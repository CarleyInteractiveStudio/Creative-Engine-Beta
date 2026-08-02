// js/editor/UndoRedoManager.js

class UndoRedoManager {
    constructor() {
        this.undoStack = [];
        this.redoStack = [];
        this.maxStackSize = 50; // generous undo history
        this.isApplyingState = false; // flag to prevent recording state while restoring
    }

    // Capture the current scene state and push to undo stack
    recordState() {
        if (this.isApplyingState) return;
        if (!window.SceneManager || !window.SceneManager.currentScene) return;

        // Check if game is running; we do not want to record editor undo states during gameplay
        if (window.isGameRunning) return;

        try {
            const serialized = window.SceneManager.serializeScene(window.SceneManager.currentScene, null);
            const selectedId = window.selectedMateria ? window.selectedMateria.id : null;

            const stateEntry = {
                sceneData: JSON.parse(JSON.stringify(serialized)), // deep copy
                selectedId: selectedId
            };

            // Check if this state is identical to the top of the stack to avoid duplicates
            if (this.undoStack.length > 0) {
                const lastEntry = this.undoStack[this.undoStack.length - 1];
                if (JSON.stringify(lastEntry.sceneData) === JSON.stringify(stateEntry.sceneData)) {
                    return; // Don't record identical duplicate states
                }
            }

            this.undoStack.push(stateEntry);
            if (this.undoStack.length > this.maxStackSize) {
                this.undoStack.shift();
            }

            // Clear redo stack on new action
            this.redoStack = [];

            // Mark scene as dirty
            if (window.SceneManager.setSceneDirty) {
                window.SceneManager.setSceneDirty(true);
            }
        } catch (e) {
            console.error("[UndoRedoManager] Failed to record state:", e);
        }
    }

    async undo() {
        if (this.undoStack.length <= 1) {
            console.log("[UndoRedoManager] Nothing to undo");
            return;
        }

        this.isApplyingState = true;
        try {
            // The current state is the top of the undo stack
            const currentState = this.undoStack.pop();
            this.redoStack.push(currentState);

            // The state we want to restore is the new top of the undo stack
            const targetState = this.undoStack[this.undoStack.length - 1];
            await this.restoreState(targetState);
        } catch (e) {
            console.error("[UndoRedoManager] Error during undo:", e);
        } finally {
            this.isApplyingState = false;
        }
    }

    async redo() {
        if (this.redoStack.length === 0) {
            console.log("[UndoRedoManager] Nothing to redo");
            return;
        }

        this.isApplyingState = true;
        try {
            const targetState = this.redoStack.pop();
            this.undoStack.push(targetState);
            await this.restoreState(targetState);
        } catch (e) {
            console.error("[UndoRedoManager] Error during redo:", e);
        } finally {
            this.isApplyingState = false;
        }
    }

    async restoreState(stateEntry) {
        if (!stateEntry || !window.SceneManager) return;

        console.log("[UndoRedoManager] Restoring scene state...");
        const { sceneData, selectedId } = stateEntry;

        // Deserialise the scene data
        const restoredScene = await window.SceneManager.deserializeScene(
            JSON.parse(JSON.stringify(sceneData)),
            window.projectsDirHandle
        );

        // Recreate physics system for the new scene
        if (window.PhysicsSystem) {
            const physicsSystem = new window.PhysicsSystem(restoredScene);
            restoredScene.physicsSystem = physicsSystem;
        }

        // Initialize UI system with new scene
        if (window.UISystem) {
            window.UISystem.initialize(restoredScene);
        }

        // Assign back to the scene manager
        window.SceneManager.currentScene = restoredScene;

        // Restore selection if possible
        if (selectedId !== null) {
            const restoredMateria = restoredScene.findMateriaById(selectedId);
            if (restoredMateria) {
                if (window.selectMateria) {
                    window.selectMateria(restoredMateria);
                }
            } else {
                if (window.selectMateria) window.selectMateria(null);
            }
        } else {
            if (window.selectMateria) window.selectMateria(null);
        }

        // Load assets to ensure they are fully visible
        await restoredScene.loadAllAssets(window.projectsDirHandle);

        // Update UI
        if (window.updateHierarchy) window.updateHierarchy();
        if (window.updateInspector) window.updateInspector();
        if (window.updateScene) window.updateScene();
    }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }
}

window.UndoRedoManager = new UndoRedoManager();
export { UndoRedoManager };
