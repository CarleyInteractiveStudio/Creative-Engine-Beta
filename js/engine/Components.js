// Components.js
// This file contains all the component classes.

import { Leyes } from './Leyes.js';
import { registerComponent } from './ComponentRegistry.js';
import { getURLForAssetPath } from './AssetUtils.js';
import * as CES_Transpiler from '../editor/CES_Transpiler.js';
import * as RuntimeAPIManager from './RuntimeAPIManager.js';

// --- Bilingual Component Aliases ---
const componentAliases = {
    'Transform': 'transformacion',
    'Rigidbody2D': 'fisica',
    'AnimatorController': 'controladorAnimacion',
    'SpriteRenderer': 'renderizadorDeSprite',
    'AudioSource': 'fuenteDeAudio',
    'BoxCollider2D': 'colisionadorCaja2D',
    'CapsuleCollider2D': 'colisionadorCapsula2D',
    'Camera': 'camara',
    'Animator': 'animador',
    'PointLight2D': 'luzPuntual2D',
    'SpotLight2D': 'luzFocal2D',
    'Tilemap': 'mapaDeAzulejos',
    'TilemapRenderer': 'renderizadorMapaDeAzulejos',
    'TilemapCollider2D': 'colisionadorMapaDeAzulejos2D',
    'Grid': 'rejilla',
    'TextureRender': 'renderizadorDeTextura',
    'UICanvas': 'lienzoUI',
    'UIImage': 'imagenUI',
    'RectTransform': 'transformacionRect',
};


// --- Base Behavior for Scripts ---
export class CreativeScriptBehavior {
    constructor(materia) {
        this.materia = materia;

        // --- Component Shortcuts ---
        this._initializeComponentShortcuts();

    }

    /**
     * @private
     * Initializes shortcuts to all components on the Materia in both English and Spanish.
     * This makes 'SpriteRenderer' accessible via `this.spriteRenderer` and `this.renderizadorDeSprite`.
     */
    _initializeComponentShortcuts() {
        if (!this.materia || !this.materia.leyes) return;

        for (const component of this.materia.leyes) {
            const componentName = component.constructor.name;
            const shortcutName = componentName.charAt(0).toLowerCase() + componentName.slice(1);

            // Create the primary (English) shortcut (e.g., this.spriteRenderer)
            if (!this.hasOwnProperty(shortcutName)) {
                this[shortcutName] = component;
            }

            // Create the Spanish alias if it exists in the map
            const alias = componentAliases[componentName];
            if (alias && !this.hasOwnProperty(alias)) {
                this[alias] = component;
            }
        }
    }
    star() { /* To be overridden by user scripts */ }
    update(deltaTime) { /* To be overridden by user scripts */ } // Kept for compatibility; user scripts receive deltaTime now
}

// --- Component Class Definitions ---

export class Transform extends Leyes {
    constructor(materia) {
        super(materia);
        // Propiedades locales relativas al padre
        this.localPosition = { x: 0, y: 0 };
        this.localRotation = 0;
        this.localScale = { x: 1, y: 1 };
    }

    // --- Posición Global (World Position) ---
    get position() {
        if (!this.materia || !this.materia.parent) {
            return { ...this.localPosition };
        }
        const parentTransform = this.materia.parent.getComponent(Transform);
        if (!parentTransform) {
            return { ...this.localPosition };
        }

        const parentPos = parentTransform.position;
        const parentScale = parentTransform.scale;
        const parentRotRad = parentTransform.rotation * (Math.PI / 180);
        const cos = Math.cos(parentRotRad);
        const sin = Math.sin(parentRotRad);

        // Aplicar escala y rotación del padre a la posición local
        const rotatedX = (this.localPosition.x * parentScale.x * cos) - (this.localPosition.y * parentScale.y * sin);
        const rotatedY = (this.localPosition.x * parentScale.x * sin) + (this.localPosition.y * parentScale.y * cos);

        return {
            x: parentPos.x + rotatedX,
            y: parentPos.y + rotatedY
        };
    }

