import { getURLForAssetPath } from '../AssetUtils.js';

let dom = {};
let projectsDirHandle = null;
let fileHandles = {
    authorIcon: null,
    libIcon: null,
    script: null
};

async function selectFile(type, options) {
    try {
        const [handle] = await window.showOpenFilePicker(options);
        const file = await handle.getFile();

        switch (type) {
            case 'authorIcon':
                fileHandles.authorIcon = handle;
                dom.authorIconPath.value = handle.name;
                dom.authorIconPreview.src = URL.createObjectURL(file);
                dom.authorIconPreview.style.display = 'block';
                break;
            case 'libIcon':
                fileHandles.libIcon = handle;
                dom.libIconPath.value = handle.name;
                dom.libIconPreview.src = URL.createObjectURL(file);
                dom.libIconPreview.style.display = 'block';
                break;
            case 'script':
                fileHandles.script = handle;
                dom.scriptPath.value = handle.name;
                break;
        }
    } catch (err) {
        console.log("User cancelled file selection or an error occurred.", err);
    }
}

function validateInputs() {
    const requiredFields = [
        'lib-creator-name', 'lib-creator-version', 'lib-creator-author-name',
        'lib-creator-script-path', 'lib-creator-desc', 'lib-creator-usage'
    ];
    for (const id of requiredFields) {
        const el = document.getElementById(id);
        if (!el.value.trim()) {
            alert(`El campo '${el.previousElementSibling.textContent}' es obligatorio.`);
            return false;
        }
    }
    if (!fileHandles.script) {
        alert("Debes seleccionar un archivo de script principal.");
        return false;
    }
    return true;
}

async function createLibraryPackage() {
    if (!validateInputs()) return;

    try {
        // 1. Get the lib directory handle
        const projectName = new URLSearchParams(window.location.search).get('project');
        const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
        const libDirHandle = await projectHandle.getDirectoryHandle('lib', { create: true });

        // 2. Read file contents and prepare for JSON
        const scriptContent = await (await fileHandles.script.getFile()).text();

        let authorIconContent = null;
        if (fileHandles.authorIcon) {
            authorIconContent = await fileToBase64(await fileHandles.authorIcon.getFile());
        }

        let libIconContent = null;
        if (fileHandles.libIcon) {
            libIconContent = await fileToBase64(await fileHandles.libIcon.getFile());
        }

        // 3. Construct the .celib JSON object
        const celibData = {
            name: dom.name.value,
            version: dom.version.value,
            author: {
                name: dom.authorName.value,
                icon: authorIconContent // Base64 string or null
            },
            description: dom.desc.value,
            usage: dom.usage.value,
            icon: libIconContent, // Base64 string or null
            script: scriptContent // The actual JS code
        };

        // 4. Save the .celib file
        const fileName = `${dom.name.value.replace(/\s+/g, '_')}.celib`;
        const fileHandle = await libDirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(celibData, null, 2));
        await writable.close();

        alert(`¡Librería '${fileName}' creada y guardada en la carpeta 'lib' con éxito!`);
        dom.modal.classList.remove('is-open');

        // Optionally, refresh the library manager if it's open
        if (window.updateLibraryManager) {
            window.updateLibraryManager();
        }

    } catch (error) {
        console.error("Error creating library file:", error);
        alert("Se produjo un error al crear el archivo de la librería. Revisa la consola para más detalles.");
    }
}

// Helper to convert a file to a Base64 string
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

export function initialize(domain, projDirHandle) {
    dom = {
        modal: document.getElementById('library-creator-modal'),
        closeBtn: document.querySelector('#library-creator-modal .close-button'),
        name: document.getElementById('lib-creator-name'),
        version: document.getElementById('lib-creator-version'),
        authorName: document.getElementById('lib-creator-author-name'),
        authorIconPath: document.getElementById('lib-creator-author-icon-path'),
        authorIconBtn: document.getElementById('lib-creator-author-icon-btn'),
        authorIconPreview: document.getElementById('lib-creator-author-icon-preview'),
        libIconPath: document.getElementById('lib-creator-icon-path'),
        libIconBtn: document.getElementById('lib-creator-icon-btn'),
        libIconPreview: document.getElementById('lib-creator-icon-preview'),
        scriptPath: document.getElementById('lib-creator-script-path'),
        scriptBtn: document.getElementById('lib-creator-script-btn'),
        desc: document.getElementById('lib-creator-desc'),
        usage: document.getElementById('lib-creator-usage'),
        helpBtn: document.getElementById('library-creator-help-btn'),
        createBtn: document.getElementById('library-creator-create-btn'),
        ...domain
    };
    projectsDirHandle = projDirHandle;

    dom.closeBtn.addEventListener('click', () => dom.modal.classList.remove('is-open'));

    dom.authorIconBtn.addEventListener('click', () => selectFile('authorIcon', {
        types: [{ description: 'Images', accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg'] } }]
    }));

    dom.libIconBtn.addEventListener('click', () => selectFile('libIcon', {
        types: [{ description: 'Images', accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg'] } }]
    }));

    dom.scriptBtn.addEventListener('click', () => selectFile('script', {
        types: [{ description: 'JavaScript', accept: { 'application/javascript': ['.js'] } }]
    }));

    dom.createBtn.addEventListener('click', createLibraryPackage);

    // This button could open a link to documentation in the future
    dom.helpBtn.addEventListener('click', () => {
        alert("La documentación para la API de librerías estará disponible pronto.");
    });
}
