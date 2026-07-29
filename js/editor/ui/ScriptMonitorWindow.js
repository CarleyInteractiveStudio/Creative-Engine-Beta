// --- Module for the Advanced Script Monitor (Monitor de Script) ---

let dom;
const scripts = new Map();
let isNetworkGlobalAllowed = true;
const expandedScripts = new Set();
let isInitialized = false;

// --- Public API ---

export function initialize(dependencies) {
    dom = dependencies.dom;

    // Register on the global object so engine classes can access hooks
    window.ScriptMonitor = {
        onScriptRegistered,
        onScriptStart,
        onScriptEnd,
        isNetworkBlocked(scriptName) {
            const data = scripts.get(scriptName);
            if (!data) return false;
            return !data.networkAllowed;
        },
        logNetworkAttempt,
        onObjectInstantiated(scriptName) {
            const data = getOrCreateScriptData(scriptName);
            data.instantiations = (data.instantiations || 0) + 1;
        },
        onObjectDestroyed(scriptName) {
            const data = getOrCreateScriptData(scriptName);
            data.destructions = (data.destructions || 0) + 1;
        },
        onAnimationPlayed(scriptName) {
            const data = getOrCreateScriptData(scriptName);
            data.animationsPlayed = (data.animationsPlayed || 0) + 1;
        }
    };

    // Setup global network interceptors
    setupNetworkInterceptors();

    // Attach event listeners to the panel container once DOM is ready
    setupEventListeners();

    isInitialized = true;
    console.log("[ScriptMonitor] Inicializado con éxito.");
}

function setupNetworkInterceptors() {
    const originalFetch = window.fetch;
    window.fetch = async function(resource, options) {
        const activeScript = window._currentlyExecutingScript;
        if (activeScript) {
            const data = getOrCreateScriptData(activeScript);
            if (!isNetworkGlobalAllowed || !data.networkAllowed) {
                console.warn(`[ScriptMonitor] Acceso a red bloqueado para: ${activeScript}`);
                logNetworkAttempt(activeScript, resource, 'fetch', 'Bloqueado');
                throw new Error(`[ScriptMonitor] Red bloqueada para el script '${activeScript}'`);
            }
            logNetworkAttempt(activeScript, resource, 'fetch', 'Permitido');
        }
        return originalFetch.apply(this, arguments);
    };

    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        this._url = url;
        this._method = method;
        this._initiatingScript = window._currentlyExecutingScript;
        return originalXHROpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function(...args) {
        const activeScript = this._initiatingScript || window._currentlyExecutingScript;
        if (activeScript) {
            const data = getOrCreateScriptData(activeScript);
            if (!isNetworkGlobalAllowed || !data.networkAllowed) {
                console.warn(`[ScriptMonitor] Acceso a red (XHR) bloqueado para: ${activeScript}`);
                logNetworkAttempt(activeScript, this._url || 'unknown', 'XHR', 'Bloqueado');
                throw new Error(`[ScriptMonitor] Red bloqueada para el script '${activeScript}'`);
            }
            logNetworkAttempt(activeScript, this._url || 'unknown', 'XHR', 'Permitido');
        }
        return originalXHRSend.apply(this, args);
    };
}