    set position(worldPosition) {
        if (!this.materia || !this.materia.parent) {
            this.localPosition = { ...worldPosition };
            return;
        }
        const parentTransform = this.materia.parent.getComponent(Transform);
        if (!parentTransform) {
            this.localPosition = { ...worldPosition };
            return;
        }

        const parentPos = parentTransform.position;
        const parentScale = parentTransform.scale;
        const parentRotRad = -parentTransform.rotation * (Math.PI / 180); // Rotación inversa
        const cos = Math.cos(parentRotRad);
        const sin = Math.sin(parentRotRad);

        const relativeX = worldPosition.x - parentPos.x;
        const relativeY = worldPosition.y - parentPos.y;

        // Aplicar rotación y escala inversas
        const unrotatedX = (relativeX * cos) - (relativeY * sin);
        const unrotatedY = (relativeX * sin) + (relativeY * cos);

        this.localPosition = {
            x: parentScale.x !== 0 ? unrotatedX / parentScale.x : 0,
            y: parentScale.y !== 0 ? unrotatedY / parentScale.y : 0
        };
    }

    // --- Rotación Global (World Rotation) ---
    get rotation() {
        if (!this.materia || !this.materia.parent) {
            return this.localRotation;
        }
        const parentTransform = this.materia.parent.getComponent(Transform);
        return parentTransform ? parentTransform.rotation + this.localRotation : this.localRotation;
    }

    set rotation(worldRotation) {
        if (!this.materia || !this.materia.parent) {
            this.localRotation = worldRotation;
            return;
        }
        const parentTransform = this.materia.parent.getComponent(Transform);
        this.localRotation = worldRotation - (parentTransform ? parentTransform.rotation : 0);
    }

    // --- Escala Global (World Scale) ---
    get scale() {
        if (!this.materia || !this.materia.parent) {
            return { ...this.localScale };
        }
        const parentTransform = this.materia.parent.getComponent(Transform);
        if (!parentTransform) {
            return { ...this.localScale };
        }
        const parentScale = parentTransform.scale;
        return {
            x: parentScale.x * this.localScale.x,
            y: parentScale.y * this.localScale.y
        };
    }

    set scale(worldScale) {
        if (!this.materia || !this.materia.parent) {
            this.localScale = { ...worldScale };
            return;
        }
        const parentTransform = this.materia.parent.getComponent(Transform);
        if (!parentTransform) {
             this.localScale = { ...worldScale };
             return;
        }
        const parentScale = parentTransform.scale;
        this.localScale = {
            x: parentScale.x !== 0 ? worldScale.x / parentScale.x : 0,
            y: parentScale.y !== 0 ? worldScale.y / parentScale.y : 0
        };
    }

    // --- Acceso directo a x/y para compatibilidad ---
    get x() { return this.position.x; }
    set x(value) { this.position = { x: value, y: this.position.y }; }
    get y() { return this.position.y; }
    set y(value) { this.position = { x: this.position.x, y: value }; }

    clone() {
        const newTransform = new Transform(null);
        newTransform.localPosition = { ...this.localPosition };
        newTransform.localRotation = this.localRotation;
        newTransform.localScale = { ...this.localScale };
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
        this.publicVars = {}; // Nuevo: para almacenar los valores del Inspector
        this.instance = null;
        this.isInitialized = false;
    }

    // --- Lifecycle wrappers ---
    start() {
        if (!this.instance) return;
        try {
            if (typeof this.instance.start === 'function') {
                this.instance.start();
            } else if (typeof this.instance.star === 'function') {
                // Backwards compat
                this.instance.star();
            }
        } catch (e) {
            console.error(`Error en start() del script '${this.scriptName}' en '${this.materia ? this.materia.name : 'Unknown'}':`, e);
        }
    }

    // Keep the old name as alias
    star() { this.start(); }

    update(deltaTime) {
        if (!this.instance) return;
        try {
            if (typeof this.instance.update === 'function') {
                this.instance.update(deltaTime);
            }
        } catch (e) {
            console.error(`Error en update() del script '${this.scriptName}' en '${this.materia ? this.materia.name : 'Unknown'}':`, e);
        }
    }

    fixedUpdate(deltaTime) {
        if (!this.instance) return;
        try {
            if (typeof this.instance.fixedUpdate === 'function') {
                this.instance.fixedUpdate(deltaTime);
            }
        } catch (e) {
            console.error(`Error en fixedUpdate() del script '${this.scriptName}' en '${this.materia ? this.materia.name : 'Unknown'}':`, e);
        }
    }

