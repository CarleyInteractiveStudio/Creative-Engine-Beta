/**
 * CarlAgent.js
 *
 * Este módulo actúa como el puente de ejecución para las acciones autónomas de Carl IA.
 * Permite que Carl ejecute comandos reales en el motor, gestione planes de trabajo
 * y maneje diferentes modos de ejecución (automático, visual, manual).
 */

import * as SceneManager from '../engine/SceneManager.js';
import * as Components from '../engine/Components.js';
import * as MateriaFactory from './MateriaFactory.js';
import { updateHierarchy } from './ui/HierarchyWindow.js';
import { updateInspector } from './ui/InspectorWindow.js';
import { updateAssetBrowser } from './ui/AssetBrowserWindow.js';

let editorDom = null;
let currentPlan = [];
let currentStepIndex = -1;
let executionMode = 'permission'; // 'automatic', 'visual', 'permission'
let isExecuting = false;
let lastCreatedMateriaId = null;

/**
 * Inicializa el agente con el DOM del editor y las dependencias.
 */
export function initialize(dom) {
    editorDom = dom;

    // Registrar los manejadores globales para que la terminal y otros módulos los usen
    window.carlCommandHandlers = {
        crearObjeto: async (params) => executeCommand('create_materia', params),
        borrarObjeto: async (params) => executeCommand('delete_materia', params),
        agregarComponente: async (params) => executeCommand('add_component', params),
        modificarPropiedad: async (params) => executeCommand('set_property', params),
        crearArchivo: async (params) => executeCommand('create_file', params),
        borrarArchivo: async (params) => executeCommand('delete_file', params),
        descargarArchivo: async (params) => executeCommand('download_file', params),
        listarObjetos: async () => {
            const materias = SceneManager.currentScene.getAllMaterias();
            return {
                success: true,
                message: "Objetos listados",
                content: materias.map(m => `[${m.id}] ${m.name} (Tag: ${m.tag})`).join('\n')
            };
        },
        obtenerDetallesObjeto: async (params) => {
            const materia = SceneManager.currentScene.findMateriaById(parseInt(params.id));
            if (!materia) return { success: false, message: `Objeto con ID ${params.id} no encontrado.` };
            const details = {
                id: materia.id,
                name: materia.name,
                tag: materia.tag,
                layer: materia.layer,
                components: materia.leyes.map(l => l.constructor.name)
            };
            return { success: true, message: "Detalles obtenidos", content: JSON.stringify(details, null, 2) };
        }
    };

    console.log("Carl Agent Bridge Initialized.");
}

/**
 * Define un nuevo plan de acción para Carl.
 * @param {Array} steps - Lista de pasos [{title, description, commands: []}]
 */
export function setPlan(steps) {
    currentPlan = steps.map(s => ({
        ...s,
        status: 'pending' // 'pending', 'executing', 'completed', 'failed'
    }));
    currentStepIndex = 0;
    updateActivityUI();

    // Auto-start if mode is not permission
    if (executionMode !== 'permission') {
        executeNextStep();
    }
}

export function setExecutionMode(mode) {
    executionMode = mode;
}

/**
 * Ejecuta el siguiente paso del plan según el modo actual.
 */
export async function executeNextStep() {
    if (currentStepIndex < 0 || currentStepIndex >= currentPlan.length) return;

    const step = currentPlan[currentStepIndex];
    step.status = 'executing';
    updateActivityUI();

    logActivity(`Iniciando paso: ${step.title}`, 'info');

    try {
        for (const cmd of step.commands) {
            const result = await executeCommand(cmd.action, cmd.params);
            if (!result.success) {
                throw new Error(`Comando ${cmd.action} falló: ${result.message}`);
            }
        }
        step.status = 'completed';
        logActivity(`Paso completado: ${step.title}`, 'success');
        currentStepIndex++;

        if (executionMode === 'automatic') {
            executeNextStep();
        } else if (executionMode === 'visual') {
            setTimeout(() => executeNextStep(), 1000); // Pausa visual
        }
    } catch (error) {
        step.status = 'failed';
        logActivity(`Error en paso ${step.title}: ${error.message}`, 'error');
    }

    updateActivityUI();
}

/**
 * Ejecuta un comando individual.
 */
