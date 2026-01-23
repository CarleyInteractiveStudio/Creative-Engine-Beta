// js/engine/CoroutineManager.js

/**
 * Manages the lifecycle of all coroutines (secuencias) in the game.
 */
class CoroutineManager {
    constructor() {
        // Array to hold all active coroutine runners
        this.coroutines = [];
    }

    /**
     * Starts a new coroutine.
     * @param {Generator} generatorObject The generator object returned by a generator function.
     */
    start(generatorObject) {
        this.coroutines.push({
            generator: generatorObject,
            waitTimer: 0,
        });
        // Immediately advance to the first yield
        this.resume(this.coroutines[this.coroutines.length - 1]);
    }

    /**
     * Updates all running coroutines. This should be called once per game frame.
     * @param {number} deltaTime The time elapsed since the last frame.
     */
    update(deltaTime) {
        // Iterate backwards to allow for safe removal of finished coroutines
        for (let i = this.coroutines.length - 1; i >= 0; i--) {
            const co = this.coroutines[i];

            if (co.waitTimer > 0) {
                co.waitTimer -= deltaTime;
            } else {
                this.resume(co);
            }
        }
    }

    /**
     * Resumes the execution of a specific coroutine.
     * @param {object} co The coroutine object to resume.
     */
    resume(co) {
        const result = co.generator.next();

        if (result.done) {
            // The coroutine has finished, remove it from the active list.
            this.coroutines = this.coroutines.filter(c => c !== co);
        } else {
            // The coroutine has yielded a value. Check if it's a wait command.
            if (typeof result.value === 'number' && result.value > 0) {
                // The yielded value is a number, so we set a wait timer.
                co.waitTimer = result.value;
            }
            // Future logic could handle yielding other types of values
            // (e.g., waiting for another coroutine, waiting for an animation to finish, etc.)
        }
    }

    /**
     * Stops and clears all running coroutines.
     * Called when the game stops or a scene is unloaded.
     */
    stopAll() {
        this.coroutines = [];
    }
}

// Export a single, global instance of the manager (Singleton pattern)
export const CoroutineManagerInstance = new CoroutineManager();