    onEnable() {
        if (!this.instance) return;
        try {
            if (typeof this.instance.onEnable === 'function') this.instance.onEnable();
        } catch (e) {
            console.error(`Error en onEnable() del script '${this.scriptName}' en '${this.materia ? this.materia.name : 'Unknown'}':`, e);
        }
    }

    onDisable() {
        if (!this.instance) return;
        try {
            if (typeof this.instance.onDisable === 'function') this.instance.onDisable();
        } catch (e) {
            console.error(`Error en onDisable() del script '${this.scriptName}' en '${this.materia ? this.materia.name : 'Unknown'}':`, e);
        }
    }

    onDestroy() {
        if (!this.instance) return;
        try {
            if (typeof this.instance.onDestroy === 'function') this.instance.onDestroy();
        } catch (e) {
            console.error(`Error en onDestroy() del script '${this.scriptName}' en '${this.materia ? this.materia.name : 'Unknown'}':`, e);
        }
    }

    // Called during scene load. Just notes the script name.
    async load(projectsDirHandle) {
        // Intentionally left simple. The real work is in initializeInstance.
        return Promise.resolve();
    }

    // Called by startGame, just before the first start() call.
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

                // Ensure common aliases exist on the instance so script authors can write in either language
                const aliasMap = {
                    start: ['star', 'iniciar'],
                    onEnable: ['alHabilitar', 'activar'],
                    onDisable: ['alDeshabilitar', 'desactivar'],
                    onDestroy: ['alDestruir'],
                    fixedUpdate: ['actualizarFijo']
                };

                for (const [canonical, aliases] of Object.entries(aliasMap)) {
                    for (const alt of aliases) {
                        if (typeof this.instance[alt] === 'function' && typeof this.instance[canonical] !== 'function') {
                            this.instance[canonical] = this.instance[alt];
                        }
                        if (typeof this.instance[canonical] === 'function' && typeof this.instance[alt] !== 'function') {
                            this.instance[alt] = this.instance[canonical];
                        }
                    }
                }

                // Also keep star/start interop
                if (typeof this.instance.star === 'function' && typeof this.instance.start !== 'function') this.instance.start = this.instance.star;
                if (typeof this.instance.start === 'function' && typeof this.instance.star !== 'function') this.instance.star = this.instance.start;

                // Attach convenience properties if not present
                if (!this.instance.hasOwnProperty('materia')) this.instance.materia = this.materia;
                if (!this.instance.hasOwnProperty('scene')) this.instance.scene = this.materia ? this.materia.scene : null;

                // --- API Injection ---
                const inputAPI = RuntimeAPIManager.getAPI('input');
                if (inputAPI) {
                    this.instance.input = inputAPI;
                    this.instance.entrada = inputAPI;
                }
                const engineAPI = RuntimeAPIManager.getAPI('engine');
                if (engineAPI) {
                     this.instance.engine = {
                        find: engineAPI.find,
                        getCollisionEnter: (tag) => engineAPI.getCollisionEnter(this.instance.materia, tag),
                        getCollisionStay: (tag) => engineAPI.getCollisionStay(this.instance.materia, tag),
                        getCollisionExit: (tag) => engineAPI.getCollisionExit(this.instance.materia, tag),
                        // Spanish Aliases
                        buscar: engineAPI.buscar,
                        alEntrarEnColision: (tag) => engineAPI.alEntrarEnColision(this.instance.materia, tag),
                        alPermanecerEnColision: (tag) => engineAPI.alPermanecerEnColision(this.instance.materia, tag),
                        alSalirDeColision: (tag) => engineAPI.alSalirDeColision(this.instance.materia, tag),
                    };
                    this.instance.motor = this.instance.engine;
                }
                // --- End API Injection ---


                // --- LÓGICA DE ASIGNACIÓN DE VARIABLES PÚBLICAS REVISADA ---
                // El constructor de la instancia del script (generado por el transpilador) ya asigna
                // los valores por defecto definidos en el código.
                // Aquí, SOLO sobrescribimos esos valores si hay un valor diferente
                // guardado en la escena (proveniente del Inspector).

