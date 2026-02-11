// Components.js
// This file contains all the component classes.

import { Leyes } from './Leyes.js';
import { registerComponent } from './ComponentRegistry.js';
import { getURLForAssetPath } from './AssetUtils.js';
import { InputManager } from './Input.js';
import * as RuntimeAPIManager from './RuntimeAPIManager.js';
import { bus as MessageBus } from './Messaging.js';

let editorLogic = null;

export function setEditorLogic(logic) {
    editorLogic = logic;
}

// --- Bilingual Component Aliases ---
const componentAliases = {
    'Transform': 'posicion',
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
    'FreeformLight2D': 'luzFormaLibre2D',
    'SpriteLight2D': 'luzDeSprite2D',
    'Tilemap': 'mapaDeAzulejos',
    'TilemapRenderer': 'renderizadorMapaDeAzulejos',
    'TilemapCollider2D': 'colisionadorMapaDeAzulejos2D',
    'CompositeCollider2D': 'colisionadorCompuesto2D',
    'Grid': 'rejilla',
    'TextureRender': 'renderizadorDeTextura',
    'Canvas': 'lienzo',
    'UIImage': 'imagenUI',
    'UITransform': 'transformacionUI',
    'UIText': 'textoUI',
    'Button': 'boton',
    'CustomComponent': 'componentePersonalizado',
    'Parallax': 'parallax',
    'Movement': 'movimiento',
    'CameraFollow': 'seguimientoDeCamara',
    'DrawingOrder': 'ordenDeDibujo',
    'ProjectileLauncher': 'lanzadorDeProyectiles',
    'AutoDestroy': 'destruccionAutomatica',
    'Health': 'vida',
    'Patrol': 'patrulla',
    'ParticleSystem': 'sistemaDeParticulas',
    'Terreno2D': 'terreno2D',
    'TerrenoCollider2D': 'colisionadorTerreno2D',
    'Gyzmo': 'gyzmo'
};


