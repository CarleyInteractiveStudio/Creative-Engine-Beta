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

            // The transpiled code is now a factory function: (CreativeScriptBehavior, RuntimeAPIManager) => class {...}
            // We need to evaluate it and then call it with the dependencies.
            const factory = (new Function(`return ${transpiledCode}`))();

            // We need the actual CreativeScriptBehavior class and RuntimeAPIManager module.
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

            // Set source from the sheet and load the actual image
            this.source = `Assets/${this.spriteSheet.sourceImage}`;
            await this.loadSprite(projectsDirHandle);

            // Default to the first sprite if none is selected
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
        // The sprite and spritesheet will be loaded automatically
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

export class AudioSource extends Leyes {
    constructor(materia) {
        super(materia);
        this.source = ''; // Path to the audio file
        this.volume = 1.0;
        this.loop = false;
        this.playOnAwake = true;
    }
    clone() {
        const newAudio = new AudioSource(null);
        newAudio.source = this.source;
        newAudio.volume = this.volume;
        newAudio.loop = this.loop;
        newAudio.playOnAwake = this.playOnAwake;
        return newAudio;
    }
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

export class Tilemap extends Leyes {
    constructor(materia) {
        super(materia);
        this.columns = 20;
        this.rows = 20;
        this.palettePath = ''; // Path to the .cepalette asset
        this.activeLayerIndex = 0;

        // Layers are now objects with a name and data grid.
        this.layers = [{
            name: 'Capa 1',
            data: this.createGridData(this.columns, this.rows)
        }];
    }

    createGridData(cols, rows) {
        return Array(rows).fill(null).map(() => Array(cols).fill(-1)); // -1 means empty tile
    }

    addLayer(name = `Capa ${this.layers.length + 1}`) {
        this.layers.push({
            name: name,
            data: this.createGridData(this.columns, this.rows)
        });
        this.activeLayerIndex = this.layers.length - 1; // Set new layer as active
    }

    removeLayer(index) {
        if (this.layers.length > 1 && index >= 0 && index < this.layers.length) {
            this.layers.splice(index, 1);
            // Adjust active layer if necessary
            if (this.activeLayerIndex >= index) {
                this.activeLayerIndex = Math.max(0, this.activeLayerIndex - 1);
            }
        }
    }

    setTile(layerIndex, x, y, tileId) {
        const layer = this.layers[layerIndex];
        if (layer && layer.data[y] && layer.data[y][x] !== undefined) {
            layer.data[y][x] = tileId;
        }
    }

    getTile(layerIndex, x, y) {
        return this.layers[layerIndex]?.data?.[y]?.[x] ?? -1;
    }

    resize(newCols, newRows) {
        this.columns = newCols;
        this.rows = newRows;
        // Resize all existing layers
        this.layers.forEach(layer => {
            const newGrid = this.createGridData(newCols, newRows);
            const oldGrid = layer.data;
            // Copy old data over
            for (let r = 0; r < Math.min(oldGrid.length, newRows); r++) {
                for (let c = 0; c < Math.min(oldGrid[r].length, newCols); c++) {
                    newGrid[r][c] = oldGrid[r][c];
                }
            }
            layer.data = newGrid;
        });
    }

    clone() {
        const newTilemap = new Tilemap(null);
        newTilemap.tileWidth = this.tileWidth;
        newTilemap.tileHeight = this.tileHeight;
        newTilemap.columns = this.columns;
        newTilemap.rows = this.rows;
        newTilemap.palettePath = this.palettePath;
        newTilemap.activeLayerIndex = this.activeLayerIndex;
        // Deep copy layers
        newTilemap.layers = JSON.parse(JSON.stringify(this.layers));
        return newTilemap;
    }
}

export class TilemapRenderer extends Leyes {
    constructor(materia) {
        super(materia);
        this.palette = null; // Loaded palette asset
        this.tileSheet = null; // The Image object for the tiles
        this.sortingLayer = 'Default';
        this.orderInLayer = 0;
    }

    async loadPalette(projectsDirHandle) {
        const tilemap = this.materia.getComponent(Tilemap);
        if (!tilemap || !tilemap.palettePath) {
            this.palette = null;
            this.tileSheet = null;
            return;
        }

        try {
            // Load palette JSON
            const paletteUrl = await getURLForAssetPath(tilemap.palettePath, projectsDirHandle);
            if (!paletteUrl) throw new Error(`Could not get URL for palette: ${tilemap.palettePath}`);
            const response = await fetch(paletteUrl);
            this.palette = await response.json();

            // Load tile sheet image
            if (this.palette.imagePath) {
                const imageUrl = await getURLForAssetPath(this.palette.imagePath, projectsDirHandle);
                if (imageUrl) {
                    this.tileSheet = new Image();
                    await new Promise((resolve, reject) => {
                        this.tileSheet.onload = resolve;
                        this.tileSheet.onerror = reject;
                        this.tileSheet.src = imageUrl;
                    });
                }
            }
        } catch (error) {
            console.error(`Failed to load palette or associated tilesheet for '${tilemap.palettePath}':`, error);
            this.palette = null;
            this.tileSheet = null;
        }
    }