                if (this.publicVars) {
                    const metadata = CES_Transpiler.getScriptMetadata(this.scriptName) || { publicVars: [] };
                    const metadataMap = new Map(metadata.publicVars.map(p => [p.name, p]));

                    for (const varName in this.publicVars) {
                        // Comprobar que la variable guardada todavía existe en el script
                        if (this.publicVars.hasOwnProperty(varName) && metadataMap.has(varName)) {
                            let savedValue = this.publicVars[varName];

                            // Asignar solo si el valor guardado no es nulo o indefinido.
                            // Un string vacío "" se considera un valor válido.
                            if (savedValue !== null && savedValue !== undefined) {
                                const metaVar = metadataMap.get(varName);

                                // Resolver referencias a Materia por ID o nombre
                                if (metaVar.type === 'Materia' && savedValue != null) {
                                    if (typeof savedValue === 'number') {
                                        savedValue = this.materia.scene.findMateriaById(savedValue);
                                    } else if (typeof savedValue === 'string') {
                                        savedValue = this.materia.scene.getAllMaterias().find(m => m.name === savedValue) || null;
                                    }
                                }

                                // Sobrescribir el valor por defecto con el valor guardado
                                try {
                                    this.instance[varName] = savedValue;
                                } catch (e) {
                                    console.warn(`No se pudo asignar la variable pública guardada '${varName}' en el script '${this.scriptName}':`, e);
                                }
                            }
                        }
                    }
                }

                // Mark initialized
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

    addForce({ x = 0, y = 0 }) {
        // In a simple physics model, addForce can be treated similarly to an impulse
        // that's applied over a frame. For now, we directly modify velocity.
        // A more complex engine would integrate this over time based on mass.
        this.velocity.x += x;
        this.velocity.y += y;
    }

    addImpulse({ x = 0, y = 0 }) {
        // Impulse directly and instantly changes velocity.
        this.velocity.x += x;
        this.velocity.y += y;
    }

    setVelocity({ x = 0, y = 0 }) {
        // Directly sets the velocity, ignoring current momentum.
        this.velocity.x = x;
        this.velocity.y = y;
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

export class CapsuleCollider2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.isTrigger = false;
        this.offset = { x: 0, y: 0 };
        this.size = { x: 1.0, y: 1.0 };
        this.direction = 'Vertical'; // 'Vertical' or 'Horizontal'
    }
    clone() {
        const newCollider = new CapsuleCollider2D(null);
        newCollider.isTrigger = this.isTrigger;
        newCollider.offset = { ...this.offset };
        newCollider.size = { ...this.size };
        newCollider.direction = this.direction;
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
        this.animationClipPath = ''; // Path to the .ceanimclip or .cea asset
        this.speed = 10;
        this.loop = true;
        this.playOnAwake = true;

        // Internal state
        this.animationClip = null; // The loaded animation clip data
        this.currentFrame = 0;
        this.startFrame = 0;
        this.endFrame = -1; // -1 means play until the end of the clip
        this.frameTimer = 0;
        this.isPlaying = false;
        this.spriteRenderer = null;
    }

    async loadAnimationClip(projectsDirHandle) {
        if (!this.animationClipPath) return;

        this.spriteRenderer = this.materia.getComponent(SpriteRenderer);
        if (!this.spriteRenderer) {
            console.error('Animator requires a SpriteRenderer component on the same Materia.');
            return;
        }

        try {
            const url = await getURLForAssetPath(this.animationClipPath, projectsDirHandle);
            if (!url) throw new Error(`Could not get URL for animation clip: ${this.animationClipPath}`);

            const response = await fetch(url);
            const data = await response.json();

            // Handle both .cea and .ceanimclip formats
            if (data.animations && data.animations.length > 0) {
                // Legacy .cea format
                this.animationClip = data.animations[0];
            } else {
                // New .ceanimclip format
                this.animationClip = data;
            }

            if (this.playOnAwake) {
                this.play();
            }

        } catch (error) {
            console.error(`Failed to load animation clip at '${this.animationClipPath}':`, error);
        }
    }

    play() {
        this.isPlaying = true;
        this.currentFrame = this.startFrame || 0;
        this.frameTimer = 0;
    }

    stop() {
        this.isPlaying = false;
    }

