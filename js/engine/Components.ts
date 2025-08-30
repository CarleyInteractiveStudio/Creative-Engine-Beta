// Components.js
// This file contains all the component classes.

import { Leyes } from './Leyes.ts';
import { registerComponent } from './ComponentRegistry.ts';
import { getURLForAssetPath } from './AssetUtils.js';

// --- Component Class Definitions ---

export class Transform extends Leyes {
    x: number;
    y: number;
    rotation: number;
    scale: { x: number, y: number };

    constructor(materia: any) {
        super(materia);
        this.x = 0;
        this.y = 0;
        this.rotation = 0;
        this.scale = { x: 1, y: 1 };
    }
}

export class Camera extends Leyes {
    orthographicSize: number;
    zoom: number;

    constructor(materia: any) {
        super(materia);
        this.orthographicSize = 500; // Represents half of the vertical viewing volume height.
        this.zoom = 1.0; // Editor-only zoom, not part of the component's data.
    }
}

export class CreativeScript extends Leyes {
    scriptName: string;
    instance: any | null;
    publicVars: any[];
    publicVarReferences: { [key: string]: any };

    constructor(materia: any, scriptName: string) {
        super(materia);
        this.scriptName = scriptName;
        this.instance = null;
        this.publicVars = [];
        this.publicVarReferences = {};
    }

    parsePublicVars(code: string): void {
        this.publicVars = [];
        const regex = /public\s+(\w+)\s+(\w+);/g;
        let match;
        while ((match = regex.exec(code)) !== null) {
            this.publicVars.push({ type: match[1], name: match[2] });
        }
    }

    async load(projectsDirHandle: FileSystemDirectoryHandle): Promise<void> {
        if (!this.scriptName) return;
        try {
            const projectName = new URLSearchParams(window.location.search).get('project');
            if (!projectName) return;
            const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName);
            let currentHandle: FileSystemDirectoryHandle = projectHandle;
            const parts = this.scriptName.split('/').filter(p => p);
            const fileName = parts.pop();
            if (!fileName) return;
            for (const part of parts) {
                currentHandle = await currentHandle.getDirectoryHandle(part);
            }
            const fileHandle = await currentHandle.getFileHandle(fileName);
            const file = await fileHandle.getFile();
            const code = await file.text();
            this.parsePublicVars(code);
            const scriptModule = new Function('materia', `${code}\nreturn { start, update };`)(this.materia);
            this.instance = {
                start: scriptModule.start || (() => {}),
                update: scriptModule.update || (() => {}),
            };
            for (const key in this.publicVarReferences) {
                this.instance[key] = this.publicVarReferences[key];
            }
        } catch (error) {
            console.error(`Error loading script '${this.scriptName}':`, error);
        }
    }
}

export class Rigidbody extends Leyes {
    bodyType: string;
    mass: number;
    velocity: { x: number, y: number };

    constructor(materia: any) {
        super(materia);
        this.bodyType = 'dynamic'; // 'dynamic', 'static', 'kinematic'
        this.mass = 1.0;
        this.velocity = { x: 0, y: 0 };
    }
}

export class BoxCollider extends Leyes {
    width: number;
    height: number;

    constructor(materia: any) {
        super(materia);
        this.width = 1.0;
        this.height = 1.0;
    }
}

export class SpriteRenderer extends Leyes {
    sprite: HTMLImageElement;
    source: string;
    color: string;

    constructor(materia: any) {
        super(materia);
        this.sprite = new Image();
        this.source = ''; // Path to the image, relative to project root
        this.color = '#ffffff'; // Tint color
    }

    setSourcePath(path: string): void {
        this.source = path;
    }

    async loadSprite(projectsDirHandle: FileSystemDirectoryHandle): Promise<void> {
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
    name: string;
    frames: string[];
    speed: number;
    loop: boolean;

    constructor(name: string = 'New Animation') {
        this.name = name;
        this.frames = []; // Array of image source paths
        this.speed = 10; // Frames per second
        this.loop = true;
    }
}

export class Animator extends Leyes {
    controllerPath: string;
    controller: any | null;
    states: Map<string, any>;
    parameters: Map<string, any>;
    currentState: any | null;
    currentFrame: number;
    frameTimer: number;
    spriteRenderer: SpriteRenderer | undefined;

    constructor(materia: any) {
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

    async loadController(projectsDirHandle: FileSystemDirectoryHandle): Promise<void> {
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

    play(stateName: string): void {
        if (this.currentState?.name !== stateName && this.states.has(stateName)) {
            this.currentState = this.states.get(stateName);
            this.currentFrame = 0;
            this.frameTimer = 0;
            console.log(`Animator state changed to: ${stateName}`);
        }
    }

    update(deltaTime: number): void {
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
}

export class RectTransform extends Leyes {
    x: number;
    y: number;
    width: number;
    height: number;
    pivot: { x: number, y: number };
    anchorMin: { x: number, y: number };
    anchorMax: { x: number, y: number };

    constructor(materia: any) {
        super(materia);
        this.x = 0;
        this.y = 0;
        this.width = 100;
        this.height = 100;
        this.pivot = { x: 0.5, y: 0.5 };
        this.anchorMin = { x: 0.5, y: 0.5 };
        this.anchorMax = { x: 0.5, y: 0.5 };
    }

    getWorldRect(parentCanvas: HTMLCanvasElement): { x: number, y: number, width: number, height: number } {
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
}

export class UICanvas extends Leyes {
    renderMode: string;

    constructor(materia: any) {
        super(materia);
        this.renderMode = 'ScreenSpaceOverlay';
    }
}

export class UIImage extends Leyes {
    sprite: HTMLImageElement;
    source: string;
    color: string;

    constructor(materia: any) {
        super(materia);
        this.sprite = new Image();
        this.source = '';
        this.color = '#ffffff';
    }

    async loadSprite(projectsDirHandle: FileSystemDirectoryHandle): Promise<void> {
        if (this.source) {
            const url = await getURLForAssetPath(this.source, projectsDirHandle);
            if (url) {
                this.sprite.src = url;
            }
        } else {
            this.sprite.src = '';
        }
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
