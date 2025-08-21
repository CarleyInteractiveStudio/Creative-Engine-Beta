// Components.js
// This file contains all the component classes.

import { Leyes } from './Leyes.js';
import { registerComponent } from './ComponentRegistry.js';
import { getURLForAssetPath } from './SceneManager.js';

export class Transform extends Leyes { constructor(materia) { super(materia); this.x = 0; this.y = 0; this.rotation = 0; this.scale = { x: 1, y: 1 }; } }
export class Camera extends Leyes {
    constructor(materia) {
        super(materia);
        this.orthographicSize = 500; // Represents half of the vertical viewing volume height.
        this.zoom = 1.0; // Editor-only zoom, not part of the component's data.
    }
}

export class CreativeScript extends Leyes { constructor(materia, scriptName) { super(materia); this.scriptName = scriptName; this.instance = null; this.publicVars = []; this.publicVarReferences = {}; } parsePublicVars(code) { this.publicVars = []; const regex = /public\s+(\w+)\s+(\w+);/g; let match; while ((match = regex.exec(code)) !== null) { this.publicVars.push({ type: match[1], name: match[2] }); } } async load(projectsDirHandle) { if (!this.scriptName) return; try { const projectName = new URLSearchParams(window.location.search).get('project'); const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName); let currentHandle = projectHandle; const parts = this.scriptName.split('/').filter(p => p); const fileName = parts.pop(); for (const part of parts) { currentHandle = await currentHandle.getDirectoryHandle(part); } const fileHandle = await currentHandle.getFileHandle(fileName); const file = await fileHandle.getFile(); const code = await file.text(); this.parsePublicVars(code); const scriptModule = new Function('materia', `${code}\nreturn { start, update };`)(this.materia); this.instance = { start: scriptModule.start || (() => {}), update: scriptModule.update || (() => {}), }; for (const key in this.publicVarReferences) { this.instance[key] = this.publicVarReferences[key]; } } catch (error) { console.error(`Error loading script '${this.scriptName}':`, error); } } }
export class UICanvas extends Leyes { constructor(materia) { super(materia); } }
export class UIText extends Leyes { constructor(materia, text = 'Hola Mundo') { super(materia); this.text = text; this.fontSize = 16; this.color = '#ffffff'; this.textTransform = 'none'; } }
export class UIButton extends Leyes { constructor(materia) { super(materia); this.label = new UIText(materia, 'Botón'); this.color = '#2d2d30'; } }

export class Rigidbody extends Leyes {
    constructor(materia) {
        super(materia);
        this.bodyType = 'dynamic'; // 'dynamic', 'static', 'kinematic'
        this.mass = 1.0;
        this.velocity = { x: 0, y: 0 };
    }
}

export class BoxCollider extends Leyes {
    constructor(materia) {
        super(materia);
        this.width = 1.0;
        this.height = 1.0;
    }
}

export class SpriteRenderer extends Leyes {
    constructor(materia) {
        super(materia);
        this.sprite = new Image();
        this.source = ''; // Path to the image, relative to project root
        this.color = '#ffffff'; // Tint color
    }

    setSourcePath(path) {
        this.source = path;
    }

    async loadSprite(projectsDirHandle) {
        if (this.source) {
            const url = await getURLForAssetPath(this.source, projectsDirHandle);
            if (url) {
                this.sprite.src = url;
            }
        } else {
            this.sprite.src = ''; // Clear the image if source is empty
        }
    }
}

export class Animation {
    constructor(name = 'New Animation') {
        this.name = name;
        this.frames = []; // Array of image source paths
        this.speed = 10; // Frames per second
        this.loop = true;
    }
}

export class Animator extends Leyes {
    constructor(materia) {
        super(materia);
        this.controllerPath = ''; // Path to the .ceanim asset
        this.controller = null; // The loaded controller data
        this.states = new Map(); // Holds the runtime animation data, keyed by state name
        this.parameters = new Map(); // Holds runtime parameter values

        this.currentState = null;
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.spriteRenderer = this.materia.getComponent(SpriteRenderer);
    }

    async loadController(projectsDirHandle) {
        if (!this.controllerPath) return;
        this.spriteRenderer = this.materia.getComponent(SpriteRenderer); // Ensure we have the renderer

        try {
            const url = await getURLForAssetPath(this.controllerPath, projectsDirHandle);
            if (!url) throw new Error(`Could not get URL for controller: ${this.controllerPath}`);

            const response = await fetch(url);
            this.controller = await response.json();

            // Load all animations defined in the states
            for (const state of this.controller.states) {
                const animUrl = await getURLForAssetPath(state.animationAsset, projectsDirHandle);
                if (animUrl) {
                    const animResponse = await fetch(animUrl);
                    const animData = await animResponse.json();
                    // We assume the .cea file has an array of animations, we take the first one
                    this.states.set(state.name, { ...state, ...animData.animations[0] });
                }
            }

            // Set initial state
            if (this.controller.entryState) {
                this.play(this.controller.entryState);
            }

        } catch (error) {
            console.error(`Failed to load Animator Controller at '${this.controllerPath}':`, error);
        }
    }

    play(stateName) {
        if (this.currentState?.name !== stateName && this.states.has(stateName)) {
            this.currentState = this.states.get(stateName);
            this.currentFrame = 0;
            this.frameTimer = 0;
            console.log(`Animator state changed to: ${stateName}`);
        }
    }

    update(deltaTime) {
        if (!this.currentState || !this.spriteRenderer) {
            return;
        }

        const animation = this.currentState;
        if (!animation.frames || animation.frames.length === 0) return;

        this.frameTimer += deltaTime;
        const frameDuration = 1 / (animation.speed || 10);

        if (this.frameTimer >= frameDuration) {
            this.frameTimer = 0; // Reset timer
            this.currentFrame++;

            if (this.currentFrame >= animation.frames.length) {
                if (animation.loop) {
                    this.currentFrame = 0;
                } else {
                    this.currentFrame = animation.frames.length - 1; // Stay on last frame
                    // Here we would check for transitions in the future
                }
            }
            // The animation frames are pre-loaded data URLs from the .cea file
            this.spriteRenderer.sprite.src = animation.frames[this.currentFrame];
        }
    }
}

registerComponent('CreativeScript', CreativeScript);
registerComponent('UICanvas', UICanvas);
registerComponent('UIText', UIText);
registerComponent('UIButton', UIButton);
registerComponent('Rigidbody', Rigidbody);
registerComponent('BoxCollider', BoxCollider);
registerComponent('Transform', Transform);
registerComponent('Camera', Camera);
registerComponent('SpriteRenderer', SpriteRenderer);
registerComponent('Animator', Animator);