    update(deltaTime) {
        if (!this.isPlaying || !this.animationClip || !this.spriteRenderer) {
            return;
        }

        const clip = this.animationClip;
        if (!clip.frames || clip.frames.length === 0) return;

        this.frameTimer += deltaTime;
        const frameDuration = 1 / (this.speed || 10);

        if (this.frameTimer >= frameDuration) {
            this.frameTimer %= frameDuration; // Keep the remainder for more accurate timing
            this.currentFrame++;

            const endFrame = (this.endFrame !== -1 && this.endFrame < clip.frames.length) ? this.endFrame : clip.frames.length -1;

            if (this.currentFrame > endFrame) {
                if (this.loop) {
                    this.currentFrame = this.startFrame || 0;
                } else {
                    this.currentFrame = endFrame; // Stay on last frame
                    this.stop();
                }
            }

            // Clamp the frame to be safe
            this.currentFrame = Math.max(this.startFrame || 0, Math.min(this.currentFrame, endFrame));

            // Update the SpriteRenderer
            const spriteName = clip.frames[this.currentFrame];
            if (this.spriteRenderer.spriteName !== spriteName) {
                this.spriteRenderer.spriteName = spriteName;
            }
        }
    }

    clone() {
        const newAnimator = new Animator(null);
        newAnimator.animationClipPath = this.animationClipPath;
        newAnimator.speed = this.speed;
        newAnimator.loop = this.loop;
        newAnimator.playOnAwake = this.playOnAwake;
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

export class TextureRender extends Leyes {
    constructor(materia) {
        super(materia);
        this.shape = 'Rectangle'; // 'Rectangle', 'Circle', 'Triangle', 'Capsule'
        this.width = 100;
        this.height = 100;
        this.radius = 50;
        this.color = '#ffffff';
        this.texturePath = '';
        this.texture = null; // Will hold the Image object
    }

    async loadTexture(projectsDirHandle) {
        if (this.texturePath) {
            const url = await getURLForAssetPath(this.texturePath, projectsDirHandle);
            if (url) {
                this.texture = new Image();
                this.texture.src = url;
                // We might need to await loading if drawing happens immediately
                await new Promise((resolve, reject) => {
                    this.texture.onload = resolve;
                    this.texture.onerror = reject;
                }).catch(e => console.error(`Failed to load texture: ${this.texturePath}`, e));
            }
        } else {
            this.texture = null;
        }
    }

    clone() {
        const newRender = new TextureRender(null);
        newRender.shape = this.shape;
        newRender.width = this.width;
        newRender.height = this.height;
        newRender.radius = this.radius;
        newRender.color = this.color;
        newRender.texturePath = this.texturePath;
        // The texture itself will be loaded on demand.
        return newRender;
    }
}
registerComponent('TextureRender', TextureRender);

registerComponent('CreativeScript', CreativeScript);
registerComponent('Rigidbody2D', Rigidbody2D);
registerComponent('BoxCollider2D', BoxCollider2D);
registerComponent('CapsuleCollider2D', CapsuleCollider2D);
registerComponent('Transform', Transform);
registerComponent('Camera', Camera);
registerComponent('SpriteRenderer', SpriteRenderer);
registerComponent('Animator', Animator);

export class AnimatorController extends Leyes {
    constructor(materia) {
        super(materia);
        this.controllerPath = ''; // Path to the .ceanim asset

        // Internal state
        this.controller = null; // The loaded controller data
        this.states = new Map(); // Holds the animation state data, keyed by name
        this.currentStateName = '';
        this.animator = null; // Reference to the Animator component
        this.projectsDirHandle = null; // To load clips at runtime
    }

    // Called by the engine when the game starts
    async initialize(projectsDirHandle) {
        this.projectsDirHandle = projectsDirHandle;
        this.animator = this.materia.getComponent(Animator);
        if (!this.animator) {
            console.error('AnimatorController requires an Animator component on the same Materia.');
            return;
        }
        await this.loadController(projectsDirHandle);
    }

    async loadController(projectsDirHandle) {
        if (!this.controllerPath) return;

        try {
            const url = await getURLForAssetPath(this.controllerPath, projectsDirHandle);
            if (!url) throw new Error(`Could not get URL for controller: ${this.controllerPath}`);

            const response = await fetch(url);
            this.controller = await response.json();

            this.states.clear();
            for (const state of this.controller.states) {
                this.states.set(state.name, state);
            }

            console.log(`AnimatorController loaded '${this.controller.name}' with ${this.states.size} states.`);

        } catch (error) {
            console.error(`Failed to load Animator Controller at '${this.controllerPath}':`, error);
        }
    }

    play(stateName) {
        // Do not restart the animation if it's already playing
        if (!this.animator || !this.states.has(stateName) || this.currentStateName === stateName) {
            return;
        }

        const state = this.states.get(stateName);
        this.currentStateName = stateName;

        // Configure the Animator component with the new state's data
        this.animator.speed = state.speed || 10;
        this.animator.loop = state.loop !== undefined ? state.loop : true;
        this.animator.startFrame = state.startFrame || 0;
        this.animator.endFrame = state.endFrame !== undefined ? state.endFrame : -1;

        // If the clip path is different, tell the animator to load the new clip and play it
        if (this.animator.animationClipPath !== state.animationClip) {
            this.animator.animationClipPath = state.animationClip;
            // The animator needs the handle to load the new clip
            this.animator.loadAnimationClip(this.projectsDirHandle).then(() => {
                this.animator.play();
            });
        } else {
            // If it's the same clip, just restart it
            this.animator.play();
        }
    }

    clone() {
        const newController = new AnimatorController(null);
        newController.controllerPath = this.controllerPath;
        return newController;
    }
}
registerComponent('AnimatorController', AnimatorController);

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
        this.width = 30;
        this.height = 20;
        this.manualSize = false;
        this.layers = [{
            position: { x: 0, y: 0 },
            tileData: new Map()
        }];
        this.activeLayerIndex = 0;
    }

