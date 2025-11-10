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
