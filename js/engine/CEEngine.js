// js/engine/CEEngine.js

/**
 * @typedef {import('./Materia.js').Materia} Materia
 * @typedef {import('./Physics.js').PhysicsSystem} PhysicsSystem
 */

class CEEngineAPI {
    constructor() {
        /** @type {Materia} */
        this.currentMateria = null;
        /** @type {PhysicsSystem} */
        this.physicsSystem = null;
    }

    /**
     * Initializes the API with necessary engine systems.
     * @param {PhysicsSystem} physicsSystem
     */
    initialize(physicsSystem) {
        this.physicsSystem = physicsSystem;
    }

    /**
     * Sets the current materia context for the API calls. This is called by the script engine before running a script's update.
     * @param {Materia} materia
     */
    setCurrentMateria(materia) {
        this.currentMateria = materia;
    }

    // --- Collision Methods ---

    getCollisionEnter() {
        if (!this.physicsSystem || !this.currentMateria) return [];
        return this.physicsSystem.getCollisionInfo(this.currentMateria, 'enter', 'collision');
    }

    getCollisionStay() {
        if (!this.physicsSystem || !this.currentMateria) return [];
        return this.physicsSystem.getCollisionInfo(this.currentMateria, 'stay', 'collision');
    }

    getCollisionExit() {
        if (!this.physicsSystem || !this.currentMateria) return [];
        return this.physicsSystem.getCollisionInfo(this.currentMateria, 'exit', 'collision');
    }

    getTriggerEnter() {
        if (!this.physicsSystem || !this.currentMateria) return [];
        return this.physicsSystem.getCollisionInfo(this.currentMateria, 'enter', 'trigger');
    }

    getTriggerStay() {
        if (!this.physicsSystem || !this.currentMateria) return [];
        return this.physicsSystem.getCollisionInfo(this.currentMateria, 'stay', 'trigger');
    }

    getTriggerExit() {
        if (!this.physicsSystem || !this.currentMateria) return [];
        return this.physicsSystem.getCollisionInfo(this.currentMateria, 'exit', 'trigger');
    }
}

export const engineAPI = new CEEngineAPI();

export function getAPIs() {
    // These functions will have their context (`currentMateria`) set by the script runner before execution.
    return {
        'getCollisionEnter': () => engineAPI.getCollisionEnter(),
        'getCollisionStay': () => engineAPI.getCollisionStay(),
        'getCollisionExit': () => engineAPI.getCollisionExit(),
        'getTriggerEnter': () => engineAPI.getTriggerEnter(),
        'getTriggerStay': () => engineAPI.getTriggerStay(),
        'getTriggerExit': () => engineAPI.getTriggerExit(),
    };
}
