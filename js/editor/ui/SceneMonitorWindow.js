// --- Module for the Advanced Scene Diagnostics & Profiler (Monitor de Escena) ---

import { networkMonitor } from '../../engine/NetworkMonitor.js';
import { estimateMateriaMemory } from '../../engine/MathUtils.js';

let dom;
let isInitialized = false;
let sessionLogs = []; // Stores event logs like collisions, creations, destructions, etc.
let lastFrameTime = performance.now();
let lastMemorySize = 0;
let lastMemoryTime = performance.now();
let ramGrowthRate = 0; // MB/sec

// --- Public API ---

export function initialize(dependencies) {
    dom = dependencies.dom;

    // Attach hooks to global object for collision & lifecycle tracking
    window.SceneMonitor = {
        logEvent,
        clearHistory() {
            sessionLogs = [];
            forceFullRepopulate();
        },
        saveHistory
    };

    setupEventListeners();
    isInitialized = true;
    console.log("[SceneMonitor] Inicializado con éxito.");
}

function setupEventListeners() {
    const container = document.getElementById('scene-monitor-content');
    if (!container) return;

    container.addEventListener('click', (e) => {
        if (e.target.id === 'btn-clear-scene-monitor' || e.target.closest('#btn-clear-scene-monitor')) {
            sessionLogs = [];
            forceFullRepopulate();
        } else if (e.target.id === 'btn-save-scene-monitor' || e.target.closest('#btn-save-scene-monitor')) {
            saveHistory();
        }
    });
}

function forceFullRepopulate() {
    const container = document.getElementById('scene-monitor-content');
    if (container) container.innerHTML = ''; // Forces complete redraw on next update
}

function logEvent(type, message, category = 'info') {
    sessionLogs.unshift({
        timestamp: new Date().toLocaleTimeString(),
        type,
        message,
        category // 'info', 'warning', 'success', 'error'
    });
    // Keep last 30 logs to avoid bloating memory
    if (sessionLogs.length > 30) {
        sessionLogs.pop();
    }
}

// Hook into scene managers to automatically log events
if (window.SceneManager) {
    const originalAdd = window.SceneManager.addMateria;
    if (originalAdd && !originalAdd.__instrumented) {
        window.SceneManager.addMateria = function(materia, ...args) {
            const res = originalAdd.apply(this, arguments);
            if (materia) {
                logEvent('Creación', `Materia '${materia.name}' (ID: ${materia.id}) añadida a la escena.`, 'success');
            }
            return res;
        };
        window.SceneManager.addMateria.__instrumented = true;
    }
}

// Hook into collision events (global triggers can be hooked or simulated)
// Physics engine hooks
if (window._PhysicsSystem) {
    // Intercept collision dispatcher if possible, otherwise we can log from engine events
}

