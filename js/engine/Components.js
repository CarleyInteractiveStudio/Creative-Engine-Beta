// Components.js
// This file contains all the component classes.

import { Leyes } from './Leyes.js';
import { registerComponent } from './ComponentRegistry.js';
import { getURLForAssetPath } from './AssetUtils.js';

// --- Component Class Definitions ---

export class Transform extends Leyes {
    constructor(materia) { super(materia); this.x = 0; this.y = 0; this.rotation = 0; this.scale = { x: 1, y: 1 }; }
    clone() {
        const newTransform = new Transform(null);
        newTransform.x = this.x;
        newTransform.y = this.y;
        newTransform.rotation = this.rotation;
        newTransform.scale = { ...this.scale };
        return newTransform;
    }
}

export class Camera extends Leyes {
    constructor(materia) {
        super(materia);
        this.depth = 0; // Rendering order. Higher is drawn on top.
        this.projection = 'Perspective'; // 'Perspective' or 'Orthographic'
        this.fov = 60; // Field of View for Perspective
        this.orthographicSize = 5; // Size for Orthographic
        this.nearClipPlane = 0.1;
        this.farClipPlane = 1000;
        this.clearFlags = 'SolidColor'; // 'SolidColor', 'Skybox', or 'DontClear'
        this.backgroundColor = '#1e293b'; // Default solid color
        this.cullingMask = -1; // Bitmask, -1 means 'Everything'
        this.zoom = 1.0; // Editor-only zoom, not part of the component's data.
    }
    clone() {
        const newCamera = new Camera(null);
        newCamera.depth = this.depth;
        newCamera.projection = this.projection;
        newCamera.fov = this.fov;
        newCamera.orthographicSize = this.orthographicSize;
        newCamera.nearClipPlane = this.nearClipPlane;
        newCamera.farClipPlane = this.farClipPlane;
        newCamera.clearFlags = this.clearFlags;
        newCamera.backgroundColor = this.backgroundColor;
        newCamera.cullingMask = this.cullingMask;
        return newCamera;
    }
}

export class CreativeScript extends Leyes {
    constructor(materia, scriptName) { super(materia); this.scriptName = scriptName; this.instance = null; this.publicVars = []; this.publicVarReferences = {}; }
    parsePublicVars(code) { this.publicVars = []; const regex = /public\s+(\w+)\s+(\w+);/g; let match; while ((match = regex.exec(code)) !== null) { this.publicVars.push({ type: match[1], name: match[2] }); } }
    async load(projectsDirHandle) { if (!this.scriptName) return; try { const projectName = new URLSearchParams(window.location.search).get('project'); const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName); let currentHandle = projectHandle; const parts = this.scriptName.split('/').filter(p => p); const fileName = parts.pop(); for (const part of parts) { currentHandle = await currentHandle.getDirectoryHandle(part); } const fileHandle = await currentHandle.getFileHandle(fileName); const file = await fileHandle.getFile(); const code = await file.text(); this.parsePublicVars(code); const scriptModule = new Function('materia', `${code}\nreturn { start, update };`)(this.materia); this.instance = { start: scriptModule.start || (() => {}), update: scriptModule.update || (() => {}), }; for (const key in this.publicVarReferences) { this.instance[key] = this.publicVarReferences[key]; } } catch (error) { console.error(`Error loading script '${this.scriptName}':`, error); } }
    clone() {
        const newScript = new CreativeScript(null, this.scriptName);
        // Deep copy public var references
        newScript.publicVarReferences = JSON.parse(JSON.stringify(this.publicVarReferences));
        return newScript;
    }
}

export class Rigidbody extends Leyes {
    constructor(materia) {
        super(materia);
        this.bodyType = 'dynamic'; // 'dynamic', 'static', 'kinematic'
        this.mass = 1.0;
        this.velocity = { x: 0, y: 0 };
    }
    clone() {
        const newRigidbody = new Rigidbody(null);
        newRigidbody.bodyType = this.bodyType;
        newRigidbody.mass = this.mass;
        newRigidbody.velocity = { ...this.velocity };
        return newRigidbody;
    }
}

export class BoxCollider extends Leyes {
    constructor(materia) {
        super(materia);
        this.width = 1.0;
        this.height = 1.0;
    }
    clone() {
        const newBoxCollider = new BoxCollider(null);
        newBoxCollider.width = this.width;
        newBoxCollider.height = this.height;
        return newBoxCollider;
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
        return new Promise(async (resolve, reject) => {
            if (this.source) {
                const url = await getURLForAssetPath(this.source, projectsDirHandle);
                if (url) {
                    this.sprite.onload = () => resolve();
                    this.sprite.onerror = () => {
                        console.error(`Failed to load sprite at: ${this.source}`);
                        reject(new Error(`Failed to load sprite at: ${this.source}`));
                    };
                    this.sprite.src = url;
                } else {
                    this.sprite.src = '';
                    resolve(); // Resolve immediately if there's no URL
                }
            } else {
                this.sprite.src = '';
                resolve(); // Resolve immediately if there's no source
            }
        });
    }
    clone() {
        const newRenderer = new SpriteRenderer(null);
        newRenderer.source = this.source;
        newRenderer.color = this.color;
        // The sprite will be loaded automatically when added to a materia in the scene
        return newRenderer;
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
                }
            }
            this.spriteRenderer.sprite.src = animation.frames[this.currentFrame];
        }
    }
    clone() {
        const newAnimator = new Animator(null);
        newAnimator.controllerPath = this.controllerPath;
        // Parameters could be deep copied if they are simple JSON objects
        newAnimator.parameters = new Map(JSON.parse(JSON.stringify(Array.from(this.parameters))));
        return newAnimator;
    }
}

