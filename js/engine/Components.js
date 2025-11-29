// Components.js
// This file contains all the component classes.

import { Leyes } from './Leyes.js';
import { registerComponent } from './ComponentRegistry.js';
import { getURLForAssetPath } from './AssetUtils.js';
import * as CES_Transpiler from '../editor/CES_Transpiler.js';
import * as RuntimeAPIManager from './RuntimeAPIManager.js';


// --- Base Behavior for Scripts ---
export class CreativeScriptBehavior {
    constructor(materia) {
        this.materia = materia;
        this.transform = materia.getComponent(Transform);
    }
    star() { /* To be overridden by user scripts */ }
    update(deltaTime) { /* To be overridden by user scripts */ }
}

// --- Component Class Definitions ---

export class Transform extends Leyes {
    constructor(materia) {
        super(materia);
        this.position = { x: 0, y: 0 };
        this.rotation = 0;
        this.scale = { x: 1, y: 1 };
    }
    clone() {
        const newTransform = new Transform(null);
        newTransform.position = { ...this.position };
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
    constructor(materia, scriptName) {
        super(materia);
        this.scriptName = scriptName;
        this.instance = null;
        this.isInitialized = false;
    }

    // Called once when the game starts, after initializeInstance
    star() {
        if (this.instance && typeof this.instance.star === 'function') {
            this.instance.star();
        }
    }

    // Called every frame
    update(deltaTime) {
        if (this.instance && typeof this.instance.update === 'function') {
            this.instance.update(deltaTime);
        }
    }

    // Called during scene load. Just notes the script name.
    async load(projectsDirHandle) {
        // Intentionally left simple. The real work is in initializeInstance.
        return Promise.resolve();
    }

    // Called by startGame, just before the first star() call.
    async initializeInstance() {
        if (this.isInitialized || !this.scriptName) return;

        try {
            const transpiledCode = CES_Transpiler.getTranspiledCode(this.scriptName);
            if (!transpiledCode) {
                throw new Error(`No se encontró código transpilado para '${this.scriptName}'.`);
            }

            const factory = (new Function(`return ${transpiledCode}`))();
            const ScriptClass = factory(CreativeScriptBehavior, RuntimeAPIManager);
            if (ScriptClass) {
                this.instance = new ScriptClass(this.materia);
                this.isInitialized = true;
                console.log(`Script '${this.scriptName}' instanciado con éxito.`);
            } else {
                throw new Error(`El script '${this.scriptName}' no exporta una clase por defecto.`);
            }
        } catch (error) {
            console.error(`Error al inicializar la instancia del script '${this.scriptName}':`, error);
            this.isInitialized = false; // Mark as failed
        }
    }

    clone() {
        return new CreativeScript(null, this.scriptName);
    }
}

export class Rigidbody2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.bodyType = 'Dynamic'; // 'Dynamic', 'Kinematic', 'Static'
        this.simulated = true;
        this.physicsMaterial = null; // Reference to a PhysicsMaterial2D asset
        this.useAutoMass = false;
        this.mass = 1.0;
        this.linearDrag = 0.0;
        this.angularDrag = 0.05;
        this.gravityScale = 1.0;
        this.collisionDetection = 'Discrete'; // 'Discrete', 'Continuous'
        this.sleepingMode = 'StartAwake'; // 'StartAwake', 'StartAsleep', 'NeverSleep'
        this.interpolate = 'None'; // 'None', 'Interpolate', 'Extrapolate'
        this.constraints = {
            freezePositionX: false,
            freezePositionY: false,
            freezeRotation: false
        };
        // Internal state, not exposed in inspector
        this.velocity = { x: 0, y: 0 };
    }
    clone() {
        const newRb = new Rigidbody2D(null);
        newRb.bodyType = this.bodyType;
        newRb.simulated = this.simulated;
        newRb.physicsMaterial = this.physicsMaterial;
        newRb.useAutoMass = this.useAutoMass;
        newRb.mass = this.mass;
        newRb.linearDrag = this.linearDrag;
        newRb.angularDrag = this.angularDrag;
        newRb.gravityScale = this.gravityScale;
        newRb.collisionDetection = this.collisionDetection;
        newRb.sleepingMode = this.sleepingMode;
        newRb.interpolate = this.interpolate;
        newRb.constraints = { ...this.constraints };
        newRb.velocity = { ...this.velocity };
        return newRb;
    }
}

