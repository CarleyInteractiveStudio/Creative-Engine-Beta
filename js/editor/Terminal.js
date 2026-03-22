// --- Creative Engine Terminal Module ---

let dom = {};
let projectsDirHandle = null;
let projectHandle = null; // Handle for the current project directory
let currentDirHandle = null; // Handle for the current directory within the project
let currentPath = '/'; // Path string relative to the project root
let logBuffer = null;

// --- Command Registry ---
const commands = {};

function registerCommand(name, func, description = '') {
    commands[name] = { func, description };
}

// --- Core Functions ---

async function initialize(editorDom, initialProjectsDirHandle) {
    dom = {
        output: editorDom.terminalOutput,
        input: editorDom.terminalInput,
        inputLine: editorDom.terminalInputLine,
        terminalContent: editorDom.terminalContent,
    };
    projectsDirHandle = initialProjectsDirHandle;

    console.log("Terminal Module Initialized.");
    setupEventListeners();
    registerCoreCommands();

    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        if (!projectName) {
            console.warn("Terminal: Nombre del proyecto no encontrado en la URL.");
            return;
        }
        if (!projectsDirHandle) {
             // We don't logError here yet because the user might not have picked a folder yet
             // Just a console log for debugging
             console.log("Terminal: Esperando projectsDirHandle...");
             return;
        }
        await loadProject(projectName);
    } catch (error) {
        logError(`Error al cargar el directorio del proyecto: ${error.message}`);
    }

    // Focus input when the terminal becomes visible
    const observer = new MutationObserver(mutations => {
        for (let mutation of mutations) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                const isActive = dom.terminalContent.classList.contains('active');
                if (isActive) {
                    setTimeout(() => dom.input.focus(), 0);
                }
            }
        }
    });

    if (dom.terminalContent) {
        observer.observe(dom.terminalContent, { attributes: true });
    }
}

function setupEventListeners() {
    if (!dom.input) return;

    dom.input.addEventListener('keydown', handleInput);
    if (dom.terminalContent) {
        dom.terminalContent.addEventListener('click', () => dom.input.focus());
    }
}

async function handleInput(e) {
    if (e.key === 'Enter' && !e.target.readOnly) {
        e.preventDefault();
        const fullCommand = dom.input.value.trim();
        dom.input.value = '';

        if (fullCommand) {
            await execute(fullCommand);
            updatePrompt();
            scrollToBottom();
        }
    }
}

async function execute(fullCommand, silent = false) {
    if (!silent) echoCommand(fullCommand);

    if (silent) logBuffer = [];

    await processCommand(fullCommand);

    if (silent) {
        const output = logBuffer.join('\n');
        logBuffer = null;
        return output;
    }
}

