// --- Module for the Advanced Scene Diagnostics & Profiler (Monitor de Escena) ---

let dom;
let isInitialized = false;
let sessionLogs = []; // Stores event logs like collisions, creations, destructions, etc.
const componentStats = new Map(); // Tracks execution statistics for all components (Leyes)
const sceneSessionHistory = []; // Historical archived sessions
let selectedSceneSessionIndex = -1; // -1 means Active/Current Session
let wasGameRunning = false;

// Real-time FPS & CPU process profiling
const fpsHistory = []; // Array of last 40 frames: { fps, render, physics, script, totalCpu, frameIndex, attributedCause }
let isCurrentlyDropping = false;
let dropStartFrame = 0;
let frameCounter = 0;

let lastFrameTime = performance.now();
let lastMemorySize = 0;
let lastMemoryTime = performance.now();
let ramGrowthRate = 0; // MB/sec

// --- Public API ---

export function initialize(dependencies) {
    dom = dependencies.dom;

    // Register on global window object so other subsystems can feed telemetry
    window.SceneMonitor = {
        logEvent,
        clearHistory() {
            sessionLogs = [];
            componentStats.clear();
            fpsHistory.length = 0;
            sceneSessionHistory.length = 0;
            selectedSceneSessionIndex = -1;
            forceFullRepopulate();
        },
        saveHistory,
        recordComponentCall(componentName, duration, success) {
            if (!window.isGameRunning) return;
            let stats = componentStats.get(componentName);
            if (!stats) {
                stats = {
                    calls: 0,
                    successes: 0,
                    errors: 0,
                    totalTime: 0,
                    maxTime: 0
                };
                componentStats.set(componentName, stats);
            }
            stats.calls++;
            stats.totalTime += duration;
            if (duration > stats.maxTime) {
                stats.maxTime = duration;
            }
            if (success) {
                stats.successes++;
            } else {
                stats.errors++;
            }
        }
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
            componentStats.clear();
            fpsHistory.length = 0;
            sceneSessionHistory.length = 0;
            selectedSceneSessionIndex = -1;
            forceFullRepopulate();
        } else if (e.target.id === 'btn-save-scene-monitor' || e.target.closest('#btn-save-scene-monitor')) {
            saveHistory();
        }
    });

    container.addEventListener('change', (e) => {
        if (e.target.id === 'scene-session-select') {
            selectedSceneSessionIndex = parseInt(e.target.value);
            forceFullRepopulate();
        }
    });
}

function forceFullRepopulate() {
    const container = document.getElementById('scene-monitor-content');
    if (container) container.innerHTML = ''; // Forces complete redraw on next update
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
}

