/**
 * CarlAgent.js
 *
 * Este módulo actúa como el puente de ejecución para las acciones autónomas de Carl IA.
 * Permite que Carl ejecute comandos reales en el motor, gestione planes de trabajo
 * y maneje diferentes modos de ejecución (automático, visual, manual).
 */

import * as SceneManager from '../engine/SceneManager.js';
import * as Components from '../engine/Components.js';
import { getComponent as getComponentFromRegistry } from '../engine/ComponentRegistry.js';
import * as MateriaFactory from './MateriaFactory.js';
import { updateHierarchy } from './ui/HierarchyWindow.js';
import { updateInspector } from './ui/InspectorWindow.js';
import { updateAssetBrowser } from './ui/AssetBrowserWindow.js';

let editorDom = null;
let currentPlan = [];
let currentStepIndex = -1;
let executionMode = 'automatic'; // Default to automatic for seamless creation
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

    // Si el juego está en ejecución, lo detenemos automáticamente para realizar los cambios del plan
    if (window.isGameRunning && window.stopGame) {
        console.log("[CarlAgent] Deteniendo el juego para ejecutar el nuevo plan.");
        window.stopGame();
    }

    // Auto-start if mode is not permission
    if (executionMode !== 'permission') {
        executeNextStep();
    }
}

export function setExecutionMode(mode) {
    executionMode = mode;
    updateActivityUI();
}

/**
 * Cambia la vista del panel de Carl entre Chat y Actividad.
 * @param {string} view - 'chat' o 'activity'
 */
export function switchView(view) {
    console.log(`[CarlAgent] Intentando cambiar a vista: ${view}`);

    const panel = document.getElementById('carl-ia-panel');
    const viewButton = document.getElementById('carl-ia-view-selector-btn');
    const viewSelectorMenu = panel ? panel.querySelector('#carl-ia-view-selector-btn + .menu-content') : null;

    if (!panel || !viewButton || !viewSelectorMenu) {
        console.error("[CarlAgent] No se pudieron encontrar los elementos de la UI para cambiar de vista.");
        return;
    }

    const link = viewSelectorMenu.querySelector(`.carl-view-option[data-view="${view}"]`);
    if (!link) {
        console.warn(`[CarlAgent] Opción de vista no encontrada: ${view}`);
        return;
    }

    viewButton.textContent = link.textContent;

    // Switch active state in menu
    viewSelectorMenu.querySelectorAll('.carl-view-option').forEach(a => a.classList.remove('active'));
    link.classList.add('active');

    // Switch visible view
    const views = panel.querySelectorAll('.carl-view');
    views.forEach(v => v.classList.remove('active'));

    const targetView = panel.querySelector(`#carl-ia-${view}-view`);
    if (targetView) {
        targetView.classList.add('active');
        console.log(`[CarlAgent] Vista cambiada exitosamente a: ${view}`);
    } else {
        console.error(`[CarlAgent] No se encontró el contenedor de vista: #carl-ia-${view}-view`);
    }

    // Clear notification if switching to activity
    if (view === 'activity') {
        link.classList.remove('has-notification');
        const activityOption = viewSelectorMenu.querySelector('.carl-view-option[data-view="activity"]');
        if (activityOption) activityOption.classList.remove('has-notification');
    }

    viewSelectorMenu.classList.remove('visible');
}

/**
 * Ejecuta el siguiente paso del plan según el modo actual.
 */