// --- Base Behavior for Scripts ---
export class CreativeScriptBehavior {
    constructor(materia) {
        this.materia = materia;
        this._messageSubscriptions = [];

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

            // Special case for Transform: allow both 'transformacion' and 'posicion'
            if (componentName === 'Transform') {
                if (!this.hasOwnProperty('transformacion')) {
                    this['transformacion'] = component;
                }
            }
        }
    }
    start() { /* To be overridden by user scripts */ }
    update(deltaTime) { /* To be overridden by user scripts */ } // Kept for compatibility; user scripts receive deltaTime now

    /**
     * Pausa la ejecución del script por una cantidad determinada de segundos.
     * Solo funciona dentro de métodos marcados como 'async' (todos los métodos .ces lo son por defecto).
     * @param {number} segundos - Tiempo a esperar en segundos.
     */
    async esperar(segundos) {
        return new Promise(resolve => setTimeout(resolve, segundos * 1000));
    }

    /**
     * @private
     * Ejecuta una función repetidamente cada X segundos.
     */
    _runInterval(segundos, callback) {
        const intervalId = setInterval(async () => {
            if (!this.materia || !this.materia.isActive) {
                clearInterval(intervalId);
                return;
            }
            try {
                await callback();
            } catch (e) {
                console.error(`[Timer] Error en intervalo de ${this.materia.name}:`, e);
                clearInterval(intervalId);
            }
        }, segundos * 1000);

        // Registrar para limpieza si es necesario
        if (!this._intervals) this._intervals = [];
        this._intervals.push(intervalId);
    }

    /**
     * Busca un script en la materia actual.
     * @param {string} nombre - Nombre del script.
     */
    obtenerScript(nombre) {
        return this.materia ? this.materia.obtenerScript(nombre) : null;
    }

    /**
     * Obtiene un componente de esta materia por su clase o nombre.
     */
    obtenerComponente(tipo) {
        if (!this.materia) return null;
        if (typeof tipo === 'string') return this.materia.getComponentByName(tipo);
        return this.materia.getComponent(tipo);
    }

    /**
     * Obtiene un componente en los padres de esta materia.
     */
    obtenerComponenteEnPadre(tipo) {
        return this.materia ? this.materia.getComponentInParent(tipo) : null;
    }

    /**
     * Obtiene un componente en los hijos de esta materia.
     */
    obtenerComponenteEnHijos(tipo) {
        return this.materia ? this.materia.getComponentInChildren(tipo) : null;
    }

    /**
     * Comprueba si la materia tiene una etiqueta específica.
     */
    tieneTag(tag) {
        return this.materia && this.materia.tag === tag;
    }
    hasTag(tag) { return this.tieneTag(tag); }

    danar(materia, cantidad) {
        if (!materia) return;
        const health = materia.getComponent(Health);
        if (health) health.damage(cantidad);
    }
    damage(materia, cantidad) { this.danar(materia, cantidad); }

    curar(materia, cantidad) {
        if (!materia) return;
        const health = materia.getComponent(Health);
        if (health) health.heal(cantidad);
    }
    heal(materia, cantidad) { this.curar(materia, cantidad); }

    // English Aliases
    getComponent(type) { return this.obtenerComponente(type); }
    getComponentInParent(type) { return this.obtenerComponenteEnPadre(type); }
    getComponentInChildren(type) { return this.obtenerComponenteEnHijos(type); }

    /**
     * Devuelve el tiempo transcurrido desde el último frame.
     */
    get deltaTime() {
        const engine = RuntimeAPIManager.getAPI('engine');
        return engine ? engine.getDeltaTime() : 0;
    }

    /** Alias en español */
    get tiempoDelta() { return this.deltaTime; }

    get estaActivado() { return this.materia ? this.materia.isActive : false; }
    set estaActivado(v) { if (this.materia) this.materia.isActive = v; }
    get activo() { return this.estaActivado; }
    set activo(v) { this.estaActivado = v; }

    get nombre() { return this.materia ? this.materia.name : ''; }
    set nombre(v) { if (this.materia) this.materia.name = v; }
    get tag() { return this.materia ? this.materia.tag : ''; }
    set tag(v) { if (this.materia) this.materia.tag = v; }

    get motor() { return this; }
    get engine() { return this; }
    get mtr() { return this.materia; }
    get colisionador2d() {
        return this.materia.getComponent(BoxCollider2D) ||
               this.materia.getComponent(CapsuleCollider2D);
    }
    get particula() { return this.materia.getComponent(ParticleSystem); }
    get particulas() { return this.particula; }
    get sistemaDeParticulas() { return this.particula; }

    get texto() { return this.materia.getComponent(UIText); }
    get boton() { return this.materia.getComponent(Button); }
    get imagen() { return this.materia.getComponent(UIImage); }
    get lienzo() { return this.materia.getComponent(Canvas); }

    get ui() {
        const self = this;
        return {
            get texto() { return self.materia.getComponent(UIText); },
            get boton() { return self.materia.getComponent(Button); },
            get imagen() { return self.materia.getComponent(UIImage); },
            get lienzo() { return self.materia.getComponent(Canvas); }
        };
    }

    /**
     * Destruye una Materia (objeto) del juego.
     * @param {Materia} materia - El objeto a destruir.
     */
    destruir(materia) {
        if (!materia) return;
        const scene = materia.scene || (this.materia ? this.materia.scene : null);
        if (scene) {
            scene.removeMateria(materia.id);
        }
    }

    /**
     * Crea una copia de una Materia (objeto) existente y la añade a la escena actual.
     */
    instanciar(original, x, y) {
        // We import it dynamically or just use the global/RuntimeManager if available.
        // But the easiest is to just use what's already imported in this file if we add it.
        // Actually, SceneManager is not imported here.
        // Let's use the global one which is usually available or inject it.
        if (window.SceneManager && window.SceneManager.instanciar) {
            return window.SceneManager.instanciar(original, x, y);
        }
        return null;
    }

    // English Aliases
    getScript(name) { return this.obtenerScript(name); }
    destroy(materia) { this.destruir(materia); }
    instantiate(original, x, y) { return this.instanciar(original, x, y); }

    /**
     * Crea una instancia de un prefab a partir de su ruta.
     * @param {string} ruta - Ruta al archivo .ceprefab.
     * @param {number} [x]
     * @param {number} [y]
     */
    async crear(ruta, x, y) {
        if (!ruta) return null;
        if (window.SceneManager && window.SceneManager.instantiatePrefabFromPath) {
            return await window.SceneManager.instantiatePrefabFromPath(ruta, x, y);
        }
        return null;
    }

    async create(ruta, x, y) { return await this.crear(ruta, x, y); }

    /**
     * Busca un objeto en la escena por su nombre.
     */
    buscar(nombre) {
        const engine = RuntimeAPIManager.getAPI('engine');
        return engine ? engine.buscar(nombre) : null;
    }
    find(nombre) { return this.buscar(nombre); }

    /**
     * Detecta objetos en una línea.
     */
    lanzarRayo(origen, direccion, distancia, tag) {
        const engine = RuntimeAPIManager.getAPI('engine');
        return engine ? engine.lanzarRayo(origen, direccion, distancia, tag) : null;
    }
    raycast(origen, direccion, distancia, tag) { return this.lanzarRayo(origen, direccion, distancia, tag); }

    // --- Colisiones (Wrappers) ---
    alEntrarEnColision(...args) {
        const engine = RuntimeAPIManager.getAPI('engine');
        if (!engine) return [];
        if (args.length === 0) return engine.alEntrarEnColision(this.materia);
        if (args.length === 1) return engine.alEntrarEnColision(this.materia, args[0]);
        return engine.alEntrarEnColision(args[0], args[1]);
    }
    getCollisionEnter(...args) { return this.alEntrarEnColision(...args); }

    alPermanecerEnColision(...args) {
        const engine = RuntimeAPIManager.getAPI('engine');
        if (!engine) return [];
        if (args.length === 0) return engine.alPermanecerEnColision(this.materia);
        if (args.length === 1) return engine.alPermanecerEnColision(this.materia, args[0]);
        return engine.alPermanecerEnColision(args[0], args[1]);
    }
    getCollisionStay(...args) { return this.alPermanecerEnColision(...args); }

    alSalirDeColision(...args) {
        const engine = RuntimeAPIManager.getAPI('engine');
        if (!engine) return [];
        if (args.length === 0) return engine.alSalirDeColision(this.materia);
        if (args.length === 1) return engine.alSalirDeColision(this.materia, args[0]);
        return engine.alSalirDeColision(args[0], args[1]);
    }
    getCollisionExit(...args) { return this.alSalirDeColision(...args); }

    /**
     * Difunde un mensaje global a todos los scripts interesados.
     * @param {string} mensaje - Nombre del mensaje.
     * @param {any} [datos] - Datos opcionales.
     */
    difundir(mensaje, datos) {
        MessageBus.broadcast(mensaje, datos);
    }

    /**
     * Se suscribe a un mensaje global.
     * @param {string} mensaje - Nombre del mensaje.
     * @param {Function} callback - Función a ejecutar.
     */
    alRecibir(mensaje, callback) {
        const unsub = MessageBus.subscribe(mensaje, callback.bind(this));
        this._messageSubscriptions.push(unsub);
    }

    // English Aliases
    broadcast(message, data) { this.difundir(message, data); }
    onReceive(message, callback) { this.alRecibir(message, callback); }

    _cleanupSubscriptions() {
        this._messageSubscriptions.forEach(unsub => unsub());
        this._messageSubscriptions = [];

        if (this._intervals) {
            this._intervals.forEach(id => clearInterval(id));
            this._intervals = [];
        }
    }

    /**
     * Internal method used to log messages from user scripts, marking them as non-system.
     * @private
     */
    _userLog(message, type = 'log', ...args) {
        if (typeof window !== 'undefined' && window.logToUIConsole) {
            window.logToUIConsole(message, type, false, ...args);
        } else {
            console[type](message, ...args);
        }
    }

    // --- Utility & Math Functions ---
    random(min = 0, max = 1) { return Math.random() * (max - min) + min; }
    azar(min, max) { return this.random(min, max); }

    sin(v) { return Math.sin(v); }
    seno(v) { return Math.sin(v); }
    cos(v) { return Math.cos(v); }
    coseno(v) { return Math.cos(v); }
    tan(v) { return Math.tan(v); }
    tangente(v) { return Math.tan(v); }
    sqrt(v) { return Math.sqrt(v); }
    raizCuadrada(v) { return Math.sqrt(v); }
    abs(v) { return Math.abs(v); }
    absoluto(v) { return Math.abs(v); }

    round(v) { return Math.round(v); }
    redondear(v) { return Math.round(v); }
    floor(v) { return Math.floor(v); }
    piso(v) { return Math.floor(v); }
    ceil(v) { return Math.ceil(v); }
    techo(v) { return Math.ceil(v); }

    clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
    limitar(v, min, max) { return this.clamp(v, min, max); }

    distance(x1, y1, x2, y2) {
        if (typeof x1 === 'object' && typeof y1 === 'object') {
            return Math.hypot(x1.x - y1.x, x1.y - y1.y);
        }
        return Math.hypot(x1 - x2, y1 - y2);
    }
    distancia(x1, y1, x2, y2) { return this.distance(x1, y1, x2, y2); }

    Vector2(x = 0, y = 0) { return { x, y }; }
    Color(r = 255, g = 255, b = 255, a = 1) {
        // Support for hex string constructor
        if (typeof r === 'string' && r.startsWith('#')) return r;
        return `rgba(${r},${g},${b},${a})`;
    }

    // --- Collision & Trigger Event Stubs ---
    alEntrarEnColision(colision) {}
    alPermanecerEnColision(colision) {}
    alSalirDeColision(colision) {}
    alEntrarEnTrigger(colision) {}
    alPermanecerEnTrigger(colision) {}
    alSalirDeTrigger(colision) {}
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

    /**
     * Hace que el objeto mire hacia una posición específica.
     * @param {number|{x:number, y:number}} xOrObj - Posición X o vector.
     * @param {number} [y] - Posición Y.
     */
    lookAt(xOrObj, y) {
        let tx = 0, ty = 0;
        if (typeof xOrObj === 'object') {
            tx = xOrObj.x;
            ty = xOrObj.y;
        } else {
            tx = xOrObj;
            ty = y;
        }
        const dx = tx - this.x;
        const dy = ty - this.y;
        this.rotation = Math.atan2(dy, dx) * 180 / Math.PI;
    }

    /** Alias en español */
    mirarA(x, y) { this.lookAt(x, y); }

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
        this.projection = 'Orthographic'; // Strict 2D
        this.orthographicSize = 5; // Size for Orthographic
        this.nearClipPlane = -1; // Standard 2D values
        this.farClipPlane = 1;
        this.clearFlags = 'SolidColor'; // 'SolidColor', 'Skybox', or 'DontClear'
        this.backgroundColor = '#1e293b'; // Default solid color
        this.cullingMask = -1; // Bitmask, -1 means 'Everything'
        this.zoom = 1.0; // Editor-only zoom, not part of the component's data.
    }
    clone() {
        const newCamera = new Camera(null);
        newCamera.depth = this.depth;
        newCamera.projection = this.projection;
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
    async _safeInvoke(methodName, ...args) {
        if (!this.instance || typeof this.instance[methodName] !== 'function') return;
        try {
            // We await it so if it's async, it catches errors correctly.
            // Note: For frame-based updates, we don't wait for the promise to resolve before the next frame,
            // but we do await it here for error handling.
            await this.instance[methodName](...args);
        } catch (e) {
            console.error(`[CreativeScript] Error en el método '${methodName}' del script '${this.scriptName}' en el objeto '${this.materia ? this.materia.name : 'Desconocido'}':\n`, e);
        }
    }

    start() {
        this._safeInvoke('start');
    }

    update(deltaTime) {
        this._safeInvoke('update', deltaTime);
    }

    fixedUpdate(deltaTime) {
        this._safeInvoke('fixedUpdate', deltaTime);
    }

    onEnable() {
        this._safeInvoke('onEnable');
    }

    onDisable() {
        this._safeInvoke('onDisable');
    }

    onDestroy() {
        this._safeInvoke('onDestroy');
        if (this.instance && typeof this.instance._cleanupSubscriptions === 'function') {
            this.instance._cleanupSubscriptions();
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
            let transpiledCode;

            // Standalone support
            if (window.CE_Standalone_Scripts) {
                transpiledCode = window.CE_Standalone_Scripts[this.scriptName];
            } else if (editorLogic) {
                transpiledCode = editorLogic.getTranspiledCode(this.scriptName);
            }

            if (!transpiledCode) {
                throw new Error(`No se encontró código transpilado para '${this.scriptName}'.`);
            }

            const factory = (new Function(`return ${transpiledCode}`))();
            const ScriptClass = factory(CreativeScriptBehavior, RuntimeAPIManager);

            if (ScriptClass) {
                this.instance = new ScriptClass(this.materia);

                // Ensure common aliases exist on the instance so script authors can write in either language
                const aliasMap = {
                    start: ['iniciar', 'alEmpezar'],
                    update: ['actualizar', 'alActualizar'],
                    onEnable: ['alHabilitar', 'activar'],
                    onDisable: ['alDeshabilitar', 'desactivar'],
                    onDestroy: ['alDestruir'],
                    fixedUpdate: ['actualizarFijo'],
                    alEntrarEnColision: ['OnCollisionEnter'],
                    alPermanecerEnColision: ['OnCollisionStay'],
                    alSalirDeColision: ['OnCollisionExit'],
                    alEntrarEnTrigger: ['OnTriggerEnter'],
                    alPermanecerEnTrigger: ['OnTriggerStay'],
                    alSalirDeTrigger: ['OnTriggerExit'],
                    alFinalizarAnimacion: ['OnAnimationEnd']
                };

                for (const [canonical, aliases] of Object.entries(aliasMap)) {
                    for (const alt of aliases) {
                        // Check if the method is defined/overridden in the instance (not just the base class stub)
                        const hasAlt = typeof this.instance[alt] === 'function' && this.instance[alt] !== CreativeScriptBehavior.prototype[alt];
                        const hasCan = typeof this.instance[canonical] === 'function' && this.instance[canonical] !== CreativeScriptBehavior.prototype[canonical];

                        if (hasAlt && !hasCan) {
                            this.instance[canonical] = this.instance[alt];
                        } else if (hasCan && !hasAlt) {
                            this.instance[alt] = this.instance[canonical];
                        }
                    }
                }


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
                // The 'engine' and 'motor' APIs are now handled by getters in the base class.
                // --- End API Injection ---


                // --- LÓGICA DE ASIGNACIÓN DE VARIABLES PÚBLICAS REVISADA ---
                // El constructor de la instancia del script (generado por el transpilador) ya asigna
                // los valores por defecto definidos en el código.
                // Aquí, SOLO sobrescribimos esos valores si hay un valor diferente
                // guardado en la escena (proveniente del Inspector).

                if (this.publicVars) {
                    const metadataSource = window.CE_Script_Metadata || (editorLogic ? editorLogic.getAllMetadata() : {});
                    const metadata = (metadataSource[this.scriptName]) || { publicVars: [] };
                    const metadataMap = new Map(metadata.publicVars.map(p => [p.name, p]));

                    for (const varName in this.publicVars) {
                        // Comprobar que la variable guardada todavía existe en el script
                        if (this.publicVars.hasOwnProperty(varName) && metadataMap.has(varName)) {
                            let savedValue = this.publicVars[varName];

                            // Asignar solo si el valor guardado no es nulo o indefinido.
                            // Un string vacío "" se considera un valor válido.
                            if (savedValue !== null && savedValue !== undefined) {
                                const metaVar = metadataMap.get(varName);

                                // Resolver referencias a Materia o Componentes por ID o nombre
                                if (savedValue != null && metaVar.type !== 'number' && metaVar.type !== 'string' && metaVar.type !== 'boolean') {
                                    if (typeof savedValue === 'number') {
                                        const targetMateria = this.materia.scene.findMateriaById(savedValue);
                                        if (targetMateria) {
                                            if (metaVar.type === 'Materia') {
                                                savedValue = targetMateria;
                                            } else {
                                                // Intentar obtener el componente específico por nombre
                                                savedValue = targetMateria.getComponentByName(metaVar.type) || targetMateria;
                                            }
                                        }
                                    } else if (typeof savedValue === 'string' && metaVar.type === 'Materia') {
                                        savedValue = this.materia.scene.getAllMaterias().find(m => m.name === savedValue) || null;
                                    }
                                }

                                // Reconstrucción de tipos complejos (Vector2, Color) si es necesario
                                // Por ahora se asume que son objetos planos {x,y} o {r,g,b,a}
                                // pero aquí se podría añadir lógica de 'new Vector2()' si las clases estuvieran disponibles.

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
        this.rebote = 0.0; // Bounciness (0-1)
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
        this.angularVelocity = 0;
    }

    get velocidad() { return this.velocity; }
    set velocidad(v) { this.velocity = v; }
    get velocidadAngular() { return this.angularVelocity; }
    set velocidadAngular(v) { this.angularVelocity = v; }
    get masa() { return this.mass; }
    set masa(m) { this.mass = m; }
    get escalaGravedad() { return this.gravityScale; }
    set escalaGravedad(s) { this.gravityScale = s; }
    get arrastreAngular() { return this.angularDrag; }
    set arrastreAngular(a) { this.angularDrag = a; }

    addForce(xOrObj = 0, y = 0) {
        let fx = 0, fy = 0;
        if (typeof xOrObj === 'object') {
            fx = xOrObj.x || 0;
            fy = xOrObj.y || 0;
        } else {
            fx = xOrObj;
            fy = y;
        }

        const mass = Math.max(0.1, this.mass);
        this.velocity.x += fx / mass;
        this.velocity.y += fy / mass;
    }

    addImpulse(xOrObj = 0, y = 0) {
        let ix = 0, iy = 0;
        if (typeof xOrObj === 'object') {
            ix = xOrObj.x || 0;
            iy = xOrObj.y || 0;
        } else {
            ix = xOrObj;
            iy = y;
        }

        const mass = Math.max(0.1, this.mass);
        this.velocity.x += ix / mass;
        this.velocity.y += iy / mass;
    }

    addTorque(torque) {
        const mass = Math.max(0.1, this.mass);
        // Inertia approximation for a simple object
        const inertia = mass * 100;
        this.angularVelocity += torque / inertia;
    }

    aplicarTorque(torque) { this.addTorque(torque); }

    setVelocity(xOrObj = 0, y = 0) {
        if (typeof xOrObj === 'object') {
            this.velocity.x = xOrObj.x || 0;
            this.velocity.y = xOrObj.y || 0;
        } else {
            this.velocity.x = xOrObj;
            this.velocity.y = y;
        }
    }

    // --- Spanish Aliases ---
    aplicarFuerza(x, y) { this.addForce(x, y); }
    aplicarImpulso(x, y) { this.addImpulse(x, y); }
    establecerVelocidad(x, y) { this.setVelocity(x, y); }

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
        newRb.rebote = this.rebote;
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
        this.opacity = 1.0;
        this.orderInLayer = 0;
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
        newRenderer.opacity = this.opacity;
        newRenderer.orderInLayer = this.orderInLayer;
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

    /** Alias en español */
    reproducir() { this.play(); }
    detener() { this.stop(); }

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
                // Notificar finalización de animación
                const scripts = this.materia.getComponents(CreativeScript);
                for (const script of scripts) {
                    script._safeInvoke('alFinalizarAnimacion', this.animationClip.name);
                    script._safeInvoke('OnAnimationEnd', this.animationClip.name);
                }

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
        this.filtroOpacidad = 1.0;
    }
    clone() {
        const newLight = new PointLight2D(null);
        newLight.color = this.color;
        newLight.intensity = this.intensity;
        newLight.radius = this.radius;
        newLight.filtroOpacidad = this.filtroOpacidad;
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
        this.filtroOpacidad = 1.0;
    }
    clone() {
        const newLight = new SpotLight2D(null);
        newLight.color = this.color;
        newLight.intensity = this.intensity;
        newLight.radius = this.radius;
        newLight.angle = this.angle;
        newLight.filtroOpacidad = this.filtroOpacidad;
        return newLight;
    }
}

export class FreeformLight2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.color = '#FFFFFF';
        this.intensity = 1.0;
        this.filtroOpacidad = 1.0;
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
        newLight.filtroOpacidad = this.filtroOpacidad;
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
        this.filtroOpacidad = 1.0;
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
        this._audio = null;
        this._isLoaded = false;
    }

    async start() {
        if (this.playOnAwake) {
            this.play();
        }
    }

    async play() {
        if (!this.source) return;

        try {
            if (!this._audio) {
                const url = await getURLForAssetPath(this.source, window.projectsDirHandle);
                if (!url) return;
                this._audio = new Audio(url);
                this._audio.oncanplaythrough = () => this._isLoaded = true;
            }

            this._audio.volume = this.volume;
            this._audio.loop = this.loop;
            await this._audio.play();
        } catch (e) {
            console.warn(`[AudioSource] No se pudo reproducir audio: ${this.source}.`, e);
        }
    }

    stop() {
        if (this._audio) {
            this._audio.pause();
            this._audio.currentTime = 0;
        }
    }

    pause() {
        if (this._audio) {
            this._audio.pause();
        }
    }

    // --- Spanish Aliases ---
    reproducir() { this.play(); }
    detener() { this.stop(); }
    pausar() { this.pause(); }

    get volumen() { return this.volume; }
    set volumen(v) { this.volume = v; if (this._audio) this._audio.volume = v; }
    get bucle() { return this.loop; }
    set bucle(l) { this.loop = l; if (this._audio) this._audio.loop = l; }

    onDestroy() {
        this.stop();
        this._audio = null;
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
        this.orderInLayer = 0;
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
        newRender.orderInLayer = this.orderInLayer;
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

    /** Alias en español */
    reproducir(nombreEstado) { this.play(nombreEstado); }

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

    get texto() { return this.text; }
    set texto(v) { this.text = v; }

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

    get interactuable() { return this.interactable; }
    set interactuable(v) { this.interactable = v; }

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

export class DrawingOrder extends Leyes {
    constructor(materia) {
        super(materia);
        this.order = 0;
    }
    clone() {
        const newOrder = new DrawingOrder(null);
        newOrder.order = this.order;
        return newOrder;
    }
}
registerComponent('DrawingOrder', DrawingOrder);

export class Parallax extends Leyes {
    constructor(materia) {
        super(materia);
        this.scrollFactor = { x: 0.5, y: 0.5 };
        this.mirroring = { x: 0, y: 0 }; // 0 means no repeat
        this.offset = { x: 0, y: 0 };
        this.autoscroll = { x: 0, y: 0 };

        // Internal state
        this._autoOffset = { x: 0, y: 0 };
    }
    update(deltaTime) {
        if (this.autoscroll.x !== 0 || this.autoscroll.y !== 0) {
            this._autoOffset.x += this.autoscroll.x * deltaTime;
            this._autoOffset.y += this.autoscroll.y * deltaTime;
        }
    }
    clone() {
        const newParallax = new Parallax(null);
        newParallax.scrollFactor = { ...this.scrollFactor };
        newParallax.mirroring = { ...this.mirroring };
        newParallax.offset = { ...this.offset };
        newParallax.autoscroll = { ...this.autoscroll };
        return newParallax;
    }
}
registerComponent('Parallax', Parallax);

export class Movement extends Leyes {
    constructor(materia) {
        super(materia);
        this.upKey = 'w';
        this.downKey = 's';
        this.leftKey = 'a';
        this.rightKey = 'd';
        this.jumpKey = 'space';
        this.speed = 200;
        this.jumpForce = 400;
        this.useRigidbody = true;
        this.groundTag = 'Ground';
        this.isGrounded = false;
    }
    update(deltaTime) {
        const input = RuntimeAPIManager.getAPI('input');
        const engine = RuntimeAPIManager.getAPI('engine');
        if (!input) return;

        // Ground check
        if (this.groundTag && engine) {
            const collisions = engine.alPermanecerEnColision(this.materia, this.groundTag);
            this.isGrounded = collisions.length > 0;
        } else {
            this.isGrounded = true; // No ground tag means always grounded
        }

        let moveX = 0;
        let moveY = 0;

        if (input.isKeyPressed(this.rightKey)) moveX += 1;
        if (input.isKeyPressed(this.leftKey)) moveX -= 1;
        if (input.isKeyPressed(this.upKey)) moveY -= 1;
        if (input.isKeyPressed(this.downKey)) moveY += 1;

        const rb = this.materia.getComponent(Rigidbody2D);
        const transform = this.materia.getComponent(Transform);

        if (this.useRigidbody && rb) {
            rb.velocity.x = moveX * (this.speed / 10);

            if (this.isGrounded && input.isKeyJustPressed(this.jumpKey)) {
                 rb.addImpulse(0, -this.jumpForce / 10);
            }
        } else if (transform) {
            transform.x += moveX * this.speed * deltaTime;
            transform.y += moveY * this.speed * deltaTime;
        }
    }
    clone() {
        const newMovement = new Movement(null);
        newMovement.upKey = this.upKey;
        newMovement.downKey = this.downKey;
        newMovement.leftKey = this.leftKey;
        newMovement.rightKey = this.rightKey;
        newMovement.jumpKey = this.jumpKey;
        newMovement.speed = this.speed;
        newMovement.jumpForce = this.jumpForce;
        newMovement.useRigidbody = this.useRigidbody;
        newMovement.groundTag = this.groundTag;
        return newMovement;
    }
}
registerComponent('Movement', Movement);

export class CameraFollow extends Leyes {
    constructor(materia) {
        super(materia);
        this.target = null;
        this.smoothness = 0.1;
        this.offset = { x: 0, y: 0 };
        this.followX = true;
        this.followY = true;
    }
    update(deltaTime) {
        let targetObj = this.target;
        if (typeof targetObj === 'number') {
            targetObj = this.materia.scene.findMateriaById(targetObj);
        }
        if (!targetObj) return;

        const targetTransform = targetObj.getComponent(Transform);
        const camTransform = this.materia.getComponent(Transform);
        if (!targetTransform || !camTransform) return;

        const targetX = this.followX ? targetTransform.position.x + this.offset.x : camTransform.position.x;
        const targetY = this.followY ? targetTransform.position.y + this.offset.y : camTransform.position.y;

        camTransform.position.x += (targetX - camTransform.position.x) * this.smoothness;
        camTransform.position.y += (targetY - camTransform.position.y) * this.smoothness;
    }
    clone() {
        const newFollow = new CameraFollow(null);
        newFollow.target = this.target;
        newFollow.smoothness = this.smoothness;
        newFollow.offset = { ...this.offset };
        newFollow.followX = this.followX;
        newFollow.followY = this.followY;
        return newFollow;
    }
}
registerComponent('CameraFollow', CameraFollow);

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

/**
 * Componente Terreno2D: Permite dibujar formas de terreno arbitrarias (píxeles/máscara).
 */
export class Terreno2D extends Leyes {
    constructor(materia) {
        super(materia);
        this._width = 1024;
        this._height = 1024;
        this.layers = []; // [{texturePath, opacity, serializedMask, maskCanvas, maskCtx}]

        // Add a default layer if created fresh
        if (materia) {
            this.addLayer('');
        }

        this.sortingLayer = 'Default';
        this.orderInLayer = 0;
        this.baseColor = '#4a4a4a';

        this.imageCache = new Map();
    }

    async loadTextures(projectsDirHandle) {
        for (const layer of this.layers) {
            // Inicializar canvas de máscara si no existe
            if (!layer.maskCanvas) {
                this._initializeLayerCanvas(layer);
            }

            if (layer.texturePath && !this.imageCache.has(layer.texturePath)) {
                try {
                    const url = await getURLForAssetPath(layer.texturePath, projectsDirHandle);
                    if (url) {
                        const img = new Image();
                        img.src = url;
                        await new Promise((resolve, reject) => {
                            img.onload = resolve;
                            img.onerror = reject;
                        });
                        this.imageCache.set(layer.texturePath, img);
                    }
                } catch (e) {
                    console.error(`Error al cargar textura de terreno: ${layer.texturePath}`, e);
                }
            }

            // Cargar máscara serializada si existe
            if (layer.serializedMask) {
                const img = new Image();
                img.src = layer.serializedMask;
                await new Promise(r => img.onload = r);
                layer.maskCtx.clearRect(0, 0, this.width, this.height);
                layer.maskCtx.drawImage(img, 0, 0);
            }
        }
    }

    _initializeLayerCanvas(layer) {
        layer.maskCanvas = document.createElement('canvas');
        layer.maskCanvas.width = this.width;
        layer.maskCanvas.height = this.height;
        layer.maskCtx = layer.maskCanvas.getContext('2d');
    }

    get width() { return this._width; }
    set width(v) {
        this._width = v;
        for (const layer of this.layers) {
            if (layer.maskCanvas) layer.maskCanvas.width = v;
        }
    }
    get height() { return this._height; }
    set height(v) {
        this._height = v;
        for (const layer of this.layers) {
            if (layer.maskCanvas) layer.maskCanvas.height = v;
        }
    }

    getImageForLayer(index) {
        if (index < 0 || index >= this.layers.length) return null;
        return this.imageCache.get(this.layers[index].texturePath);
    }

    addLayer(texturePath) {
        const newLayer = {
            texturePath: texturePath,
            opacity: 1.0,
            serializedMask: null
        };
        this._initializeLayerCanvas(newLayer);
        this.layers.push(newLayer);
    }

    removeLayer(index) {
        if (index >= 0 && index < this.layers.length) {
            this.layers.splice(index, 1);
        }
    }

    /**
     * Pinta en la máscara de una capa específica del terreno.
     * @param {number} worldX
     * @param {number} worldY
     * @param {number} radius
     * @param {boolean} erase
     * @param {number} layerIndex
     */
    paint(worldX, worldY, radius, erase = false, layerIndex = 0) {
        const transform = this.materia.getComponent(Transform);
        if (!transform) return;

        if (this.layers.length === 0) {
            if (erase) return;
            this.addLayer('');
            layerIndex = 0;
        }

        if (layerIndex < 0 || layerIndex >= this.layers.length) {
            layerIndex = 0;
        }

        const localX = (worldX - transform.x) + (this.width / 2);
        const localY = (worldY - transform.y) + (this.height / 2);

        // Si es borrar, borramos de TODAS las capas para que el hueco sea total
        if (erase) {
            for (const layer of this.layers) {
                this._paintOnLayer(layer, localX, localY, radius, true);
            }
        } else {
            this._paintOnLayer(this.layers[layerIndex], localX, localY, radius, false);
        }

        // Notificar al colisionador que debe regenerarse automáticamente
        const collider = this.materia.getComponent(TerrenoCollider2D);
        if (collider) collider.generateColliders();
    }

    _paintOnLayer(layer, x, y, radius, erase) {
        if (!layer.maskCtx) this._initializeLayerCanvas(layer);

        const ctx = layer.maskCtx;
        ctx.save();
        ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.restore();

        layer.serializedMask = layer.maskCanvas.toDataURL();
    }

    clone() {
        const newTerreno = new Terreno2D(null);
        newTerreno.width = this.width;
        newTerreno.height = this.height;
        newTerreno.layers = this.layers.map(l => ({
            texturePath: l.texturePath,
            opacity: l.opacity,
            serializedMask: l.serializedMask
        }));
        newTerreno.sortingLayer = this.sortingLayer;
        newTerreno.orderInLayer = this.orderInLayer;
        newTerreno.baseColor = this.baseColor;
        return newTerreno;
    }
}
registerComponent('Terreno2D', Terreno2D);

/**
 * Componente TerrenoCollider2D: Genera colisiones automáticas a partir de la máscara de Terreno2D.
 */
export class TerrenoCollider2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.isTrigger = false;
        this.offset = { x: 0, y: 0 };
        this.isDirty = true;
        this.generatedColliders = [];
        this.resolution = 16; // Tamaño del bloque para simplificar colisiones (en píxeles)
    }

    generateColliders() {
        const terreno = this.materia.getComponent(Terreno2D);
        if (!terreno || terreno.layers.length === 0) return;

        this.generatedColliders = [];
        const { width, height } = terreno;

        // Crear un canvas temporal para combinar todas las máscaras
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tCtx = tempCanvas.getContext('2d');

        for (const layer of terreno.layers) {
            if (layer.maskCanvas) {
                tCtx.drawImage(layer.maskCanvas, 0, 0);
            }
        }

        const imgData = tCtx.getImageData(0, 0, width, height).data;

        const res = this.resolution;
        const cols = Math.ceil(width / res);
        const rows = Math.ceil(height / res);

        // 1. Crear una rejilla de ocupación
        const grid = new Uint8Array(cols * rows);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                // Comprobar el centro del bloque
                const px = Math.min(width - 1, c * res + res / 2);
                const py = Math.min(height - 1, r * res + res / 2);
                const idx = (Math.floor(py) * width + Math.floor(px)) * 4;
                if (imgData[idx + 3] > 128) { // Si el alpha es > 50%
                    grid[r * cols + c] = 1;
                }
            }
        }

        // 2. Greedy Meshing: Combinar bloques adyacentes en rectángulos más grandes
        const visited = new Uint8Array(cols * rows);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r * cols + c] === 1 && !visited[r * cols + c]) {
                    // Intentar expandir a la derecha
                    let w = 1;
                    while (c + w < cols && grid[r * cols + (c + w)] === 1 && !visited[r * cols + (c + w)]) {
                        w++;
                    }

                    // Intentar expandir hacia abajo
                    let h = 1;
                    while (r + h < rows) {
                        let canExpand = true;
                        for (let k = 0; k < w; k++) {
                            if (grid[(r + h) * cols + (c + k)] !== 1 || visited[(r + h) * cols + (c + k)]) {
                                canExpand = false;
                                break;
                            }
                        }
                        if (!canExpand) break;
                        h++;
                    }

                    // Marcar como visitados
                    for (let hh = 0; hh < h; hh++) {
                        for (let ww = 0; ww < w; ww++) {
                            visited[(r + hh) * cols + (c + ww)] = 1;
                        }
                    }

                    // Crear colisionador (centrado respecto al terreno)
                    const rectWidth = w * res;
                    const rectHeight = h * res;
                    const centerX = (c * res + rectWidth / 2) - (width / 2);
                    const centerY = (r * res + rectHeight / 2) - (height / 2);

                    this.generatedColliders.push({
                        x: centerX,
                        y: centerY,
                        width: rectWidth,
                        height: rectHeight
                    });
                }
            }
        }

        this.isDirty = false;
        console.log(`[TerrenoCollider2D] Generados ${this.generatedColliders.length} rectángulos de colisión.`);
    }

    generate() {
        this.generateColliders();
    }

    clone() {
        const newCollider = new TerrenoCollider2D(null);
        newCollider.isTrigger = this.isTrigger;
        newCollider.offset = { ...this.offset };
        newCollider.resolution = this.resolution;
        newCollider.generatedColliders = JSON.parse(JSON.stringify(this.generatedColliders));
        return newCollider;
    }
}
registerComponent('TerrenoCollider2D', TerrenoCollider2D);

