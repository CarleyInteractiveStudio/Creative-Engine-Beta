// --- Creative Engine Terminal Module ---

let dom = {};
let projectsDirHandle = null;
let projectHandle = null; // Handle for the current project directory
let currentDirHandle = null; // Handle for the current directory within the project
let currentPath = '/'; // Path string relative to the project root

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

    try {
        const projectName = new URLSearchParams(window.location.search).get('project');
        if (!projectName) throw new Error("Nombre del proyecto no encontrado en la URL.");
        projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        currentDirHandle = projectHandle; // Start at the project root
        log(`Proyecto cargado: ${projectName}. Bienvenido a la terminal.`);
        updatePrompt();
    } catch (error) {
        logError(`Error al cargar el directorio del proyecto: ${error.message}`);
        if (dom.input) dom.input.readOnly = true;
    }

    console.log("Terminal Module Initialized.");
    setupEventListeners();
    registerCoreCommands();

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
            echoCommand(fullCommand);
            await processCommand(fullCommand);
            updatePrompt();
            scrollToBottom();
        }
    }
}

async function processCommand(fullCommand) {
    const [commandName, ...args] = fullCommand.split(/\s+/);
    const command = commands[commandName.toLowerCase()];

    if (command) {
        try {
            await command.func(args);
        } catch (error) {
            logError(`Error ejecutando el comando "${commandName}": ${error.message}`);
            console.error(error);
        }
    } else {
        logError(`Comando no reconocido: ${commandName}`);
    }
}

function echoCommand(command) {
    const promptText = dom.inputLine.querySelector('.terminal-prompt').textContent;
    const escapedCommand = command.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    log(`<span class="terminal-prompt">${promptText}</span> ${escapedCommand}`);
}

function log(message) {
    if (!dom.output) return;
    dom.output.innerHTML += `<div>${message}</div>`;
}

function logError(message) {
    log(`<span style="color: #ff6b6b;">${message}</span>`);
}

function scrollToBottom() {
    if (!dom.output) return;
    dom.output.scrollTop = dom.output.scrollHeight;
}

function updatePrompt() {
    if (!dom.inputLine) return;
    const prompt = dom.inputLine.querySelector('.terminal-prompt');
    const pathForPrompt = currentPath === '/' ? '~' : currentPath.split('/').pop();
    prompt.textContent = `${pathForPrompt} >`;
}

function clearScreen() {
    if (!dom.output) return;
    dom.output.innerHTML = '<span>Creative Engine Terminal [Versión 0.1.0]</span><br><span>(c) Carley Interactive Studio. Todos los derechos reservados.</span><br><br>';
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
    registerCommand('clear', clearScreen, 'Limpia la pantalla de la terminal.');
    registerCommand('help', () => {
        log('Comandos disponibles:');
        Object.entries(commands).sort().forEach(([name, { description }]) => {
            log(`  <span style="color: #8be9fd;">${name.padEnd(10)}</span> - ${description || 'Sin descripción.'}`);
        });
    }, 'Muestra esta lista de ayuda.');
    registerCommand('version', () => log('Creative Engine Version: 0.1.0-beta'), 'Muestra la versión del motor.');

    // Filesystem commands
    registerCommand('ls', lsCommand, 'Lista los archivos y directorios.');
    registerCommand('pwd', pwdCommand, 'Muestra el directorio de trabajo actual.');
    registerCommand('cat', catCommand, 'Muestra el contenido de un archivo.');
    registerCommand('cd', cdCommand, 'Cambia el directorio de trabajo actual.');
}

export { initialize };