export class RectTransform extends Leyes {
    constructor(materia) {
        super(materia);
        this.x = 0;
        this.y = 0;
        this.width = 100;
        this.height = 100;
        this.pivot = { x: 0.5, y: 0.5 };
        this.anchorMin = { x: 0.5, y: 0.5 };
        this.anchorMax = { x: 0.5, y: 0.5 };
    }

    getWorldRect(parentCanvas) {
        // For now, a simplified version that doesn't handle nesting.
        // It assumes the parent is the main canvas.
        const parentWidth = parentCanvas.width;
        const parentHeight = parentCanvas.height;

        // Calculate anchor positions in pixels
        const anchorMinX = parentWidth * this.anchorMin.x;
        const anchorMinY = parentHeight * this.anchorMin.y;

        // Calculate the position of the pivot point relative to the anchors
        const pivotPosX = anchorMinX + this.x;
        const pivotPosY = anchorMinY + this.y;

        // Calculate the top-left corner of the rectangle based on the pivot
        const rectX = pivotPosX - (this.width * this.pivot.x);
        const rectY = pivotPosY - (this.height * this.pivot.y);

        return {
            x: rectX,
            y: rectY,
            width: this.width,
            height: this.height
        };
    }
    clone() {
        const newRectTransform = new RectTransform(null);
        newRectTransform.x = this.x;
        newRectTransform.y = this.y;
        newRectTransform.width = this.width;
        newRectTransform.height = this.height;
        newRectTransform.pivot = { ...this.pivot };
        newRectTransform.anchorMin = { ...this.anchorMin };
        newRectTransform.anchorMax = { ...this.anchorMax };
        return newRectTransform;
    }
}

export class UICanvas extends Leyes {
    constructor(materia) {
        super(materia);
        this.renderMode = 'ScreenSpaceOverlay';
    }
    clone() {
        const newCanvas = new UICanvas(null);
        newCanvas.renderMode = this.renderMode;
        return newCanvas;
    }
}

export class UIImage extends Leyes {
    constructor(materia) {
        super(materia);
        this.sprite = new Image();
        this.source = '';
        this.color = '#ffffff';
    }

    async loadSprite(projectsDirHandle) {
        if (this.source) {
            const url = await getURLForAssetPath(this.source, projectsDirHandle);
            if (url) {
                this.sprite.src = url;
            }
        } else {
            this.sprite.src = '';
        }
    }
    clone() {
        const newImage = new UIImage(null);
        newImage.source = this.source;
        newImage.color = this.color;
        return newImage;
    }
}

export class PointLight2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.color = '#FFFFFF';
        this.intensity = 1.0;
        this.radius = 200; // Default radius in pixels/world units
    }
    clone() {
        const newLight = new PointLight2D(null);
        newLight.color = this.color;
        newLight.intensity = this.intensity;
        newLight.radius = this.radius;
        return newLight;
    }
}

export class SpotLight2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.color = '#FFFFFF';
        this.intensity = 1.0;
        this.radius = 300;
        this.angle = 45; // The angle of the cone in degrees
    }
    clone() {
        const newLight = new SpotLight2D(null);
        newLight.color = this.color;
        newLight.intensity = this.intensity;
        newLight.radius = this.radius;
        newLight.angle = this.angle;
        return newLight;
    }
}

export class FreeformLight2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.color = '#FFFFFF';
        this.intensity = 1.0;
        // Default to a simple square shape relative to the object's origin
        this.vertices = [
            { x: -50, y: -50 },
            { x: 50, y: -50 },
            { x: 50, y: 50 },
            { x: -50, y: 50 }
        ];
    }
    clone() {
        const newLight = new FreeformLight2D(null);
        newLight.color = this.color;
        newLight.intensity = this.intensity;
        newLight.vertices = JSON.parse(JSON.stringify(this.vertices)); // Deep copy
        return newLight;
    }
}

export class SpriteLight2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.sprite = new Image();
        this.source = ''; // Path to the sprite texture
        this.color = '#FFFFFF';
        this.intensity = 1.0;
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
            this.sprite.src = '';
        }
    }

    clone() {
        const newLight = new SpriteLight2D(null);
        newLight.source = this.source;
        newLight.color = this.color;
        newLight.intensity = this.intensity;
        return newLight;
    }
}

// --- Component Registration ---

registerComponent('CreativeScript', CreativeScript);
registerComponent('Rigidbody', Rigidbody);
registerComponent('BoxCollider', BoxCollider);
registerComponent('Transform', Transform);
registerComponent('Camera', Camera);
registerComponent('SpriteRenderer', SpriteRenderer);
registerComponent('Animator', Animator);
registerComponent('RectTransform', RectTransform);
registerComponent('UICanvas', UICanvas);
registerComponent('UIImage', UIImage);
registerComponent('PointLight2D', PointLight2D);
registerComponent('SpotLight2D', SpotLight2D);
registerComponent('FreeformLight2D', FreeformLight2D);
registerComponent('SpriteLight2D', SpriteLight2D);