/**
 * Componente Gyzmo: Define áreas rectangulares para diseño y lógica.
 */
export class Gyzmo extends Leyes {
    constructor(materia) {
        super(materia);
        this.layers = []; // [{name, x, y, width, height, color, showInGame}]
        this.showInGame = false;

        if (materia) {
            this.addLayer("Área Principal", 0, 0, 200, 200, "#00ff00");
        }
    }

    addLayer(name = "Nueva Capa", x = 0, y = 0, width = 100, height = 100, color = "#00ff00") {
        this.layers.push({
            name,
            x,
            y,
            width,
            height,
            color,
            showInGame: true
        });
    }

    removeLayer(index) {
        if (index >= 0 && index < this.layers.length) {
            this.layers.splice(index, 1);
        }
    }

    getLayer(nameOrIndex) {
        if (typeof nameOrIndex === 'number') return this.layers[nameOrIndex];
        return this.layers.find(l => l.name === nameOrIndex);
    }

    clone() {
        const newGyzmo = new Gyzmo(null);
        newGyzmo.layers = JSON.parse(JSON.stringify(this.layers));
        newGyzmo.showInGame = this.showInGame;
        return newGyzmo;
    }
}
registerComponent('Gyzmo', Gyzmo);

/**
 * Componente que lanza proyectiles (prefabs) al presionar una tecla o llamar a fire().
 */