async function executeCommand(action, params) {
    console.log(`[CarlAgent] Ejecutando comando: ${action}`, params);

    // Resolve @last shortcut
    for (const key in params) {
        if (params[key] === '@last') {
            params[key] = lastCreatedMateriaId;
        }
    }

    switch (action) {
        case 'create_materia': {
            const { name, parentId, type } = params;
            const parent = parentId ? SceneManager.currentScene.findMateriaById(parseInt(parentId)) : null;
            let newMtr;

            if (type === 'Sprite') newMtr = MateriaFactory.createBaseMateria(name || "Nuevo Sprite", parent);
            else if (type === 'Canvas') newMtr = MateriaFactory.createCanvasObject();
            else if (type === 'Camera') {
                 newMtr = MateriaFactory.createBaseMateria(name || "Nueva Cámara", parent);
                 newMtr.addComponent(new Components.Camera(newMtr));
            }
            else newMtr = MateriaFactory.createBaseMateria(name || "Nuevo Objeto", parent);

            if (type === 'Sprite' && !newMtr.getComponent(Components.SpriteRenderer)) {
                newMtr.addComponent(new Components.SpriteRenderer(newMtr));
            }

            updateHierarchy();
            if (window.selectMateria) window.selectMateria(newMtr.id);
            lastCreatedMateriaId = newMtr.id;
            return { success: true, message: `Objeto '${newMtr.name}' creado con ID ${newMtr.id}` };
        }

        case 'delete_materia': {
            const id = parseInt(params.id);
            SceneManager.currentScene.removeMateria(id);
            updateHierarchy();
            updateInspector();
            return { success: true, message: `Objeto ${id} eliminado.` };
        }

        case 'add_component': {
            const { materiaId, type, properties } = params;
            const materia = SceneManager.currentScene.findMateriaById(parseInt(materiaId));
            if (!materia) return { success: false, message: "Objeto no encontrado." };

            const ComponentClass = Components[type];
            if (!ComponentClass) return { success: false, message: `Componente '${type}' no reconocido.` };

            const comp = new ComponentClass(materia);
            if (properties) {
                Object.assign(comp, properties);
            }
            materia.addComponent(comp);
            updateInspector();
            return { success: true, message: `Componente '${type}' añadido a '${materia.name}'.` };
        }

        case 'set_property': {
            const { materiaId, componentType, propPath, value } = params;
            const materia = SceneManager.currentScene.findMateriaById(parseInt(materiaId));
            if (!materia) return { success: false, message: "Objeto no encontrado." };

            const comp = materia.getComponent(Components[componentType]);
            if (!comp) return { success: false, message: `Componente '${componentType}' no encontrado en '${materia.name}'.` };

            // Handle nested paths like "position.x"
            const paths = propPath.split('.');
            let target = comp;
            for (let i = 0; i < paths.length - 1; i++) {
                target = target[paths[i]];
            }
            target[paths[paths.length - 1]] = value;

            updateInspector();
            return { success: true, message: `Propiedad '${propPath}' actualizada.` };
        }

        case 'create_file': {
            const { path, content } = params;
            // This requires access to the file system handle, which is usually in editor.js
            // For now, we use a global shortcut if available
            if (window.ceCreateAsset) {
                const parts = path.split('/');
                const fileName = parts.pop();

                const result = await window.ceCreateAsset(fileName, content);
                if (result) {
                    updateAssetBrowser();

                    // Hot Reload if game is running and it's a script
                    if ((fileName.endsWith('.ces') || fileName.endsWith('.chc')) && window.ceHotReload) {
                        await window.ceHotReload(fileName);
                    }

                    return { success: true, message: `Archivo '${path}' creado.` };
                }
            }
            return { success: false, message: "Función de creación de archivos no disponible en este contexto." };
        }

        case 'download_file': {
            const { url, path } = params;
            try {
                logActivity(`Descargando asset de: ${url}`, 'info');
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const blob = await response.blob();
                if (window.ceCreateAsset) {
                    const parts = path.split('/');
                    const fileName = parts.pop();
                    await window.ceCreateAsset(fileName, blob);
                    updateAssetBrowser();
                    return { success: true, message: `Archivo descargado y guardado en '${path}'.` };
                }
            } catch (e) {
                return { success: false, message: `Fallo al descargar: ${e.message}` };
            }
            return { success: false, message: "No se pudo descargar el archivo." };
        }

        default:
            return { success: false, message: `Acción desconocida: ${action}` };
    }
}

/**
 * Actualiza la UI del log de actividad de Carl.
 */
function updateActivityUI() {
    const activityLog = document.getElementById('carl-ia-activity-log');
    if (!activityLog) return;

    if (currentPlan.length === 0) {
        activityLog.innerHTML = `<div class="carl-initial-info" data-i18n="NO_ACTIVIDAD_RECIENTE">No hay actividad reciente.</div>`;
        return;
    }

    const L = window.Localization;
    let html = `<div class="carl-plan-container">
        <h3 data-i18n="PLAN_ACTUAL">${L?.get('PLAN_ACTUAL') || 'Plan Actual'}</h3>
        <div class="carl-steps-list">`;

    currentPlan.forEach((step, index) => {
        const isCurrent = index === currentStepIndex;
        html += `
            <div class="carl-step-item ${step.status} ${isCurrent ? 'current' : ''}">
                <div class="step-header">
                    <span class="step-status-icon">${getStatusIcon(step.status)}</span>
                    <span class="step-title">${step.title}</span>
                </div>
                ${isCurrent || step.status === 'executing' ? `<div class="step-desc">${step.description}</div>` : ''}
                ${isCurrent && executionMode === 'permission' ? `<button onclick="window.carlAgent.approveStep()" class="approve-btn" data-i18n="APROBAR_CONTINUAR">${L?.get('APROBAR_CONTINUAR') || 'Aprobar y Continuar'}</button>` : ''}
            </div>
        `;
    });

    html += `</div></div>`;
    activityLog.innerHTML = html;
}

function getStatusIcon(status) {
    switch (status) {
        case 'pending': return '⚪';
        case 'executing': return '🔄';
        case 'completed': return '✅';
        case 'failed': return '❌';
        default: return '❓';
    }
}

function logActivity(message, type = 'info') {
    console.log(`[CarlActivity] ${type.toUpperCase()}: ${message}`);
    // Podríamos añadir una lista de logs históricos debajo del plan
}

/**
 * Función global para que la UI apruebe un paso.
 */
window.carlAgent = {
    approveStep: () => {
        executeNextStep();
    },
    setExecutionMode: (mode) => {
        executionMode = mode;
        console.log(`Carl Agent Execution Mode: ${mode}`);
    }
};