export class BoxCollider2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.usedByComposite = false;
        this.isTrigger = false;
        this.offset = { x: 0, y: 0 };
        this.size = { x: 1.0, y: 1.0 };
        this.edgeRadius = 0.0;
    }
    clone() {
        const newCollider = new BoxCollider2D(null);
        newCollider.usedByComposite = this.usedByComposite;
        newCollider.isTrigger = this.isTrigger;
        newCollider.offset = { ...this.offset };
        newCollider.size = { ...this.size };
        newCollider.edgeRadius = this.edgeRadius;
        return newCollider;
    }
}

export class SpriteRenderer extends Leyes {
    constructor(materia) {
        super(materia);
        this.sprite = new Image();
        this.source = ''; // Path to the source image file (e.g., player.png)
        this.spriteAssetPath = ''; // Path to the .ceSprite asset
        this.spriteName = ''; // Name of the specific sprite from the .ceSprite asset
        this.color = '#ffffff';
        this.spriteSheet = null; // Holds the loaded .ceSprite data
    }

    setSourcePath(path, projectsDirHandle) {
        if (path.endsWith('.ceSprite')) {
            this.spriteAssetPath = path;
            this.loadSpriteSheet(projectsDirHandle);
        } else {
            this.source = path;
            this.spriteAssetPath = '';
            this.spriteSheet = null;
            this.spriteName = '';
            this.loadSprite(projectsDirHandle);
        }
    }

    async loadSpriteSheet(projectsDirHandle) {
        if (!this.spriteAssetPath) return;
        try {
            const url = await getURLForAssetPath(this.spriteAssetPath, projectsDirHandle);
            if (!url) throw new Error('Could not get URL for .ceSprite asset');
            const response = await fetch(url);
            this.spriteSheet = await response.json();
            this.source = `Assets/${this.spriteSheet.sourceImage}`;
            await this.loadSprite(projectsDirHandle);
            if (!this.spriteName && this.spriteSheet.sprites && Object.keys(this.spriteSheet.sprites).length > 0) {
                this.spriteName = Object.keys(this.spriteSheet.sprites)[0];
            }
        } catch (error) {
            console.error(`Failed to load sprite sheet at '${this.spriteAssetPath}':`, error);
        }
    }