function logEvent(type, message, category = 'info') {
    sessionLogs.unshift({
        timestamp: new Date().toLocaleTimeString(),
        type,
        message,
        category // 'info', 'warning', 'success', 'error'
    });
    // Keep last 40 logs to avoid bloating memory
    if (sessionLogs.length > 40) {
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

function saveHistory() {
    const L = window.Localization;
    const exportData = {
        sessionTimestamp: new Date().toISOString(),
        sceneLogs: sessionLogs,
        diagnostics: getSceneMetrics(),
        fpsHistory: fpsHistory
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
    let audioSourcesCount = 0;
    let scriptsCount = 0;
    let uiElements = 0;

    const scriptInstancesMap = new Map(); // Tracks scriptName -> list of materias running it
    const scaleIssues = []; // List of scale-related bugs found
    const playingAudios = []; // List of active/playing audio files
    const cameras = []; // Active cameras in scene

    materias.forEach(m => {
        // Look for scale bugs (e.g. scale equal to zero)
        const transform = m.getComponentByName('Transform') || m.getComponentByName('Transform3D') || m.getComponentByName('CarleyTransform3D');
        if (transform) {
            const scale = transform.localScale || { x: 1, y: 1, z: 1 };
            if (scale.x === 0 || scale.y === 0 || (scale.z !== undefined && scale.z === 0)) {
                scaleIssues.push(`Materia '${m.name}' (ID: ${m.id}) tiene escala igual a cero en algún eje, lo que impide su renderizado y puede romper sus cálculos de física.`);
            }
        }

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
            if (name === 'AudioSource' || name === 'FuenteAudio') {
                audioSourcesCount++;
                if (ley.source || ley.isPlaying) {
                    playingAudios.push({
                        materiaName: m.name,
                        source: ley.source || 'default',
                        volume: ley.volume !== undefined ? ley.volume : 1.0,
                        loop: ley.loop ? 'Sí' : 'No'
                    });
                }
            }
            if (name === 'Camera' || name === 'Camara') {
                cameras.push({
                    materiaName: m.name,
                    active: ley.isPrimary || ley.active ? 'Primaria' : 'Secundaria',
                    mode: ley.orthographic ? 'Ortográfica (2D)' : 'Perspectiva (3D)'
                });
            }
            if (name === 'UITransform' || name === 'UIImage' || name === 'UIText' || name === 'Button') {
                uiElements++;
            }
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
        audioSourcesCount,
        scriptsCount,
        uiElements,
        scriptInstancesMap,
        scaleIssues,
        playingAudios,
        cameras
    };
}

function drawFPSTimeline(canvas, history) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    // Draw Background Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= h; i += h / 3) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(w, i);
        ctx.stroke();
    }

    if (history.length === 0) {
        ctx.fillStyle = '#666';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Esperando datos de rendimiento...', w / 2, h / 2);
        return;
    }

    const maxItems = 40;
    const barWidth = w / maxItems;

    // Draw bars
    history.slice(-maxItems).forEach((data, index) => {
        const x = index * barWidth;
        const normalizedFPS = Math.min(60, data.fps);
        const barHeight = (normalizedFPS / 60) * h;
        const y = h - barHeight;

        const isDrop = data.fps < 40;
        ctx.fillStyle = isDrop ? 'rgba(255, 68, 68, 0.85)' : 'rgba(0, 255, 204, 0.7)';
        ctx.fillRect(x + 1, y, barWidth - 1, barHeight);

        if (isDrop && index === history.slice(-maxItems).length - 1) {
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(`Drop: ${data.fps.toFixed(1)} FPS (${data.attributedCause})`, w - 5, 12);
        }
    });

    // Draw labels
    ctx.fillStyle = '#888';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('60 FPS', 5, 10);
    ctx.fillText('30 FPS', 5, h / 2);
}

export function update() {
    const container = document.getElementById('scene-monitor-content');
    if (!container) return;

    const L = window.Localization;
    const scene = window.SceneManager ? window.SceneManager.currentScene : null;

    if (!scene) {
        container.innerHTML = `
            <div style="padding: 20px; color: #888; text-align: center; font-family: sans-serif;">
                Carga un proyecto y una escena para ver diagnósticos avanzados en tiempo real.
            </div>
        `;
        return;
    }

    // --- Dynamic Game Session Transition Detection ---
    if (window.isGameRunning && !wasGameRunning) {
        sessionLogs.length = 0;
        componentStats.clear();
        fpsHistory.length = 0;
        isCurrentlyDropping = false;
        frameCounter = 0;
        selectedSceneSessionIndex = -1; // Live view
        wasGameRunning = true;
        forceFullRepopulate();
    } else if (!window.isGameRunning && wasGameRunning) {
        // Archive the completed session
        const archived = {
            name: `Sesión ${sceneSessionHistory.length + 1} (${new Date().toLocaleTimeString()})`,
            logs: [...sessionLogs],
            componentStats: new Map(JSON.parse(JSON.stringify(Array.from(componentStats.entries())))),
            fpsHistory: [...fpsHistory],
            metrics: getSceneMetrics(),
            ramGrowth: ramGrowthRate,
            fps: window.currentFPS !== undefined ? window.currentFPS.toFixed(1) : "---"
        };
        sceneSessionHistory.push(archived);
        selectedSceneSessionIndex = sceneSessionHistory.length - 1; // Auto-select the completed session
        wasGameRunning = false;
        forceFullRepopulate();
    }

    // Build session options HTML
    let sessionOptions = '';
    sceneSessionHistory.forEach((session, index) => {
        const isSel = index === selectedSceneSessionIndex ? 'selected' : '';
        sessionOptions += `<option value="${index}" ${isSel}>${session.name}</option>`;
    });

    // Resolve displayed dataset based on selection
    let displayLogs = sessionLogs;
    let displayComponentStats = componentStats;
    let displayMetrics = getSceneMetrics();
    let displayRamGrowth = ramGrowthRate;
    let displayFPS = "---";

    if (selectedSceneSessionIndex !== -1 && sceneSessionHistory[selectedSceneSessionIndex]) {
        const archived = sceneSessionHistory[selectedSceneSessionIndex];
        displayLogs = archived.logs;
        displayComponentStats = new Map(archived.componentStats);
        displayMetrics = archived.metrics;
        displayRamGrowth = archived.ramGrowth;
        displayFPS = archived.fps;
    } else {
        // Measure RAM growth rate (Live View only)
        const now = performance.now();
        if (window.performance && window.performance.memory) {
            const memory = window.performance.memory;
            const currentMB = memory.usedJSHeapSize / 1048576;
            const timeDiff = (now - lastMemoryTime) / 1000; // sec
            if (timeDiff >= 1.0) {
                const memDiff = currentMB - lastMemorySize;
                ramGrowthRate = memDiff > 0 ? (memDiff / timeDiff).toFixed(2) : 0;
                lastMemorySize = currentMB;
                lastMemoryTime = now;
            }
        } else {
            ramGrowthRate = "---";
        }
        displayRamGrowth = ramGrowthRate;

        // Current FPS (Live View only)
        const fpsVal = window.currentFPS !== undefined ? window.currentFPS : (1000 / (now - lastFrameTime));
        displayFPS = fpsVal.toFixed(1);
        lastFrameTime = now;

        // Trace and record FPS drops & process attribution in the history
        if (window.isGameRunning) {
            frameCounter++;
            const renderT = (window._PerformanceMetrics && window._PerformanceMetrics.lastRenderTime) || 0;
            const physicsT = (window._PerformanceMetrics && window._PerformanceMetrics.lastPhysicsTime) || 0;
            const scriptT = (window._PerformanceMetrics && window._PerformanceMetrics.lastScriptUpdateTime) || 0;

            // Attribute direct cause
            let attributedCause = "Procesamiento de CPU";
            const maxTime = Math.max(renderT, physicsT, scriptT);
            if (maxTime > 1.5) {
                if (maxTime === renderT) attributedCause = "Renderizado WebGL/2D";
                else if (maxTime === physicsT) attributedCause = "Físicas & Colisiones";
                else if (maxTime === scriptT) attributedCause = "Ejecución de Scripts";
            }

            fpsHistory.push({
                fps: fpsVal,
                render: renderT,
                physics: physicsT,
                script: scriptT,
                frameIndex: frameCounter,
                attributedCause: attributedCause
            });

            if (fpsHistory.length > 50) {
                fpsHistory.shift();
            }

            // Real-time drop threshold detection (< 40 FPS indicates a stutter)
            if (fpsVal < 40) {
                if (!isCurrentlyDropping) {
                    isCurrentlyDropping = true;
                    dropStartFrame = frameCounter;
                    logEvent('Caída FPS', `Se detectó una caída de rendimiento (${displayFPS} FPS) en el fotograma ${dropStartFrame}. Causa probable: ${attributedCause} (${maxTime.toFixed(1)}ms).`, 'error');
                }
            } else {
                if (isCurrentlyDropping && fpsVal > 45) { // recovered
                    logEvent('Caída FPS Terminado', `El rendimiento se estabilizó de nuevo a los ${displayFPS} FPS en el fotograma ${frameCounter} (Duración del drop: ${frameCounter - dropStartFrame} fotogramas).`, 'success');
                    isCurrentlyDropping = false;
                }
            }
        }
    }

    if (!displayMetrics) return;

    // Diagnostics & Optimization Heuristics
    const advancedAdvices = [];
    const criticalBottlenecks = [];

    // Scale Bugs Detection
    if (displayMetrics.scaleIssues && displayMetrics.scaleIssues.length > 0) {
        displayMetrics.scaleIssues.forEach(issue => {
            criticalBottlenecks.push(`
                <div style="background: #2d1313; border-left: 4px solid #ff4444; padding: 8px 12px; margin-bottom: 6px; border-radius: 4px; font-size: 0.95em;">
                    ⚠️ <strong>Error de Transformación Crítico:</strong> ${issue}
                </div>
            `);
        });
    }

    // 1. Script redundancy & Controller/Manager pattern detection
    if (displayMetrics.scriptInstancesMap) {
        displayMetrics.scriptInstancesMap.forEach((materiaNames, scriptName) => {
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
    if (displayMetrics.drawCalls > 100) {
        advancedAdvices.push(`
            <div style="background: #2d1313; border-left: 4px solid #ff4444; padding: 10px; margin-bottom: 8px; border-radius: 4px;">
                <strong style="color: #ff4444; font-size: 1.05em;">⚠️ Llamadas de Dibujo Elevadas (Draw Calls: ${displayMetrics.drawCalls})</strong>
                <div style="margin-top: 4px; color: #ddd; font-size: 0.95em; line-height: 1.4;">
                    El número de elementos renderizados por separado está superando los límites recomendados de WebGL para navegadores móviles y laptops estándar.
                    <br><span style="color: #00ffcc;">Sugerencia de Optimización:</span> Agrupa tus sprites usando <strong>Hojas de Sprites (Sprite Sheets)</strong> o combina mallas estáticas 3D en un único prefab estático combinado. Activar el sistema de Batching reducirá drásticamente las comunicaciones CPU-GPU y evitará caídas severas de FPS.
                </div>
            </div>
        `);
    }

    // 3. Dynamic RAM growth rate warnings (Memory Leak heuristic)
    if (parseFloat(displayRamGrowth) > 1.5) {
        criticalBottlenecks.push(`
            <div style="background: #2d1313; border-left: 4px solid #ff4444; padding: 8px 12px; margin-bottom: 6px; border-radius: 4px; font-size: 0.95em;">
                🚨 <strong>Consumo Excesivo de RAM (+${displayRamGrowth} MB/s)</strong>: La tasa de asignación de memoria es críticamente alta. Esto suele indicar una <strong>fuga de memoria (Memory Leak)</strong> causada por instanciación repetitiva de objetos (por ejemplo, proyectiles o partículas) sin destruir, o almacenamiento de referencias en arrays globales acumulativos.
            </div>
        `);
    }

    // 4. Overlighting & Shader overload warnings
    if (displayMetrics.lightsCount > 8) {
        advancedAdvices.push(`
            <div style="background: #2b1f11; border-left: 4px solid #ff9900; padding: 10px; margin-bottom: 8px; border-radius: 4px;">
                <strong style="color: #ff9900; font-size: 1.05em;">💡 Exceso de Luces Dinámicas (${displayMetrics.lightsCount} activas)</strong>
                <div style="margin-top: 4px; color: #ddd; font-size: 0.95em; line-height: 1.4;">
                    El renderizado de múltiples luces dinámicas fuerza a WebGL a recalcular el sombreado de píxeles (Fragment Shader) de forma múltiple para cada objeto iluminado.
                    <br><span style="color: #00ffcc;">Sugerencia de Optimización:</span> Desactiva las luces que estén fuera del campo de visión de la cámara principal (Frustum Culling) o considera simular luces secundarias usando texturas de gradiente estáticas pre-diseñadas.
                </div>
            </div>
        `);
    }

    // 5. Static Colliders mutating transforms warning
    if (displayMetrics.collidersCount > 20 && displayMetrics.rigidbodiesCount < displayMetrics.collidersCount * 0.4) {
        advancedAdvices.push(`
            <div style="background: #17271e; border-left: 4px solid #00C851; padding: 10px; margin-bottom: 8px; border-radius: 4px;">
                <strong style="color: #00C851; font-size: 1.05em;">⚙️ Estructura del Árbol Físico (AABB Tree)</strong>
                <div style="margin-top: 4px; color: #ddd; font-size: 0.95em; line-height: 1.4;">
                    Tienes <strong>${displayMetrics.collidersCount} colisionadores</strong> activos y solo <strong>${displayMetrics.rigidbodiesCount} cuerpos físicos (Rigidbodies)</strong>.
                    <br><span style="color: #00ffcc;">Sugerencia de Buenas Prácticas:</span> Asegúrate de que los colisionadores estáticos permanezcan inmóviles. Mover un objeto con colisionador pero sin Rigidbody mediante scripts de transformación directa fuerza al motor físico a regenerar y recalcular el árbol espacial entero cada fotograma, consumiendo tiempo crítico de CPU. Usa componentes Rigidbody tipo <strong>Kinematic</strong> si los objetos deben moverse de forma procedural.
                </div>
            </div>
        `);
    }

    // UI and Canvas suggestions
    if (displayMetrics.uiElements > 40) {
        advancedAdvices.push(`
            <div style="background: #1e1e2d; border-left: 4px solid #00b4ff; padding: 10px; margin-bottom: 8px; border-radius: 4px;">
                <strong style="color: #00b4ff; font-size: 1.05em;">🖥️ Sobrecarga de Elementos UI (Canvas: ${displayMetrics.uiElements} activos)</strong>
                <div style="margin-top: 4px; color: #ddd; font-size: 0.95em; line-height: 1.4;">
                    Tienes muchos elementos de interfaz UI activos en el Canvas. Cada cambio de texto o posición de imagen fuerza al Canvas de la GPU a re-calcular sus polígonos y redibujarse (Batch Rebuild).
                    <br><span style="color: #00ffcc;">Sugerencia:</span> Desactiva paneles completos de UI que no estén en uso (<code>materia.isActive = false</code>) en lugar de esconderlos individualmente, de modo que queden excluidos del árbol de dibujo.
                </div>
            </div>
        `);
    }

    // Empty state fallback for advices
    if (advancedAdvices.length === 0 && criticalBottlenecks.length === 0) {
        advancedAdvices.push(`
            <div style="background: #17271e; border-left: 4px solid #00C851; padding: 10px; margin-bottom: 8px; border-radius: 4px; font-size: 0.95em; color: #00C851;">
                ✅ <strong>¡La escena se encuentra en un estado óptimo!</strong> No se han detectado redundancias de código, problemas de llamadas de dibujo WebGL, elementos de interfaz sobrecargados ni fugas de memoria evidentes. Todo funciona bajo los estándares más exigentes de rendimiento.
            </div>
        `);
    }

    // Build event logs
    let logsHtml = '';
    if (displayLogs.length === 0) {
        logsHtml = `<div style="color: #666; padding: 20px; text-align: center; font-size: 0.95em;">No hay eventos registrados en esta sesión. Los cambios en escena, colisiones y llamadas se verán reflejados aquí.</div>`;
    } else {
        logsHtml = `<table style="width: 100%; border-collapse: collapse; font-size: 0.9em; text-align: left;">`;
        displayLogs.forEach(log => {
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

    // Build audio items
    let audioItemsHtml = '';
    if (displayMetrics.playingAudios.length === 0) {
        audioItemsHtml = `<div style="color: #666; font-size: 0.9em; padding: 4px 0;">No hay fuentes de audio activas reproduciéndose.</div>`;
    } else {
        audioItemsHtml = displayMetrics.playingAudios.map(audio => `
            <div style="padding: 4px 6px; border-bottom: 1px solid #222; font-size: 0.9em; display: flex; justify-content: space-between;">
                <span style="color: #00ffcc; font-weight: bold;">🔊 ${audio.materiaName}</span>
                <span style="color: #ddd;">${audio.source} (Vol: ${audio.volume})</span>
                <span style="color: #888;">Bucle: ${audio.loop}</span>
            </div>
        `).join('');
    }

    // Build cameras list
    let camerasHtml = '';
    if (displayMetrics.cameras.length === 0) {
        camerasHtml = `<div style="color: #666; font-size: 0.9em; padding: 4px 0;">No se detectaron cámaras en la escena actual (usando cámara por defecto del editor).</div>`;
    } else {
        camerasHtml = displayMetrics.cameras.map(cam => `
            <div style="padding: 4px 6px; border-bottom: 1px solid #222; font-size: 0.9em; display: flex; justify-content: space-between;">
                <span style="color: #00b4ff; font-weight: bold;">📷 ${cam.materiaName}</span>
                <span style="color: #00ffcc;">${cam.active}</span>
                <span style="color: #aaa;">${cam.mode}</span>
            </div>
        `).join('');
    }

    // Build component stats list
    let componentStatsHtml = '';
    if (displayComponentStats.size === 0) {
        componentStatsHtml = `<div style="color: #666; font-size: 0.9em; padding: 4px 0;">Esperando ejecuciones de componentes en escena...</div>`;
    } else {
        componentStatsHtml = `<table style="width: 100%; border-collapse: collapse; font-size: 0.85em; text-align: left; font-family: monospace; color: #ddd;">
            <thead>
                <tr style="border-bottom: 1px solid #333; color: #888; font-weight: bold; height: 20px;">
                    <th style="padding: 2px;">Componente</th>
                    <th style="padding: 2px; text-align: right;">Llamados</th>
                    <th style="padding: 2px; text-align: right; color: #ff4444;">Errores</th>
                    <th style="padding: 2px; text-align: right;">T.Prom (ms)</th>
                    <th style="padding: 2px; text-align: right;">T.Máx (ms)</th>
                </tr>
            </thead>
            <tbody>`;
        displayComponentStats.forEach((stats, compName) => {
            const avgTime = stats.calls > 0 ? (stats.totalTime / stats.calls).toFixed(3) : '0.000';
            const maxTime = stats.maxTime.toFixed(3);
            const errColor = stats.errors > 0 ? '#ff4444' : '#00ffcc';
            componentStatsHtml += `
                <tr style="border-bottom: 1px solid #222; height: 20px;">
                    <td style="padding: 2px; color: #fff; font-weight: bold;">${compName}</td>
                    <td style="padding: 2px; text-align: right; color: #00b4ff;">${stats.calls}</td>
                    <td style="padding: 2px; text-align: right; color: ${errColor};">${stats.errors}</td>
                    <td style="padding: 2px; text-align: right; color: #ccc;">${avgTime} ms</td>
                    <td style="padding: 2px; text-align: right; color: #ffbb33; font-weight: bold;">${maxTime} ms</td>
                </tr>
            `;
        });
        componentStatsHtml += `</tbody></table>`;
    }

    // Build process attribution sparkline metrics
    let renderPct = 0, physicsPct = 0, scriptPct = 0;
    const rT = (window._PerformanceMetrics && window._PerformanceMetrics.lastRenderTime) || 0;
    const pT = (window._PerformanceMetrics && window._PerformanceMetrics.lastPhysicsTime) || 0;
    const sT = (window._PerformanceMetrics && window._PerformanceMetrics.lastScriptUpdateTime) || 0;
    const totalT = rT + pT + sT;

    if (totalT > 0) {
        renderPct = ((rT / totalT) * 100).toFixed(0);
        physicsPct = ((pT / totalT) * 100).toFixed(0);
        scriptPct = ((sT / totalT) * 100).toFixed(0);
    }

    // Render HTML Panel Structure
    container.innerHTML = `
        <div class="scene-monitor-panel" style="padding: 10px; display: flex; flex-direction: column; min-height: 100%; box-sizing: border-box; color: #fff; background: #1e1e1e; font-family: sans-serif;">
            <!-- Toolbar -->
            <div class="monitor-toolbar" style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid #333; margin-bottom: 8px; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                    <span style="font-size: 0.95em; color: #aaa; font-weight: bold;">📊 FPS: <span style="color: #00ffcc;">${displayFPS} FPS</span></span>
                    <span style="font-size: 0.95em; color: #aaa; font-weight: bold;">📈 RAM Growth: <span style="color: #00b4ff;">+${displayRamGrowth} MB/s</span></span>
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 0.85em; color: #888;">Historial:</span>
                        <select id="scene-session-select" style="background: #2d2d2d; border: 1px solid #444; color: #fff; border-radius: 4px; padding: 2px 6px; font-size: 0.85em; outline: none; cursor: pointer;">
                            <option value="-1" ${selectedSceneSessionIndex === -1 ? 'selected' : ''}>Sesión Activa (En Vivo)</option>
                            ${sessionOptions}
                        </select>
                    </div>
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

            <!-- Visual FPS Drop Timeline & Process Attribution Sparkline -->
            <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 15px; margin-bottom: 12px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                <div>
                    <div style="font-size: 0.85em; color: #aaa; font-weight: bold; margin-bottom: 6px;">📈 Gráfico de Estabilidad de FPS (Últimos 40 Fotogramas)</div>
                    <canvas id="fps-timeline-canvas" width="360" height="70" style="width: 100%; height: 70px; background: #000; border-radius: 4px; display: block; border: 1px solid rgba(255,255,255,0.05);"></canvas>
                </div>
                <div style="display: flex; flex-direction: column; justify-content: center; font-size: 0.85em;">
                    <div style="font-weight: bold; color: #aaa; margin-bottom: 6px;">⚙️ Atribución de Carga del Motor (Fotograma Actual)</div>
                    <!-- Sparkline Bar -->
                    <div style="display: flex; height: 16px; border-radius: 4px; overflow: hidden; background: #222; margin-bottom: 8px;">
                        <div style="width: ${renderPct}%; background: #e74c3c; height: 100%;" title="Renderizado: ${renderPct}%"></div>
                        <div style="width: ${physicsPct}%; background: #2ecc71; height: 100%;" title="Físicas: ${physicsPct}%"></div>
                        <div style="width: ${scriptPct}%; background: #f1c40f; height: 100%;" title="Scripts: ${scriptPct}%"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; font-size: 0.85em; font-family: monospace;">
                        <span style="color: #ff4d4d;">■ Render: ${rT.toFixed(1)}ms (${renderPct}%)</span>
                        <span style="color: #2ecc71;">■ Físicas: ${pT.toFixed(1)}ms (${physicsPct}%)</span>
                        <span style="color: #f1c40f;">■ Scripts: ${sT.toFixed(1)}ms (${scriptPct}%)</span>
                    </div>
                </div>
            </div>

            <!-- Bottlenecks Warning Panel -->
            ${criticalBottlenecks.length > 0 ? `<div style="margin-bottom: 10px;">${criticalBottlenecks.join('')}</div>` : ''}

            <!-- Main Live Telemetry Grid -->
            <div style="display: flex; gap: 12px; margin-bottom: 12px; font-size: 0.8em; flex-wrap: wrap;">
                <div style="flex: 1; min-width: 100px; background: #151515; padding: 6px; border-radius: 4px; text-align: center;">
                    <div style="color: #888; font-weight: bold;">Materias Totales</div>
                    <div style="font-size: 1.3em; color: #fff; font-weight: bold; margin-top: 4px;">${displayMetrics.totalMaterias}</div>
                </div>
                <div style="flex: 1; min-width: 100px; background: #151515; padding: 6px; border-radius: 4px; text-align: center;">
                    <div style="color: #888; font-weight: bold;">Colisionadores</div>
                    <div style="font-size: 1.3em; color: #00ffcc; font-weight: bold; margin-top: 4px;">${displayMetrics.collidersCount}</div>
                </div>
                <div style="flex: 1; min-width: 100px; background: #151515; padding: 6px; border-radius: 4px; text-align: center;">
                    <div style="color: #888; font-weight: bold;">Scripts Activos</div>
                    <div style="font-size: 1.3em; color: #ffbb33; font-weight: bold; margin-top: 4px;">${displayMetrics.scriptsCount}</div>
                </div>
                <div style="flex: 1; min-width: 100px; background: #151515; padding: 6px; border-radius: 4px; text-align: center;">
                    <div style="color: #888; font-weight: bold;">Draw Calls</div>
                    <div style="font-size: 1.3em; color: #00b4ff; font-weight: bold; margin-top: 4px;">${displayMetrics.drawCalls}</div>
                </div>
                <div style="flex: 1; min-width: 100px; background: #151515; padding: 6px; border-radius: 4px; text-align: center;">
                    <div style="color: #888; font-weight: bold;">Luces Dinámicas</div>
                    <div style="font-size: 1.3em; color: #ff4444; font-weight: bold; margin-top: 4px;">${displayMetrics.lightsCount}</div>
                </div>
                <div style="flex: 1; min-width: 100px; background: #151515; padding: 6px; border-radius: 4px; text-align: center;">
                    <div style="color: #888; font-weight: bold;">Elementos UI</div>
                    <div style="font-size: 1.3em; color: #e5c158; font-weight: bold; margin-top: 4px;">${displayMetrics.uiElements}</div>
                </div>
            </div>

            <!-- Content Area -->
            <div style="display: flex; gap: 15px; flex-wrap: wrap; margin-top: 10px;">
                <!-- Left Column: Diagnostic & Architectural suggestions -->
                <div style="flex: 1.2; min-width: 320px; background: #151515; padding: 10px; border-radius: 4px; border: 1px solid #333;">
                    <div style="font-size: 1em; font-weight: bold; color: #00e5ff; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px;">🔍 Sugerencias de Arquitectura y Diagnósticos Avanzados</div>
                    <div>
                        ${advancedAdvices.join('')}
                    </div>
                </div>

                <!-- Right Column: Live Scene Telemetry Logs & Subsystems details -->
                <div style="flex: 1; min-width: 300px; display: flex; flex-direction: column; gap: 15px;">
                    <!-- Top Right: Audio & Camera sources -->
                    <div style="background: #151515; padding: 10px; border-radius: 4px; border: 1px solid #333;">
                        <div>
                            <div style="font-size: 0.95em; font-weight: bold; color: #00b4ff; margin-bottom: 4px; border-bottom: 1px solid #222; padding-bottom: 2px;">📷 Cámaras en Escena</div>
                            ${camerasHtml}
                        </div>
                        <div style="margin-top: 10px;">
                            <div style="font-size: 0.95em; font-weight: bold; color: #00ffcc; margin-bottom: 4px; border-bottom: 1px solid #222; padding-bottom: 2px;">🔊 Reproducción de Audio Live</div>
                            ${audioItemsHtml}
                        </div>
                        <div style="margin-top: 15px;">
                            <div style="font-size: 0.95em; font-weight: bold; color: #ff00ff; margin-bottom: 4px; border-bottom: 1px solid #222; padding-bottom: 2px;">⚙️ Rendimiento y Llamadas de Componentes (Leyes)</div>
                            ${componentStatsHtml}
                        </div>
                    </div>

                    <!-- Bottom Right: Scene Events log -->
                    <div style="background: #151515; padding: 10px; border-radius: 4px; border: 1px solid #333;">
                        <div style="font-size: 1em; font-weight: bold; color: #ffbb33; margin-bottom: 8px; border-bottom: 1px solid #333; padding-bottom: 4px;">📋 Historial de Eventos de la Sesión</div>
                        <div>
                            ${logsHtml}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Draw the visual timeline canvas!
    const canvas = document.getElementById('fps-timeline-canvas');
    if (canvas) {
        let activeHistory = fpsHistory;
        if (selectedSceneSessionIndex !== -1 && sceneSessionHistory[selectedSceneSessionIndex]) {
            activeHistory = sceneSessionHistory[selectedSceneSessionIndex].fpsHistory;
        }
        drawFPSTimeline(canvas, activeHistory);
    }
}