export class ProjectileLauncher extends Leyes {
    constructor(materia) {
        super(materia);
        this.projectilePrefab = ""; // Ruta al .ceprefab
        this.fireKey = "Space";
        this.fireRate = 0.5;
        this.projectileSpeed = 500;
        this.offset = { x: 0, y: 0 };
        this.direction = { x: 1, y: 0 };

        this._lastFireTime = 0;
    }

    update(deltaTime) {
        if (this.fireKey && InputManager.isKeyPressed(this.fireKey)) {
            this.fire();
        }
    }

    async fire() {
        const now = performance.now() / 1000;
        if (now - this._lastFireTime < this.fireRate) return;

        this._lastFireTime = now;

        const transform = this.materia.getComponent(Transform);
        if (!transform) return;

        const spawnPos = {
            x: transform.x + this.offset.x,
            y: transform.y + this.offset.y
        };

        if (!this.projectilePrefab) return;

        // Usar SceneManager global para evitar dependencias circulares
        if (window.SceneManager && window.SceneManager.instantiatePrefabFromPath) {
            const projectile = await window.SceneManager.instantiatePrefabFromPath(this.projectilePrefab, spawnPos.x, spawnPos.y);
            if (projectile) {
                const rb = projectile.getComponent(Rigidbody2D);
                if (rb) {
                    rb.velocity = {
                        x: (this.direction.x * this.projectileSpeed) / 100,
                        y: (this.direction.y * this.projectileSpeed) / 100
                    };
                }
            }
        }
    }