    clone() {
        const newRenderer = new TilemapRenderer(null);
        newRenderer.sortingLayer = this.sortingLayer;
        newRenderer.orderInLayer = this.orderInLayer;
        // The palette will be reloaded based on the Tilemap's path.
        return newRenderer;
    }
}

registerComponent('Tilemap', Tilemap);
registerComponent('TilemapRenderer', TilemapRenderer);

export class TilemapCollider2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.usedByComposite = false;
        this.usedByEffector = false;
        this.isTrigger = false;
        this.offset = { x: 0, y: 0 };
        this.sourceLayerIndex = 0; // Which layer to use for collision
        this.generatedColliders = []; // Array of {x, y, width, height} objects
    }

    generate() {
        const tilemap = this.materia.getComponent(Tilemap);
        if (!tilemap || !tilemap.layers[this.sourceLayerIndex]) {
            this.generatedColliders = [];
            return;
        }

        const grid = tilemap.layers[this.sourceLayerIndex].data;
        const { columns, rows, tileWidth, tileHeight } = tilemap;

        const visited = Array(rows).fill(null).map(() => Array(columns).fill(false));
        const rects = [];

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < columns; c++) {
                if (grid[r][c] !== -1 && !visited[r][c]) {
                    let currentWidth = 1;
                    while (c + currentWidth < columns && grid[r][c + currentWidth] !== -1 && !visited[r][c + currentWidth]) {
                        currentWidth++;
                    }

                    let currentHeight = 1;
                    while (r + currentHeight < rows) {
                        let canExpandDown = true;
                        for (let i = 0; i < currentWidth; i++) {
                            if (grid[r + currentHeight][c + i] === -1 || visited[r + currentHeight][c + i]) {
                                canExpandDown = false;
                                break;
                            }
                        }
                        if (canExpandDown) {
                            currentHeight++;
                        } else {
                            break;
                        }
                    }

                    for (let y = 0; y < currentHeight; y++) {
                        for (let x = 0; x < currentWidth; x++) {
                            visited[r + y][c + x] = true;
                        }
                    }

                    const mapTotalWidth = columns * tileWidth;
                    const mapTotalHeight = rows * tileHeight;
                    const rectWidth_pixels = currentWidth * tileWidth;
                    const rectHeight_pixels = currentHeight * tileHeight;
                    const rectCenterX = (c * tileWidth) + (rectWidth_pixels / 2);
                    const rectCenterY = (r * tileHeight) + (rectHeight_pixels / 2);

                    const relativeX = rectCenterX - (mapTotalWidth / 2);
                    const relativeY = rectCenterY - (mapTotalHeight / 2);

                    rects.push({
                        x: relativeX,
                        y: relativeY,
                        width: rectWidth_pixels,
                        height: rectHeight_pixels
                    });
                }
            }
        }

        this.generatedColliders = rects;
        console.log(`Generados ${rects.length} colisionadores optimizados.`);
    }

    clone() {
        const newCollider = new TilemapCollider2D(null);
        newCollider.usedByComposite = this.usedByComposite;
        newCollider.usedByEffector = this.usedByEffector;
        newCollider.isTrigger = this.isTrigger;
        newCollider.offset = { ...this.offset };
        newCollider.sourceLayerIndex = this.sourceLayerIndex;
        // The colliders themselves are not copied; they should be regenerated.
        return newCollider;
    }
}

export class Grid extends Leyes {
    constructor(materia) {
        super(materia);
        this.cellSize = { x: 32, y: 32 };
        this.cellLayout = 'Rectangular'; // Future: Isometric, Hexagonal
    }

    clone() {
        const newGrid = new Grid(null);
        newGrid.cellSize = { ...this.cellSize };
        newGrid.cellLayout = this.cellLayout;
        return newGrid;
    }
}

registerComponent('Grid', Grid);
registerComponent('TilemapCollider2D', TilemapCollider2D);

export class CompositeCollider2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.physicsMaterial = null;
        this.isTrigger = false;
        this.usedByEffector = false;
        this.offset = { x: 0, y: 0 };
        this.geometryType = 'Outlines'; // 'Outlines' or 'Polygons'
        this.generationType = 'Synchronous'; // 'Synchronous' or 'Asynchronous'
        this.vertexDistance = 0.005;
        this.offsetDistance = 0.025; // Replaces Edge Radius in some contexts
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

registerComponent('CompositeCollider2D', CompositeCollider2D);