function setupEventListeners() {
    const container = document.getElementById('script-monitor-content');
    if (!container) return;

    container.addEventListener('click', (e) => {
        if (e.target.id === 'btn-clear-monitor' || e.target.closest('#btn-clear-monitor')) {
            clearMonitorData();
        } else if (e.target.id === 'btn-save-monitor' || e.target.closest('#btn-save-monitor')) {
            saveMonitorHistory();
        } else if (e.target.classList.contains('monitor-expand-btn') || e.target.closest('.monitor-expand-btn')) {
            const btn = e.target.classList.contains('monitor-expand-btn') ? e.target : e.target.closest('.monitor-expand-btn');
            const scriptName = btn.dataset.script;
            if (expandedScripts.has(scriptName)) {
                expandedScripts.delete(scriptName);
            } else {
                expandedScripts.add(scriptName);
            }
            forceFullRepopulate();
        }
    });

    container.addEventListener('change', (e) => {
        if (e.target.id === 'chk-global-network') {
            isNetworkGlobalAllowed = e.target.checked;
            console.log(`[ScriptMonitor] Acceso global a red: ${isNetworkGlobalAllowed ? 'PERMITIDO' : 'BLOQUEADO'}`);
        } else if (e.target.classList.contains('chk-script-network')) {
            const scriptName = e.target.dataset.script;
            const data = scripts.get(scriptName);
            if (data) {
                data.networkAllowed = e.target.checked;
                console.log(`[ScriptMonitor] Acceso a red para ${scriptName}: ${data.networkAllowed ? 'PERMITIDO' : 'BLOQUEADO'}`);
            }
        }
    });
}

function getOrCreateScriptData(scriptName) {
    if (!scripts.has(scriptName)) {
        scripts.set(scriptName, {
            name: scriptName,
            status: 'Idle',
            lastMethod: '---',
            executions: 0,
            successes: 0,
            errors: 0,
            unresponsive: 0,
            ramEstimate: 0,
            networkCalls: 0,
            networkAllowed: true,
            networkLogs: [],
            functions: {},
            instantiations: 0,
            destructions: 0,
            animationsPlayed: 0
        });
    }
    return scripts.get(scriptName);
}

function onScriptRegistered(scriptName) {
    getOrCreateScriptData(scriptName);
}

function onScriptStart(scriptName, methodName) {
    const data = getOrCreateScriptData(scriptName);
    data.status = 'Running';
    data.lastMethod = methodName;
    data.executions++;

    if (!data.functions[methodName]) {
        data.functions[methodName] = {
            calls: 0,
            successes: 0,
            errors: 0,
            unresponsive: 0,
            totalTime: 0,
            maxTime: 0
        };
    }
    data.functions[methodName].calls++;
}

function onScriptEnd(scriptName, methodName, duration, ramEstimateBytes, hasError = false) {
    const data = getOrCreateScriptData(scriptName);
    data.status = 'Idle';
    data.lastDuration = duration;
    data.ramEstimate = ramEstimateBytes;

    const func = data.functions[methodName] || {
        calls: 1,
        successes: 0,
        errors: 0,
        unresponsive: 0,
        totalTime: 0,
        maxTime: 0
    };
    data.functions[methodName] = func;

    func.totalTime += duration;
    if (duration > func.maxTime) {
        func.maxTime = duration;
    }

    if (duration > 16.6) { // Slow call (stalls 60fps frame budget)
        data.unresponsive++;
        func.unresponsive++;
    }

    if (hasError) {
        data.errors++;
        func.errors++;
    } else {
        data.successes++;
        func.successes++;
    }
}

function logNetworkAttempt(scriptName, url, type, status) {
    const data = getOrCreateScriptData(scriptName);
    data.networkCalls++;

    let urlString = typeof url === 'string' ? url : (url && url.url ? url.url : String(url));
    if (urlString.length > 60) {
        urlString = urlString.substring(0, 57) + '...';
    }

    data.networkLogs.unshift({
        url: urlString,
        type,
        status,
        timestamp: new Date().toLocaleTimeString()
    });

    if (data.networkLogs.length > 15) {
        data.networkLogs.pop();
    }
}

function clearMonitorData() {
    expandedScripts.clear();
    scripts.clear();
    forceFullRepopulate();
}

function forceFullRepopulate() {
    const rowsBody = document.getElementById('monitor-rows-body');
    if (rowsBody) rowsBody.innerHTML = '';
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
}