    get prefabProyectil() { return this.projectilePrefab; }
    set prefabProyectil(v) { this.projectilePrefab = v; }
    get teclaDisparo() { return this.fireKey; }
    set teclaDisparo(v) { this.fireKey = v; }
    get cadencia() { return this.fireRate; }
    set cadencia(v) { this.fireRate = v; }
    get velocidadProyectil() { return this.projectileSpeed; }
    set velocidadProyectil(v) { this.projectileSpeed = v; }
}

/**
 * Componente que destruye el objeto automáticamente después de un tiempo.
 */
export class AutoDestroy extends Leyes {
    constructor(materia) {
        super(materia);
        this.delay = 3.0;
        this._timer = 0;
    }

    update(deltaTime) {
        this._timer += deltaTime;
        if (this._timer >= this.delay) {
            if (this.materia && this.materia.scene) {
                this.materia.scene.removeMateria(this.materia.id);
            }
        }
    }

    get retraso() { return this.delay; }
    set retraso(v) { this.delay = v; }
}

/**
 * Componente que gestiona la vida de un objeto.
 */
export class Health extends Leyes {
    constructor(materia) {
        super(materia);
        this.maxHealth = 100;
        this.currentHealth = 100;
        this.destroyOnDeath = true;
    }

    damage(amount) {
        this.currentHealth -= amount;
        if (this.currentHealth <= 0) {
            this.currentHealth = 0;
            this.onDeath();
        }
    }

