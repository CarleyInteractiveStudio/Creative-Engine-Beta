// --- Module for the Advanced Scene Diagnostics & Profiler (Monitor de Escena) ---

let dom;
let isInitialized = false;
let sessionLogs = []; // Stores event logs like collisions, creations, destructions, etc.
const componentStats = new Map(); // Tracks execution statistics for all components (Leyes)
const sceneSessionHistory = []; // Historical archived sessions
let selectedSceneSessionIndex = -1; // -1 means Active/Current Session
let wasGameRunning = false;
let isDetailedProfilingEnabled = false;
let inspectedFrame = null;
let lastUpdateTime = 0;

// Real-time FPS & CPU process profiling
const fpsHistory = []; // Array of last 40 frames: { fps, render, physics, script, totalCpu, frameIndex, attributedCause }
let isCurrentlyDropping = false;
let dropStartFrame = 0;
let frameCounter = 0;
let consecutiveDropFrames = 0;

// Cached DOM element references for 60 FPS performance optimization
let cachedCanvas = null;
let cachedFpsValEl = null;
let cachedRamValEl = null;

// Throttled tab state checking to prevent garbage collection and layout overhead on hot paths
let lastTabCheckTime = 0;
let cachedIsTabActive = false;

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
            inspectedFrame = null;
            forceFullRepopulate();
        } else if (e.target.id === 'btn-save-scene-monitor' || e.target.closest('#btn-save-scene-monitor')) {
            saveHistory();
        } else if (e.target.id === 'btn-close-inspect') {
            inspectedFrame = null;
            forceFullRepopulate();
        }
    });

    container.addEventListener('change', (e) => {
        if (e.target.id === 'scene-session-select') {
            selectedSceneSessionIndex = parseInt(e.target.value);
            inspectedFrame = null;
            forceFullRepopulate();
        } else if (e.target.id === 'chk-detailed-profiling') {
            isDetailedProfilingEnabled = e.target.checked;
            if (window.SceneMonitor) {
                window.SceneMonitor.isDetailedProfilingEnabled = isDetailedProfilingEnabled;
            }
        }
    });

    container.addEventListener('mousedown', (e) => {
        const canvas = document.getElementById('fps-timeline-canvas');
        if (canvas && e.target === canvas) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;

            let activeHistory = fpsHistory;
            if (selectedSceneSessionIndex !== -1 && sceneSessionHistory[selectedSceneSessionIndex]) {
                activeHistory = sceneSessionHistory[selectedSceneSessionIndex].fpsHistory;
            }

            if (activeHistory.length === 0) return;

            const maxItems = 40;
            const barWidth = rect.width / maxItems;

            // Limit to display count
            const displayCount = Math.min(maxItems, activeHistory.length);
            const historySlice = activeHistory.slice(-displayCount);

            const clickedIndex = Math.floor(mouseX / (rect.width / maxItems));
            if (clickedIndex >= 0 && clickedIndex < historySlice.length) {
                inspectedFrame = historySlice[clickedIndex];
                forceFullRepopulate();
            }
        }
    });
}

