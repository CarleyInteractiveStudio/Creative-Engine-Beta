// --- Module for the Script Monitor (Monitor de Script) ---

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
        logNetworkAttempt
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
    // We delegate events for dynamic checkboxes and buttons
    const container = document.getElementById('script-monitor-content');
    if (!container) return;

    container.addEventListener('click', (e) => {
        if (e.target.id === 'btn-clear-monitor') {
            clearMonitorData();
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
            totalDuration: 0,
            lastDuration: 0,
            ramEstimate: 0,
            networkCalls: 0,
            networkAllowed: true,
            networkLogs: []
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
}

function onScriptEnd(scriptName, methodName, duration, ramEstimateBytes) {
    const data = getOrCreateScriptData(scriptName);
    data.status = 'Idle';
    data.lastDuration = duration;
    data.totalDuration += duration;
    data.ramEstimate = ramEstimateBytes;
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

    if (data.networkLogs.length > 10) {
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

export function update() {
    const container = document.getElementById('script-monitor-content');
    if (!container) return;

    const L = window.Localization;

    // Render skeleton if empty (e.g. on first load or after clear)
    if (!container.querySelector('.script-monitor-panel')) {
        container.innerHTML = `
            <div class="script-monitor-panel" style="padding: 10px; display: flex; flex-direction: column; height: 100%; box-sizing: border-box; overflow: hidden; color: #fff; background: #1e1e1e; font-family: sans-serif;">
                <!-- Toolbar -->
                <div class="monitor-toolbar" style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid #333; margin-bottom: 8px;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.9em; user-select: none;">
                            <input type="checkbox" id="chk-global-network" ${isNetworkGlobalAllowed ? 'checked' : ''} style="accent-color: #00ffcc; cursor: pointer;">
                            <span data-i18n="MONITOR_RED_GLOBAL">${L.get('MONITOR_RED_GLOBAL', 'Permitir Red (Global)')}</span>
                        </label>
                    </div>
                    <button id="btn-clear-monitor" class="panel-tool-btn" style="background: #2d2d2d; border: 1px solid #444; color: #ccc; padding: 4px 10px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.85em;" title="${L.get('MONITOR_BORRAR', 'Borrar')}">
                        <img src="icons/trash.svg" class="ce-icon" style="width: 14px; height: 14px; filter: invert(0.8);">
                        <span data-i18n="MONITOR_BORRAR">${L.get('MONITOR_BORRAR', 'Borrar')}</span>
                    </button>
                </div>

                <!-- Table Container -->
                <div class="monitor-list-container" style="flex: 1; overflow-y: auto;">
                    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85em; font-family: monospace;">
                        <thead>
                            <tr style="border-bottom: 2px solid #444; color: #888; font-weight: bold;">
                                <th style="padding: 8px 4px; width: 30px;"></th>
                                <th style="padding: 8px 4px;" data-i18n="MONITOR_TABLA_SCRIPT">${L.get('MONITOR_TABLA_SCRIPT', 'Script')}</th>
                                <th style="padding: 8px 4px; text-align: center; width: 90px;" data-i18n="MONITOR_TABLA_ESTADO">${L.get('MONITOR_TABLA_ESTADO', 'Estado')}</th>
                                <th style="padding: 8px 4px;" data-i18n="MONITOR_TABLA_ULT_FUNC">${L.get('MONITOR_TABLA_ULT_FUNC', 'Últ. Función')}</th>
                                <th style="padding: 8px 4px; text-align: right; width: 70px;" data-i18n="MONITOR_TABLA_EJECS">${L.get('MONITOR_TABLA_EJECS', 'Ejecs.')}</th>
                                <th style="padding: 8px 4px; text-align: right; width: 140px;" data-i18n="MONITOR_TABLA_TIEMPO">${L.get('MONITOR_TABLA_TIEMPO', 'Tiempo (Prom/Últ)')}</th>
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

    // Update or populate rows
    scripts.forEach((data, name) => {
        let rowId = `monitor-row-${name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        let mainRow = document.getElementById(rowId);
        let logsRowId = `${rowId}-logs`;
        let logsRow = document.getElementById(logsRowId);

        const isExpanded = expandedScripts.has(name);
        const avgTime = data.executions > 0 ? (data.totalDuration / data.executions).toFixed(3) : '0.000';
        const lastTime = data.lastDuration.toFixed(3);
        const formattedRam = formatBytes(data.ramEstimate);

        const statusDotStyle = data.status === 'Running'
            ? 'background: #00ffcc; box-shadow: 0 0 8px #00ffcc;'
            : 'background: #555;';

        const statusLabel = data.status === 'Running' ? 'RUNNING' : 'IDLE';
        const statusColor = data.status === 'Running' ? '#00ffcc' : '#aaa';

        if (!mainRow) {
            // Create rows dynamically
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
            <td style="padding: 6px 4px; color: #ffbb33;">${data.lastMethod}</td>
            <td style="padding: 6px 4px; text-align: right; color: #00b4ff;">${data.executions}</td>
            <td style="padding: 6px 4px; text-align: right; color: #aaa;">
                <span>${avgTime} ms</span> <span style="color: #666;">/</span> <span style="color: #fff;">${lastTime} ms</span>
            </td>
            <td style="padding: 6px 4px; text-align: right; color: #00ffcc;">${formattedRam}</td>
            <td style="padding: 6px 4px; text-align: center;">
                <input type="checkbox" class="chk-script-network" data-script="${name}" ${data.networkAllowed ? 'checked' : ''} style="accent-color: #00ffcc; cursor: pointer;">
            </td>
        `;

        // Update / create network logs sub-row
        if (isExpanded) {
            if (!logsRow) {
                logsRow = document.createElement('tr');
                logsRow.id = logsRowId;
                rowsBody.insertBefore(logsRow, mainRow.nextSibling);
            }

            let logsHtml = '';
            if (data.networkLogs.length === 0) {
                logsHtml = `<div style="color: #666;" data-i18n="MONITOR_SIN_REGISTROS">${L.get('MONITOR_SIN_REGISTROS', 'Sin actividad de red registrada.')}</div>`;
            } else {
                logsHtml = `<table style="width: 100%; border-collapse: collapse; font-size: 0.9em; text-align: left;">`;
                data.networkLogs.forEach(log => {
                    const statusColor = log.status === 'Permitido' ? '#00ffcc' : '#ff4444';
                    logsHtml += `
                        <tr style="border-bottom: 1px solid #222;">
                            <td style="padding: 4px; color: #888; width: 70px;">[${log.timestamp}]</td>
                            <td style="padding: 4px; color: #ffbb33; width: 50px;">${log.type}</td>
                            <td style="padding: 4px; color: #fff; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${log.url}">${log.url}</td>
                            <td style="padding: 4px; text-align: right; color: ${statusColor}; font-weight: bold;">${log.status}</td>
                        </tr>
                    `;
                });
                logsHtml += `</table>`;
            }

            logsRow.innerHTML = `
                <td colspan="8" style="background: #151515; padding: 10px 15px; border-bottom: 1px solid #333;">
                    <div style="font-size: 0.9em; font-weight: bold; color: #888; margin-bottom: 6px;" data-i18n="MONITOR_DETALLES_LOGS">
                        ${L.get('MONITOR_DETALLES_LOGS', 'Registro de Peticiones (Últimas 10)')}
                    </div>
                    ${logsHtml}
                </td>
            `;
        } else {
            if (logsRow) {
                logsRow.remove();
            }
        }
    });

    // Remove any rows that are no longer in the map
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
