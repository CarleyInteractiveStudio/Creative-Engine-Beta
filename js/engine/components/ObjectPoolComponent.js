// js/engine/components/ObjectPoolComponent.js

import { ObjectPool } from '../ObjectPool.js';
import { getFileHandleForPath } from '../AssetUtils.js';

/**
 * Un componente que adjunta y gestiona un ObjectPool a una Materia.
 */
export class ObjectPoolComponent {
    constructor(materia) {
        this.materia = materia;
        this.prefabAssetPath = null;
        this.initialSize = 10;

        this.pool = null; // La instancia de la clase ObjectPool se creará en start
    }

    async start() {
        if (!this.prefabAssetPath) {
            console.error(`ObjectPoolComponent en '${this.materia.name}' no tiene un prefab asignado.`);
            return;
        }

        try {
            // Necesitamos una forma de obtener el projectsDirHandle. Por ahora, lo tomaremos de una variable global.
            const projectsDirHandle = window.projectsDirHandle;
            if (!projectsDirHandle) {
                throw new Error("El 'projectsDirHandle' global no está disponible.");
            }

            const fileHandle = await getFileHandleForPath(this.prefabAssetPath, projectsDirHandle);
            if (!fileHandle) {
                 throw new Error(`No se pudo encontrar el asset del prefab en la ruta: ${this.prefabAssetPath}`);
            }

            const file = await fileHandle.getFile();
            const content = await file.text();
            const prefabData = JSON.parse(content);

            // Creamos la instancia del pool
            this.pool = new ObjectPool(prefabData, this.initialSize, projectsDirHandle, this.materia);

        } catch (error) {
            console.error(`Error al inicializar ObjectPoolComponent en '${this.materia.name}':`, error);
        }
    }

    /**
     * Obtiene un objeto del pool.
     * @returns {Promise<Materia|null>}
     */
    getObject() {
        if (!this.pool) {
            console.error("El pool de objetos no está inicializado.");
            return Promise.resolve(null);
        }
        return this.pool.getObject();
    }

    /**
     * Devuelve un objeto al pool.
     * @param {Materia} materia
     */
    returnObject(materia) {
        if (!this.pool) {
            console.error("El pool de objetos no está inicializado.");
            return;
        }
        this.pool.returnObject(materia);
    }

    clone() {
        const newComponent = new ObjectPoolComponent(null);
        newComponent.prefabAssetPath = this.prefabAssetPath;
        newComponent.initialSize = this.initialSize;
        return newComponent;
    }
}