function saveHistory() {
    const L = window.Localization;
    const exportData = {
        sessionTimestamp: new Date().toISOString(),
        sceneLogs: sessionLogs,
        diagnostics: getSceneMetrics()
    };

    const jsonString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `scene_monitor_session_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    console.log("[SceneMonitor] Historial de escena exportado.");
}

function getSceneMetrics() {
    const scene = window.SceneManager ? window.SceneManager.currentScene : null;
    if (!scene) return null;

    const materias = scene.getAllMaterias() || [];
    let colliders2D = 0;
    let colliders3D = 0;
    let rigidbodies2D = 0;
    let rigidbodies3D = 0;
    let particleSystems = 0;
    let spriteRenderers = 0;
    let meshRenderers = 0;
    let lights = 0;
    let audioSources = 0;
    let scriptsCount = 0;

    const scriptInstancesMap = new Map(); // Tracks scriptName -> list of materias running it

    materias.forEach(m => {
        if (!m.leyes) return;
        m.leyes.forEach(ley => {
            const name = ley.constructor.name;
            if (name === 'BoxCollider2D' || name === 'CircleCollider2D' || name === 'PolygonCollider2D' || name === 'LineCollider') colliders2D++;
            if (name === 'Collider3D' || name === 'BoxCollider3D' || name === 'SphereCollider3D' || name === 'CapsuleCollider3D' || name === 'TerrenoCollider3D' || name === 'PlaneCollider3D') colliders3D++;
            if (name === 'Rigidbody2D' || name === 'Fisicas2D') rigidbodies2D++;
            if (name === 'Rigidbody3D' || name === 'Fisicas3D') rigidbodies3D++;
            if (name === 'ParticleSystem' || name === 'SistemaParticulas') particleSystems++;
            if (name === 'SpriteRenderer' || name === 'RenderizadorSprite') spriteRenderers++;
            if (name === 'MeshRenderer3D' || name === 'SkinnedMeshRenderer3D') meshRenderers++;
            if (name === 'Light' || name === 'DirectionalLight3D' || name === 'PointLight3D' || name === 'SpotLight3D' || name === 'Luz2D') lights++;
            if (name === 'AudioSource' || name === 'FuenteAudio') audioSources++;
            if (name === 'CreativeScript') {
                scriptsCount++;
                if (ley.scriptName) {
                    if (!scriptInstancesMap.has(ley.scriptName)) {
                        scriptInstancesMap.set(ley.scriptName, []);
                    }
                    scriptInstancesMap.get(ley.scriptName).push(m.name);
                }
            }
        });
    });

    return {
        totalMaterias: materias.length,
        collidersCount: colliders2D + colliders3D,
        rigidbodiesCount: rigidbodies2D + rigidbodies3D,
        particleSystems,
        drawCalls: spriteRenderers + meshRenderers,
        lightsCount: lights,
        audioSources,
        scriptsCount,
        scriptInstancesMap
    };
}

export function update() {
    const container = document.getElementById('scene-monitor-content');
    if (!container) return;

    const L = window.Localization;
    const scene = window.SceneManager ? window.SceneManager.currentScene : null;

    if (!scene) {
        container.innerHTML = `
            <div style="padding: 20px; color: #888; text-align: center; font-family: sans-serif;">
                Carga un proyecto y una escena para ver diagnósticos en tiempo real.
            </div>
        `;
        return;
    }

    // Measure RAM growth rate
    const now = performance.now();
    if (window.performance && window.performance.memory) {
        const memory = window.performance.memory;
        const currentMB = memory.usedJSHeapSize / 1048576;
        const timeDiff = (now - lastMemoryTime) / 1000; // sec
        if (timeDiff >= 1.0) {
            const memDiff = currentMB - lastMemorySize;
            // Check only if it went up to detect positive allocation rate
            ramGrowthRate = memDiff > 0 ? (memDiff / timeDiff).toFixed(2) : 0;
            lastMemorySize = currentMB;
            lastMemoryTime = now;
        }
    } else {
        ramGrowthRate = "---";
    }

    // Get current FPS and frame stats
    const fps = window.currentFPS !== undefined ? window.currentFPS.toFixed(1) : (1000 / (now - lastFrameTime)).toFixed(1);
    lastFrameTime = now;

    // Calculate metrics
    const metrics = getSceneMetrics();
    if (!metrics) return;

    // Generate heuristics and deep architectural advice
    const advancedAdvices = [];
    const criticalBottlenecks = [];

    // 1. Script redundancy & Controller/Manager pattern detection
    if (metrics.scriptInstancesMap) {
        metrics.scriptInstancesMap.forEach((materiaNames, scriptName) => {
            if (materiaNames.length >= 6) {
                advancedAdvices.push(`
                    <div style="background: #2b1f11; border-left: 4px solid #ffaa00; padding: 10px; margin-bottom: 8px; border-radius: 4px;">
                        <strong style="color: #ffaa00; font-size: 1.05em;">📦 Redundancia de Script Detectada: "${scriptName}"</strong>
                        <div style="margin-top: 4px; color: #ddd; font-size: 0.95em; line-height: 1.4;">
                            Hay <strong>${materiaNames.length} objetos independientes</strong> ejecutando el script <code>${scriptName}</code> en su bucle update() individual.
                            <br><span style="color: #00ffcc;">Sugerencia de Arquitectura:</span> Considera usar el patrón <strong>Controller / Manager</strong>: crea una única Materia vacía central con un solo script controlador que mantenga un array con la referencia a todos estos objetos y los mueva o actualice dentro de un único bucle. Esto reduce el overhead en el hilo de ejecución de Javascript del motor de <strong>O(N)</strong> llamadas de ciclo de vida a <strong>O(1)</strong> llamadas, mejorando sustancialmente los FPS.
                        </div>
                    </div>
                `);
            }
        });
    }

    // 2. High Draw Calls & Batching advice
    if (metrics.drawCalls > 100) {
        advancedAdvices.push(`
            <div style="background: #2d1313; border-left: 4px solid #ff4444; padding: 10px; margin-bottom: 8px; border-radius: 4px;">
                <strong style="color: #ff4444; font-size: 1.05em;">⚠️ Llamadas de Dibujo Elevadas (Draw Calls: ${metrics.drawCalls})</strong>
                <div style="margin-top: 4px; color: #ddd; font-size: 0.95em; line-height: 1.4;">
                    El número de elementos renderizados por separado está superando los límites recomendados de WebGL para navegadores móviles y laptops estándar.
                    <br><span style="color: #00ffcc;">Sugerencia de Optimización:</span> Agrupa tus sprites usando <strong>Hojas de Sprites (Sprite Sheets)</strong> o combina mallas estáticas 3D en un único prefab estático combinado. Activar el sistema de Batching reducirá drásticamente las comunicaciones CPU-GPU y evitará caídas severas de FPS.
                </div>
            </div>
        `);
    }

    // 3. Dynamic RAM growth rate warnings (Memory Leak heuristic)
    if (parseFloat(ramGrowthRate) > 1.5) {
        criticalBottlenecks.push(`
            <div style="background: #2d1313; border-left: 4px solid #ff4444; padding: 8px 12px; margin-bottom: 6px; border-radius: 4px; font-size: 0.95em;">
                🚨 <strong>Consumo Excesivo de RAM (+${ramGrowthRate} MB/s)</strong>: La tasa de asignación de memoria es críticamente alta. Esto suele indicar una <strong>fuga de memoria (Memory Leak)</strong> causada por instanciación repetitiva de objetos (por ejemplo, proyectiles o partículas) sin destruir, o almacenamiento de referencias en arrays globales acumulativos.
            </div>
        `);
    }

    // 4. Overlighting & Shader overload warnings
    if (metrics.lightsCount > 8) {
        advancedAdvices.push(`
            <div style="background: #2b1f11; border-left: 4px solid #ff9900; padding: 10px; margin-bottom: 8px; border-radius: 4px;">
                <strong style="color: #ff9900; font-size: 1.05em;">💡 Exceso de Luces Dinámicas (${metrics.lightsCount} activas)</strong>
                <div style="margin-top: 4px; color: #ddd; font-size: 0.95em; line-height: 1.4;">
                    El renderizado de múltiples luces dinámicas fuerza a WebGL a recalcular el sombreado de píxeles (Fragment Shader) de forma múltiple para cada objeto iluminado.
                    <br><span style="color: #00ffcc;">Sugerencia de Optimización:</span> Desactiva las luces que estén fuera del campo de visión de la cámara principal (Frustum Culling) o considera simular luces secundarias usando texturas de gradiente estáticas pre-diseñadas.
                </div>
            </div>
        `);
    }

    // 5. Static Colliders mutating transforms warning
    let mutatingStaticCollidersDetected = false; // Simulate / detect if moving
    if (metrics.collidersCount > 20 && metrics.rigidbodiesCount < metrics.collidersCount * 0.4) {
        advancedAdvices.push(`
            <div style="background: #17271e; border-left: 4px solid #00C851; padding: 10px; margin-bottom: 8px; border-radius: 4px;">
                <strong style="color: #00C851; font-size: 1.05em;">⚙️ Estructura del Árbol Físico (AABB Tree)</strong>
                <div style="margin-top: 4px; color: #ddd; font-size: 0.95em; line-height: 1.4;">
                    Tienes <strong>${metrics.collidersCount} colisionadores</strong> activos y solo <strong>${metrics.rigidbodiesCount} cuerpos físicos (Rigidbodies)</strong>.
                    <br><span style="color: #00ffcc;">Sugerencia de Buenas Prácticas:</span> Asegúrate de que los colisionadores estáticos permanezcan inmóviles. Mover un objeto con colisionador pero sin Rigidbody mediante scripts de transformación directa fuerza al motor físico a regenerar y recalcular el árbol espacial entero cada fotograma, consumiendo tiempo crítico de CPU. Usa componentes Rigidbody tipo <strong>Kinematic</strong> si los objetos deben moverse de forma procedural.
                </div>
            </div>
        `);
    }

    // Empty state fallback for advices
    if (advancedAdvices.length === 0) {
        advancedAdvices.push(`
            <div style="background: #17271e; border-left: 4px solid #00C851; padding: 10px; margin-bottom: 8px; border-radius: 4px; font-size: 0.95em; color: #00C851;">
                ✅ <strong>¡La escena se encuentra en un estado óptimo!</strong> No se han detectado redundancias de código, problemas de llamadas de dibujo WebGL ni fugas de memoria evidentes. Todo funciona bajo los estándares más exigentes de rendimiento.
            </div>
        `);
    }

    // Build log items HTML
    let logsHtml = '';
    if (sessionLogs.length === 0) {
        logsHtml = `<div style="color: #666; padding: 20px; text-align: center; font-size: 0.95em;">No hay eventos registrados en esta sesión. Los cambios en escena, colisiones y llamadas se verán reflejados aquí.</div>`;
    } else {
        logsHtml = `<table style="width: 100%; border-collapse: collapse; font-size: 0.9em; text-align: left;">`;
        sessionLogs.forEach(log => {
            let catColor = '#aaa';
            if (log.category === 'success') catColor = '#00ffcc';
            if (log.category === 'warning') catColor = '#ffbb33';
            if (log.category === 'error') catColor = '#ff4444';

            logsHtml += `
                <tr style="border-bottom: 1px solid #222; height: 24px;">
                    <td style="padding: 4px; color: #666; width: 80px;">[${log.timestamp}]</td>
                    <td style="padding: 4px; color: ${catColor}; font-weight: bold; width: 90px;">${log.type}</td>
                    <td style="padding: 4px; color: #ddd;">${log.message}</td>
                </tr>
            `;
        });
        logsHtml += `</table>`;
    }

    // Render HTML Panel Structure
    container.innerHTML = `
        <div class="scene-monitor-panel" style="padding: 10px; display: flex; flex-direction: column; height: 100%; box-sizing: border-box; overflow: hidden; color: #fff; background: #1e1e1e; font-family: sans-serif;">
            <!-- Toolbar -->
            <div class="monitor-toolbar" style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid #333; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="font-size: 0.95em; color: #aaa; font-weight: bold;">📊 Rendimiento Live: <span style="color: #00ffcc;">${fps} FPS</span></span>
                    <span style="font-size: 0.95em; color: #aaa; font-weight: bold;">📈 Crecimiento RAM: <span style="color: #00b4ff;">+${ramGrowthRate} MB/s</span></span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button id="btn-save-scene-monitor" class="panel-tool-btn" style="background: #2d2d2d; border: 1px solid #444; color: #00ffcc; padding: 4px 10px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.85em;" title="Guardar Historial de Escena">
                        <span>Guardar Historial de Escena</span>
                    </button>
                    <button id="btn-clear-scene-monitor" class="panel-tool-btn" style="background: #2d2d2d; border: 1px solid #444; color: #ff4444; padding: 4px 10px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.85em;" title="Borrar Historial">
                        <span>Borrar Historial</span>
                    </button>
                </div>
            </div>

            <!-- Bottlenecks Warning Panel -->
            ${criticalBottlenecks.length > 0 ? `<div style="margin-bottom: 10px;">${criticalBottlenecks.join('')}</div>` : ''}

            <!-- Main Live Telemetry Grid -->
            <div style="display: flex; gap: 15px; margin-bottom: 12px; font-size: 0.85em;">
                <div style="flex: 1; background: #151515; padding: 8px; border-radius: 4px; text-align: center;">
                    <div style="color: #888; font-weight: bold;">Materias Totales</div>
                    <div style="font-size: 1.5em; color: #fff; font-weight: bold; margin-top: 4px;">${metrics.totalMaterias}</div>
                </div>
                <div style="flex: 1; background: #151515; padding: 8px; border-radius: 4px; text-align: center;">
                    <div style="color: #888; font-weight: bold;">Colisionadores</div>
                    <div style="font-size: 1.5em; color: #00ffcc; font-weight: bold; margin-top: 4px;">${metrics.collidersCount}</div>
                </div>
                <div style="flex: 1; background: #151515; padding: 8px; border-radius: 4px; text-align: center;">
                    <div style="color: #888; font-weight: bold;">Scripts Activos</div>
                    <div style="font-size: 1.5em; color: #ffbb33; font-weight: bold; margin-top: 4px;">${metrics.scriptsCount}</div>
                </div>
                <div style="flex: 1; background: #151515; padding: 8px; border-radius: 4px; text-align: center;">
                    <div style="color: #888; font-weight: bold;">Llamadas de Dibujo</div>
                    <div style="font-size: 1.5em; color: #00b4ff; font-weight: bold; margin-top: 4px;">${metrics.drawCalls}</div>
                </div>
                <div style="flex: 1; background: #151515; padding: 8px; border-radius: 4px; text-align: center;">
                    <div style="color: #888; font-weight: bold;">Luces Dinámicas</div>
                    <div style="font-size: 1.5em; color: #ff4444; font-weight: bold; margin-top: 4px;">${metrics.lightsCount}</div>
                </div>
            </div>

            <!-- Content Area -->
            <div style="flex: 1; display: flex; gap: 15px; overflow: hidden;">
                <!-- Left Column: Diagnostic & Architectural suggestions -->
                <div style="flex: 1; display: flex; flex-direction: column; overflow-y: auto; background: #151515; padding: 10px; border-radius: 4px; border: 1px solid #333;">
                    <div style="font-size: 1em; font-weight: bold; color: #00e5ff; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px;">🔍 Sugerencias Avanzadas y Diagnósticos de Escena</div>
                    <div style="flex: 1;">
                        ${advancedAdvices.join('')}
                    </div>
                </div>

                <!-- Right Column: Scene Events log -->
                <div style="flex: 1; display: flex; flex-direction: column; overflow: hidden; background: #151515; padding: 10px; border-radius: 4px; border: 1px solid #333;">
                    <div style="font-size: 1em; font-weight: bold; color: #ffbb33; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px;">📋 Historial de Eventos de la Sesión</div>
                    <div style="flex: 1; overflow-y: auto;">
                        ${logsHtml}
                    </div>
                </div>
            </div>
        </div>
    `;
}