async function processCommand(fullCommand) {
    // Better argument parsing to handle quotes
    const regex = /[^\s"']+|"([^"]*)"|'([^']*)'/g;
    const tokens = [];
    let m;
    while ((m = regex.exec(fullCommand)) !== null) {
        tokens.push(m[1] || m[2] || m[0]);
    }

    if (tokens.length === 0) return;

    const commandName = tokens[0];
    const args = tokens.slice(1);
    const lowerName = commandName.toLowerCase();
    const command = commands[lowerName];

    if (command) {
        try {
            await command.func(args);
            return;
        } catch (error) {
            logError(`Error ejecutando el comando "${commandName}": ${error.message}`);
            console.error(error);
            return;
        }
    }

    // Bridge with Carl Command Handlers
    if (window.carlCommandHandlers) {
        const mapping = {
            'rm': 'borrarArchivo',
            'mv': 'moverArchivo',
            'download': 'descargarArchivo',
            'descargar': 'descargarArchivo',
            'mkobj': 'crearObjeto',
            'rmobj': 'borrarObjeto',
            'addcomp': 'agregarComponente',
            'setprop': 'modificarPropiedad',
            'lsobj': 'listarObjetos',
            'inspect': 'obtenerDetallesObjeto'
        };

        const action = mapping[lowerName] || commandName;
        if (window.carlCommandHandlers[action]) {
            try {
                let params = {};
                if (action === 'descargarArchivo') {
                    params = { url: args[0], path: args[1] };
                } else if (action === 'crearObjeto') {
                    params = { name: args[0], parentId: args[1] };
                } else if (action === 'borrarObjeto') {
                    params = { id: args[0] };
                } else if (action === 'agregarComponente') {
                    params = { materiaId: args[0], type: args[1] };
                } else if (action === 'modificarPropiedad') {
                    params = {
                        materiaId: args[0],
                        componentType: args[1],
                        propPath: args[2],
                        value: isNaN(args[3]) ? args[3] : parseFloat(args[3])
                    };
                    if (args[3] === 'true') params.value = true;
                    if (args[3] === 'false') params.value = false;
                } else if (action === 'borrarArchivo') {
                    params = { path: args[0] };
                } else if (action === 'obtenerDetallesObjeto') {
                    params = { id: args[0] };
                } else {
                    if (args[0] && args[0].startsWith('{')) {
                        params = JSON.parse(args.join(' '));
                    }
                }

                const result = await window.carlCommandHandlers[action](params);
                if (result.success) {
                    log(result.message);
                    if (result.content) log(`<pre style="background: rgba(0,0,0,0.3); padding: 5px; border-radius: 4px; overflow: auto; max-height: 200px; white-space: pre-wrap; font-family: monospace;">${result.content}</pre>`);
                } else {
                    logError(result.message);
                }
                return;
            } catch (e) {
                logError(`Error en bridge de comando "${action}": ${e.message}`);
                return;
            }
        }
    }

    logError(`Comando no reconocido: ${commandName}`);
}

function echoCommand(command) {
    let promptText = ">";
    if (dom.inputLine) {
        const promptEl = dom.inputLine.querySelector('.terminal-prompt');
        if (promptEl) promptText = promptEl.textContent;
    }
    const escapedCommand = command.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    log(`<span class="terminal-prompt">${promptText}</span> ${escapedCommand}`);
}

function log(message) {
    if (logBuffer) {
        logBuffer.push(message.replace(/<[^>]*>/g, '')); // Strip HTML for silent buffer
        return;
    }
    if (!dom.output) return;
    dom.output.innerHTML += `<div>${message}</div>`;
}

function logError(message) {
    if (logBuffer) {
        logBuffer.push("ERROR: " + message.replace(/<[^>]*>/g, ''));
        return;
    }
    log(`<span style="color: #ff6b6b;">${message}</span>`);
}

function scrollToBottom() {
    if (!dom.output) return;
    dom.output.scrollTop = dom.output.scrollHeight;
}

async function loadProject(projectName) {
    try {
        if (!projectsDirHandle) return;
        projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        currentDirHandle = projectHandle;
        currentPath = '/';
        log(`Proyecto '${projectName}' cargado en la terminal.`);
        updatePrompt();
        if (dom.input) dom.input.readOnly = false;
    } catch (e) {
        logError(`No se pudo cargar el proyecto en la terminal: ${e.message}`);
    }
}

// Expose for external updates
window.ceTerminal = {
    execute: execute,
    updateHandle: (newHandle) => {
        projectsDirHandle = newHandle;
        const projectName = new URLSearchParams(window.location.search).get('project');
        if (projectName) loadProject(projectName);
    }
};

function updatePrompt() {
    if (!dom.inputLine) return;
    const prompt = dom.inputLine.querySelector('.terminal-prompt');
    const pathForPrompt = currentPath === '/' ? '~' : currentPath.split('/').pop();
    prompt.textContent = `${pathForPrompt} >`;
}

function clearScreen() {
    if (!dom.output) return;
    dom.output.innerHTML = '<span>Creative Engine Terminal [Version 0.1.0]</span><br><span>(c) Carley Interactive Studio. Todos los derechos reservados.</span><br><br>';
}

// --- Command Implementations ---

async function lsCommand(args) {
    const entries = [];
    for await (const entry of currentDirHandle.values()) {
        if (entry.kind === 'directory') {
            entries.push(`<span style="color: #61afef;">${entry.name}/</span>`); // Blue for directories
        } else {
            entries.push(entry.name);
        }
    }
    if (entries.length > 0) {
        log(entries.sort().join('\n'));
    }
}

async function catCommand(args) {
    if (args.length === 0) {
        return logError("Uso: cat &lt;nombre_archivo&gt;");
    }
    const fileName = args[0];
    try {
        const fileHandle = await currentDirHandle.getFileHandle(fileName, { create: false });
        const file = await fileHandle.getFile();
        const content = await file.text();
        const escapedContent = content.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        log(escapedContent);
    } catch (e) {
        if (e.name === 'NotFoundError') {
            logError(`Archivo no encontrado: ${fileName}`);
        } else if (e.name === 'TypeMismatchError') {
            logError(`Error: '${fileName}' es un directorio, no un archivo.`);
        } else {
            logError(`No se pudo leer el archivo '${fileName}': ${e.message}`);
        }
    }
}

function pwdCommand() {
    // Replace the initial '/' with the project root '~' for display
    const displayPath = currentPath === '/' ? '~' : `~${currentPath}`;
    log(displayPath);
}

async function cdCommand(args) {
    if (args.length === 0 || args[0] === '~' || args[0] === '~/') {
        currentDirHandle = projectHandle;
        currentPath = '/';
        return;
    }

    const target = args[0].startsWith('~/') ? args[0].substring(2) : args[0];
    let newPathParts;

    if (target.startsWith('/')) {
        // Absolute path from project root
        newPathParts = target.split('/').filter(p => p);
    } else {
        // Relative path
        const currentPathParts = currentPath.split('/').filter(p => p);
        const targetParts = target.split('/');
        newPathParts = [...currentPathParts];
        for (const part of targetParts) {
            if (part === '..') {
                if (newPathParts.length > 0) newPathParts.pop();
            } else if (part !== '' && part !== '.') {
                newPathParts.push(part);
            }
        }
    }

    let newHandle = projectHandle;
    try {
        for (const part of newPathParts) {
            newHandle = await newHandle.getDirectoryHandle(part);
        }
        currentDirHandle = newHandle;
        currentPath = '/' + newPathParts.join('/');
        if (currentPath === '//') currentPath = '/';
    } catch (e) {
        if (e.name === 'NotFoundError') {
            logError(`Ruta no encontrada: ${'~/' + newPathParts.join('/')}`);
        } else if (e.name === 'TypeMismatchError') {
            logError(`Error: Un componente de la ruta no es un directorio.`);
        } else {
            logError(`Error al cambiar de directorio: ${e.message}`);
        }
    }
}

function registerCoreCommands() {
    registerCommand('descargar', (args) => execute(`download ${args.join(' ')}`), 'Alias de download.');
    registerCommand('download', async (args) => {
        if (args.length < 1) return logError('Uso: download <url> [path]');
        const url = args[0];
        const path = args[1] || `Assets/${url.split('/').pop()}`;
        if (window.carlCommandHandlers && window.carlCommandHandlers.descargarArchivo) {
            const res = await window.carlCommandHandlers.descargarArchivo({ url, path });
            if (res.success) log(res.message);
            else logError(res.message);
        } else {
            logError((window.Localization?.get('COMANDO_NO_DISPONIBLE') || 'Comando {cmd} no disponible.').replace('{cmd}', 'descargar'));
        }
    }, window.Localization?.get('DESCARGAR_DESC') || 'Descarga un archivo desde una URL.');

    registerCommand('clear', clearScreen, 'Limpia la pantalla de la terminal.');
    registerCommand('help', () => {
        log(window.Localization?.get('COMANDOS_DISPONIBLES') || 'Comandos disponibles:');
        Object.entries(commands).sort().forEach(([name, { description }]) => {
            log(`  <span style="color: #8be9fd;">${name.padEnd(10)}</span> - ${description || window.Localization?.get('SIN_DESCRIPCION') || 'Sin descripcion.'}`);
        });

        log('<br>Comandos de Escena (Bridge):');
        log('  <span style="color: #50fa7b;">lsobj     </span> - Lista objetos de la escena.');
        log('  <span style="color: #50fa7b;">mkobj     </span> - Crea un objeto. Uso: mkobj &lt;nombre&gt;');
        log('  <span style="color: #50fa7b;">rmobj     </span> - Borra un objeto. Uso: rmobj &lt;id&gt;');
        log('  <span style="color: #50fa7b;">inspect   </span> - Detalles de objeto. Uso: inspect &lt;id&gt;');
        log('  <span style="color: #50fa7b;">addcomp   </span> - Anade componente. Uso: addcomp &lt;id&gt; &lt;tipo&gt;');
        log('  <span style="color: #50fa7b;">setprop   </span> - Cambia propiedad. Uso: setprop &lt;id&gt; &lt;comp&gt; &lt;prop&gt; &lt;valor&gt;');
    }, window.Localization?.get('AYUDA_DESC') || 'Muestra esta lista de ayuda.');
    registerCommand('version', () => log('Creative Engine Version: 0.1.0-beta'), window.Localization?.get('VERSION_DESC') || 'Muestra la version del motor.');

    // Filesystem commands
    registerCommand('ls', lsCommand, window.Localization?.get('LS_DESC') || 'Lista los archivos y directorios.');
    registerCommand('pwd', pwdCommand, 'Muestra el directorio de trabajo actual.');
    registerCommand('cat', catCommand, 'Muestra el contenido de un archivo.');
    registerCommand('cd', cdCommand, 'Cambia el directorio de trabajo actual.');
}

export { initialize };