    addLayer(x, y) {
        this.layers.push({
            position: { x, y },
            tileData: new Map()
        });
    }

    removeLayer(index) {
        if (index > 0 && index < this.layers.length) {
            this.layers.splice(index, 1);
            if (this.activeLayerIndex >= index) {
                this.activeLayerIndex = Math.max(0, this.activeLayerIndex - 1);
            }
        }
    }

    clone() {
        const newTilemap = new Tilemap(null);
        newTilemap.width = this.width;
        newTilemap.height = this.height;
        newTilemap.manualSize = this.manualSize;
        newTilemap.activeLayerIndex = this.activeLayerIndex;

        // Deep copy layers and correctly clone the Map
        newTilemap.layers = this.layers.map(layer => {
            return {
                position: { ...layer.position },
                tileData: new Map(layer.tileData)
            };
        });

        return newTilemap;
    }
}

export class TilemapRenderer extends Leyes {
    constructor(materia) {
        super(materia);
        this.sortingLayer = 'Default';
        this.orderInLayer = 0;
        this.isDirty = true; // Flag to know when to re-render

        // Always initialize imageCache as a Map. This prevents corrupted data
        // from scene deserialization from breaking the renderer.
        this.imageCache = new Map();
    }

    setDirty() {
        this.isDirty = true;
    }

    getImageForTile(tileData) {
        // Self-healing: SceneManager now ensures imageCache is a Map on load.
        if (!(this.imageCache instanceof Map)) {
            this.imageCache = new Map();
        }

        if (this.imageCache.has(tileData.imageData)) {
            return this.imageCache.get(tileData.imageData);
        } else {
            const image = new Image();
            image.src = tileData.imageData;
            this.imageCache.set(tileData.imageData, image);
            // The image will be drawn on the next frame when it's loaded.
            // For immediate drawing, we would need to handle the onload event.
            return image;
        }
    }

    clone() {
        const newRenderer = new TilemapRenderer(null);
        newRenderer.sortingLayer = this.sortingLayer;
        newRenderer.orderInLayer = this.orderInLayer;
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

        // Always initialize _cachedMesh as a Map. This prevents corrupted data
        // from scene deserialization from breaking the renderer.
        this._cachedMesh = new Map();
    }

    /**
     * Safely retrieves the cached mesh for a given layer, ensuring the cache is valid.
     * @param {number} layerIndex The index of the layer to get the mesh for.
     * @returns {Array} An array of rectangle data for the layer's mesh.
     */
    getMeshForLayer(layerIndex) {
        // The SceneManager now handles correct serialization, so self-healing is a fallback.
        if (!(this._cachedMesh instanceof Map)) {
            this._cachedMesh = new Map();
        }
        return this._cachedMesh.get(layerIndex) || [];
    }