    danar(cantidad) { this.damage(cantidad); }

    heal(amount) {
        this.currentHealth += amount;
        if (this.currentHealth > this.maxHealth) {
            this.currentHealth = this.maxHealth;
        }
    }

    curar(cantidad) { this.heal(cantidad); }

    onDeath() {
        // Enviar mensaje de muerte
        this.materia.leyes.forEach(ley => {
            if (ley instanceof CreativeScript) {
                ley._safeInvoke('alMorir');
            }
        });

        if (this.destroyOnDeath && this.materia.scene) {
            this.materia.scene.removeMateria(this.materia.id);
        }
    }

    get vidaMaxima() { return this.maxHealth; }
    set vidaMaxima(v) { this.maxHealth = v; }
    get vidaActual() { return this.currentHealth; }
    set vidaActual(v) { this.currentHealth = v; }
}

/**
 * Componente que hace que el objeto patrulle entre dos puntos o direcciones.
 */
export class Patrol extends Leyes {
    constructor(materia) {
        super(materia);
        this.speed = 200;
        this.distance = 300;
        this.horizontal = true;
        this.pauseTime = 1.0;

        this._startPos = null;
        this._direction = 1;
        this._timer = 0;
        this._isPaused = false;
        this._movedDistance = 0;
    }

    update(deltaTime) {
        const transform = this.materia.getComponent(Transform);
        if (!transform) return;

        if (this._startPos === null) {
            this._startPos = { x: transform.x, y: transform.y };
        }

        if (this._isPaused) {
            this._timer += deltaTime;
            if (this._timer >= this.pauseTime) {
                this._isPaused = false;
                this._timer = 0;
                this._direction *= -1;
            }
            return;
        }

        const moveStep = this.speed * deltaTime;
        if (this.horizontal) {
            transform.x += moveStep * this._direction;
        } else {
            transform.y += moveStep * this._direction;
        }

        this._movedDistance += moveStep;

        if (this._movedDistance >= this.distance) {
            this._movedDistance = 0;
            this._isPaused = true;
        }
    }