function forceFullRepopulate() {
    cachedCanvas = null;
    cachedFpsValEl = null;
    cachedRamValEl = null;
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
                const lang = (window.Localization && window.Localization.currentLanguage) || 'ES';
                let issueText = '';
                if (lang === 'EN') {
                    issueText = `Materia '${m.name}' (ID: ${m.id}) has a scale equal to zero in some axis, which prevents it from rendering and can break its physics calculations.`;
                } else if (lang === 'PT') {
                    issueText = `Materia '${m.name}' (ID: ${m.id}) tem escala igual a zero em algum eixo, o que impede a sua renderização e pode quebrar os cálculos de física.`;
                } else if (lang === 'RU') {
                    issueText = `Materia '${m.name}' (ID: ${m.id}) имеет масштаб, равный нулю по какой-либо оси, что препятствует ее рендерингу и может нарушить расчеты физики.`;
                } else if (lang === 'ZH') {
                    issueText = `Materia '${m.name}' (ID: ${m.id}) 的某个轴缩放为零，这将阻止其渲染并可能破坏其物理计算。`;
                } else {
                    issueText = `Materia '${m.name}' (ID: ${m.id}) tiene escala igual a cero en algún eje, lo que impide su renderizado y puede romper sus cálculos de física.`;
                }
                scaleIssues.push(issueText);
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
    const displayCount = Math.min(maxItems, history.length);
    const historySlice = history.slice(-displayCount);

    historySlice.forEach((data, index) => {
        const x = index * barWidth;
        const normalizedFPS = Math.min(60, data.fps);
        const barHeight = (normalizedFPS / 60) * h;
        const y = h - barHeight;

        const isInspected = inspectedFrame && inspectedFrame.frameIndex === data.frameIndex;
        const isDrop = data.fps < 40;

        if (isInspected) {
            ctx.fillStyle = '#ffeb3b'; // Highlight selected inspected frame in bright yellow
        } else {
            ctx.fillStyle = isDrop ? 'rgba(255, 68, 68, 0.85)' : 'rgba(0, 255, 204, 0.7)';
        }
        ctx.fillRect(x + 1, y, barWidth - 1, barHeight);

        if (isInspected) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 1, y, barWidth - 1, barHeight);
        }

        if (isDrop && index === historySlice.length - 1 && !inspectedFrame) {
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
    const now = performance.now();

    // --- 1. Frame-by-frame Performance & History Tracking (Run on EVERY frame) ---
    // (We do this regardless of which tab is active, to keep continuous history)
    let displayFPS = "---";
    let displayRamGrowth = ramGrowthRate;

    if (selectedSceneSessionIndex === -1) {
        // Measure RAM growth rate (Live View only)
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

        // Trace and record FPS drops & process attribution in the history
        if (window.isGameRunning) {
            frameCounter++;
            const renderT = (window._PerformanceMetrics && window._PerformanceMetrics.lastRenderTime) || 0;
            const physicsT = (window._PerformanceMetrics && window._PerformanceMetrics.lastPhysicsTime) || 0;
            const scriptT = (window._PerformanceMetrics && window._PerformanceMetrics.lastScriptUpdateTime) || 0;

            // Attribute direct cause
            const currentLang = (window.Localization && window.Localization.currentLanguage) || 'ES';
            let attributedCause = "Procesamiento de CPU";
            if (currentLang === 'EN') attributedCause = "CPU Processing";
            else if (currentLang === 'PT') attributedCause = "Processamento de CPU";
            else if (currentLang === 'RU') attributedCause = "Процессорная обработка";
            else if (currentLang === 'ZH') attributedCause = "CPU 处理";

            const leyesT = physicsT + scriptT;
            const maxTime = Math.max(renderT, leyesT);
            if (maxTime > 1.5) {
                if (maxTime === renderT) {
                    if (currentLang === 'EN') attributedCause = "WebGL/2D Rendering";
                    else if (currentLang === 'PT') attributedCause = "Renderização WebGL/2D";
                    else if (currentLang === 'RU') attributedCause = "Рендеринг WebGL/2D";
                    else if (currentLang === 'ZH') attributedCause = "WebGL/2D 渲染";
                    else attributedCause = "Renderizado WebGL/2D";
                } else {
                    if (currentLang === 'EN') attributedCause = "Components Execution (Leyes)";
                    else if (currentLang === 'PT') attributedCause = "Execução de Leis";
                    else if (currentLang === 'RU') attributedCause = "Исполнение компонентов (Leyes)";
                    else if (currentLang === 'ZH') attributedCause = "组件执行 (Leyes)";
                    else attributedCause = "Ejecución de Leyes";
                }
            }

            const metrics = window._PerformanceMetrics || {};
            fpsHistory.push({
                fps: fpsVal,
                render: renderT,
                physics: physicsT,
                script: scriptT,
                frameIndex: frameCounter,
                attributedCause: attributedCause,
                // Detailed metrics
                spritesDrawn: metrics.spritesDrawn || 0,
                texturesDrawn: metrics.texturesDrawn || 0,
                tilesDrawn: metrics.tilesDrawn || 0,
                lightsDrawn: metrics.lightsDrawn || 0,
                uiElementsDrawn: metrics.uiElementsDrawn || 0,
                scriptsRun: metrics.scriptsRun || 0,
                collisionsChecked: metrics.collisionsChecked || 0,
                detailedEnabled: isDetailedProfilingEnabled
            });

            if (fpsHistory.length > 50) {
                fpsHistory.shift();
            }

            // Real-time drop threshold detection (< 30 FPS indicates a major drop of 3+ bars)
            // Skip the first 20 frames of warmup to avoid false alarms immediately on game start!
            if (frameCounter > 20) {
                if (fpsVal < 30) {
                    consecutiveDropFrames++;
                    if (consecutiveDropFrames >= 25) { // Requires sustained drop (~5 intervals)
                        if (!isCurrentlyDropping) {
                            isCurrentlyDropping = true;
                            dropStartFrame = frameCounter - consecutiveDropFrames + 1;
                            logEvent('Caída FPS', `Se detectó una caída de rendimiento (${displayFPS} FPS) desde el fotograma ${dropStartFrame} (Duración: ${consecutiveDropFrames} fotogramas). Causa probable: ${attributedCause} (${maxTime.toFixed(1)}ms).`, 'error');
                        }
                    }
                } else {
                    if (isCurrentlyDropping && fpsVal > 45) { // recovered
                        logEvent('Caída FPS Terminado', `El rendimiento se estabilizó de nuevo a los ${displayFPS} FPS en el fotograma ${frameCounter} (Duración del drop: ${frameCounter - dropStartFrame} fotogramas).`, 'success');
                    }
                    consecutiveDropFrames = 0;
                    isCurrentlyDropping = false;
                }
            }
        }
    }

    // Keep lastFrameTime updated
    lastFrameTime = now;

    // --- 2. Throttled active tab checking to prevent GC and DOM overhead ---
    if (now - lastTabCheckTime > 500) {
        lastTabCheckTime = now;
        const activeTabBtn = document.querySelector('.tab-buttons .tab-btn.active');
        cachedIsTabActive = activeTabBtn && activeTabBtn.getAttribute('data-tab') === 'scene-monitor-content';
    }

    // Skip all DOM and rendering updates if the tab is not currently active
    if (!cachedIsTabActive) return;

    const container = document.getElementById('scene-monitor-content');
    if (!container) return;

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
        consecutiveDropFrames = 0;
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

    if (selectedSceneSessionIndex !== -1 && sceneSessionHistory[selectedSceneSessionIndex]) {
        const archived = sceneSessionHistory[selectedSceneSessionIndex];
        displayLogs = archived.logs;
        displayComponentStats = new Map(archived.componentStats);
        displayMetrics = archived.metrics;
        displayRamGrowth = archived.ramGrowth;
        displayFPS = archived.fps;
    }

    // Keep lastFrameTime updated
    lastFrameTime = now;

    // --- Real-time Canvas and Toolbar Text Redraw (On EVERY frame if playing) ---
    if (window.isGameRunning && selectedSceneSessionIndex === -1) {
        if (!cachedCanvas) cachedCanvas = document.getElementById('fps-timeline-canvas');
        if (cachedCanvas) {
            drawFPSTimeline(cachedCanvas, fpsHistory);
        }
        if (!cachedFpsValEl) cachedFpsValEl = document.getElementById('monitor-fps-val');
        if (cachedFpsValEl) cachedFpsValEl.textContent = `${displayFPS} FPS`;

        if (!cachedRamValEl) cachedRamValEl = document.getElementById('monitor-ram-val');
        if (cachedRamValEl) cachedRamValEl.textContent = `+${displayRamGrowth} MB/s`;
    }

    // --- DOM Rebuild Throttling (Throttled to 4 times per second) ---
    const isThrottled = (now - lastUpdateTime) < 250;
    if (isThrottled && container.innerHTML !== '') {
        // Draw timeline for static view / archived sessions
        if (!window.isGameRunning || selectedSceneSessionIndex !== -1) {
            if (!cachedCanvas) cachedCanvas = document.getElementById('fps-timeline-canvas');
            if (cachedCanvas) {
                let activeHistory = fpsHistory;
                if (selectedSceneSessionIndex !== -1 && sceneSessionHistory[selectedSceneSessionIndex]) {
                    activeHistory = sceneSessionHistory[selectedSceneSessionIndex].fpsHistory;
                }
                drawFPSTimeline(cachedCanvas, activeHistory);
            }
        }
        return;
    }
    lastUpdateTime = now;

    const L = window.Localization;

    if (!displayMetrics) return;

    // Diagnostics & Optimization Heuristics
    const advancedAdvices = [];
    const criticalBottlenecks = [];

    // Scale Bugs Detection
    if (displayMetrics.scaleIssues && displayMetrics.scaleIssues.length > 0) {
        const lang = (window.Localization && window.Localization.currentLanguage) || 'ES';
        let errorTitle = 'Error de Transformación Crítico:';
        if (lang === 'EN') errorTitle = 'Critical Transform Error:';
        else if (lang === 'PT') errorTitle = 'Erro de Transformação Crítico:';
        else if (lang === 'RU') errorTitle = 'Критическая ошибка трансформации:';
        else if (lang === 'ZH') errorTitle = '关键变换错误：';

        displayMetrics.scaleIssues.forEach(issue => {
            criticalBottlenecks.push(`
                <div style="background: #2d1313; border-left: 4px solid #ff4444; padding: 8px 12px; margin-bottom: 6px; border-radius: 4px; font-size: 0.95em;">
                    ⚠️ <strong>${errorTitle}</strong> ${issue}
                </div>
            `);
        });
    }

    const lang = (window.Localization && window.Localization.currentLanguage) || 'ES';

    // 1. Script redundancy & Controller/Manager pattern detection
    if (displayMetrics.scriptInstancesMap) {
        displayMetrics.scriptInstancesMap.forEach((materiaNames, scriptName) => {
            if (materiaNames.length >= 6) {
                let title = '';
                let body = '';
                if (lang === 'EN') {
                    title = `📦 Script Redundancy Detected: "${scriptName}"`;
                    body = `There are <strong>${materiaNames.length} independent objects</strong> executing the script <code>${scriptName}</code> in their individual update() loop.
                            <br><span style="color: #00ffcc;">Architectural Suggestion:</span> Consider using the <strong>Controller / Manager</strong> pattern: create a single central empty Materia with a single controller script that keeps an array with references to all these objects and moves or updates them within a single loop. This reduces execution overhead in the engine's Javascript thread from <strong>O(N)</strong> lifecycle calls to <strong>O(1)</strong> calls, substantially improving FPS.`;
                } else if (lang === 'PT') {
                    title = `📦 Redundância de Script Detectada: "${scriptName}"`;
                    body = `Existem <strong>${materiaNames.length} objetos independentes</strong> executando o script <code>${scriptName}</code> em seu loop update() individual.
                            <br><span style="color: #00ffcc;">Sugestão de Arquitetura:</span> Considere usar o padrão <strong>Controller / Manager</strong>: crie uma única Materia vazia central com um único script controlador que mantenha uma matriz com a referência a todos esses objetos e os mova ou atualize dentro de um único loop. Isso reduz o overhead no thread de execução de Javascript do motor de <strong>O(N)</strong> chamadas de ciclo de vida para <strong>O(1)</strong> chamadas, melhorando substancialmente os FPS.`;
                } else if (lang === 'RU') {
                    title = `📦 Обнаружена избыточность скрипта: "${scriptName}"`;
                    body = `Существует <strong>${materiaNames.length} независимых объектов</strong>, выполняющих скрипт <code>${scriptName}</code> в своем индивидуальном цикле update().
                            <br><span style="color: #00ffcc;">Архитектурное предложение:</span> Подумайте об использовании паттерна <strong>Controller / Manager</strong>: создайте одну центральную пустую Материю с одним управляющим скриптом, который хранит массив со ссылками на все эти объекты и перемещает или обновляет их в рамках одного цикла. Это снизит накладные расходы в потоке выполнения Javascript движка с <strong>O(N)</strong> вызовов жизненного цикла до <strong>O(1)</strong> вызовов, существенно повысив FPS.`;
                } else if (lang === 'ZH') {
                    title = `📦 检测到脚本冗余："${scriptName}"`;
                    body = `有 <strong>${materiaNames.length} 个独立对象</strong> 在其各自的 update() 循环中运行脚本 <code>${scriptName}</code>。
                            <br><span style="color: #00ffcc;">架构建议：</span> 考虑使用 <strong>Controller / Manager（控制器/管理器）</strong> 模式：创建一个单一的中央空 Materia，使用单个控制脚本，保留包含对所有这些对象的引用的数组，并在单个循环中移动或更新它们。这将使引擎 Javascript 执行线程中的开销从 <strong>O(N)</strong> 生命周期调用减少到 <strong>O(1)</strong> 调用，从而大幅提升 FPS。`;
                } else {
                    title = `📦 Redundancia de Script Detectada: "${scriptName}"`;
                    body = `Hay <strong>${materiaNames.length} objetos independientes</strong> ejecutando el script <code>${scriptName}</code> en su bucle update() individual.
                            <br><span style="color: #00ffcc;">Sugerencia de Arquitectura:</span> Considera usar el patrón <strong>Controller / Manager</strong>: crea una única Materia vacía central con un solo script controlador que mantenga un array con la referencia a todos estos objetos y los mueva o actualice dentro de un único bucle. Esto reduce el overhead en el hilo de ejecución de Javascript del motor de <strong>O(N)</strong> llamadas de ciclo de vida a <strong>O(1)</strong> llamadas, mejorando sustancialmente los FPS.`;
                }

                advancedAdvices.push(`
                    <div style="background: #2b1f11; border-left: 4px solid #ffaa00; padding: 10px; margin-bottom: 8px; border-radius: 4px;">
                        <strong style="color: #ffaa00; font-size: 1.05em;">${title}</strong>
                        <div style="margin-top: 4px; color: #ddd; font-size: 0.95em; line-height: 1.4;">
                            ${body}
                        </div>
                    </div>
                `);
            }
        });
    }

    // 2. High Draw Calls & Batching advice
    if (displayMetrics.drawCalls > 100) {
        let title = '';
        let body = '';
        if (lang === 'EN') {
            title = `⚠️ High Draw Calls (Draw Calls: ${displayMetrics.drawCalls})`;
            body = `The number of elements rendered separately is exceeding the recommended WebGL limits for mobile browsers and standard laptops.
                    <br><span style="color: #00ffcc;">Optimization Suggestion:</span> Group your sprites using <strong>Sprite Sheets</strong> or combine static 3D meshes into a single combined static prefab. Activating the Batching system will drastically reduce CPU-GPU communications and prevent severe FPS drops.`;
        } else if (lang === 'PT') {
            title = `⚠️ Altas Chamadas de Desenho (Draw Calls: ${displayMetrics.drawCalls})`;
            body = `O número de elementos renderizados separadamente está excedendo os limites recomendados do WebGL para navegadores móveis e laptops padrão.
                    <br><span style="color: #00ffcc;">Sugestão de Otimização:</span> Agrupe seus sprites usando <strong>Sprite Sheets (Folhas de Sprites)</strong> ou combine malhas 3D estáticas em um único prefab estático combinado. A ativação do sistema de Batching reduzirá drasticamente as comunicações CPU-GPU e evitará quedas severas de FPS.`;
        } else if (lang === 'RU') {
            title = `⚠️ Высокое число вызовов отрисовки (Draw Calls: ${displayMetrics.drawCalls})`;
            body = `Количество элементов, рендеримых отдельно, превышает рекомендуемые лимиты WebGL для мобильных браузеров и стандартных ноутбуков.
                    <br><span style="color: #00ffcc;">Предложение по оптимизации:</span> Группируйте спрайты с помощью <strong>атласов спрайтов (Sprite Sheets)</strong> или объединяйте статические 3D-меши в один комбинированный статический префаб. Активация пакетной отрисовки (Batching) резко сократит обмен данными между CPU и GPU и предотвратит серьезные падения FPS.`;
        } else if (lang === 'ZH') {
            title = `⚠️ 绘制调用过高 (Draw Calls: ${displayMetrics.drawCalls})`;
            body = `单独渲染的元素数量正超出移动浏览器和标准笔记本电脑推荐 de WebGL 限制。
                    <br><span style="color: #00ffcc;">优化建议：</span> 使用 <strong>精灵图 (Sprite Sheets)</strong> 分组您的精灵，或将静态 3D 网格合并为单个组合静态预制件。激活批处理 (Batching) 系统将彻底减少 CPU 与 GPU 的通信，并防止严重的 FPS 下降。`;
        } else {
            title = `⚠️ Llamadas de Dibujo Elevadas (Draw Calls: ${displayMetrics.drawCalls})`;
            body = `El número de elementos renderizados por separado está superando los límites recomendados de WebGL para navegadores móviles y laptops estándar.
                    <br><span style="color: #00ffcc;">Sugerencia de Optimización:</span> Agrupa tus sprites usando <strong>Hojas de Sprites (Sprite Sheets)</strong> o combina mallas estáticas 3D en un único prefab estático combinado. Activar el sistema de Batching reducirá drásticamente las comunicaciones CPU-GPU y evitará caídas severas de FPS.`;
        }

        advancedAdvices.push(`
            <div style="background: #2d1313; border-left: 4px solid #ff4444; padding: 10px; margin-bottom: 8px; border-radius: 4px;">
                <strong style="color: #ff4444; font-size: 1.05em;">${title}</strong>
                <div style="margin-top: 4px; color: #ddd; font-size: 0.95em; line-height: 1.4;">
                    ${body}
                </div>
            </div>
        `);
    }

    // 3. Dynamic RAM growth rate warnings (Memory Leak heuristic)
    if (parseFloat(displayRamGrowth) > 1.5) {
        let warningText = '';
        if (lang === 'EN') {
            warningText = `🚨 <strong>Excessive RAM Consumption (+${displayRamGrowth} MB/s)</strong>: The memory allocation rate is critically high. This usually indicates a <strong>memory leak (Memory Leak)</strong> caused by repetitive instantiation of objects (e.g., projectiles or particles) without destroying them, or storing references in cumulative global arrays.`;
        } else if (lang === 'PT') {
            warningText = `🚨 <strong>Consumo Excessivo de RAM (+${displayRamGrowth} MB/s)</strong>: A taxa de alocação de memória está criticamente alta. Isso geralmente indica um <strong>vazamento de memória (Memory Leak)</strong> causado pela instanciação repetitiva de objetos (por exemplo, projéteis ou partículas) sem destruí-los, ou armazenamento de referências em arrays globais acumulativos.`;
        } else if (lang === 'RU') {
            warningText = `🚨 <strong>Чрезмерное потребление оперативной памяти (+${displayRamGrowth} МБ/с)</strong>: Скорость выделения памяти критически высока. Обычно это указывает на <strong>утечку памяти (Memory Leak)</strong>, вызванную повторяющимся созданием объектов (например, снарядов или частиц) без их уничтожения или сохранением ссылок в глобальных массивах.`;
        } else if (lang === 'ZH') {
            warningText = `🚨 <strong>内存消耗过高 (+${displayRamGrowth} MB/s)</strong>: 内存分配率极高。这通常表示存在<strong>内存泄漏 (Memory Leak)</strong>，可能是由于重复实例化对象 (例如子弹或粒子) 而未销毁，或者在全局数组中累积存储了引用。`;
        } else {
            warningText = `🚨 <strong>Consumo Excesivo de RAM (+${displayRamGrowth} MB/s)</strong>: La tasa de asignación de memoria es críticamente alta. Esto suele indicar una <strong>fuga de memoria (Memory Leak)</strong> causada por instanciación repetitiva de objetos (por ejemplo, proyectiles o partículas) sin destruir, o almacenamiento de referencias en arrays globales acumulativos.`;
        }
        criticalBottlenecks.push(`
            <div style="background: #2d1313; border-left: 4px solid #ff4444; padding: 8px 12px; margin-bottom: 6px; border-radius: 4px; font-size: 0.95em;">
                ${warningText}
            </div>
        `);
    }

    // 4. Overlighting & Shader overload warnings
    if (displayMetrics.lightsCount > 8) {
        let title = '';
        let body = '';
        if (lang === 'EN') {
            title = `💡 Excess of Dynamic Lights (${displayMetrics.lightsCount} active)`;
            body = `Rendering multiple dynamic lights forces WebGL to recalculate pixel shading (Fragment Shader) multiple times for each illuminated object.
                    <br><span style="color: #00ffcc;">Optimization Suggestion:</span> Disable lights that are outside the field of view of the main camera (Frustum Culling) or consider simulating secondary lights using pre-designed static gradient textures.`;
        } else if (lang === 'PT') {
            title = `💡 Excesso de Luzes Dinâmicas (${displayMetrics.lightsCount} ativas)`;
            body = `A renderização de várias luzes dinâmicas força o WebGL a recalcular o sombreamento de pixels (Fragment Shader) várias vezes para cada objeto iluminado.
                    <br><span style="color: #00ffcc;">Sugestão de Otimização:</span> Desative as luzes que estão fora do campo de visão da câmera principal (Frustum Culling) ou considere simular luzes secundárias usando texturas de gradiente estático pré-desenhadas.`;
        } else if (lang === 'RU') {
            title = `💡 Избыток динамических источников света (${displayMetrics.lightsCount} активных)`;
            body = `Рендеринг нескольких динамических источников света заставляет WebGL многократно пересчитывать пиксельное затенение (Fragment Shader) для каждого освещенного объекта.
                    <br><span style="color: #00ffcc;">Предложение по оптимизации:</span> Отключите источники света, находящиеся вне поля зрения основной камеры (Frustum Culling), или рассмотрите возможность имитации вторичного освещения с помощью предварительно созданных статических текстур градиента.`;
        } else if (lang === 'ZH') {
            title = `💡 动态光源过多 (当前激活 ${displayMetrics.lightsCount} 个)`;
            body = `渲染多个动态光源会迫使 WebGL 为每个受光照物体多次重新计算像素着色 (Fragment Shader)。
                    <br><span style="color: #00ffcc;">优化建议：</span> 禁用主摄像机视野之外的光源 (Frustum Culling)，或考虑使用预先设计的静态渐变纹理来模拟辅助光源。`;
        } else {
            title = `💡 Exceso de Luces Dinámicas (${displayMetrics.lightsCount} activas)`;
            body = `El renderizado de múltiples luces dinámicas fuerza a WebGL a recalcular el sombreado de píxeles (Fragment Shader) de forma múltiple para cada objeto iluminado.
                    <br><span style="color: #00ffcc;">Sugerencia de Optimización:</span> Desactiva las luces que estén fuera del campo de visión de la cámara principal (Frustum Culling) o considera simular luces secundarias usando texturas de gradiente estáticas pre-diseñadas.`;
        }

        advancedAdvices.push(`
            <div style="background: #2b1f11; border-left: 4px solid #ff9900; padding: 10px; margin-bottom: 8px; border-radius: 4px;">
                <strong style="color: #ff9900; font-size: 1.05em;">${title}</strong>
                <div style="margin-top: 4px; color: #ddd; font-size: 0.95em; line-height: 1.4;">
                    ${body}
                </div>
            </div>
        `);
    }

    // 5. Static Colliders mutating transforms warning
    if (displayMetrics.collidersCount > 20 && displayMetrics.rigidbodiesCount < displayMetrics.collidersCount * 0.4) {
        let title = '';
        let body = '';
        if (lang === 'EN') {
            title = `⚙️ Physical Tree Structure (AABB Tree)`;
            body = `You have <strong>${displayMetrics.collidersCount} active colliders</strong> and only <strong>${displayMetrics.rigidbodiesCount} physical bodies (Rigidbodies)</strong>.
                    <br><span style="color: #00ffcc;">Best Practices Suggestion:</span> Make sure static colliders remain motionless. Moving an object with a collider but without a Rigidbody using direct transform scripts forces the physics engine to regenerate and recalculate the entire spatial tree every frame, consuming critical CPU time. Use <strong>Kinematic</strong> Rigidbody components if objects must move procedurally.`;
        } else if (lang === 'PT') {
            title = `⚙️ Estrutura da Árvore Física (Árvore AABB)`;
            body = `Você tem <strong>${displayMetrics.collidersCount} colididores</strong> ativos e apenas <strong>${displayMetrics.rigidbodiesCount} corpos físicos (Rigidbodies)</strong>.
                    <br><span style="color: #00ffcc;">Sugestão de Boas Práticas:</span> Certifique-se de que os colididores estáticos permaneçam imóveis. Mover un objeto com colididor mas sem Rigidbody através de scripts de transformação direta força o motor de física a regenerar e recalcular a árvore espacial inteira a cada frame, consumindo tempo crítico de CPU. Use componentes Rigidbody tipo <strong>Kinematic</strong> se os objetos devem se mover de forma procedural.`;
        } else if (lang === 'RU') {
            title = `⚙️ Структура физического дерева (AABB Tree)`;
            body = `У вас есть <strong>${displayMetrics.collidersCount} активных коллайдеров</strong> и только <strong>${displayMetrics.rigidbodiesCount} физических тел (Rigidbodies)</strong>.
                    <br><span style="color: #00ffcc;">Рекомендация:</span> Убедитесь, что статические коллайдеры остаются неподвижными. Перемещение объекта с коллайдером, но без Rigidbody с помощью прямых скриптов трансформации заставляет физический движок перестраивать и пересчитывать все пространственное дерево каждый кадр, расходуя драгоценное время процессора. Используйте компоненты Rigidbody типа <strong>Kinematic</strong>, если объекты должны перемещаться процедурно.`;
        } else if (lang === 'ZH') {
            title = `⚙️ 物理树结构 (AABB Tree)`;
            body = `您当前激活了 <strong>${displayMetrics.collidersCount} 个碰撞体</strong>，而只有 <strong>${displayMetrics.rigidbodiesCount} 个刚体 (Rigidbodies)</strong>。
                    <br><span style="color: #00ffcc;">最佳实践建议：</span> 确保静态碰撞体保持静止。使用直接变换脚本移动带有碰撞体但没有刚体的物体，会迫使物理引擎在每帧重新生成和重新计算整个空间树，从而消耗关键的 CPU 时间。如果物体必须以程序化方式移动，请使用 <strong>Kinematic</strong> 类型的刚体组件。`;
        } else {
            title = `⚙️ Estructura del Árbol Físico (AABB Tree)`;
            body = `Tienes <strong>${displayMetrics.collidersCount} colisionadores</strong> activos y solo <strong>${displayMetrics.rigidbodiesCount} cuerpos físicos (Rigidbodies)</strong>.
                    <br><span style="color: #00ffcc;">Sugerencia de Buenas Prácticas:</span> Asegúrate de que los colisionadores estáticos permanezcan inmóviles. Mover un objeto con colisionador pero sin Rigidbody mediante scripts de transformación directa fuerza al motor físico a regenerar y recalcular el árbol espacial entero cada fotograma, consumiendo tiempo crítico de CPU. Usa componentes Rigidbody tipo <strong>Kinematic</strong> si los objetos deben moverse de forma procedural.`;
        }

        advancedAdvices.push(`
            <div style="background: #17271e; border-left: 4px solid #00C851; padding: 10px; margin-bottom: 8px; border-radius: 4px;">
                <strong style="color: #00C851; font-size: 1.05em;">${title}</strong>
                <div style="margin-top: 4px; color: #ddd; font-size: 0.95em; line-height: 1.4;">
                    ${body}
                </div>
            </div>
        `);
    }

    // UI and Canvas suggestions
    if (displayMetrics.uiElements > 40) {
        let title = '';
        let body = '';
        if (lang === 'EN') {
            title = `🖥️ UI Elements Overload (Canvas: ${displayMetrics.uiElements} active)`;
            body = `You have many active UI interface elements on the Canvas. Each text change or image position change forces the GPU Canvas to recalculate its polygons and redraw (Batch Rebuild).
                    <br><span style="color: #00ffcc;">Suggestion:</span> Disable entire UI panels that are not in use (<code>materia.isActive = false</code>) instead of hiding them individually, so they are excluded from the draw tree.`;
        } else if (lang === 'PT') {
            title = `🖥️ Sobrecarga de Elementos de UI (Canvas: ${displayMetrics.uiElements} ativos)`;
            body = `Você tem muitos elementos de interface de UI ativos no Canvas. Cada mudança de texto ou posição de imagem força o Canvas da GPU a recalcular seus polígonos e se redesenhar (Batch Rebuild).
                    <br><span style="color: #00ffcc;">Sugestão:</span> Desative painéis inteiros de UI que não estejam em uso (<code>materia.isActive = false</code>) em vez de ocultá-los individualmente, para que sejam excluídos da árvore de desenho.`;
        } else if (lang === 'RU') {
            title = `🖥️ Перегрузка элементов интерфейса (Canvas: ${displayMetrics.uiElements} активных)`;
            body = `У вас много активных элементов интерфейса на Canvas. Каждое изменение текста или положения изображения заставляет GPU Canvas пересчитывать полигоны и перерисовываться (Batch Rebuild).
                    <br><span style="color: #00ffcc;">Рекомендация:</span> Отключайте панели пользовательского интерфейса целиком, когда они не используются (<code>materia.isActive = false</code>), вместо того чтобы скрывать их по отдельности, чтобы они полностью исключались из дерева отрисовки.`;
        } else if (lang === 'ZH') {
            title = `🖥️ UI 元素过载 (当前激活了 ${displayMetrics.uiElements} 个 Canvas)`;
            body = `您在 Canvas 上激活了许多 UI 界面元素。每次文本更改或图像位置更改都会迫使 GPU Canvas 重新计算其多边形并重新绘制 (Batch Rebuild)。
                    <br><span style="color: #00ffcc;">建议：</span> 禁用不使用的整个 UI 面板 (<code>materia.isActive = false</code>)，而不是单独隐藏它们，从而将它们排除在绘制树之外。`;
        } else {
            title = `🖥️ Sobrecarga de Elementos UI (Canvas: ${displayMetrics.uiElements} activos)`;
            body = `Tienes muchos elementos de interfaz UI activos en el Canvas. Cada cambio de texto o posición de imagen fuerza al Canvas de la GPU a re-calcular sus polígonos y redibujarse (Batch Rebuild).
                    <br><span style="color: #00ffcc;">Sugerencia:</span> Desactiva paneles completos de UI que no estén en uso (<code>materia.isActive = false</code>) en lugar de esconderlos individualmente, de modo que queden excluidos del árbol de dibujo.`;
        }

        advancedAdvices.push(`
            <div style="background: #1e1e2d; border-left: 4px solid #00b4ff; padding: 10px; margin-bottom: 8px; border-radius: 4px;">
                <strong style="color: #00b4ff; font-size: 1.05em;">${title}</strong>
                <div style="margin-top: 4px; color: #ddd; font-size: 0.95em; line-height: 1.4;">
                    ${body}
                </div>
            </div>
        `);
    }

    // Empty state fallback for advices
    if (advancedAdvices.length === 0 && criticalBottlenecks.length === 0) {
        let title = '';
        let body = '';
        if (lang === 'EN') {
            title = `✅ The scene is in an optimal state!`;
            body = `No code redundancies, WebGL draw call issues, overloaded interface elements, or obvious memory leaks have been detected. Everything runs under the highest performance standards.`;
        } else if (lang === 'PT') {
            title = `✅ A cena está em um estado ideal!`;
            body = `Nenhuma redundância de código, problemas de chamada de desenho do WebGL, elementos de interface sobrecarregados ou vazamentos óbvios de memória foram detectados. Tudo funciona sob os mais altos padrões de desempenho.`;
        } else if (lang === 'RU') {
            title = `✅ Сцена находится в оптимальном состоянии!`;
            body = `Не обнаружено избыточности кода, проблем с вызовами отрисовки WebGL, перегруженных элементов интерфейса или явных утечек памяти. Все работает в соответствии с высочайшими стандартами производительности.`;
        } else if (lang === 'ZH') {
            title = `✅ 场景处于最佳状态！`;
            body = `未检测到代码冗余、WebGL 绘制调用问题、过载的界面元素或明显的内存泄漏。一切都在最高性能标准下运行。`;
        } else {
            title = `✅ ¡La escena se encuentra en un estado óptimo!`;
            body = `No se han detectado redundancias de código, problemas de llamadas de dibujo WebGL, elementos de interfaz sobrecargados ni fugas de memoria evidentes. Todo funciona bajo los estándares más exigentes de rendimiento.`;
        }

        advancedAdvices.push(`
            <div style="background: #17271e; border-left: 4px solid #00C851; padding: 10px; margin-bottom: 8px; border-radius: 4px; font-size: 0.95em; color: #00C851;">
                <strong>${title}</strong> ${body}
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
        let headerComponent = "Componente";
        let headerCalls = "Llamados";
        let headerErrors = "Errores";
        let headerAvg = "T.Prom (ms)";
        let headerMax = "T.Máx (ms)";
        if (lang === 'EN') {
            headerComponent = "Component";
            headerCalls = "Calls";
            headerErrors = "Errors";
            headerAvg = "Avg (ms)";
            headerMax = "Max (ms)";
        } else if (lang === 'PT') {
            headerComponent = "Componente";
            headerCalls = "Chamados";
            headerErrors = "Erros";
            headerAvg = "Média (ms)";
            headerMax = "Máx (ms)";
        } else if (lang === 'RU') {
            headerComponent = "Компонент";
            headerCalls = "Вызовы";
            headerErrors = "Ошибки";
            headerAvg = "Ср. (мс)";
            headerMax = "Макс. (мс)";
        } else if (lang === 'ZH') {
            headerComponent = "组件 / 脚本";
            headerCalls = "调用次数";
            headerErrors = "错误数";
            headerAvg = "平均值 (ms)";
            headerMax = "最大值 (ms)";
        }

        componentStatsHtml = `<table style="width: 100%; border-collapse: collapse; font-size: 0.85em; text-align: left; font-family: monospace; color: #ddd;">
            <thead>
                <tr style="border-bottom: 1px solid #333; color: #888; font-weight: bold; height: 20px;">
                    <th style="padding: 2px;">${headerComponent}</th>
                    <th style="padding: 2px; text-align: right;">${headerCalls}</th>
                    <th style="padding: 2px; text-align: right; color: #ff4444;">${headerErrors}</th>
                    <th style="padding: 2px; text-align: right;">${headerAvg}</th>
                    <th style="padding: 2px; text-align: right;">${headerMax}</th>
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
    let renderPct = 0, leyesPct = 0;
    const rT = (window._PerformanceMetrics && window._PerformanceMetrics.lastRenderTime) || 0;
    const pT = (window._PerformanceMetrics && window._PerformanceMetrics.lastPhysicsTime) || 0;
    const sT = (window._PerformanceMetrics && window._PerformanceMetrics.lastScriptUpdateTime) || 0;
    const leyesT = pT + sT;
    const totalT = rT + leyesT;

    if (totalT > 0) {
        renderPct = ((rT / totalT) * 100).toFixed(0);
        leyesPct = ((leyesT / totalT) * 100).toFixed(0);
    }

    let inspectedFrameHtml = '';
    if (inspectedFrame) {
        const inf = inspectedFrame;
        const leyesInfT = inf.physics + inf.script;
        const hasDetails = inf.detailedEnabled;

        let labelSpeed = "Velocidad:";
        let labelMainLoad = "Carga Principal:";
        let labelRenderTime = "Tiempo Render:";
        let labelLeyesTime = "Tiempo Leyes:";
        let closeInspectText = "Cerrar Inspección";
        let detailTitle = "Detalle del Fotograma Inspeccionado";
        let detailPlaceholder = "El perfilado detallado estaba desactivado para este fotograma. Activa \"Perfilado Detallado\" arriba a la izquierda para capturar conteo exacto de sprites, scripts, luces y colisiones en futuros fotogramas.";

        if (lang === 'EN') {
            labelSpeed = "Speed:";
            labelMainLoad = "Main Load:";
            labelRenderTime = "Render Time:";
            labelLeyesTime = "Laws Time:";
            closeInspectText = "Close Inspection";
            detailTitle = "Inspected Frame Details";
            detailPlaceholder = "Detailed profiling was disabled for this frame. Check \"Detailed Profiling\" on the top left to capture exact sprite, script, light and collision metrics on future frames.";
        } else if (lang === 'PT') {
            labelSpeed = "Velocidade:";
            labelMainLoad = "Carga Principal:";
            labelRenderTime = "Tempo Render:";
            labelLeyesTime = "Tempo Leis:";
            closeInspectText = "Fechar Inspeção";
            detailTitle = "Detalhe do Fotograma Inspecionado";
            detailPlaceholder = "O perfilamento detalhado estava desativado para este fotograma. Ative \"Perfilamento Detalhado\" no canto superior esquerdo para capturar a contagem exata de sprites, scripts, luzes e colisões em futuros fotogramas.";
        } else if (lang === 'RU') {
            labelSpeed = "Скорость:";
            labelMainLoad = "Осн. Нагрузка:";
            labelRenderTime = "Время рендера:";
            labelLeyesTime = "Время законов (Leyes):";
            closeInspectText = "Закрыть Просмотр";
            detailTitle = "Детали инспектируемого кадра";
            detailPlaceholder = "Подробное профилирование было отключено для этого кадра. Включите \"Детальный Профиль\" вверху слева, чтобы собирать точную статистику спрайтов, скриптов, источников света и столкновений.";
        } else if (lang === 'ZH') {
            labelSpeed = "速度:";
            labelMainLoad = "主要负载:";
            labelRenderTime = "渲染时间:";
            labelLeyesTime = "组件/脚本时间 (Leyes):";
            closeInspectText = "关闭监视";
            detailTitle = "已检查帧详情";
            detailPlaceholder = "此帧已禁用详细剖析。请勾选左上角的“详细剖析”以捕获未来帧中的精确精灵、脚本、光源及碰撞数。";
        }

        inspectedFrameHtml = `
            <div style="background: #2b2b11; border: 1px solid #ffeb3b; padding: 12px; margin-bottom: 12px; border-radius: 6px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong style="color: #ffeb3b; font-size: 1.1em;">🔍 ${detailTitle} #${inf.frameIndex}</strong>
                    <button id="btn-close-inspect" style="background: #222; border: 1px solid #555; color: #fff; border-radius: 3px; padding: 2px 8px; cursor: pointer; font-size: 0.85em;">${closeInspectText}</button>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; font-size: 0.9em; line-height: 1.4;">
                    <div>
                        <span style="color: #888;">${labelSpeed}</span> <strong style="color: #00ffcc;">${inf.fps.toFixed(1)} FPS</strong>
                    </div>
                    <div>
                        <span style="color: #888;">${labelMainLoad}</span> <strong style="color: #ffaa00;">${inf.attributedCause}</strong>
                    </div>
                    <div>
                        <span style="color: #888;">${labelRenderTime}</span> <strong style="color: #ff4d4d;">${inf.render.toFixed(2)} ms</strong>
                    </div>
                    <div>
                        <span style="color: #888;">${labelLeyesTime}</span> <strong style="color: #2ecc71;">${leyesInfT.toFixed(2)} ms</strong>
                    </div>
                </div>
                <div style="border-top: 1px solid rgba(255,255,255,0.08); margin-top: 8px; padding-top: 8px; font-size: 0.85em;">
                    ${hasDetails ? `
                        <div style="display: flex; gap: 15px; flex-wrap: wrap; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 4px;">
                            ${inf.spritesDrawn > 0 ? `<div style="flex: 1; min-width: 120px;">🖼️ <strong style="color: #00b4ff;">${lang === 'EN' ? 'Sprites Drawn' : lang === 'PT' ? 'Sprites Desenhados' : lang === 'RU' ? 'Спрайтов нарисовано' : lang === 'ZH' ? '绘制精灵数' : 'Sprites Dibujados'}:</strong> ${inf.spritesDrawn}</div>` : ''}
                            ${inf.texturesDrawn > 0 ? `<div style="flex: 1; min-width: 120px;">🎨 <strong style="color: #ff6b6b;">${lang === 'EN' ? 'Textures/Shapes' : lang === 'PT' ? 'Texturas/Formas' : lang === 'RU' ? 'Текстур/Форм' : lang === 'ZH' ? '纹理/形状数' : 'Texturas/Formas'}:</strong> ${inf.texturesDrawn}</div>` : ''}
                            ${inf.tilesDrawn > 0 ? `<div style="flex: 1; min-width: 120px;">🧱 <strong style="color: #ffd166;">${lang === 'EN' ? 'Tilemap Cells' : lang === 'PT' ? 'Células de Tilemap' : lang === 'RU' ? 'Ячеек тайлмепа' : lang === 'ZH' ? '绘制瓦片数' : 'Celdas Tilemap'}:</strong> ${inf.tilesDrawn}</div>` : ''}
                            ${inf.lightsDrawn > 0 ? `<div style="flex: 1; min-width: 120px;">💡 <strong style="color: #ef476f;">${lang === 'EN' ? 'Lights Drawn' : lang === 'PT' ? 'Luzes Desenhadas' : lang === 'RU' ? 'Источников света' : lang === 'ZH' ? '绘制光源数' : 'Luces Dibujadas'}:</strong> ${inf.lightsDrawn}</div>` : ''}
                            ${inf.uiElementsDrawn > 0 ? `<div style="flex: 1; min-width: 120px;">🖥️ <strong style="color: #06d6a0;">${lang === 'EN' ? 'UIs Drawn' : lang === 'PT' ? 'UIs Desenhadas' : lang === 'RU' ? 'Элементов UI' : lang === 'ZH' ? '绘制UI数' : 'UIs Dibujadas'}:</strong> ${inf.uiElementsDrawn}</div>` : ''}
                            ${inf.scriptsRun > 0 ? `<div style="flex: 1; min-width: 120px;">📜 <strong style="color: #a8dadc;">${lang === 'EN' ? 'Scripts Run' : lang === 'PT' ? 'Scripts Executados' : lang === 'RU' ? 'Скриптов запущено' : lang === 'ZH' ? '运行脚本数' : 'Scripts Ejecutados'}:</strong> ${inf.scriptsRun}</div>` : ''}
                            ${inf.collisionsChecked > 0 ? `<div style="flex: 1; min-width: 120px;">⚡ <strong style="color: #e63946;">${lang === 'EN' ? 'Collisions Evaluated' : lang === 'PT' ? 'Colisões Avaliadas' : lang === 'RU' ? 'Проверок столкновений' : lang === 'ZH' ? '碰撞评估数' : 'Colisiones Evaluadas'}:</strong> ${inf.collisionsChecked}</div>` : ''}
                        </div>
                    ` : `
                        <div style="color: #aaa; text-align: center; font-style: italic; background: rgba(255,255,255,0.03); padding: 6px; border-radius: 4px;">
                            ${detailPlaceholder}
                        </div>
                    `}
                </div>
            </div>
        `;
    }

    // Render HTML Panel Structure
    let panelEl = container.querySelector('.scene-monitor-panel');
    if (!panelEl) {
        container.innerHTML = `
            <div class="scene-monitor-panel" style="padding: 10px; display: flex; flex-direction: column; min-height: 100%; box-sizing: border-box; color: #fff; background: #1e1e1e; font-family: sans-serif;">
                <!-- Toolbar -->
                <div class="monitor-toolbar" style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid #333; margin-bottom: 8px; flex-wrap: wrap; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
                        <span style="font-size: 0.95em; color: #aaa; font-weight: bold;">📊 FPS: <span id="monitor-fps-val" style="color: #00ffcc;">${displayFPS} FPS</span></span>
                        <span style="font-size: 0.95em; color: #aaa; font-weight: bold;">📈 RAM Growth: <span id="monitor-ram-val" style="color: #00b4ff;">+${displayRamGrowth} MB/s</span></span>
                        <span style="font-size: 0.85em; color: #888; font-weight: bold;">💻 CPU Cores: <span style="color: #ffdd55;">${navigator.hardwareConcurrency || 'N/A'}</span></span>
                        <span style="font-size: 0.85em; color: #888; font-weight: bold;">🎮 GPU: <span style="color: #ff77ff;">${window.renderer3D?.gpuInfo?.renderer || 'WebGL GPU'}</span></span>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="font-size: 0.85em; color: #888;">Historial:</span>
                            <select id="scene-session-select" style="background: #2d2d2d; border: 1px solid #444; color: #fff; border-radius: 4px; padding: 2px 6px; font-size: 0.85em; outline: none; cursor: pointer;">
                                <option value="-1" ${selectedSceneSessionIndex === -1 ? 'selected' : ''}>Sesión Activa (En Vivo)</option>
                                ${sessionOptions}
                            </select>
                        </div>
                        <label style="display: flex; align-items: center; gap: 4px; font-size: 0.85em; color: #fff; cursor: pointer;" title="Grabar estadísticas detalladas de dibujado y llamadas en cada frame.">
                            <input type="checkbox" id="chk-detailed-profiling" ${isDetailedProfilingEnabled ? 'checked' : ''} style="cursor: pointer;">
                            <span>Perfilado Detallado</span>
                        </label>
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
                <!-- Dynamic Content Container -->
                <div id="scene-monitor-dynamic-content" style="display: flex; flex-direction: column; gap: 12px; flex-grow: 1;"></div>
            </div>
        `;
        panelEl = container.querySelector('.scene-monitor-panel');
    } else {
        // Sync static toolbar fields without recreating the elements
        const fpsEl = document.getElementById('monitor-fps-val');
        if (fpsEl) fpsEl.textContent = `${displayFPS} FPS`;
        const ramEl = document.getElementById('monitor-ram-val');
        if (ramEl) ramEl.textContent = `+${displayRamGrowth} MB/s`;

        const selectEl = document.getElementById('scene-session-select');
        if (selectEl) {
            const currentOptsHTML = `<option value="-1" ${selectedSceneSessionIndex === -1 ? 'selected' : ''}>Sesión Activa (En Vivo)</option>${sessionOptions}`;
            if (selectEl.innerHTML !== currentOptsHTML) {
                selectEl.innerHTML = currentOptsHTML;
            }
        }
    }

    const dynamicContent = document.getElementById('scene-monitor-dynamic-content');
    if (dynamicContent) {
        // Build telemetry items dynamically (excluding 0-count elements)
        const telemetryItems = [];
        let totalMateriasLabel = "Materias Totales";
        if (lang === 'EN') totalMateriasLabel = "Total Materias";
        else if (lang === 'PT') totalMateriasLabel = "Materias Totais";
        else if (lang === 'RU') totalMateriasLabel = "Всего Материй";
        else if (lang === 'ZH') totalMateriasLabel = "物体总数";
        telemetryItems.push(`
            <div style="flex: 1; min-width: 100px; background: #151515; padding: 6px; border-radius: 4px; text-align: center;">
                <div style="color: #888; font-weight: bold;">${totalMateriasLabel}</div>
                <div style="font-size: 1.3em; color: #fff; font-weight: bold; margin-top: 4px;">${displayMetrics.totalMaterias}</div>
            </div>
        `);

        if (displayMetrics.collidersCount > 0) {
            let collidersLabel = "Colisionadores";
            if (lang === 'EN') collidersLabel = "Colliders";
            else if (lang === 'PT') collidersLabel = "Colididores";
            else if (lang === 'RU') collidersLabel = "Коллайдеры";
            else if (lang === 'ZH') collidersLabel = "碰撞体";
            telemetryItems.push(`
                <div style="flex: 1; min-width: 100px; background: #151515; padding: 6px; border-radius: 4px; text-align: center;">
                    <div style="color: #888; font-weight: bold;">${collidersLabel}</div>
                    <div style="font-size: 1.3em; color: #00ffcc; font-weight: bold; margin-top: 4px;">${displayMetrics.collidersCount}</div>
                </div>
            `);
        }

        if (displayMetrics.scriptsCount > 0) {
            let scriptsLabel = "Scripts Activos";
            if (lang === 'EN') scriptsLabel = "Active Scripts";
            else if (lang === 'PT') scriptsLabel = "Scripts Ativos";
            else if (lang === 'RU') scriptsLabel = "Активные скрипты";
            else if (lang === 'ZH') scriptsLabel = "激活的脚本";
            telemetryItems.push(`
                <div style="flex: 1; min-width: 100px; background: #151515; padding: 6px; border-radius: 4px; text-align: center;">
                    <div style="color: #888; font-weight: bold;">${scriptsLabel}</div>
                    <div style="font-size: 1.3em; color: #ffbb33; font-weight: bold; margin-top: 4px;">${displayMetrics.scriptsCount}</div>
                </div>
            `);
        }

        if (displayMetrics.drawCalls > 0) {
            let drawCallsLabel = "Draw Calls";
            if (lang === 'ZH') drawCallsLabel = "绘制调用";
            telemetryItems.push(`
                <div style="flex: 1; min-width: 100px; background: #151515; padding: 6px; border-radius: 4px; text-align: center;">
                    <div style="color: #888; font-weight: bold;">${drawCallsLabel}</div>
                    <div style="font-size: 1.3em; color: #00b4ff; font-weight: bold; margin-top: 4px;">${displayMetrics.drawCalls}</div>
                </div>
            `);
        }

        if (displayMetrics.lightsCount > 0) {
            let lightsLabel = "Luces Dinámicas";
            if (lang === 'EN') lightsLabel = "Dynamic Lights";
            else if (lang === 'PT') lightsLabel = "Luzes Dinâmicas";
            else if (lang === 'RU') lightsLabel = "Динамический свет";
            else if (lang === 'ZH') lightsLabel = "动态光源";
            telemetryItems.push(`
                <div style="flex: 1; min-width: 100px; background: #151515; padding: 6px; border-radius: 4px; text-align: center;">
                    <div style="color: #888; font-weight: bold;">${lightsLabel}</div>
                    <div style="font-size: 1.3em; color: #ff4444; font-weight: bold; margin-top: 4px;">${displayMetrics.lightsCount}</div>
                </div>
            `);
        }

        if (displayMetrics.uiElements > 0) {
            let uiElementsLabel = "Elementos UI";
            if (lang === 'EN') uiElementsLabel = "UI Elements";
            else if (lang === 'PT') uiElementsLabel = "Elementos de UI";
            else if (lang === 'RU') uiElementsLabel = "Элементы UI";
            else if (lang === 'ZH') uiElementsLabel = "UI 元素";
            telemetryItems.push(`
                <div style="flex: 1; min-width: 100px; background: #151515; padding: 6px; border-radius: 4px; text-align: center;">
                    <div style="color: #888; font-weight: bold;">${uiElementsLabel}</div>
                    <div style="font-size: 1.3em; color: #e5c158; font-weight: bold; margin-top: 4px;">${displayMetrics.uiElements}</div>
                </div>
            `);
        }

        let labelTimeline = "📈 Gráfico de Estabilidad de FPS (Últimos 40 Fotogramas)";
        let labelTimelineClick = "(Haz clic en una barra para inspeccionar)";
        let labelLoadTitle = "⚙️ Atribución de Carga del Motor (Fotograma Actual)";
        let labelRenderBreakdown = "Render";
        let labelLeyesBreakdown = "Leyes";

        if (lang === 'EN') {
            labelTimeline = "📈 FPS Stability Chart (Last 40 Frames)";
            labelTimelineClick = "(Click a bar to inspect)";
            labelLoadTitle = "⚙️ Engine Load Attribution (Current Frame)";
            labelRenderBreakdown = "Render";
            labelLeyesBreakdown = "Laws";
        } else if (lang === 'PT') {
            labelTimeline = "📈 Gráfico de Estabilidade de FPS (Últimos 40 Fotogramas)";
            labelTimelineClick = "(Clique em uma barra para inspecionar)";
            labelLoadTitle = "⚙️ Atribuição de Carga do Motor (Fotograma Atual)";
            labelRenderBreakdown = "Render";
            labelLeyesBreakdown = "Leis";
        } else if (lang === 'RU') {
            labelTimeline = "📈 График стабильности FPS (Последние 40 кадров)";
            labelTimelineClick = "(Нажмите на столбец для просмотра)";
            labelLoadTitle = "⚙️ Распределение нагрузки двигателя (Текущий кадр)";
            labelRenderBreakdown = "Рендер";
            labelLeyesBreakdown = "Законы (Leyes)";
        } else if (lang === 'ZH') {
            labelTimeline = "📈 FPS 稳定性图表 (最近 40 帧)";
            labelTimelineClick = "(点击图条以进行检查)";
            labelLoadTitle = "⚙️ 引擎负载分配 (当前帧)";
            labelRenderBreakdown = "渲染";
            labelLeyesBreakdown = "组件/脚本";
        }

        dynamicContent.innerHTML = `
            <!-- Visual FPS Drop Timeline & Process Attribution Sparkline -->
            <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 15px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                <div>
                    <div style="font-size: 0.85em; color: #aaa; font-weight: bold; margin-bottom: 6px;">${labelTimeline} <span style="color: #ffaa00; font-size: 0.9em; font-weight: normal;">${labelTimelineClick}</span></div>
                    <canvas id="fps-timeline-canvas" width="360" height="70" style="width: 100%; height: 70px; background: #000; border-radius: 4px; display: block; border: 1px solid rgba(255,255,255,0.05); cursor: pointer;"></canvas>
                </div>
                <div style="display: flex; flex-direction: column; justify-content: center; font-size: 0.85em;">
                    <div style="font-weight: bold; color: #aaa; margin-bottom: 6px;">${labelLoadTitle}</div>
                    <!-- Sparkline Bar -->
                    <div style="display: flex; height: 16px; border-radius: 4px; overflow: hidden; background: #222; margin-bottom: 8px;">
                        <div style="width: ${renderPct}%; background: #e74c3c; height: 100%;" title="${labelRenderBreakdown}: ${renderPct}%"></div>
                        <div style="width: ${leyesPct}%; background: #2ecc71; height: 100%;" title="${labelLeyesBreakdown}: ${leyesPct}%"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; font-size: 0.85em; font-family: monospace;">
                        <span style="color: #ff4d4d;">■ ${labelRenderBreakdown}: ${rT.toFixed(1)}ms (${renderPct}%)</span>
                        <span style="color: #2ecc71;">■ ${labelLeyesBreakdown}: ${leyesT.toFixed(1)}ms (${leyesPct}%)</span>
                    </div>
                </div>
            </div>

            <!-- Inspected Frame Details Section -->
            ${inspectedFrameHtml}

            <!-- Bottlenecks Warning Panel -->
            ${criticalBottlenecks.length > 0 ? `<div style="margin-bottom: 10px;">${criticalBottlenecks.join('')}</div>` : ''}

            <!-- Main Live Telemetry Grid -->
            <div style="display: flex; gap: 12px; font-size: 0.8em; flex-wrap: wrap;">
                ${telemetryItems.join('')}
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
    }

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