    /**
     * Generates an optimized mesh of rectangles for a specific layer using a greedy meshing algorithm.
     * The result is cached.
     */
    generateMesh() {
        // Self-healing is now handled by the constructor and getMeshForLayer
        if (!(this._cachedMesh instanceof Map)) {
            this._cachedMesh = new Map();
        }

        const tilemap = this.materia.getComponent(Tilemap);
        const grid = this.materia.parent?.getComponent(Grid);

        if (!tilemap || !grid) {
            this._cachedMesh.clear();
            this.generatedColliders = [];
            return;
        }

        this.generatedColliders = [];
        const { cellSize } = grid;
        const layerWidth = tilemap.width * cellSize.x;
        const layerHeight = tilemap.height * cellSize.y;

        for (let i = 0; i < tilemap.layers.length; i++) {
            const layer = tilemap.layers[i];
            const tiles = new Set();
            for (const [key, value] of layer.tileData.entries()) {
                if (value) tiles.add(key);
            }

            if (tiles.size === 0) {
                this._cachedMesh.set(i, []);
                continue;
            }

            const visited = new Set();
            const rects = [];
            const sortedTiles = Array.from(tiles).sort((a, b) => {
                const [ax, ay] = a.split(',').map(Number);
                const [bx, by] = b.split(',').map(Number);
                if (ay !== by) return ay - by;
                return ax - bx;
            });

            for (const key of sortedTiles) {
                if (visited.has(key)) continue;
                const [c, r] = key.split(',').map(Number);
                let currentWidth = 1;
                while (tiles.has(`${c + currentWidth},${r}`) && !visited.has(`${c + currentWidth},${r}`)) {
                    currentWidth++;
                }
                let currentHeight = 1;
                let canExpandDown = true;
                while (canExpandDown) {
                    for (let j = 0; j < currentWidth; j++) {
                        if (!tiles.has(`${c + j},${r + currentHeight}`)) {
                            canExpandDown = false;
                            break;
                        }
                    }
                    if (canExpandDown) currentHeight++;
                }
                for (let y = 0; y < currentHeight; y++) {
                    for (let x = 0; x < currentWidth; x++) {
                        visited.add(`${c + x},${r + y}`);
                    }
                }
                rects.push({ col: c, row: r, width: currentWidth, height: currentHeight });
            }
            this._cachedMesh.set(i, rects);

            // Now, convert these rects to world-space colliders for the physics engine
            // This is only done for the layer specified in the component's properties
            if (i === this.sourceLayerIndex) {
                const layerOffsetX = layer.position.x * layerWidth;
                const layerOffsetY = layer.position.y * layerHeight;
                const layerTopLeftX = layerOffsetX - layerWidth / 2;
                const layerTopLeftY = layerOffsetY - layerHeight / 2;

                for (const rect of rects) {
                    const rectWidth_pixels = rect.width * cellSize.x;
                    const rectHeight_pixels = rect.height * cellSize.y;
                    const rectTopLeftX = layerTopLeftX + rect.col * cellSize.x;
                    const rectTopLeftY = layerTopLeftY + rect.row * cellSize.y;

                    this.generatedColliders.push({
                        x: rectTopLeftX + rectWidth_pixels / 2,
                        y: rectTopLeftY + rectHeight_pixels / 2,
                        width: rectWidth_pixels,
                        height: rectHeight_pixels
                    });
                }
            }
        }
    }

    generate() {
        console.warn("El método 'generate()' de TilemapCollider2D está obsoleto. Usa 'generateMesh()' en su lugar.");
        this.generateMesh();
    }

    clone() {
        const newCollider = new TilemapCollider2D(null);
        newCollider.usedByComposite = this.usedByComposite;
        newCollider.usedByEffector = this.usedByEffector;
        newCollider.isTrigger = this.isTrigger;
        newCollider.offset = { ...this.offset };
        newCollider.sourceLayerIndex = this.sourceLayerIndex;

        // Deep copy the generated colliders and the cached mesh to preserve state
        newCollider.generatedColliders = JSON.parse(JSON.stringify(this.generatedColliders));
        newCollider._cachedMesh = new Map(JSON.parse(JSON.stringify(Array.from(this._cachedMesh))));

        return newCollider;
    }
}

export class Grid extends Leyes {
    constructor(materia) {
        super(materia);
        this.cellSize = { x: 32, y: 32 };
    }

    clone() {
        const newGrid = new Grid(null);
        newGrid.cellSize = { ...this.cellSize };
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