    get velocidad() { return this.speed; }
    set velocidad(v) { this.speed = v; }
    get distancia() { return this.distance; }
    set distancia(v) { this.distance = v; }
    get tiempoPausa() { return this.pauseTime; }
    set tiempoPausa(v) { this.pauseTime = v; }
}

registerComponent('ProjectileLauncher', ProjectileLauncher);
registerComponent('AutoDestroy', AutoDestroy);
registerComponent('Health', Health);
registerComponent('Patrol', Patrol);

/**
 * Componente que emite prefabs como partículas con optimización de pooling.
 */
export class ParticleSystem extends Leyes {
    constructor(materia) {
        super(materia);
        this.prefabPath = "";
        this.maxParticles = 50;
        this.emissionRate = 5; // partículas por segundo
        this.lifetime = 2.0;
        this.speed = 200;
        this.spread = 45; // grados
        this.loop = true;
        this.playOnAwake = true;

        this._pool = [];
        this._active = false;
        this._emissionAccumulator = 0;
    }

    start() {
        if (this.playOnAwake) {
            this.play();
        }
    }

    play() {
        this._active = true;
    }

    stop() {
        this._active = false;
    }

    reproducir() { this.play(); }
    detener() { this.stop(); }

    update(deltaTime) {
        // Gestionar vida de partículas activas en el pool
        for (let i = 0; i < this._pool.length; i++) {
            const p = this._pool[i];
            if (p.isActive) {
                p._remainingLifetime -= deltaTime;
                if (p._remainingLifetime <= 0) {
                    p.isActive = false;
                }
            }
        }

        if (!this._active) return;

        this._emissionAccumulator += deltaTime;
        const interval = 1 / Math.max(0.1, this.emissionRate);

        while (this._emissionAccumulator >= interval) {
            this.emit();
            this._emissionAccumulator -= interval;
        }
    }

