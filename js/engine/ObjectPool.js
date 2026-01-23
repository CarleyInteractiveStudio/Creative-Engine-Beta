// js/engine/ObjectPool.js

import * as SceneManager from './SceneManager.js';

/**
 * Gestiona un pool de objetos para reutilización, mejorando el rendimiento
 * al evitar la creación y destrucción constante de objetos.
 */
export class ObjectPool {
    constructor(prefab, initialSize, projectsDirHandle, parentMateria = null) {
        if (!prefab) {
            throw new Error("Se requiere un prefab para inicializar el ObjectPool.");
        }
        this.prefab = prefab;
        this.initialSize = initialSize;
        this.projectsDirHandle = projectsDirHandle;
        this.parentMateria = parentMateria; // La Materia que contiene este pool

        this.pool = [];
        this.activeObjects = new Set();

        this.initializePool();
    }

    async initializePool() {
        for (let i = 0; i < this.initialSize; i++) {
            // Se instancia el prefab, pero se mantiene desactivado.
            const instance = await SceneManager.instantiatePrefab(this.prefab, 'in-pool', this.projectsDirHandle);
            if (instance) {
                instance.isActive = false;
                this.pool.push(instance);
            }
        }
    }

    /**
     * Obtiene un objeto del pool. Si el pool está vacío, puede crear uno nuevo.
     * @returns {Materia|null} Una instancia del prefab, o null si falla.
     */
    async getObject() {
        let objectToReturn = null;
        if (this.pool.length > 0) {
            objectToReturn = this.pool.pop();
        } else {
            // Opcional: crecer el pool si está vacío
            console.warn("El pool de objetos está vacío. Creando una nueva instancia dinámicamente.");
            objectToReturn = await SceneManager.instantiatePrefab(this.prefab, 'in-pool-dynamic', this.projectsDirHandle);
        }

        if (objectToReturn) {
            objectToReturn.isActive = true;
            this.activeObjects.add(objectToReturn);
        }
        return objectToReturn;
    }

    /**
     * Devuelve un objeto al pool para que pueda ser reutilizado.
     * @param {Materia} materia El objeto a devolver.
     */
    returnObject(materia) {
        if (this.activeObjects.has(materia)) {
            materia.isActive = false;
            this.activeObjects.delete(materia);
            this.pool.push(materia);
        } else {
            console.warn("Se intentó devolver al pool un objeto que no le pertenece o ya fue devuelto.", materia);
        }
    }

    /**
     * Devuelve todos los objetos activos al pool.
     */
    returnAllObjects() {
        // Usamos una copia del Set para iterar de forma segura mientras modificamos el original
        const activeObjectsCopy = new Set(this.activeObjects);
        for (const materia of activeObjectsCopy) {
            this.returnObject(materia);
        }
    }
}