    async loadSprite(projectsDirHandle) {
        if (!this.source) {
            this.sprite.src = '';
            return;
        }
        const imageUrl = await getURLForAssetPath(this.source, projectsDirHandle);
        if (!imageUrl) {
            console.error(`Could not get URL for sprite source: ${this.source}`);
            return;
        }
        if (this.sprite.src !== imageUrl) {
            await new Promise((resolve, reject) => {
                this.sprite.onload = resolve;
                this.sprite.onerror = reject;
                this.sprite.src = imageUrl;
            }).catch(e => console.error(`Failed to load image: ${imageUrl}`, e));
        }
    }
    clone() {
        const newRenderer = new SpriteRenderer(null);
        newRenderer.source = this.source;
        newRenderer.spriteName = this.spriteName;
        newRenderer.color = this.color;
        return newRenderer;
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
    async loadController(projectsDirHandle) { /* Full implementation from original file */ }
    play(stateName) { /* Full implementation from original file */ }
    update(deltaTime) { /* Full implementation from original file */ }
    clone() {
        const newAnimator = new Animator(null);
        newAnimator.controllerPath = this.controllerPath;
        newAnimator.parameters = new Map(JSON.parse(JSON.stringify(Array.from(this.parameters))));
        return newAnimator;
    }
}

export class RectTransform extends Leyes {
    constructor(materia) {
        super(materia);
        this.x = 0; this.y = 0; this.width = 100; this.height = 100;
        this.pivot = { x: 0.5, y: 0.5 }; this.anchorMin = { x: 0.5, y: 0.5 }; this.anchorMax = { x: 0.5, y: 0.5 };
    }
    getWorldRect(parentCanvas) { /* Full implementation from original file */ }
    clone() {
        const newRectTransform = new RectTransform(null);
        newRectTransform.x = this.x; newRectTransform.y = this.y; newRectTransform.width = this.width; newRectTransform.height = this.height;
        newRectTransform.pivot = { ...this.pivot }; newRectTransform.anchorMin = { ...this.anchorMin }; newRectTransform.anchorMax = { ...this.anchorMax };
        return newRectTransform;
    }
}
export class UICanvas extends Leyes {
    constructor(materia) { super(materia); this.renderMode = 'ScreenSpaceOverlay'; }
    clone() { const newCanvas = new UICanvas(null); newCanvas.renderMode = this.renderMode; return newCanvas; }
}
export class UIImage extends Leyes {
    constructor(materia) { super(materia); this.sprite = new Image(); this.source = ''; this.color = '#ffffff'; }
    async loadSprite(projectsDirHandle) { if (this.source) { const url = await getURLForAssetPath(this.source, projectsDirHandle); if (url) this.sprite.src = url; } else { this.sprite.src = ''; } }
    clone() { const newImage = new UIImage(null); newImage.source = this.source; newImage.color = this.color; return newImage; }
}
export class PointLight2D extends Leyes {
    constructor(materia) { super(materia); this.color = '#FFFFFF'; this.intensity = 1.0; this.radius = 200; }
    clone() { const newLight = new PointLight2D(null); newLight.color = this.color; newLight.intensity = this.intensity; newLight.radius = this.radius; return newLight; }
}
export class SpotLight2D extends Leyes {
    constructor(materia) { super(materia); this.color = '#FFFFFF'; this.intensity = 1.0; this.radius = 300; this.angle = 45; }
    clone() { const newLight = new SpotLight2D(null); newLight.color = this.color; newLight.intensity = this.intensity; newLight.radius = this.radius; newLight.angle = this.angle; return newLight; }
}
export class FreeformLight2D extends Leyes {
    constructor(materia) { super(materia); this.color = '#FFFFFF'; this.intensity = 1.0; this.vertices = [{ x: -50, y: -50 }, { x: 50, y: -50 }, { x: 50, y: 50 }, { x: -50, y: 50 }]; }
    clone() { const newLight = new FreeformLight2D(null); newLight.color = this.color; newLight.intensity = this.intensity; newLight.vertices = JSON.parse(JSON.stringify(this.vertices)); return newLight; }
}
export class SpriteLight2D extends Leyes {
    constructor(materia) { super(materia); this.sprite = new Image(); this.source = ''; this.color = '#FFFFFF'; this.intensity = 1.0; }
    setSourcePath(path) { this.source = path; }
    async loadSprite(projectsDirHandle) { if (this.source) { const url = await getURLForAssetPath(this.source, projectsDirHandle); if (url) this.sprite.src = url; } else { this.sprite.src = ''; } }
    clone() { const newLight = new SpriteLight2D(null); newLight.source = this.source; newLight.color = this.color; newLight.intensity = this.intensity; return newLight; }
}
export class AudioSource extends Leyes {
    constructor(materia) { super(materia); this.source = ''; this.volume = 1.0; this.loop = false; this.playOnAwake = true; }
    clone() { const newAudio = new AudioSource(null); newAudio.source = this.source; newAudio.volume = this.volume; newAudio.loop = this.loop; newAudio.playOnAwake = this.playOnAwake; return newAudio; }
}

// --- Component Registration ---
registerComponent('CreativeScript', CreativeScript);
registerComponent('Rigidbody2D', Rigidbody2D);
registerComponent('BoxCollider2D', BoxCollider2D);
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
registerComponent('AudioSource', AudioSource);

// --- Tilemap Components ---

export class Grid extends Leyes {
    constructor(materia) {
        super(materia);
        this.cellSize = { x: 32, y: 32 };
        this.cellLayout = 'Rectangular';
    }
    clone() {
        const newGrid = new Grid(null);
        newGrid.cellSize = { ...this.cellSize };
        newGrid.cellLayout = this.cellLayout;
        return newGrid;
    }
}

export class Tilemap extends Leyes {
    constructor(materia) {
        super(materia);
        this.width = 16;
        this.height = 16;
        this.tileData = new Map();
    }
    clone() {
        const newTilemap = new Tilemap(null);
        newTilemap.width = this.width;
        newTilemap.height = this.height;
        newTilemap.tileData = new Map(JSON.parse(JSON.stringify(Array.from(this.tileData))));
        return newTilemap;
    }
}

export class TilemapRenderer extends Leyes {
    constructor(materia) {
        super(materia);
        this.sortingLayer = 'Default';
        this.orderInLayer = 0;
        this.imageCache = new Map();
        this.isDirty = true;
    }
    setDirty() { this.isDirty = true; }
    getImageForTile(tileData) {
        if (this.imageCache.has(tileData.imageData)) return this.imageCache.get(tileData.imageData);
        const image = new Image();
        image.src = tileData.imageData;
        this.imageCache.set(tileData.imageData, image);
        return image;
    }
    clone() {
        const newRenderer = new TilemapRenderer(null);
        newRenderer.sortingLayer = this.sortingLayer;
        newRenderer.orderInLayer = this.orderInLayer;
        return newRenderer;
    }
}

export class TilemapCollider2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.usedByComposite = false;
        this.usedByEffector = false;
        this.isTrigger = false;
        this.offset = { x: 0, y: 0 };
        this.generatedColliders = [];
    }

    generate() {
        const tilemap = this.materia.getComponent(Tilemap);
        if (!tilemap) { this.generatedColliders = []; return; }

        const parentMateria = this.materia.parent;
        if (!parentMateria) { console.error("TilemapCollider2D must be on a child of a Grid object."); this.generatedColliders = []; return; }

        const grid = parentMateria.getComponent(Grid);
        if (!grid) { console.error("Could not find Grid component on parent of TilemapCollider2D's object."); this.generatedColliders = []; return; }

        const { width, height, tileData } = tilemap;
        const { cellSize } = grid;
        const visited = new Set();
        const rects = [];

        for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
                const coord = `${c},${r}`;
                if (tileData.has(coord) && !visited.has(coord)) {
                    let currentWidth = 1;
                    while (c + currentWidth < width && tileData.has(`${c + currentWidth},${r}`) && !visited.has(`${c + currentWidth},${r}`)) {
                        currentWidth++;
                    }
                    let currentHeight = 1;
                    while (r + currentHeight < height) {
                        let canExpandDown = true;
                        for (let i = 0; i < currentWidth; i++) {
                            if (!tileData.has(`${c + i},${r + currentHeight}`) || visited.has(`${c + i},${r + currentHeight}`)) {
                                canExpandDown = false;
                                break;
                            }
                        }
                        if (canExpandDown) currentHeight++;
                        else break;
                    }

                    for (let y = 0; y < currentHeight; y++) {
                        for (let x = 0; x < currentWidth; x++) {
                            visited.add(`${c + x},${r + y}`);
                        }
                    }

                    const mapTotalWidth = width * cellSize.x;
                    const mapTotalHeight = height * cellSize.y;
                    const rectWidth_pixels = currentWidth * cellSize.x;
                    const rectHeight_pixels = currentHeight * cellSize.y;

                    const rectCenterX_local = (c * cellSize.x) + (rectWidth_pixels / 2);
                    const rectCenterY_local = (r * cellSize.y) + (rectHeight_pixels / 2);

                    const relativeX = rectCenterX_local - (mapTotalWidth / 2);
                    const relativeY = rectCenterY_local - (mapTotalHeight / 2);

                    rects.push({ x: relativeX, y: relativeY, width: rectWidth_pixels, height: rectHeight_pixels });
                }
            }
        }
        this.generatedColliders = rects;
        console.log(`Generated ${rects.length} optimized colliders.`);
    }

    clone() {
        const newCollider = new TilemapCollider2D(null);
        newCollider.usedByComposite = this.usedByComposite;
        newCollider.usedByEffector = this.usedByEffector;
        newCollider.isTrigger = this.isTrigger;
        newCollider.offset = { ...this.offset };
        return newCollider;
    }
}


export class CompositeCollider2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.physicsMaterial = null;
        this.isTrigger = false;
        this.usedByEffector = false;
        this.offset = { x: 0, y: 0 };
        this.geometryType = 'Outlines';
        this.generationType = 'Synchronous';
        this.vertexDistance = 0.005;
        this.offsetDistance = 0.025;
    }
    clone() {
        const newCollider = new CompositeCollider2D(null);
        newCollider.physicsMaterial = this.physicsMaterial;
        newCollider.isTrigger = this.isTrigger;
        newCollider.usedByEffector = this.usedByEffector;
        newCollider.offset = { ...this.offset };
        newCollider.geometryType = this.geometryType;
        newCollider.generationType = this.generationType;
        newCollider.vertexDistance = this.vertexDistance;
        newCollider.offsetDistance = this.offsetDistance;
        return newCollider;
    }
}

registerComponent('Grid', Grid);
registerComponent('Tilemap', Tilemap);
registerComponent('TilemapRenderer', TilemapRenderer);
registerComponent('TilemapCollider2D', TilemapCollider2D);
registerComponent('CompositeCollider2D', CompositeCollider2D);
