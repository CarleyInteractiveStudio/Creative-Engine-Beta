/**
 * WappPlayer.js
 *
 * Librería para cargar y ejecutar juegos empaquetados en formato .wapp
 * por Creative Engine.
 */
export class WappPlayer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`WappPlayer: No se encontró un canvas con el id "${canvasId}".`);
        }
        this.zip = null;
        this.fileCache = new Map(); // Cache para URLs de blobs
        this.decodedFiles = new Map(); // Cache para contenido de archivos decodificados
    }

    /**
     * Carga un archivo .wapp desde una URL, lo decodifica y lo ejecuta.
     * @param {string} wappUrl La URL del archivo .wapp.
     */
    async loadAndRun(wappUrl) {
        console.log(`Cargando juego desde: ${wappUrl}`);

        try {
            // 1. Descargar y descomprimir
            const response = await fetch(wappUrl);
            if (!response.ok) throw new Error(`No se pudo descargar el archivo: ${response.statusText}`);
            const wappBlob = await response.blob();
            this.zip = await JSZip.loadAsync(wappBlob);
            console.log("Archivo .wapp cargado y descomprimido en memoria.");

            // 2. Decodificar todos los archivos en memoria
            console.log("Decodificando archivos del paquete...");
            for (const relativePath in this.zip.files) {
                if (!this.zip.files[relativePath].dir) {
                    const file = this.zip.files[relativePath];
                    const base64Content = await file.async('string');
                    // Decodificar de Base64 a binario y luego a texto (UTF-8)
                    const decodedContent = atob(base64Content);
                    this.decodedFiles.set(relativePath, decodedContent);
                }
            }
            console.log("Todos los archivos decodificados y cacheados.");

            // 3. Modificar el fetch global para interceptar peticiones
            this._overrideFetch();

            // 4. Cargar dinámicamente los scripts del juego
            console.log("Cargando scripts del juego...");
            await this._loadScript('lib/creative-engine-runtime.js');
            await this._loadScript('game.js');
            await this._loadScript('game-scripts.js');

            console.log("¡Juego listo para empezar!");

        } catch (error) {
            console.error("Error al cargar y ejecutar el juego .wapp:", error);
            throw error;
        }
    }

    /**
     * Carga un script desde el .wapp y lo ejecuta.
     * @param {string} path La ruta del script dentro del .wapp.
     */
    async _loadScript(path) {
        const scriptContent = this.decodedFiles.get(path);
        if (!scriptContent) throw new Error(`El script "${path}" no se encontró en el paquete .wapp.`);

        // Usamos un Blob para crear una URL que el navegador pueda importar como módulo
        const blob = new Blob([scriptContent], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        await import(url);
        URL.revokeObjectURL(url); // Limpiar la URL del blob después de usarla
    }

    /**
     * Sobrescribe la función `fetch` global para que las peticiones a assets
     * se sirvan desde los archivos decodificados en memoria.
     */
    _overrideFetch() {
        const originalFetch = window.fetch;
        const player = this;

        window.fetch = (resource, options) => {
            const url = new URL(resource, window.location.href);
            const path = url.pathname.substring(1); // Quitar el '/' inicial

            if (player.decodedFiles.has(path)) {
                console.log(`[WappPlayer] Sirviendo desde memoria: ${path}`);
                const content = player.decodedFiles.get(path);

                // Necesitamos convertir el string decodificado de vuelta a un Blob
                const byteNumbers = new Array(content.length);
                for (let i = 0; i < content.length; i++) {
                    byteNumbers[i] = content.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray]);

                const response = new Response(blob);
                return Promise.resolve(response);
            }

            // Si no está en el .wapp, usar el fetch normal
            return originalFetch.call(this, resource, options);
        };
    }
}