    async emit() {
        if (!this.prefabPath) return;

        // Buscar una partícula inactiva en el pool
        let p = this._pool.find(item => !item.isActive);

        if (!p) {
            if (this._pool.length >= this.maxParticles) return;

            // Crear nueva partícula si hay espacio en el pool
            if (window.SceneManager && window.SceneManager.instantiatePrefabFromPath) {
                p = await window.SceneManager.instantiatePrefabFromPath(this.prefabPath);
                if (p) {
                    this._pool.push(p);
                }
            }
        }

        if (p) {
            const transform = this.materia.getComponent(Transform);
            const pTransform = p.getComponent(Transform);

            if (transform && pTransform) {
                pTransform.position = { x: transform.x, y: transform.y };

                // Calcular dirección aleatoria según spread
                const baseRotation = transform.rotation;
                const randomAngle = (Math.random() - 0.5) * this.spread;
                const finalRotation = (baseRotation + randomAngle) * (Math.PI / 180);

                const vx = Math.cos(finalRotation) * (this.speed / 100);
                const vy = Math.sin(finalRotation) * (this.speed / 100);

                const rb = p.getComponent(Rigidbody2D);
                if (rb) {
                    rb.setVelocity(vx, vy);
                } else {
                    // Si no tiene físicas, podríamos añadir lógica de movimiento simple aquí
                    // o dejar que el prefab se mueva solo.
                }

                p._remainingLifetime = this.lifetime;
                p.isActive = true;
            }
        }
    }

    // --- Spanish Aliases ---
    get prefab() { return this.prefabPath; }
    set prefab(v) { this.prefabPath = v; }
    get maxParticulas() { return this.maxParticles; }
    set maxParticulas(v) { this.maxParticles = v; }
    get tasaEmision() { return this.emissionRate; }
    set tasaEmision(v) { this.emissionRate = v; }
    get vidaParticula() { return this.lifetime; }
    set vidaParticula(v) { this.lifetime = v; }
    get velocidad() { return this.speed; }
    set velocidad(v) { this.speed = v; }
    get dispersion() { return this.spread; }
    set dispersion(v) { this.spread = v; }
    get bucle() { return this.loop; }
    set bucle(v) { this.loop = v; }
    get reproducirAlEmpezar() { return this.playOnAwake; }
    set reproducirAlEmpezar(v) { this.playOnAwake = v; }

    onDestroy() {
        // Limpiar el pool
        if (this.materia && this.materia.scene) {
            for (const p of this._pool) {
                this.materia.scene.removeMateria(p.id);
            }
        }
        this._pool = [];
    }

    clone() {
        const newPs = new ParticleSystem(null);
        newPs.prefabPath = this.prefabPath;
        newPs.maxParticles = this.maxParticles;
        newPs.emissionRate = this.emissionRate;
        newPs.lifetime = this.lifetime;
        newPs.speed = this.speed;
        newPs.spread = this.spread;
        newPs.loop = this.loop;
        newPs.playOnAwake = this.playOnAwake;
        return newPs;
    }
}
registerComponent('ParticleSystem', ParticleSystem);

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
            this._definition = window.CE_Custom_Components ? window.CE_Custom_Components[this.definitionName] : (editorLogic ? editorLogic.getComponentDefinition(this.definitionName) : null);

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