function saveMonitorHistory() {
    const exportData = {
        sessionTimestamp: new Date().toISOString(),
        globalNetworkAllowed: isNetworkGlobalAllowed,
        scripts: []
    };

    scripts.forEach((data, name) => {
        exportData.scripts.push({
            name: data.name,
            totalExecutions: data.executions,
            totalSuccesses: data.successes,
            totalErrors: data.errors,
            totalUnresponsive: data.unresponsive,
            ramEstimateBytes: data.ramEstimate,
            networkCalls: data.networkCalls,
            networkAllowed: data.networkAllowed,
            functions: data.functions,
            networkLogs: data.networkLogs,
            instantiations: data.instantiations,
            destructions: data.destructions,
            animationsPlayed: data.animationsPlayed
        });
    });

    const jsonString = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `script_monitor_session_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    console.log("[ScriptMonitor] Historial de sesión exportado.");
}

export function update() {
    const container = document.getElementById('script-monitor-content');
    if (!container) return;

    const L = window.Localization;

    // Render skeleton if empty (e.g. on first load or after clear)
    if (!container.querySelector('.script-monitor-panel')) {
        container.innerHTML = `
            <div class="script-monitor-panel" style="padding: 10px; display: flex; flex-direction: column; min-height: 100%; box-sizing: border-box; color: #fff; background: #1e1e1e; font-family: sans-serif;">
                <!-- Toolbar -->
                <div class="monitor-toolbar" style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid #333; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.9em; user-select: none;">
                            <input type="checkbox" id="chk-global-network" ${isNetworkGlobalAllowed ? 'checked' : ''} style="accent-color: #00ffcc; cursor: pointer;">
                            <span data-i18n="MONITOR_RED_GLOBAL">${L.get('MONITOR_RED_GLOBAL', 'Permitir Red (Global)')}</span>
                        </label>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button id="btn-save-monitor" class="panel-tool-btn" style="background: #2d2d2d; border: 1px solid #444; color: #00ffcc; padding: 4px 10px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.85em;" title="${L.get('MONITOR_GUARDAR_HISTORIAL', 'Guardar Historial')}">
                            <span>${L.get('MONITOR_GUARDAR_HISTORIAL', 'Guardar Historial')}</span>
                        </button>
                        <button id="btn-clear-monitor" class="panel-tool-btn" style="background: #2d2d2d; border: 1px solid #444; color: #ff4444; padding: 4px 10px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.85em;" title="${L.get('MONITOR_BORRAR_SESION', 'Borrar Sesión')}">
                            <img src="icons/trash.svg" class="ce-icon" style="width: 14px; height: 14px; filter: invert(0.8);">
                            <span>${L.get('MONITOR_BORRAR_SESION', 'Borrar Sesión')}</span>
                        </button>
                    </div>
                </div>

                <!-- Table Container -->
                <div class="monitor-list-container" style="flex: 1; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85em; font-family: monospace;">
                        <thead>
                            <tr style="border-bottom: 2px solid #444; color: #888; font-weight: bold;">
                                <th style="padding: 8px 4px; width: 30px;"></th>
                                <th style="padding: 8px 4px;" data-i18n="MONITOR_TABLA_SCRIPT">${L.get('MONITOR_TABLA_SCRIPT', 'Script')}</th>
                                <th style="padding: 8px 4px; text-align: center; width: 90px;" data-i18n="MONITOR_TABLA_ESTADO">${L.get('MONITOR_TABLA_ESTADO', 'Estado')}</th>
                                <th style="padding: 8px 4px; text-align: right; width: 80px;">${L.get('MONITOR_EXITOS', 'Éxitos')}</th>
                                <th style="padding: 8px 4px; text-align: right; width: 80px; color: #ff4444;">${L.get('MONITOR_ERRORES', 'Errores')}</th>
                                <th style="padding: 8px 4px; text-align: right; width: 90px; color: #ffbb33;">${L.get('MONITOR_LENTOS', 'Lentos')}</th>
                                <th style="padding: 8px 4px; text-align: right; width: 90px;" data-i18n="MONITOR_TABLA_RAM">${L.get('MONITOR_TABLA_RAM', 'Est. RAM')}</th>
                                <th style="padding: 8px 4px; text-align: center; width: 100px;" data-i18n="MONITOR_TABLA_RED">${L.get('MONITOR_TABLA_RED', 'Acceso Red')}</th>
                            </tr>
                        </thead>
                        <tbody id="monitor-rows-body">
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        // Ensure event listeners are attached to new elements
        setupEventListeners();
    }

    const rowsBody = document.getElementById('monitor-rows-body');
    if (!rowsBody) return;

    if (scripts.size === 0) {
        rowsBody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; color: #666; padding: 20px;" data-i18n="MONITOR_SIN_SCRIPTS">
                    ${L.get('MONITOR_SIN_SCRIPTS', 'No se han ejecutado scripts todavía en esta sesión.')}
                </td>
            </tr>
        `;
        return;
    }

    scripts.forEach((data, name) => {
        let rowId = `monitor-row-${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        let mainRow = document.getElementById(rowId);
        let logsRowId = `${rowId}-logs`;
        let logsRow = document.getElementById(logsRowId);

        const isExpanded = expandedScripts.has(name);
        const formattedRam = formatBytes(data.ramEstimate);

        const statusDotStyle = data.status === 'Running'
            ? 'background: #00ffcc; box-shadow: 0 0 8px #00ffcc;'
            : 'background: #555;';

        const statusLabel = data.status === 'Running' ? 'RUNNING' : 'IDLE';
        const statusColor = data.status === 'Running' ? '#00ffcc' : '#aaa';

        if (!mainRow) {
            mainRow = document.createElement('tr');
            mainRow.id = rowId;
            mainRow.style.borderBottom = '1px solid #2d2d2d';
            mainRow.style.height = '32px';
            rowsBody.appendChild(mainRow);
        }

        mainRow.innerHTML = `
            <td style="padding: 6px 4px; text-align: center;">
                <button class="monitor-expand-btn" data-script="${name}" style="background: none; border: none; color: #888; cursor: pointer; font-size: 10px; padding: 2px 6px; display: flex; align-items: center; justify-content: center;">
                    <span style="display: inline-block; transition: transform 0.15s; ${isExpanded ? 'transform: rotate(90deg);' : ''}">▶</span>
                </button>
            </td>
            <td style="padding: 6px 4px; color: #fff; font-weight: bold; display: flex; align-items: center; gap: 6px; height: 32px; box-sizing: border-box;">
                <img src="image/Script.png" style="width: 14px; height: 14px; object-fit: contain;">
                <span>${name}</span>
            </td>
            <td style="padding: 6px 4px; text-align: center;">
                <div style="display: inline-flex; align-items: center; gap: 6px; color: ${statusColor}; font-size: 0.9em;">
                    <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; ${statusDotStyle}"></span>
                    <span>${statusLabel}</span>
                </div>
            </td>
            <td style="padding: 6px 4px; text-align: right; color: #00ffcc; font-weight: bold;">${data.successes}</td>
            <td style="padding: 6px 4px; text-align: right; color: #ff4444; font-weight: bold;">${data.errors}</td>
            <td style="padding: 6px 4px; text-align: right; color: #ffbb33; font-weight: bold;">${data.unresponsive}</td>
            <td style="padding: 6px 4px; text-align: right; color: #00b4ff;">${formattedRam}</td>
            <td style="padding: 6px 4px; text-align: center;">
                <input type="checkbox" class="chk-script-network" data-script="${name}" ${data.networkAllowed ? 'checked' : ''} style="accent-color: #00ffcc; cursor: pointer;">
            </td>
        `;

        if (isExpanded) {
            if (!logsRow) {
                logsRow = document.createElement('tr');
                logsRow.id = logsRowId;
                rowsBody.insertBefore(logsRow, mainRow.nextSibling);
            }

            // Let's render the detailed functions analysis table!
            let funcTableRows = '';
            let advices = [];

            // Detect advice criteria
            let hasErrorsInFunctions = false;
            let hasSlowFunctions = false;

            const funcEntries = Object.entries(data.functions);
            if (funcEntries.length === 0) {
                funcTableRows = `<tr><td colspan="6" style="text-align: center; color: #666; padding: 10px;">Ninguna función ejecutada todavía.</td></tr>`;
            } else {
                funcEntries.forEach(([funcName, stats]) => {
                    const avgT = stats.calls > 0 ? (stats.totalTime / stats.calls).toFixed(3) : '0.000';
                    const maxT = stats.maxTime.toFixed(3);

                    if (stats.errors > 0) hasErrorsInFunctions = true;
                    if (stats.unresponsive > 0) hasSlowFunctions = true;

                    funcTableRows += `
                        <tr style="border-bottom: 1px solid #222; height: 26px;">
                            <td style="padding: 4px; color: #ffbb33; font-weight: bold;">${funcName}()</td>
                            <td style="padding: 4px; text-align: right; color: #fff;">${stats.calls}</td>
                            <td style="padding: 4px; text-align: right; color: #00ffcc;">${stats.successes}</td>
                            <td style="padding: 4px; text-align: right; color: #ff4444;">${stats.errors}</td>
                            <td style="padding: 4px; text-align: right; color: #ffaa00;">${stats.unresponsive}</td>
                            <td style="padding: 4px; text-align: right; color: #ccc;">
                                <span>${avgT} ms</span> <span style="color: #555;">/</span> <span style="color: #fff; font-weight: bold;">${maxT} ms</span>
                            </td>
                        </tr>
                    `;
                });
            }

            // Build smart recommendations
            if (hasErrorsInFunctions) {
                advices.push(`⚠️ <span style="color: #ff4444;">Se han detectado errores durante la ejecución de las funciones. Revisa la pestaña de Consola para ver los detalles del error.</span>`);
            }
            if (hasSlowFunctions) {
                advices.push(`⚡ <span style="color: #ffbb33;">Hay llamadas "Lentas" que tardan más de 16.6ms. Optimiza los cálculos reduciendo bucles excesivos o evitando buscar objetos con getComponentByName o findMateria dentro de update() o fixedUpdate().</span>`);
            }
            if (data.networkCalls > 10) {
                advices.push(`🌐 <span style="color: #00b4ff;">Uso alto de peticiones de red (${data.networkCalls} llamadas). Considera implementar un caché o un retardo para evitar sobrecargar los hilos de comunicación de red.</span>`);
            }
            if (advices.length === 0) {
                advices.push(`✅ <span style="color: #00ffcc;">¡Excelente rendimiento! Este script se está ejecutando perfectamente y dentro de los tiempos recomendados de frame budget.</span>`);
            }

            const advicesHtml = advices.map(a => `<div style="margin-bottom: 4px; font-size: 0.95em;">${a}</div>`).join('');

            // Also render Network Logs
            let networkLogsHtml = '';
            if (data.networkLogs.length === 0) {
                networkLogsHtml = `<div style="color: #666; font-size: 0.9em; padding: 4px 0;">Sin peticiones de red registradas.</div>`;
            } else {
                networkLogsHtml = `<table style="width: 100%; border-collapse: collapse; font-size: 0.9em; text-align: left;">`;
                data.networkLogs.slice(0, 10).forEach(log => {
                    const statusColor = log.status === 'Permitido' ? '#00ffcc' : '#ff4444';
                    networkLogsHtml += `
                        <tr style="border-bottom: 1px solid #222; height: 20px;">
                            <td style="padding: 2px 4px; color: #888; width: 75px;">[${log.timestamp}]</td>
                            <td style="padding: 2px 4px; color: #ffbb33; width: 45px;">${log.type}</td>
                            <td style="padding: 2px 4px; color: #fff; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${log.url}">${log.url}</td>
                            <td style="padding: 2px 4px; text-align: right; color: ${statusColor}; font-weight: bold; width: 80px;">${log.status}</td>
                        </tr>
                    `;
                });
                networkLogsHtml += `</table>`;
            }

            logsRow.innerHTML = `
                <td colspan="8" style="background: #151515; padding: 12px 15px; border-bottom: 1px solid #333;">
                    <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                        <!-- Left Side: Detailed Functions Table -->
                        <div style="flex: 2; min-width: 320px;">
                            <div style="font-size: 0.95em; font-weight: bold; color: #00ffcc; margin-bottom: 6px; border-bottom: 1px solid #333; padding-bottom: 4px;">${L.get('MONITOR_ANALISIS_DETALLADO', 'Análisis Detallado de Funciones')}</div>
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.95em; text-align: left;">
                                <thead>
                                    <tr style="border-bottom: 1px solid #444; color: #888;">
                                        <th style="padding: 4px;">${L.get('MONITOR_FUNCION', 'Función')}</th>
                                        <th style="padding: 4px; text-align: right;">${L.get('MONITOR_LLAMADOS', 'Llamados')}</th>
                                        <th style="padding: 4px; text-align: right;">${L.get('MONITOR_EXITOS', 'Éxitos')}</th>
                                        <th style="padding: 4px; text-align: right; color: #ff4444;">${L.get('MONITOR_ERRORES', 'Errores')}</th>
                                        <th style="padding: 4px; text-align: right; color: #ffbb33;">${L.get('MONITOR_LENTOS', 'Lentos')}</th>
                                        <th style="padding: 4px; text-align: right;">${L.get('MONITOR_TABLA_TIEMPO', 'Tiempo (Prom/Máx)')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${funcTableRows}
                                </tbody>
                            </table>
                        </div>

                        <!-- Right Side: Suggestions & Network Logs -->
                        <div style="flex: 1; min-width: 280px; display: flex; flex-direction: column; gap: 15px;">
                            <div>
                                <div style="font-size: 0.95em; font-weight: bold; color: #00e5ff; margin-bottom: 6px; border-bottom: 1px solid #333; padding-bottom: 4px;">Actividad de Objetos</div>
                                <div style="background: #222; border-radius: 4px; padding: 8px; border-left: 3px solid #00e5ff; font-size: 0.95em;">
                                    <div style="margin-bottom: 4px;">✨ Objetos Creados: <strong style="color: #00ffcc;">${data.instantiations || 0}</strong></div>
                                    <div style="margin-bottom: 4px;">💥 Objetos Destruidos: <strong style="color: #ff4444;">${data.destructions || 0}</strong></div>
                                    <div>🎬 Animaciones Iniciadas: <strong style="color: #ffbb33;">${data.animationsPlayed || 0}</strong></div>
                                </div>
                            </div>

                            <div>
                                <div style="font-size: 0.95em; font-weight: bold; color: #ffbb33; margin-bottom: 6px; border-bottom: 1px solid #333; padding-bottom: 4px;">${L.get('MONITOR_SUGERENCIAS', 'Sugerencias de Optimización')}</div>
                                <div style="background: #222; border-radius: 4px; padding: 8px; border-left: 3px solid #ffbb33;">
                                    ${advicesHtml}
                                </div>
                            </div>

                            <div>
                                <div style="font-size: 0.95em; font-weight: bold; color: #00b4ff; margin-bottom: 6px; border-bottom: 1px solid #333; padding-bottom: 4px;">${L.get('MONITOR_RED_RECIENTES', 'Peticiones de Red Recientes')}</div>
                                <div style="background: #222; border-radius: 4px; padding: 6px; max-height: 120px; overflow-y: auto;">
                                    ${networkLogsHtml}
                                </div>
                            </div>
                        </div>
                    </div>
                </td>
            `;
        } else {
            if (logsRow) {
                logsRow.remove();
            }
        }
    });

    const existingRowIds = new Set();
    scripts.forEach((data, name) => {
        existingRowIds.add(`monitor-row-${name.replace(/[^a-zA-Z0-9]/g, '_')}`);
        existingRowIds.add(`monitor-row-${name.replace(/[^a-zA-Z0-9]/g, '_')}-logs`);
    });

    Array.from(rowsBody.children).forEach(row => {
        if (row.id && !existingRowIds.has(row.id) && row.id !== 'monitor-empty-row') {
            row.remove();
        }
    });
}
