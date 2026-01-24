// Components.js
// This file contains all the component classes.

import { Leyes } from './Leyes.js';
import { registerComponent } from './ComponentRegistry.js';
import { getURLForAssetPath } from './AssetUtils.js';
import { ObjectPoolComponent } from './components/ObjectPoolComponent.js';
import { AStar } from './Pathfinding.js';
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
    'Canvas': 'lienzo',
    'UIImage': 'imagenUI',
    'UITransform': 'transformacionUI',
    'UIText': 'textoUI',
    'Button': 'boton',
    'ObjectPoolComponent': 'poolDeObjetos'
};


// Export the new component so it's available for import elsewhere
export { ObjectPoolComponent };

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
                    // --- API de Físicas Retrocompatible ---
                    // Esta función crea un "envoltorio" para las funciones de colisión
                    // que maneja inteligentemente las llamadas con 1 o 2 argumentos.
                    const createCollisionWrapper = (apiMethod) => {
                        return function(...args) {
                            if (args.length === 0) {
                                // Llamada sin argumentos, devuelve vacío
                                return apiMethod(this.materia, undefined);
                            } else if (args.length === 1) {
                                // Llamada con 1 argumento: motor.alPermanecerEnColision(tag)
                                // El primer argumento es el 'tag'.
                                return apiMethod(this.materia, args[0]);
                            } else {
                                // Llamada con 2+ argumentos: motor.alPermanecerEnColision(materia, tag)
                                // El primer argumento es la 'materia', el segundo es el 'tag'.
                                return apiMethod(args[0], args[1]);
                            }
                        }.bind(this.instance); // ¡Importante! Enlazar el 'this' a la instancia del script
                    };

                     this.instance.engine = {
                        find: engineAPI.find,
                        getCollisionEnter: createCollisionWrapper(engineAPI.getCollisionEnter),
                        getCollisionStay: createCollisionWrapper(engineAPI.getCollisionStay),
                        getCollisionExit: createCollisionWrapper(engineAPI.getCollisionExit),
                        startSequence: (sequenceName, ...args) => engineAPI.startSequence(this.instance, sequenceName, ...args),

                        // Spanish Aliases
                        buscar: engineAPI.find, // Corrected alias
                        alEntrarEnColision: createCollisionWrapper(engineAPI.getCollisionEnter),
                        alPermanecerEnColision: createCollisionWrapper(engineAPI.getCollisionStay),
                        alSalirDeColision: createCollisionWrapper(engineAPI.getCollisionExit),
                        iniciarSecuencia: (sequenceName, ...args) => engineAPI.startSequence(this.instance, sequenceName, ...args),
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

                                // Handle Materia references for both single variables and arrays
                                if (metaVar.type === 'Materia' && savedValue != null) {
                                    if (metaVar.isArray && Array.isArray(savedValue)) {
                                        // It's an array of Materia references (IDs)
                                        savedValue = savedValue.map(id => {
                                            if (typeof id === 'number') {
                                                return this.materia.scene.findMateriaById(id);
                                            }
                                            return null; // Or handle string names if needed
                                        }).filter(Boolean); // Filter out any nulls from failed lookups
                                    } else if (!metaVar.isArray) {
                                        // It's a single Materia reference
                                        if (typeof savedValue === 'number') {
                                            savedValue = this.materia.scene.findMateriaById(savedValue);
                                        } else if (typeof savedValue === 'string') {
                                            savedValue = this.materia.scene.getAllMaterias().find(m => m.name === savedValue) || null;
                                        }
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
        // Force produces acceleration based on mass (a = F/m).
        // This acceleration is then applied to velocity over time in the physics system.
        // For a simple direct velocity modification, we can simulate this.
        const mass = Math.max(0.1, this.mass); // Avoid division by zero
        this.velocity.x += (x / mass);
        this.velocity.y += (y / mass);
    }

    addImpulse({ x = 0, y = 0 }) {
        // Impulse produces an instantaneous change in velocity based on mass (Δv = J/m).
        const mass = Math.max(0.1, this.mass); // Avoid division by zero
        this.velocity.x += (x / mass);
        this.velocity.y += (y / mass);
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

export class UITransform extends Leyes {
    constructor(materia) {
        super(materia);
        this.position = { x: 0, y: 0 }; // Position relative to the anchor point
        this.size = { width: 100, height: 100 };
        this.anchorPoint = 4; // 0-8, representing the 3x3 grid. 4 is center.
    }

    clone() {
        const newUITransform = new UITransform(null);
        newUITransform.position = { ...this.position };
        newUITransform.size = { ...this.size };
        newUITransform.anchorPoint = this.anchorPoint;
        return newUITransform;
    }
}

export class UIImage extends Leyes {
    constructor(materia) {
        super(materia);
        this.sprite = new Image();
        this.source = '';
        this.color = '#FFFFFF'; // Ensure it's a solid, valid color by default
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

export class CameraFollow2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.target = null; // ID of the Materia to follow
        this.smoothSpeed = 0.125;
        this.offset = { x: 0, y: 0, z: -10 };

        this._targetMateria = null; // To hold the actual Materia reference
    }

    start() {
        if (this.target !== null && this.materia && this.materia.scene) {
            this._targetMateria = this.materia.scene.findMateriaById(this.target);
            if (!this._targetMateria) {
                console.warn(`CameraFollow2D: No se pudo encontrar el objetivo (target) con ID: ${this.target}`);
            }
        }
    }

    update(deltaTime) {
        if (!this._targetMateria) {
            // Si el objetivo no se ha encontrado todavía (quizás se cargó después), inténtalo de nuevo.
            if (this.target !== null && this.materia && this.materia.scene && !this._targetMateria) {
                this.start();
            }
            if (!this._targetMateria) return;
        }

        const targetTransform = this._targetMateria.getComponent(Transform);
        const cameraTransform = this.materia.getComponent(Transform);

        if (!targetTransform || !cameraTransform) {
            return;
        }

        const desiredPosition = {
            x: targetTransform.position.x + this.offset.x,
            y: targetTransform.position.y + this.offset.y
        };

        const smoothedPosition = {
            x: cameraTransform.position.x + (desiredPosition.x - cameraTransform.position.x) * this.smoothSpeed,
            y: cameraTransform.position.y + (desiredPosition.y - cameraTransform.position.y) * this.smoothSpeed
        };

        cameraTransform.position = smoothedPosition;
    }

    clone() {
        const newFollow = new CameraFollow2D(null);
        newFollow.target = this.target;
        newFollow.smoothSpeed = this.smoothSpeed;
        newFollow.offset = { ...this.offset };
        return newFollow;
    }
}

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

registerComponent('UITransform', UITransform);
registerComponent('UIImage', UIImage);

export class UIText extends Leyes {
    constructor(materia) {
        super(materia);
        this.text = 'Hello World';
        this.fontSize = 24;
        this.color = '#ffffff';
        this.horizontalAlign = 'left'; // 'left', 'center', 'right'
        this.textTransform = 'none'; // 'none', 'uppercase', 'lowercase'
        this.fontAssetPath = ''; // Path to the .ttf, .otf, .woff, etc. file
        this.fontFamily = 'sans-serif'; // The dynamically generated font-family name
    }

    async loadFont(projectsDirHandle) {
        if (!this.fontAssetPath) {
            this.fontFamily = 'sans-serif'; // Reset to default if path is cleared
            return;
        }

        try {
            const fontUrl = await getURLForAssetPath(this.fontAssetPath, projectsDirHandle);
            if (!fontUrl) {
                throw new Error(`Could not get URL for font asset: ${this.fontAssetPath}`);
            }

            // Generate a unique font family name to avoid conflicts
            const fontName = `font_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.fontFamily = fontName;

            const fontFace = new FontFace(fontName, `url(${fontUrl})`);
            await fontFace.load();
            document.fonts.add(fontFace);

            console.log(`Font '${this.fontAssetPath}' loaded successfully as '${fontName}'.`);

        } catch (error) {
            console.error(`Failed to load font: ${this.fontAssetPath}`, error);
            this.fontFamily = 'sans-serif'; // Fallback to default on error
        }
    }

    clone() {
        const newText = new UIText(null);
        newText.text = this.text;
        newText.fontSize = this.fontSize;
        newText.color = this.color;
        newText.horizontalAlign = this.horizontalAlign;
        newText.textTransform = this.textTransform;
        newText.fontAssetPath = this.fontAssetPath;
        newText.fontFamily = this.fontFamily;
        return newText;
    }
}
registerComponent('UIText', UIText);

export class Button extends Leyes {
    constructor(materia) {
        super(materia);
        this.interactable = true;
        this.transition = 'Color Tint'; // 'None', 'Color Tint', 'Sprite Swap', 'Animation'
        this.colors = {
            normalColor: '#ffffff',
            pressedColor: '#dddddd',
            disabledColor: '#a0a0a0'
        };
        this.spriteSwap = {
            highlightedSprite: '',
            pressedSprite: '',
            disabledSprite: ''
        };
        this.animationTriggers = {
            highlightedTrigger: 'Highlighted',
            pressedTrigger: 'Pressed',
            disabledTrigger: 'Disabled'
        };
        this.onClick = []; // Array to hold onClick events
    }

    clone() {
        const newButton = new Button(null);
        newButton.interactable = this.interactable;
        newButton.transition = this.transition;
        newButton.colors = { ...this.colors };
        newButton.spriteSwap = { ...this.spriteSwap };
        newButton.animationTriggers = { ...this.animationTriggers };
        // Deep copy the onClick array
        newButton.onClick = JSON.parse(JSON.stringify(this.onClick));
        return newButton;
    }
}
registerComponent('Button', Button);

registerComponent('PointLight2D', PointLight2D);
registerComponent('SpotLight2D', SpotLight2D);
registerComponent('FreeformLight2D', FreeformLight2D);
registerComponent('SpriteLight2D', SpriteLight2D);
registerComponent('AudioSource', AudioSource);

export class Canvas extends Leyes {
    constructor(materia) {
        super(materia);
        this.renderMode = 'Screen Space'; // 'Screen Space' or 'World Space'
        this.size = { x: 800, y: 600 }; // For World Space
        this.referenceResolution = { width: 800, height: 600 }; // For Screen Space
        this.screenMatchMode = 'Match Width Or Height';
        this.showGrid = false; // Controls the 3x3 grid gizmo visibility
        this.scaleChildren = false; // If true, child UI elements scale with canvas; if false, they maintain original size
    }

    clone() {
        const newCanvas = new Canvas(null);
        newCanvas.renderMode = this.renderMode;
        newCanvas.size = { ...this.size };
        newCanvas.referenceResolution = { ...this.referenceResolution };
        newCanvas.screenMatchMode = this.screenMatchMode;
        newCanvas.showGrid = this.showGrid;
        newCanvas.scaleChildren = this.scaleChildren;
        return newCanvas;
    }
}
registerComponent('Canvas', Canvas);

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

                    // Ajuste clave: Restar la mitad de la altura total del layer para alinear con el pivote central
                    const rectTopLeftX = (rect.col * cellSize.x) - (layerWidth / 2);
                    const rectTopLeftY = (rect.row * cellSize.y) - (layerHeight / 2);

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
registerComponent('CameraFollow2D', CameraFollow2D);

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

class Particle {
    constructor() {
        this.isActive = false;
        this.position = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.life = 0; // Remaining life in seconds
        this.totalLife = 1;

        this.startSize = 1;
        this.endSize = 0;
        this.size = 1;

        this.startColor = { r: 255, g: 255, b: 255, a: 1 };
        this.endColor = { r: 255, g: 255, b: 255, a: 0 };
        this.color = 'rgba(255, 255, 255, 1)';
    }

    reset() {
        this.isActive = false;
    }
}

export class ParticleSystem extends Leyes {
    constructor(materia) {
        super(materia);

        // Emission
        this.duration = 5.0;
        this.loop = true;
        this.maxParticles = 1000;
        this.emissionRate = 10; // Particles per second

        // Shape
        this.shape = 'cone'; // 'cone', 'box', 'sphere'
        this.coneAngle = 25; // Degrees
        this.coneRadius = 1;

        // Lifetime & Movement
        this.startLifetime = 5.0;
        this.startSpeed = 5.0;
        this.gravityModifier = 0;

        // Appearance
        this.startSize = 1.0;
        this.endSize = 0.0;
        this.startColor = '#FFFFFF';
        this.endColor = '#FFFFFF00'; // White, fully transparent
        this.texturePath = ''; // Path to the particle texture

        // Internal State
        this._particles = [];
        this._pool = [];
        this._isPlaying = false;
        this._elapsedTime = 0;
        this._emissionCounter = 0;
        this.texture = null;
    }

    async loadTexture(projectsDirHandle) {
        this.texture = null; // Reset texture
        if (!this.texturePath || !projectsDirHandle) {
            return;
        }
        try {
            const url = await getURLForAssetPath(this.texturePath, projectsDirHandle);
            if (url) {
                this.texture = new Image();
                this.texture.src = url;
            }
        } catch(e) {
            console.error(`Failed to load particle texture: ${this.texturePath}`, e);
            this.texture = null;
        }
    }

    async start() {
        this.initializePool();
        const dirHandle = typeof window !== 'undefined' ? window.projectsDirHandle : null;
        if (this.texturePath) {
            await this.loadTexture(dirHandle);
        }
        this.play();
    }

    update(deltaTime) {
        if (!this._isPlaying) return;

        // Ensure colors are consistently in object format for interpolation
        this.startColor = this.hexToRgba(this.startColor);
        this.endColor = this.hexToRgba(this.endColor);

        this._elapsedTime += deltaTime;

        // Handle emission
        const emissionInterval = 1.0 / this.emissionRate;
        this._emissionCounter += deltaTime;
        while (this._emissionCounter > emissionInterval) {
            this.emitParticle();
            this._emissionCounter -= emissionInterval;
        }

        // Update active particles
        for (const particle of this._particles) {
            if (!particle.isActive) continue;

            particle.life -= deltaTime;
            if (particle.life <= 0) {
                particle.isActive = false;
                continue;
            }

            // Update position
            particle.position.x += particle.velocity.x * deltaTime;
            particle.position.y += particle.velocity.y * deltaTime;
            particle.velocity.y += this.gravityModifier * 9.81 * deltaTime; // Simple gravity

            // Update appearance (interpolation)
            const lifePercent = Math.max(0, particle.life / particle.totalLife);
            particle.size = this.endSize + (this.startSize - this.endSize) * lifePercent;

            const r = this.endColor.r + (this.startColor.r - this.endColor.r) * lifePercent;
            const g = this.endColor.g + (this.startColor.g - this.endColor.g) * lifePercent;
            const b = this.endColor.b + (this.startColor.b - this.endColor.b) * lifePercent;
            const a = this.endColor.a + (this.startColor.a - this.endColor.a) * lifePercent;
            particle.color = `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${a})`;
        }

        if (!this.loop && this._elapsedTime >= this.duration) {
            this.stop();
        }
    }

    initializePool() {
        if (this._pool.length >= this.maxParticles) return;
        for (let i = 0; i < this.maxParticles; i++) {
            this._pool.push(new Particle());
        }
    }

    emitParticle() {
        const particle = this._pool.find(p => !p.isActive);
        if (!particle) return; // Pool is full

        particle.isActive = true;
        particle.life = this.startLifetime;
        particle.totalLife = this.startLifetime;

        const systemTransform = this.materia.getComponent(Transform);
        particle.position = { ...systemTransform.position };

        // Velocity based on shape
        const angleRad = (Math.random() * this.coneAngle - this.coneAngle / 2) * (Math.PI / 180);
        const speed = this.startSpeed;
        particle.velocity = {
            x: Math.sin(angleRad) * speed,
            y: -Math.cos(angleRad) * speed // -Y is up in canvas
        };

        particle.startSize = this.startSize;
        particle.endSize = this.endSize;
        particle.size = this.startSize;

        // OPTIMIZATION: Convert colors to objects only once here
        particle.startColor = this.hexToRgba(this.startColor);
        particle.endColor = this.hexToRgba(this.endColor);

        // Set initial color
        const sc = particle.startColor;
        particle.color = `rgba(${sc.r}, ${sc.g}, ${sc.b}, ${sc.a})`;

        if(!this._particles.includes(particle)) {
            this._particles.push(particle);
        }
    }

    play() {
        this._isPlaying = true;
        this._elapsedTime = 0;
    }

    stop() {
        this._isPlaying = false;
    }

    hexToRgba(hex) {
        if (typeof hex === 'object') return hex; // Already converted
        let c;
        if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
            c = hex.substring(1).split('');
            if (c.length == 3) {
                c = [c[0], c[0], c[1], c[1], c[2], c[2]];
            }
            c = '0x' + c.join('');
            return {
                r: (c >> 16) & 255,
                g: (c >> 8) & 255,
                b: c & 255,
                a: 1
            };
        }
         if (/^#([A-Fa-f0-9]{8})$/.test(hex)) { // With alpha
            const bigint = parseInt(hex.slice(1), 16);
            return {
                r: (bigint >> 24) & 255,
                g: (bigint >> 16) & 255,
                b: (bigint >> 8) & 255,
                a: (bigint & 255) / 255
            };
        }

        // Fallback for invalid format
        return { r: 255, g: 255, b: 255, a: 1 };
    }


    clone() {
        const newSystem = new ParticleSystem(null);
        // Emission
        newSystem.duration = this.duration;
        newSystem.loop = this.loop;
        newSystem.maxParticles = this.maxParticles;
        newSystem.emissionRate = this.emissionRate;
        // Shape
        newSystem.shape = this.shape;
        newSystem.coneAngle = this.coneAngle;
        newSystem.coneRadius = this.coneRadius;
        // Lifetime & Movement
        newSystem.startLifetime = this.startLifetime;
        newSystem.startSpeed = this.startSpeed;
        newSystem.gravityModifier = this.gravityModifier;
        // Appearance
        newSystem.startSize = this.startSize;
        newSystem.endSize = this.endSize;
        newSystem.startColor = this.startColor;
        newSystem.endColor = this.endColor;
        newSystem.texturePath = this.texturePath;
        return newSystem;
    }
}
registerComponent('CompositeCollider2D', CompositeCollider2D);

// --- Pathfinding Components ---

export class NavigationArea2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.areaSize = { width: 1000, height: 1000 };
        this.cellSize = 50;
        this.navGrid = null; // This will hold the baked grid data
    }

    bake() {
        console.log(`Baking navigation area with size ${this.areaSize.width}x${this.areaSize.height} and cell size ${this.cellSize}`);
        const scene = this.materia.scene;
        if (!scene) {
            console.error("NavigationArea2D no puede generar el mapa sin una escena.");
            return;
        }

        const cols = Math.floor(this.areaSize.width / this.cellSize);
        const rows = Math.floor(this.areaSize.height / this.cellSize);
        this.navGrid = Array(cols).fill(null).map(() => Array(rows).fill(null).map(() => ({ walkable: true, allowedAgents: [] })));

        const allMaterias = scene.getAllMaterias();

        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                const cellWorldX = this.materia.getComponent(Transform).position.x - this.areaSize.width / 2 + x * this.cellSize + this.cellSize / 2;
                const cellWorldY = this.materia.getComponent(Transform).position.y - this.areaSize.height / 2 + y * this.cellSize + this.cellSize / 2;
                const cellRect = { x: cellWorldX, y: cellWorldY, width: this.cellSize, height: this.cellSize };

                for (const materia of allMaterias) {
                    if (this._checkCollision(cellRect, materia)) {
                        this.navGrid[x][y].walkable = false;
                        break; // Move to the next cell once an obstacle is found
                    }
                }
            }
        }

        // Apply NavModifiers after checking for collisions
        for (const materia of allMaterias) {
            const navModifier = materia.getComponent(NavModifier);
            const boxCollider = materia.getComponent(BoxCollider2D); // NavModifiers are assumed to use a BoxCollider2D
            if (navModifier && boxCollider) {
                const modifierTransform = materia.getComponent(Transform);
                const worldColliderRect = {
                    x: modifierTransform.position.x + boxCollider.offset.x,
                    y: modifierTransform.position.y + boxCollider.offset.y,
                    width: boxCollider.size.x,
                    height: boxCollider.size.y,
                };

                for (let x = 0; x < cols; x++) {
                    for (let y = 0; y < rows; y++) {
                        const cellWorldX = this.materia.getComponent(Transform).position.x - this.areaSize.width / 2 + x * this.cellSize + this.cellSize / 2;
                        const cellWorldY = this.materia.getComponent(Transform).position.y - this.areaSize.height / 2 + y * this.cellSize + this.cellSize / 2;

                        if (cellWorldX > worldColliderRect.x - worldColliderRect.width / 2 &&
                            cellWorldX < worldColliderRect.x + worldColliderRect.width / 2 &&
                            cellWorldY > worldColliderRect.y - worldColliderRect.height / 2 &&
                            cellWorldY < worldColliderRect.y + worldColliderRect.height / 2) {

                            this.navGrid[x][y].walkable = true; // Ensure it's walkable
                            this.navGrid[x][y].allowedAgents.push(navModifier.overrideType);
                        }
                    }
                }
            }
        }

        console.log("Navigation grid baked successfully.", this.navGrid);
    }

    _checkCollision(rect, materia) {
        const boxCollider = materia.getComponent(BoxCollider2D);
        const capsuleCollider = materia.getComponent(CapsuleCollider2D);
        const tilemapCollider = materia.getComponent(TilemapCollider2D);
        const transform = materia.getComponent(Transform);

        if (!transform) return false;

        // AABB check function (Axis-Aligned Bounding Box)
        const checkAABB = (rectA, rectB) => {
            return (
                rectA.x - rectA.width / 2 < rectB.x + rectB.width / 2 &&
                rectA.x + rectA.width / 2 > rectB.x - rectB.width / 2 &&
                rectA.y - rectA.height / 2 < rectB.y + rectB.height / 2 &&
                rectA.y + rectA.height / 2 > rectB.y - rectB.height / 2
            );
        };

        if (boxCollider) {
            const worldColliderRect = {
                x: transform.position.x + boxCollider.offset.x,
                y: transform.position.y + boxCollider.offset.y,
                width: boxCollider.size.x,
                height: boxCollider.size.y,
            };
            return checkAABB(rect, worldColliderRect);
        }

        if (capsuleCollider) {
            // Approximate capsule with a box for grid collision
            const worldColliderRect = {
                x: transform.position.x + capsuleCollider.offset.x,
                y: transform.position.y + capsuleCollider.offset.y,
                width: capsuleCollider.size.x,
                height: capsuleCollider.size.y,
            };
            return checkAABB(rect, worldColliderRect);
        }

        if (tilemapCollider) {
            // This is more complex. We need to check against each generated collider box.
            for (const generated of tilemapCollider.generatedColliders) {
                 const worldColliderRect = {
                    x: transform.position.x + generated.x,
                    y: transform.position.y + generated.y,
                    width: generated.width,
                    height: generated.height,
                };
                if (checkAABB(rect, worldColliderRect)) {
                    return true; // Found a collision with one of the tiles
                }
            }
        }

        return false;
    }

    clone() {
        const newNavArea = new NavigationArea2D(null);
        newNavArea.areaSize = { ...this.areaSize };
        newNavArea.cellSize = this.cellSize;
        // The navGrid is not cloned as it should be rebaked per scene instance if needed.
        return newNavArea;
    }
}
registerComponent('NavigationArea2D', NavigationArea2D);

export class PathfindingAgent extends Leyes {
    constructor(materia) {
        super(materia);
        this.agentType = 'Caminante';
        this.speed = 100;
        this.stoppingDistance = 10;

        this._path = [];
        this._currentTargetIndex = 0;
        this._isMoving = false;
        this._navArea = null;
    }

    start() {
        // Find the NavigationArea2D in the scene at the start
        const scene = this.materia.scene;
        if (scene) {
            for (const rootMateria of scene.getRootMaterias()) {
                const navArea = rootMateria.getComponent(NavigationArea2D);
                if (navArea) {
                    this._navArea = navArea;
                    break;
                }
            }
        }
        if (!this._navArea) {
            console.warn("PathfindingAgent no pudo encontrar un NavigationArea2D en la escena.");
        }
    }

    setDestination(worldX, worldY) {
        this._path = this.calculatePath(worldX, worldY);
        if (this._path && this._path.length > 0) {
            this._currentTargetIndex = 0;
            this._isMoving = true;
        } else {
            this._isMoving = false;
        }
    }

    calculatePath(worldX, worldY) {
        if (!this._navArea || !this._navArea.navGrid) {
            console.error("No hay datos de navegación generados. Asegúrate de 'Generar' el NavigationArea2D.");
            return [];
        }

        const agentTransform = this.materia.getComponent(Transform);
        const navAreaTransform = this._navArea.materia.getComponent(Transform);

        // Convert world coordinates to grid coordinates
        const startX = Math.floor((agentTransform.position.x - navAreaTransform.position.x + this._navArea.areaSize.width / 2) / this._navArea.cellSize);
        const startY = Math.floor((agentTransform.position.y - navAreaTransform.position.y + this._navArea.areaSize.height / 2) / this._navArea.cellSize);
        const endX = Math.floor((worldX - navAreaTransform.position.x + this._navArea.areaSize.width / 2) / this._navArea.cellSize);
        const endY = Math.floor((worldY - navAreaTransform.position.y + this._navArea.areaSize.height / 2) / this._navArea.cellSize);

        const astar = new AStar(this._navArea.navGrid);
        const pathInGridCoords = astar.findPath({ x: startX, y: startY }, { x: endX, y: endY }, this.agentType);

        // Convert grid coordinates back to world coordinates
        return pathInGridCoords.map(node => ({
            x: navAreaTransform.position.x - this._navArea.areaSize.width / 2 + node.x * this._navArea.cellSize + this._navArea.cellSize / 2,
            y: navAreaTransform.position.y - this._navArea.areaSize.height / 2 + node.y * this._navArea.cellSize + this._navArea.cellSize / 2,
        }));
    }

    update(deltaTime) {
        if (!this._isMoving || this._path.length === 0 || this._currentTargetIndex >= this._path.length) {
            return;
        }

        const agentTransform = this.materia.getComponent(Transform);
        const currentTarget = this._path[this._currentTargetIndex];

        const dx = currentTarget.x - agentTransform.position.x;
        const dy = currentTarget.y - agentTransform.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < this.stoppingDistance) {
            this._currentTargetIndex++;
            if (this._currentTargetIndex >= this._path.length) {
                this._isMoving = false; // Reached the end
                return;
            }
        } else {
            // Move towards the target
            const moveX = (dx / distance) * this.speed * deltaTime;
            const moveY = (dy / distance) * this.speed * deltaTime;
            agentTransform.position.x += moveX;
            agentTransform.position.y += moveY;
        }
    }

    clone() {
        const newAgent = new PathfindingAgent(null);
        newAgent.agentType = this.agentType;
        newAgent.speed = this.speed;
        newAgent.stoppingDistance = this.stoppingDistance;
        return newAgent;
    }
}
registerComponent('PathfindingAgent', PathfindingAgent);

export class NavModifier extends Leyes {
    constructor(materia) {
        super(materia);
        this.overrideType = 'Caminante'; // The agent type that can pass through this area
    }

    clone() {
        const newModifier = new NavModifier(null);
        newModifier.overrideType = this.overrideType;
        return newModifier;
    }
}
registerComponent('NavModifier', NavModifier);
registerComponent('ObjectPoolComponent', ObjectPoolComponent);


export class CustomComponent extends Leyes {
    constructor(materia, definitionOrName) {
        super(materia);

        if (typeof definitionOrName === 'string') {
            this.definitionName = definitionOrName;
        } else if (typeof definitionOrName === 'object' && definitionOrName !== null) {
            // This handles instantiation from Inspector and SceneManager where the whole definition is passed.
            this.definitionName = definitionOrName.nombre;
        } else {
            this.definitionName = null;
            console.error("CustomComponent Creado con definición o nombre inválido.");
        }

        this.publicVars = {};
        this.instance = null;
        this.isInitialized = false;

        // Lazy initialization of the definition
        this._definition = null;
    }

    // Use a getter for the definition to ensure it's loaded lazily
    get definition() {
        if (!this._definition) {
            this._definition = CES_Transpiler.getComponentDefinition(this.definitionName);
            if (!this._definition) {
                console.error(`[CustomComponent] Definición '${this.definitionName}' no encontrada.`);
                // Return a dummy definition to prevent further errors
                return { nombre: this.definitionName, publicVars: [] };
            }
            // Initialize publicVars from the definition's defaults
            this._definition.publicVars.forEach(pv => {
                if (this.publicVars[pv.name] === undefined) {
                   this.publicVars[pv.name] = pv.defaultValue;
                }
            });
        }
        return this._definition;
    }

    async initializeInstance() {
        if (this.isInitialized || !this.definitionName) return;

        try {
            const componentDefinition = this.definition; // Use the getter
            if (!componentDefinition || !componentDefinition.transpiledCode) {
                 throw new Error(`No se encontró código transpilado para el componente personalizado '${this.definitionName}'.`);
            }

            const factory = (new Function(`return ${componentDefinition.transpiledCode}`))();
            const ScriptClass = factory(CreativeScriptBehavior, RuntimeAPIManager);

            if (ScriptClass) {
                this.instance = new ScriptClass(this.materia);

                 // --- Important: Re-run shortcut initialization ---
                 // This ensures shortcuts to other custom components added later are available.
                this.instance._initializeComponentShortcuts();


                if (!this.instance.hasOwnProperty('materia')) this.instance.materia = this.materia;
                if (!this.instance.hasOwnProperty('scene')) this.instance.scene = this.materia ? this.materia.scene : null;

                // Apply public var values from the inspector over the defaults
                if (this.publicVars) {
                     for (const varName in this.publicVars) {
                         if (this.publicVars.hasOwnProperty(varName)) {
                            let savedValue = this.publicVars[varName];
                             // Special handling for Materia references
                            if (componentDefinition.publicVars.find(p => p.name === varName)?.type === 'Materia' && savedValue != null) {
                                if (typeof savedValue === 'number') {
                                    savedValue = this.materia.scene.findMateriaById(savedValue);
                                } else if (typeof savedValue === 'string') {
                                    savedValue = this.materia.scene.getAllMaterias().find(m => m.name === savedValue) || null;
                                }
                            }
                            this.instance[varName] = savedValue;
                         }
                     }
                }

                this.isInitialized = true;
            } else {
                 throw new Error(`El componente personalizado '${this.definitionName}' no exporta una clase.`);
            }

        } catch (error) {
            console.error(`Error al inicializar instancia del componente personalizado '${this.definitionName}':`, error);
            this.isInitialized = false;
        }
    }

    // --- Lifecycle Wrappers ---
    start() {
        if (this.instance && typeof this.instance.start === 'function') {
            try { this.instance.start(); } catch(e) { console.error(`Error en start() de ${this.definitionName}:`, e); }
        }
    }
    update(deltaTime) {
        if (this.instance && typeof this.instance.update === 'function') {
             try { this.instance.update(deltaTime); } catch(e) { console.error(`Error en update() de ${this.definitionName}:`, e); }
        }
    }
     fixedUpdate(deltaTime) {
        if (this.instance && typeof this.instance.fixedUpdate === 'function') {
             try { this.instance.fixedUpdate(deltaTime); } catch(e) { console.error(`Error en fixedUpdate() de ${this.definitionName}:`, e); }
        }
    }

    clone() {
        const newCustom = new CustomComponent(null, this.definitionName);
        // Deep copy public vars to avoid shared state
        newCustom.publicVars = JSON.parse(JSON.stringify(this.publicVars));
        return newCustom;
    }
}