export async function executeNextStep() {
    if (currentStepIndex < 0 || currentStepIndex >= currentPlan.length) {
        console.log("[CarlAgent] No hay más pasos que ejecutar o índice fuera de rango.", { currentStepIndex, planLength: currentPlan.length });
        return;
    }

    const step = currentPlan[currentStepIndex];
    step.status = 'executing';
    updateActivityUI();

    console.log(`[CarlAgent] Ejecutando paso ${currentStepIndex + 1}/${currentPlan.length}: ${step.title}`);
    logActivity(`Iniciando paso: ${step.title}`, 'info');

    try {
        for (const cmd of step.commands) {
            console.log(`[CarlAgent] -> Ejecutando comando: ${cmd.action}`, cmd.params);
            const result = await executeCommand(cmd.action, cmd.params);
            console.log(`[CarlAgent] <- Resultado: ${result.success ? 'EXITO' : 'FALLO'}`, result.message);

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
        console.error(`[CarlAgent] Error crítico en paso ${step.title}:`, error);
        logActivity(`Error en paso ${step.title}: ${error.message}`, 'error');
    }

    updateActivityUI();
}

/**
 * Resuelve una referencia a una materia (ID o Nombre).
 */
function resolveMateria(idOrName) {
    if (idOrName === '@last') return SceneManager.currentScene.findMateriaById(lastCreatedMateriaId);

    // Si ya es un objeto Materia
    if (typeof idOrName === 'object' && idOrName !== null && idOrName.id !== undefined) return idOrName;

    const id = parseInt(idOrName);
    if (!isNaN(id) && idOrName.toString() === id.toString()) {
        return SceneManager.currentScene.findMateriaById(id);
    }

    // Búsqueda por nombre
    return SceneManager.currentScene.getAllMaterias().find(m => m.name === idOrName);
}

/**
 * Resuelve un nombre de componente (soporta alias bilingües).
 */
function resolveComponentClass(name) {
    if (!name) return null;

    // Normalización: Eliminar espacios y convertir a PascalCase o usar mapa
    const aliasMap = {
        'Script': 'CreativeScript',
        'Creative Script': 'CreativeScript',
        'Guion': 'CreativeScript',
        'Rigidbody2D': 'Rigidbody2D',
        'Rigidbody 2D': 'Rigidbody2D',
        'Fisica': 'Rigidbody2D',
        'BoxCollider2D': 'BoxCollider2D',
        'Box Collider 2D': 'BoxCollider2D',
        'ColisionadorDeCaja': 'BoxCollider2D',
        'CircleCollider2D': 'CircleCollider2D',
        'ColisionadorCircular': 'CircleCollider2D',
        'SpriteRenderer': 'SpriteRenderer',
        'RenderizadorDeSprite': 'SpriteRenderer',
        'Imagen': 'UIImage',
        'Texto': 'UIText',
        'Boton': 'Button',
        'Controlador': 'AnimatorController',
        'Animador': 'Animator'
    };

    const resolvedName = aliasMap[name] || name;

    // 1. Intentar acceso directo en el objeto Components
    if (Components[resolvedName]) return Components[resolvedName];

    // 2. Buscar en el registro por nombre o alias
    return getComponentFromRegistry(resolvedName);
}

/**
 * Ejecuta un comando individual.
 */
async function executeCommand(action, params) {
    console.log(`[CarlAgent] Ejecutando comando: ${action}`, params);

    // Pre-procesar parámetros para resolver @last si es necesario (aunque resolveMateria ya lo hace)
    if (params.materiaId === '@last') params.materiaId = lastCreatedMateriaId;
    if (params.parentId === '@last') params.parentId = lastCreatedMateriaId;

    switch (action) {
        case 'create_materia': {
            const { name, parentId, type } = params;
            const parent = parentId ? resolveMateria(parentId) : null;
            let newMtr;

            // Usar MateriaFactory para objetos comunes
            if (type === 'Sprite' || type === 'renderizadorDeSprite') {
                newMtr = MateriaFactory.createBaseMateria(name || "Nuevo Sprite", parent);
                newMtr.addComponent(new Components.SpriteRenderer(newMtr));
            } else if (type === 'Canvas' || type === 'lienzo') {
                newMtr = MateriaFactory.createCanvasObject();
                if (name) newMtr.name = name;
            } else if (type === 'Camera' || type === 'camara') {
                 newMtr = MateriaFactory.createBaseMateria(name || "Nueva Cámara", parent);
                 newMtr.addComponent(new Components.Camera(newMtr));
            } else if (type === 'Audio' || type === 'sonido') {
                newMtr = MateriaFactory.createAudioObject(parent);
                if (name) newMtr.name = name;
            } else {
                newMtr = MateriaFactory.createBaseMateria(name || "Nuevo Objeto", parent);
            }

            updateHierarchy();
            if (window.selectMateria) window.selectMateria(newMtr.id);
            lastCreatedMateriaId = newMtr.id;
            return { success: true, message: `Objeto '${newMtr.name}' creado con ID ${newMtr.id}` };
        }

        case 'delete_materia': {
            const materia = resolveMateria(params.id);
            if (!materia) return { success: false, message: `Objeto '${params.id}' no encontrado.` };

            const id = materia.id;
            SceneManager.currentScene.removeMateria(id);
            updateHierarchy();
            updateInspector();
            return { success: true, message: `Objeto ${id} (${materia.name}) eliminado.` };
        }

        case 'add_component': {
            const { materiaId, type, properties } = params;
            const materia = resolveMateria(materiaId);
            if (!materia) return { success: false, message: `Objeto '${materiaId}' no encontrado.` };

            const ComponentClass = resolveComponentClass(type);
            if (!ComponentClass) return { success: false, message: `Componente '${type}' no reconocido.` };

            // Evitar duplicados si es un componente único
            if (materia.getComponent(ComponentClass)) {
                return { success: true, message: `El objeto ya tiene un componente '${type}'.` };
            }

            const comp = new ComponentClass(materia);
            materia.addComponent(comp);

            if (properties) {
                for (const prop in properties) {
                    comp[prop] = properties[prop];
                }
            }

            updateInspector();
            return { success: true, message: `Componente '${type}' añadido a '${materia.name}'.` };
        }

        case 'set_property': {
            const { materiaId, componentType, propPath, value } = params;
            const materia = resolveMateria(materiaId);
            if (!materia) return { success: false, message: `Objeto '${materiaId}' no encontrado.` };

            const ComponentClass = resolveComponentClass(componentType);
            const comp = ComponentClass ? materia.getComponent(ComponentClass) : materia.getComponentByName(componentType);

            if (!comp) return { success: false, message: `Componente '${componentType}' no encontrado en '${materia.name}'.` };

            // Handle nested paths like "position.x"
            const paths = propPath.split('.');
            let target = comp;

            try {
                for (let i = 0; i < paths.length - 1; i++) {
                    const next = target[paths[i]];
                    if (next === undefined || next === null) {
                        // Intentar crear el objeto intermedio si es común
                        if (paths[i] === 'scale' || paths[i] === 'position' || paths[i] === 'offset') {
                            target[paths[i]] = { x: 0, y: 0 };
                        } else {
                            throw new Error(`Ruta inválida: ${paths[i]}`);
                        }
                    }
                    target = target[paths[i]];
                }

                const lastProp = paths[paths.length - 1];

                // Manejo especial de valores numéricos si vienen como string
                let finalValue = value;
                if (typeof value === 'string' && !isNaN(parseFloat(value))) {
                    finalValue = parseFloat(value);
                }

                target[lastProp] = finalValue;

                updateInspector();
                return { success: true, message: `Propiedad '${propPath}' de '${componentType}' actualizada a ${JSON.stringify(finalValue)}.` };
            } catch (e) {
                return { success: false, message: `Error al asignar propiedad: ${e.message}` };
            }
        }

        case 'create_file': {
            const { path, content } = params;
            // This requires access to the file system handle, which is usually in editor.js
            // For now, we use a global shortcut if available
            if (window.ceCreateAsset) {
                const result = await window.ceCreateAsset(path, content);
                if (result) {
                    updateAssetBrowser();

                    const fileName = path.split('/').pop();
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
                    await window.ceCreateAsset(path, blob);
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

    // Apply translations to the newly injected content
    if (window.Localization) {
        window.Localization.applyToElement(activityLog);
    }
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
 * API unificada para Carl Agent, expuesta globalmente.
 */
export const AgentAPI = {
    initialize,
    setPlan,
    setExecutionMode: (mode) => {
        executionMode = mode;
        console.log(`Carl Agent Execution Mode: ${mode}`);
        updateActivityUI();
    },
    switchView,
    approveStep: () => {
        executeNextStep();
    }
};

// Garantizar acceso global mediante ambos nombres comunes
window.CarlAgent = AgentAPI;
window.carlAgent = AgentAPI;
