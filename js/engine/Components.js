// Components.js
// This file contains all the component classes.

import { Leyes } from './Leyes.js';
import { registerComponent } from './ComponentRegistry.js';
import { getURLForAssetPath, getFileHandleForPath } from './AssetUtils.js';
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
    'UIEventTrigger': 'disparadorDeEventosUI',
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
    'PolygonCollider2D': 'colisionadorPoligono2D',
    'Gyzmo': 'gyzmo',
    'RaycastSource': 'rallo',
    'BasicAI': 'iaBasica',
    'VideoPlayer': 'reproductorDeVideo',
    'Water': 'agua',
    'LineCollider2D': 'colisionadorDeLineas2D',
    'VerticalLayoutGroup': 'autoDisposicionVertical',
    'HorizontalLayoutGroup': 'autoDisposicionHorizontal',
    'GridLayoutGroup': 'autoDisposicionRejilla',
};


// --- Base Behavior for Scripts ---
export class CreativeScriptBehavior {
    constructor(materia) {
        this.materia = materia;
        this._messageSubscriptions = [];

        // --- Standard Constructors for Scripts ---
        const self = this;

        /** @constructor */
        this.Vector2 = function(x = 0, y = 0) {
            const res = { x: x, y: y };
            if (!(this instanceof self.Vector2)) return res;
            this.x = x;
            this.y = y;
        };

        /** @constructor */
        this.Color = function(r = 255, g = 255, b = 255, a = 1) {
            const res = (typeof r === 'string' && r.startsWith('#')) ? r : `rgba(${r},${g},${b},${a})`;
            if (!(this instanceof self.Color)) return res;
            // If called with 'new', we must return a non-primitive to override the instance
            return new String(res);
        };

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

        // --- Setup 'reproducir' proxy for state access (reproducir.correr()) ---
        const self = this;
        const baseReproducir = this.reproducir.bind(this);
        this.reproducir = new Proxy(baseReproducir, {
            get: (target, prop) => {
                if (prop in target) return target[prop];
                return (opciones) => self.reproducir(prop, opciones);
            }
        });

        // Same for English 'play'
        const basePlay = this.play.bind(this);
        this.play = new Proxy(basePlay, {
            get: (target, prop) => {
                if (prop in target) return target[prop];
                return (opciones) => self.play(prop, opciones);
            }
        });
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

    get voltearH() { return this.transform ? this.transform.flipX : false; }
    set voltearH(v) { if (this.transform) this.transform.flipX = v; }
    get voltearV() { return this.transform ? this.transform.flipY : false; }
    set voltearV(v) { if (this.transform) this.transform.flipY = v; }
    get flipX() { return this.voltearH; }
    set flipX(v) { this.voltearH = v; }
    get flipY() { return this.voltearV; }
    set flipY(v) { this.voltearV = v; }

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

    get audio() { return this.materia.getComponent(AudioSource); }
    get sonido() { return this.audio; }

    get video() { return this.materia.getComponent(VideoPlayer); }
    get pelicula() { return this.video; }

    get agua() { return this.materia.getComponent(Water); }
    get water() { return this.agua; }

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
     * Ejecuta una acción (objeto con targetId y functionName).
     * @param {object} accion - La acción a ejecutar.
     * @param {...any} args - Argumentos adicionales.
     */
    ejecutarAccion(accion, ...args) {
        if (!accion || !accion.targetId || !accion.functionName) return;
        const target = this.materia.scene ? this.materia.scene.findMateriaById(accion.targetId) : null;
        if (!target) return;
        target.getComponents(CreativeScript).forEach(s => {
            if (s.instance && typeof s.instance[accion.functionName] === 'function') {
                s._safeInvoke(accion.functionName, ...args);
            }
        });
    }

    /** Alias en inglés */
    executeAction(action, ...args) { this.ejecutarAccion(action, ...args); }

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

    estaTocandoTag(...args) {
        const engine = RuntimeAPIManager.getAPI('engine');
        if (!engine) return false;
        if (args.length === 1) return engine.estaTocandoTag(this.materia, args[0]);
        return engine.estaTocandoTag(args[0], args[1]);
    }
    isTouchingTag(...args) { return this.estaTocandoTag(...args); }

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

    /**
     * Reproduce una animación específica en esta materia.
     * Si hay un AnimatorController, esto sobrescribirá el estado actual temporalmente.
     * @param {string} path - Ruta al archivo .cea o .ceanimclip
     * @param {boolean} [loop=true] - Si la animación debe repetirse
     * @param {number} [speed=12] - Velocidad de reproducción
     */
    reproducirAnimacion(path, loop = true, speed = 12) {
        if (!this.materia) return;
        const animator = this.obtenerComponente('Animator');
        if (animator) {
            animator.play(path, { loop, speed, source: 'script' });
        }
    }

    /** Alias en inglés */
    playAnimation(path, loop, speed) { this.reproducirAnimacion(path, loop, speed); }

    /**
     * Reproduce un estado del AnimatorController si existe una conexión.
     * @param {string} estado - Nombre del estado.
     * @param {boolean|object} [opciones] - Si es boolean, es el parámetro 'force'. Si es objeto, son overrides (loop, speed, etc).
     */
    reproducir(estado, opciones = false) {
        if (!this.materia) return;
        const controller = this.obtenerComponente('AnimatorController');
        if (controller) {
            if (typeof opciones === 'boolean') {
                controller.play(estado, opciones);
            } else {
                const opt = opciones || {};
                controller.play(estado, opt.force || false, opt);
            }
        }
    }

    /** Alias en inglés */
    play(estado, opciones) { this.reproducir(estado, opciones); }

    /**
     * Detiene la animación actual.
     */
    detenerAnimacion() {
        if (!this.materia) return;
        const animator = this.obtenerComponente('Animator');
        if (animator) {
            animator.stop();
        }
    }

    /** Alias en inglés */
    stopAnimation() { this.detenerAnimacion(); }

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
        this.flipX = false;
        this.flipY = false;
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
        let baseScale;
        if (!this.materia || !this.materia.parent) {
            baseScale = { ...this.localScale };
        } else {
            const parentTransform = this.materia.parent.getComponent(Transform);
            if (!parentTransform) {
                baseScale = { ...this.localScale };
            } else {
                const parentScale = parentTransform.scale;
                baseScale = {
                    x: parentScale.x * this.localScale.x,
                    y: parentScale.y * this.localScale.y
                };
            }
        }
        return {
            x: baseScale.x * (this.flipX ? -1 : 1),
            y: baseScale.y * (this.flipY ? -1 : 1)
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
        newTransform.flipX = this.flipX;
        newTransform.flipY = this.flipY;
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
                    alFinalizarAnimacion: ['OnAnimationEnd'],
                    onPointerDown: ['alPresionar'],
                    onPointerUp: ['alSoltar'],
                    onPointerEnter: ['alEntrar'],
                    onPointerExit: ['alSalir'],
                    onPointerClick: ['alHacerClick'],
                    onPointerDrag: ['alDeslizar'],
                    onPointerHold: ['alMantener']
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
        this.buoyancyWeight = 1.0; // Peso del objeto para flotación
        this.sinkThreshold = 1.5; // Densidad a la que empieza a hundirse (buoyancy density)

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
        // Reset velocity to zero for clones created in editor (duplication)
        newRb.velocity = { x: 0, y: 0 };
        newRb.angularVelocity = 0;
        return newRb;
    }
}

export class BoxCollider2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.usedByComposite = false;
        this.isTrigger = false;
        this.offset = { x: 0, y: 0 };
        this.size = { x: 50.0, y: 50.0 };
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

export class PolygonCollider2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.isTrigger = false;
        this.offset = { x: 0, y: 0 };
        this.vertices = [
            { x: -50, y: -50 },
            { x:  50, y: -50 },
            { x:  50, y:  50 },
            { x: -50, y:  50 }
        ];
    }
    clone() {
        const newCollider = new PolygonCollider2D(null);
        newCollider.isTrigger = this.isTrigger;
        newCollider.offset = { ...this.offset };
        newCollider.vertices = this.vertices.map(v => ({ ...v }));
        return newCollider;
    }
}

export class CapsuleCollider2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.isTrigger = false;
        this.offset = { x: 0, y: 0 };
        this.size = { x: 50.0, y: 50.0 };
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
        this._spriteName = ''; // Name of the specific sprite from the .ceSprite asset
        this.color = '#ffffff';
        this.opacity = 1.0;
        this.orderInLayer = 0;
        this.spriteSheet = null; // Holds the loaded .ceSprite data
        this.isError = false;
        this.isLoading = false;
        this._lastLoadedSource = '';
        this.pivot = { x: 0.5, y: 0.5 };
    }

    get spriteName() { return this._spriteName; }
    set spriteName(value) {
        if (this._spriteName === value) return;
        this._spriteName = value;

        // Update pivot from sheet if available
        if (this.spriteSheet && this.spriteSheet.sprites && this.spriteSheet.sprites[value]) {
            const sd = this.spriteSheet.sprites[value];
            if (sd.pivot) {
                this.pivot = { x: sd.pivot.x ?? 0.5, y: sd.pivot.y ?? 0.5 };
            }
        }

        // If it's a data URL or a path, it's a direct source override (e.g. from imported frames)
        if (typeof value === 'string' && value) {
            if (value.startsWith('data:')) {
                this.spriteSheet = null; // Important: Clear spritesheet mode
                this.isLoading = false;
                this.isError = false;
                if (!this.sprite || typeof this.sprite.addEventListener !== 'function') {
                    this.sprite = new Image();
                }
                if (this.sprite.src !== value) {
                    this.sprite.src = value;
                }
            } else if (value.includes('/') || value.includes('.')) {
                this.spriteSheet = null;
                this.source = value;
                this.loadSprite(window.projectsDirHandle);
            }
        }
    }

    async setSourcePath(path, projectsDirHandle) {
        if (path.endsWith('.ceSprite')) {
            if (this.spriteAssetPath === path && this.spriteSheet) return;
            this.spriteAssetPath = path;
            await this.loadSpriteSheet(projectsDirHandle);
        } else {
            this.source = path;
            this.spriteAssetPath = '';
            this.spriteSheet = null;
            this.spriteName = '';
            await this.loadSprite(projectsDirHandle);
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

    update(deltaTime) {
        // Auto-load if source is set but not yet loaded
        if (this.source && this.source !== this._lastLoadedSource && !this.isLoading && !this.isError) {
            this.loadSprite(window.projectsDirHandle);
        }
    }

    async loadSprite(projectsDirHandle) {
        // Ensure this.sprite is a valid Image object (serialization might have overwritten it)
        if (!this.sprite || typeof this.sprite.addEventListener !== 'function') {
            this.sprite = new Image();
        }

        if (!this.source) {
            this.sprite.src = '';
            this.isError = false;
            this.isLoading = false;
            this._lastLoadedSource = '';
            return;
        }

        const currentDirHandle = projectsDirHandle || window.projectsDirHandle;

        try {
            const imageUrl = await getURLForAssetPath(this.source, currentDirHandle);
            if (!imageUrl) {
                this.isError = true;
                return;
            }

            // Check if we are already loading this source or if it's already loaded
            if (this._lastLoadedSource === this.source && this.sprite.complete && this.sprite.naturalWidth > 0) {
                this.isLoading = false;
                this.isError = false;
                return;
            }

            // If already loading the SAME URL, don't restart
            if (this.isLoading && this._loadingUrl === imageUrl) return;
            this._loadingUrl = imageUrl;
            this.isLoading = true;
            this.isError = false;

            // If the URL is already set but the image isn't complete, we still want to wait
            if (this.sprite.src !== imageUrl || !this.sprite.complete) {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        cleanup();
                        reject(new Error("Timeout loading image: " + this.source));
                    }, 8000);

                    const onload = () => { cleanup(); resolve(); };
                    const onerror = (e) => { cleanup(); reject(new Error("Failed to load image: " + this.source)); };
                    const cleanup = () => {
                        clearTimeout(timeout);
                        this.sprite.removeEventListener('load', onload);
                        this.sprite.removeEventListener('error', onerror);
                    };

                    this.sprite.addEventListener('load', onload);
                    this.sprite.addEventListener('error', onerror);

                    if (this.sprite.src !== imageUrl) {
                        this.sprite.src = imageUrl;
                    } else if (this.sprite.complete) {
                        onload(); // Already done
                    }
                });
            }

            this._lastLoadedSource = this.source;
            this.isError = false;
        } catch (error) {
            if (window.CE_DEBUG_ANIMATION) console.error(`Error loading sprite: ${this.source}`, error);
            this.isError = true;
        } finally {
            this.isLoading = false;
            this._loadingUrl = null;
        }
    }
    clone() {
        const newRenderer = new SpriteRenderer(null);
        newRenderer.source = this.source;
        newRenderer.spriteAssetPath = this.spriteAssetPath;
        newRenderer.spriteName = this.spriteName;
        newRenderer.color = this.color;
        newRenderer.opacity = this.opacity;
        newRenderer.orderInLayer = this.orderInLayer;
        newRenderer.pivot = { ...this.pivot };
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
        this.speed = 12.0;
        this.loop = true;
        this.playOnAwake = true;

        // Internal state
        this.animationClip = null; // The loaded animation clip data
        this.currentFrame = 0;
        this.startFrame = 0;
        this.endFrame = -1; // -1 means play until the end of the clip
        this.frameTimer = 0;

        // Importante: Empezar pausado en el editor. El motor llamará a play() al iniciar el juego.
        this.isPlaying = false;
        this.spriteRenderer = null;
        this.projectsDirHandle = null;
        this._frameCache = []; // Cache of preloaded Image objects
        this._controlSource = 'none'; // 'none', 'controller', 'script'
        this._isLoading = false;
        this.hasError = false;
    }

    start() {
        if (this.playOnAwake && !this.isPlaying) {
            this.play();
        }
    }

    async loadAnimationClip(projectsDirHandle) {
        if (!this.animationClipPath) return;
        this.projectsDirHandle = projectsDirHandle;
        this._isLoading = true;

        this.spriteRenderer = this.materia.getComponent(SpriteRenderer);

        try {
            const url = await getURLForAssetPath(this.animationClipPath, projectsDirHandle);
            if (!url) throw new Error(`Could not get URL for animation clip: ${this.animationClipPath}`);

            const response = await fetch(url);
            const data = await response.json();

            // Handle both .cea and .ceanimclip formats
            let clip;
            if (data.animations && data.animations.length > 0) {
                clip = data.animations[0];
            } else {
                clip = data;
            }

            this.animationClip = clip;
            if (window.CE_DEBUG_ANIMATION) {
                console.log(`[Animator] Clip cargado correctamente: ${this.animationClipPath}`, clip);
            }

            // Set properties from clip if they were at defaults
            if (this.speed === 12.0) {
                if (clip.frameRate) this.speed = clip.frameRate;
                else if (clip.speed) this.speed = clip.speed;
            }
            if (this.loop === true && clip.loop === false) {
                this.loop = false;
            }
            if (this.endFrame === -1 && clip.frames) {
                this.endFrame = clip.frames.length - 1;
            }

            // Preload frames to avoid flicker
            if (clip && clip.frames) {
                this._frameCache = [];
                const spritesheetCache = new Map(); // Cache for .ceSprite JSONs during preload

                const preloadPromises = clip.frames.map(async (frameData, index) => {
                    let imagePath = '';

                    if (typeof frameData === 'string') {
                        imagePath = frameData;
                    } else if (typeof frameData === 'object' && frameData !== null) {
                        const assetPath = frameData.spriteAssetPath;
                        if (assetPath) {
                            if (assetPath.endsWith('.ceSprite')) {
                                // For .ceSprite, we need to load the JSON to find the actual image path
                                let sheet = spritesheetCache.get(assetPath);
                                if (!sheet) {
                                    try {
                                        const sheetUrl = await getURLForAssetPath(assetPath, projectsDirHandle);
                                        const sheetRes = await fetch(sheetUrl);
                                        sheet = await sheetRes.json();
                                        spritesheetCache.set(assetPath, sheet);
                                    } catch (e) {
                                        console.warn(`[Animator] Error preloading spritesheet ${assetPath}:`, e);
                                    }
                                }
                                if (sheet && sheet.sourceImage) {
                                    imagePath = `Assets/${sheet.sourceImage}`;
                                }
                            } else {
                                imagePath = assetPath;
                            }
                        }
                    }

                    if (imagePath) {
                        const img = new Image();
                        this._frameCache[index] = img;

                        let src = imagePath;
                        if (!imagePath.startsWith('data:')) {
                            src = await getURLForAssetPath(imagePath, projectsDirHandle);
                        }

                        if (src) {
                            return new Promise((resolve) => {
                                img.onload = () => resolve();
                                img.onerror = () => {
                                    if (window.CE_DEBUG_ANIMATION) console.warn(`[Animator] Error al precargar frame: ${src}`);
                                    resolve();
                                };
                                img.src = src;
                            });
                        }
                    }
                    return Promise.resolve();
                });

                await Promise.all(preloadPromises);
            }

            // Always apply the first frame immediately after loading so it's visible in the editor
            this.applyCurrentFrame();

        } catch (error) {
            console.error(`Failed to load animation clip at '${this.animationClipPath}':`, error);
            this.hasError = true;
        } finally {
            this._isLoading = false;
        }
    }

    /**
     * Reproduce una animación.
     * @param {string} [path] - Ruta opcional a un nuevo clip.
     * @param {object} [options] - Opciones: { loop, speed, startFrame, endFrame, source, force }
     */
    play(path = null, options = {}) {
        const debug = window.CE_DEBUG_ANIMATION;

        const isSamePath = !path || path === this.animationClipPath;

        if (debug) {
            console.log(`[Animator] Play llamado: path=${path || this.animationClipPath}, source=${options.source || this._controlSource}, isSamePath=${isSamePath}, loading=${this._isLoading}`);
        }

        // Guard: If already playing the same clip and same source, don't reset unless forced
        if (!options.force && isSamePath && this.isPlaying && (options.source === undefined || options.source === this._controlSource)) {
            // If already loading or already has clip, just update properties but don't reset timer/frame
            if (this.animationClip || this._isLoading) {
                if (debug) console.log(`[Animator] Ignorando play() redundante (está en curso o cargado) para mantener el frame actual.`);

                const rangeChanged = (options.startFrame !== undefined && options.startFrame !== this.startFrame) ||
                                     (options.endFrame !== undefined && options.endFrame !== this.endFrame);

                if (options.loop !== undefined) this.loop = options.loop;
                if (options.speed !== undefined) this.speed = options.speed;
                if (options.startFrame !== undefined) this.startFrame = options.startFrame;
                if (options.endFrame !== undefined) this.endFrame = options.endFrame;

                if (rangeChanged && this.animationClip) {
                    // Clamp current frame to new range immediately
                    const frames = this.animationClip.frames;
                    if (frames && frames.length > 0) {
                        const end = (this.endFrame !== -1 && this.endFrame < frames.length) ? this.endFrame : frames.length - 1;
                        this.currentFrame = Math.max(this.startFrame || 0, Math.min(this.currentFrame, end));
                    }
                    this.applyCurrentFrame();
                }
                return;
            }
        }

        if (path && path !== this.animationClipPath) {
            this.animationClipPath = path;
            this.animationClip = null; // Clear old data to trigger reload
        }

        if (options.loop !== undefined) this.loop = options.loop;
        if (options.speed !== undefined) this.speed = options.speed;
        if (options.startFrame !== undefined) this.startFrame = options.startFrame;
        if (options.endFrame !== undefined) this.endFrame = options.endFrame;
        if (options.source !== undefined) this._controlSource = options.source;

        if (debug) console.log(`[Animator] Iniciando reproducción: ${this.animationClipPath}, source=${this._controlSource}, loop=${this.loop}`);

        this.isPlaying = true;
        this.hasError = false;
        this.currentFrame = this.startFrame || 0;
        this.frameTimer = 0;

        // Trigger immediate load if needed
        if (!this.animationClip && this.animationClipPath && !this._isLoading) {
            this.loadAnimationClip(this.projectsDirHandle || window.projectsDirHandle).then(() => {
                if (this.isPlaying) this.applyCurrentFrame();
            });
        } else if (this.animationClip) {
            this.applyCurrentFrame();
        }
    }

    reset() {
        this.currentFrame = this.startFrame || 0;
        this.frameTimer = 0;
        if (this.animationClip) this.applyCurrentFrame();
    }

    stop() {
        if (this.isPlaying && window.CE_DEBUG_ANIMATION) {
            console.log(`[Animator] Deteniendo animación`);
        }
        this.isPlaying = false;
    }

    /** Alias en español */
    reproducir(ruta, opciones) { this.play(ruta, opciones); }
    detener() { this.stop(); }
    reiniciar() { this.reset(); }

    update(deltaTime) {
        const debug = window.CE_DEBUG_ANIMATION;

        if (!this.spriteRenderer && this.materia) {
            this.spriteRenderer = this.materia.getComponent(SpriteRenderer);
        }

        // Auto-load if path exists but no data
        if (!this.animationClip && this.animationClipPath && !this._isLoading) {
            this.loadAnimationClip(this.projectsDirHandle || window.projectsDirHandle);
        }

        if (!this.isPlaying || !this.animationClip) {
            return;
        }

        this.frameTimer += deltaTime;
        const speed = Math.max(0.1, this.speed || 12.0);
        const frameDuration = 1 / speed;

        let frameChanged = false;
        while (this.frameTimer >= frameDuration) {
            this.frameTimer -= frameDuration;
            this.currentFrame++;
            frameChanged = true;

            const clip = this.animationClip;
            if (!clip.frames || clip.frames.length === 0) break;

            const endFrame = (this.endFrame !== -1 && this.endFrame < clip.frames.length) ? this.endFrame : clip.frames.length - 1;

            if (this.currentFrame > endFrame) {
                // Animation Finished
                const scripts = this.materia.getComponents(CreativeScript);
                for (const script of scripts) {
                    script._safeInvoke('alFinalizarAnimacion', clip.name || this.animationClipPath);
                    script._safeInvoke('OnAnimationEnd', clip.name || this.animationClipPath);
                }

                const controller = this.materia.getComponent(AnimatorController);
                if (controller && typeof controller.onAnimationEnd === 'function') {
                    controller.onAnimationEnd(clip.name || this.animationClipPath);
                }

                if (this.loop) {
                    this.currentFrame = this.startFrame || 0;
                } else {
                    this.currentFrame = endFrame;
                    this.stop();
                    break;
                }
            }
        }

        if (frameChanged) {
            this.applyCurrentFrame();
        }
    }

    applyCurrentFrame() {
        if (!this.animationClip || !this.spriteRenderer) return;

        const clip = this.animationClip;
        const frames = clip.frames;
        if (!frames || frames.length === 0) return;

        const endFrame = (this.endFrame !== -1 && this.endFrame < frames.length) ? this.endFrame : frames.length - 1;
        const frameIdx = Math.max(this.startFrame || 0, Math.min(this.currentFrame, endFrame));

        const frame = frames[frameIdx];
        const cachedImg = this._frameCache[frameIdx];

        if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
            this.spriteRenderer.sprite = cachedImg;
            this.spriteRenderer.isLoading = false;
            this.spriteRenderer.isError = false;
        } else if (cachedImg && cachedImg.complete) {
            // Failed to load image
            this.hasError = true;
        }

        // Apply metadata (source, spriteName) regardless of cache to ensure SpriteRenderer has correct UVs
        if (typeof frame === 'object' && frame !== null) {
            if (frame.spriteAssetPath && this.spriteRenderer.spriteAssetPath !== frame.spriteAssetPath) {
                // If we have cachedImg, SpriteRenderer.loadSpriteSheet will skip loading the image
                this.spriteRenderer.setSourcePath(frame.spriteAssetPath, this.projectsDirHandle || window.projectsDirHandle);
            }
            if (frame.spriteName && this.spriteRenderer.spriteName !== frame.spriteName) {
                this.spriteRenderer.spriteName = frame.spriteName;
            }
        } else if (typeof frame === 'string') {
            if (cachedImg) {
                this.spriteRenderer.source = frame;
                this.spriteRenderer._lastLoadedSource = frame;
            }
            if (this.spriteRenderer.spriteName !== frame) {
                this.spriteRenderer.spriteName = frame;
            }
        }
    }

    clone() {
        const newAnimator = new Animator(null);
        newAnimator.animationClipPath = this.animationClipPath;
        newAnimator.speed = this.speed;
        newAnimator.loop = this.loop;
        newAnimator.playOnAwake = this.playOnAwake;
        newAnimator.startFrame = this.startFrame;
        newAnimator.endFrame = this.endFrame;
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
        this.isError = false;
        this.isLoading = false;
        this._lastLoadedSource = '';
    }

    update(deltaTime) {
        // Auto-load if source is set but not yet loaded
        if (this.source && this.source !== this._lastLoadedSource && !this.isLoading && !this.isError) {
            this.loadSprite(window.projectsDirHandle);
        }
    }

    async loadSprite(projectsDirHandle) {
        // Ensure this.sprite is a valid Image object (serialization might have overwritten it)
        if (!this.sprite || typeof this.sprite.addEventListener !== 'function') {
            this.sprite = new Image();
        }

        if (!this.source) {
            this.sprite.src = '';
            this.isError = false;
            this.isLoading = false;
            this._lastLoadedSource = '';
            return;
        }

        const currentDirHandle = projectsDirHandle || window.projectsDirHandle;

        try {
            const url = await getURLForAssetPath(this.source, currentDirHandle);
            if (!url) {
                this.isError = true;
                return;
            }

            if (this._lastLoadedSource === this.source && this.sprite.complete && this.sprite.naturalWidth > 0) {
                this.isLoading = false;
                this.isError = false;
                return;
            }

            if (this.isLoading && this._loadingUrl === url) return;
            this._loadingUrl = url;
            this.isLoading = true;
            this.isError = false;

            if (this.sprite.src !== url || !this.sprite.complete) {
                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => { cleanup(); reject(new Error("Timeout loading UI image: " + this.source)); }, 8000);
                    const onload = () => { cleanup(); resolve(); };
                    const onerror = (e) => { cleanup(); reject(new Error("Failed to load UI image: " + this.source)); };
                    const cleanup = () => {
                        clearTimeout(timeout);
                        this.sprite.removeEventListener('load', onload);
                        this.sprite.removeEventListener('error', onerror);
                    };
                    this.sprite.addEventListener('load', onload);
                    this.sprite.addEventListener('error', onerror);
                    if (this.sprite.src !== url) {
                        this.sprite.src = url;
                    } else if (this.sprite.complete) {
                        onload();
                    }
                });
            }

            this._lastLoadedSource = this.source;
            this.isError = false;
        } catch (error) {
            if (window.CE_DEBUG_ANIMATION) console.error(`Error loading UI image: ${this.source}`, error);
            this.isError = true;
        } finally {
            this.isLoading = false;
            this._loadingUrl = null;
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

        // Spatial Audio Properties
        this.spatial = false;
        this.minDistance = 100;
        this.maxDistance = 1000;

        // Playback Range (cutting)
        this.playbackStart = 0; // seconds
        this.playbackEnd = 0;   // seconds, 0 means play until the end

        this._audio = null;
        this._isLoaded = false;
        this._currentVolume = 1.0;
    }

    async start() {
        if (this.playOnAwake) {
            this.play();
        }
    }

    update(deltaTime) {
        if (!this._audio || !this.isPlaying) return;

        // --- Handle Playback End (Cut) ---
        if (this.playbackEnd > 0 && this._audio.currentTime >= this.playbackEnd) {
            if (this.loop) {
                this._audio.currentTime = this.playbackStart;
            } else {
                this.stop();
                return;
            }
        }

        // --- Spatial Audio Logic ---
        if (this.spatial && this.materia && this.materia.scene) {
            const camera = this.materia.scene.findFirstCamera();
            if (camera) {
                const camTrans = camera.getComponent(Transform);
                const myTrans = this.materia.getComponent(Transform);
                if (camTrans && myTrans) {
                    const dist = Math.hypot(camTrans.x - myTrans.x, camTrans.y - myTrans.y);
                    let spatialFactor = 1.0;

                    if (dist <= this.minDistance) {
                        spatialFactor = 1.0;
                    } else if (dist >= this.maxDistance) {
                        spatialFactor = 0.0;
                    } else {
                        // Linear falloff
                        spatialFactor = 1.0 - (dist - this.minDistance) / (this.maxDistance - this.minDistance);
                    }

                    this._currentVolume = this.volume * spatialFactor;
                    if (this._audio) this._audio.volume = this._currentVolume;
                }
            }
        } else {
            if (this._audio && this._audio.volume !== this.volume) {
                this._audio.volume = this.volume;
            }
        }
    }

    get isPlaying() {
        return this._audio && !this._audio.paused && !this._audio.ended;
    }

    async play(startTime = null) {
        if (!this.source) return;

        try {
            if (!this._audio) {
                const url = await getURLForAssetPath(this.source, window.projectsDirHandle);
                if (!url) return;
                this._audio = new Audio(url);
                this._audio.oncanplaythrough = () => this._isLoaded = true;
            }

            this._audio.volume = this.spatial ? this._currentVolume : this.volume;
            this._audio.loop = this.loop;

            if (startTime !== null) {
                this._audio.currentTime = startTime;
            } else if (this._audio.currentTime < this.playbackStart) {
                this._audio.currentTime = this.playbackStart;
            }

            await this._audio.play();
        } catch (e) {
            console.warn(`[AudioSource] No se pudo reproducir audio: ${this.source}.`, e);
        }
    }

    stop() {
        if (this._audio) {
            this._audio.pause();
            this._audio.currentTime = this.playbackStart;
        }
    }

    pause() {
        if (this._audio) {
            this._audio.pause();
        }
    }

    // --- Spanish Aliases ---
    reproducir(tiempoInicio) { this.play(tiempoInicio); }
    detener() { this.stop(); }
    pausar() { this.pause(); }

    get volumen() { return this.volume; }
    set volumen(v) { this.volume = v; if (this._audio && !this.spatial) this._audio.volume = v; }
    get bucle() { return this.loop; }
    set bucle(l) { this.loop = l; if (this._audio) this._audio.loop = l; }

    get espacial() { return this.spatial; }
    set espacial(v) { this.spatial = v; }
    get distanciaMinima() { return this.minDistance; }
    set distanciaMinima(v) { this.minDistance = v; }
    get distanciaMaxima() { return this.maxDistance; }
    set distanciaMaxima(v) { this.maxDistance = v; }

    get inicioReproduccion() { return this.playbackStart; }
    set inicioReproduccion(v) { this.playbackStart = v; }
    get finReproduccion() { return this.playbackEnd; }
    set finReproduccion(v) { this.playbackEnd = v; }

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
        newAudio.spatial = this.spatial;
        newAudio.minDistance = this.minDistance;
        newAudio.maxDistance = this.maxDistance;
        newAudio.playbackStart = this.playbackStart;
        newAudio.playbackEnd = this.playbackEnd;
        return newAudio;
    }
}

export class VideoPlayer extends Leyes {
    constructor(materia) {
        super(materia);
        this.source = '';
        this.volume = 1.0;
        this.loop = false;
        this.playOnAwake = true;
        this.playbackRate = 1.0;
        this.scalingMode = 'Fit'; // 'Stretch', 'Fit', 'Fill'

        this._video = null;
        this._isLoaded = false;
        this._lastLoadedSource = '';
    }

    async start() {
        if (this.playOnAwake) {
            this.play();
        }
    }

    update(deltaTime) {
        // Auto-load if source is set but not yet loaded
        if (this.source && this.source !== this._lastLoadedSource && !this._video) {
            this.load();
        }

        if (!this._video) return;

        // Sincronizar volumen con AudioSource si existe en la misma Materia
        const audioSource = this.materia.getComponent(AudioSource);
        if (audioSource) {
            this._video.volume = audioSource.spatial ? audioSource._currentVolume : audioSource.volume;
            this._video.muted = false;
        } else {
            this._video.volume = this.volume;
        }

        this._video.loop = this.loop;
        this._video.playbackRate = this.playbackRate;
    }

    get isPlaying() {
        return this._video && !this._video.paused && !this._video.ended;
    }

    async load() {
        if (!this.source) return;

        try {
            const url = await getURLForAssetPath(this.source, window.projectsDirHandle);
            if (!url) return;

            if (!this._video) {
                this._video = document.createElement('video');
                this._video.crossOrigin = 'anonymous';
                this._video.playsInline = true;
                this._video.muted = true; // Empieza muteado para auto-play policies
            }

            if (this._video.src !== url) {
                this._video.src = url;
                this._lastLoadedSource = this.source;

                await new Promise((resolve) => {
                    this._video.oncanplay = resolve;
                    this._video.load();
                });
                this._isLoaded = true;
            }
        } catch (e) {
            console.warn(`[VideoPlayer] Error al cargar video: ${this.source}.`, e);
        }
    }

    async play() {
        if (!this._isLoaded || this.source !== this._lastLoadedSource) {
            await this.load();
        }

        if (this._video) {
            try {
                await this._video.play();
            } catch (e) {
                console.warn(`[VideoPlayer] No se pudo reproducir: ${e.message}`);
            }
        }
    }

    pause() {
        if (this._video) this._video.pause();
    }

    stop() {
        if (this._video) {
            this._video.pause();
            this._video.currentTime = 0;
        }
    }

    seek(time) {
        if (this._video) this._video.currentTime = time;
    }

    // --- Spanish Aliases ---
    reproducir() { this.play(); }
    pausar() { this.pause(); }
    detener() { this.stop(); }
    buscarTiempo(t) { this.seek(t); }

    get fuente() { return this.source; }
    set fuente(v) { this.source = v; }
    get volumen() { return this.volume; }
    set volumen(v) { this.volume = v; }
    get bucle() { return this.loop; }
    set bucle(v) { this.loop = v; }
    get velocidad() { return this.playbackRate; }
    set velocidad(v) { this.playbackRate = v; }
    get modoEscalado() { return this.scalingMode; }
    set modoEscalado(v) { this.scalingMode = v; }

    onDestroy() {
        this.stop();
        if (this._video) {
            this._video.src = "";
            this._video.load();
            this._video = null;
        }
    }

    clone() {
        const copy = new VideoPlayer(null);
        copy.source = this.source;
        copy.volume = this.volume;
        copy.loop = this.loop;
        copy.playOnAwake = this.playOnAwake;
        copy.playbackRate = this.playbackRate;
        copy.scalingMode = this.scalingMode;
        return copy;
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
registerComponent('PolygonCollider2D', PolygonCollider2D);
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

        this.parameters = {
            horizontal: 0,
            vertical: 0,
            speed: 0,
            isMoving: false
        };

        this._lastPosition = { x: 0, y: 0 };
        this._hasLastPosition = false;
        this._failedToLoad = false;
        this._smartModeOverride = null;

        // Anti-flicker state
        this._isMovingSmooth = false;
        this._movingStopTimer = 0;
        this._lastMovingHoriz = 0;
        this._lastMovingVert = 0;

        // Direction stability
        this._lastDirIndex = 4;
        this._desiredDirIndex = 4;
        this._dirStabilityTimer = 0;

        // Configurable responsiveness (Snappy defaults)
        this.deadZone = 0.1;
        this.startDelay = 0.02;
        this.stopDelay = 0.02;
        this.directionDelay = 0.05;
        this.stopBuffer = 0.05;
    }

    get smartMode() {
        if (this._smartModeOverride !== null) return this._smartModeOverride;
        return this.controller ? !!this.controller.smartMode : false;
    }
    set smartMode(v) {
        this._smartModeOverride = v;
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

        if (this.controller && this.controller.entryState) {
            // In editor or at start, just set the state to show the first frame
            this.currentStateName = this.controller.entryState;
            const state = this.states.get(this.currentStateName);
            if (state && state.animationClip) {
                this.animator.animationClipPath = state.animationClip;
                // Just load it to show the first frame
                this.animator.loadAnimationClip(projectsDirHandle);
            }
        }
    }

    start() {
        // Force play entry state when game actually starts
        if (this.controller && this.controller.entryState) {
            this.play(this.controller.entryState, true);
        }
    }

    async loadController(projectsDirHandle) {
        if (!this.controllerPath || this._failedToLoad) return;

        try {
            const url = await getURLForAssetPath(this.controllerPath, projectsDirHandle);
            if (!url) throw new Error(`Could not get URL for controller: ${this.controllerPath}`);

            const response = await fetch(url);
            this.controller = await response.json();

            // Defensive check to ensure 'states' is a Map (prevents crashes from legacy corrupted data)
            if (!(this.states instanceof Map)) {
                this.states = new Map();
            }

            this.states.clear();
            for (const state of this.controller.states) {
                this.states.set(state.name, state);
            }

            // Reset state to force entry state playback if it's the first time
            if (!this.currentStateName) {
                this.currentStateName = '';
            }

            console.log(`AnimatorController loaded '${this.controller.name}' with ${this.states.size} states.`);

        } catch (error) {
            console.error(`Failed to load Animator Controller at '${this.controllerPath}':`, error);
            this._failedToLoad = true;
        }
    }

    play(stateName, force = false, overrides = {}) {
        if (!stateName) return;
        const debug = window.CE_DEBUG_ANIMATION;

        if (debug) console.log(`[AnimatorController] Intento de play: state=${stateName}, force=${force}`);

        // Check transitions if not forced and not the first state
        if (!force && this.currentStateName && this.currentStateName !== stateName) {
            if (!this.canTransitionTo(stateName)) {
                if (debug) console.warn(`[AnimatorController] Transición denegada: No hay conexión de '${this.currentStateName}' a '${stateName}'.`);
                return;
            }
        }

        if (!this.animator && this.materia) {
            this.animator = this.materia.getComponent(Animator);
        }

        if (!(this.states instanceof Map)) {
            this.states = new Map();
        }

        if (!this.animator) {
            if (debug) console.warn(`[AnimatorController] No se pudo encontrar el componente Animator.`);
            return;
        }

        if (!this.states.has(stateName)) {
            if (debug) console.warn(`[AnimatorController] El estado '${stateName}' no existe en este controlador.`);
            return;
        }

        // If animator is under script control, don't interrupt unless forced
        if (!force && this.animator._controlSource === 'script' && this.animator.isPlaying) {
            if (debug) console.log(`[AnimatorController] Ignorando cambio a '${stateName}' porque el script tiene la prioridad.`);
            return;
        }

        const state = this.states.get(stateName);
        const isSameState = this.currentStateName === stateName;

        if (debug) console.log(`[AnimatorController] Cambiando a estado: ${stateName} (Clip: ${state.animationClip || 'Ninguno'})`);
        this.currentStateName = stateName;

        // Handle flipping
        const transform = this.materia.getComponent(Transform);
        if (transform) {
            transform.flipX = !!state.flipX;
            transform.flipY = !!state.flipY;
        }

        // Handle empty clip
        if (!state.animationClip) {
            this.animator.stop();
            return;
        }

        // Pass control to animator with overrides support
        this.animator.play(state.animationClip, {
            loop: overrides.loop !== undefined ? overrides.loop : (state.loop !== undefined ? state.loop : true),
            speed: overrides.speed || state.speed || 12,
            startFrame: overrides.startFrame !== undefined ? overrides.startFrame : (state.startFrame || 0),
            endFrame: overrides.endFrame !== undefined ? overrides.endFrame : (state.endFrame !== undefined ? state.endFrame : -1),
            source: 'controller',
            force: force
        });
    }

    /** Alias en español */
    reproducir(nombreEstado) { this.play(nombreEstado); }

    async refresh() {
        if (window.CE_DEBUG_ANIMATION) console.log(`[AnimatorController] Refrescando controlador: ${this.controllerPath}`);
        const lastState = this.currentStateName;
        await this.loadController(this.projectsDirHandle || window.projectsDirHandle);
        if (lastState && this.states.has(lastState)) {
            this.play(lastState, true); // Force restart to apply changes
        } else if (this.controller && this.controller.entryState) {
            this.play(this.controller.entryState, true);
        }
    }

    setParameter(name, value) {
        this.parameters[name] = value;
    }

    establecerParametro(nombre, valor) { this.setParameter(nombre, valor); }

    canTransitionTo(targetStateName) {
        if (!this.controller || !this.controller.transitions) return false;
        // If we don't have a current state, we can only go to entryState by default,
        // but for robustness we allow the first transition.
        if (!this.currentStateName) return true;
        if (this.currentStateName === targetStateName) return true;

        return this.controller.transitions.some(t => t.from === this.currentStateName && t.to === targetStateName);
    }

    update(deltaTime) {
        if (!this.materia.isActive) return;
        const debug = window.CE_DEBUG_ANIMATION;

        // Lazy lookup of Animator
        if (!this.animator && this.materia) {
            this.animator = this.materia.getComponent(Animator);
        }

        if (debug && Math.random() < 0.01) {
            console.log(`[AnimatorController] Update activo. Path: ${this.controllerPath}, hasController: ${!!this.controller}, currentState: ${this.currentStateName}`);
        }

        // Auto-load controller data if needed
        if (!this.controller && this.controllerPath && !this._failedToLoad) {
            if (!this._isAutoLoading) {
                this._isAutoLoading = true;
                this.loadController(this.projectsDirHandle || window.projectsDirHandle).then(() => {
                    this._isAutoLoading = false;
                    // Play entry state after auto-load
                    const isGame = typeof window !== 'undefined' && (window.isGameRunning || window.CE_Standalone_Scripts);
                    if (isGame && this.controller && this.controller.entryState) {
                        this.play(this.controller.entryState);
                    } else if (this.controller && this.controller.entryState) {
                        this.currentStateName = this.controller.entryState;
                        const state = this.states.get(this.currentStateName);
                        if (state && state.animationClip) {
                            this.animator.animationClipPath = state.animationClip;
                            this.animator.loadAnimationClip(this.projectsDirHandle || window.projectsDirHandle);
                        }
                    }
                });
            }
        }

        if (!this.animator || !this.controller) return;

        // Fallback to Principal (Entry State) on animation failure
        if (this.animator.hasError && this.controller.entryState && this.currentStateName !== this.controller.entryState) {
            if (debug) console.log(`[AnimatorController] Fallback a estado principal '${this.controller.entryState}' por error en animación.`);
            this.play(this.controller.entryState, true); // force fallback
            this.animator.hasError = false; // reset error after fallback
        }

        // Auto-update parameters from components
        const rb = this.materia.getComponent(Rigidbody2D);
        const movement = this.materia.getComponent(Movement);
        const transform = this.materia.getComponent(Transform);

        // Intention check: is the user trying to move via Input?
        const isIntentionalStop = movement && movement.isActive && movement.lastMove.x === 0 && movement.lastMove.y === 0;
        const isGrounded = movement && movement.isActive && movement.isGrounded;

        let horiz = 0, vert = 0, moving = false;

        // 1. Check Movement component (Highest priority for intentional input)
        if (movement && movement.isActive && !isIntentionalStop) {
            horiz = movement.lastMove.x;
            vert = movement.lastMove.y;
            moving = true;
            if (debug && Math.random() < 0.05) console.log(`[AnimatorController] Movimiento detectado vía componente Movement: ${horiz.toFixed(2)}, ${vert.toFixed(2)}`);
        }

        // 2. Check Rigidbody velocity (Fallback if Movement didn't provide input)
        if (!moving && rb && rb.isActive) {
            // Be extremely strict if we are supposed to be stopped on ground
            const isGroundedStop = isIntentionalStop && isGrounded;

            // In platformers, Y velocity is often noisy due to gravity/collisions.
            // If grounded and not trying to move, ignore Y velocity for "moving" detection.
            const checkY = !(isGroundedStop && rb.gravityScale > 0);
            const rbThreshold = isGroundedStop ? 40.0 : 10.0; // Even higher thresholds

            if (Math.abs(rb.velocity.x) > rbThreshold || (checkY && Math.abs(rb.velocity.y) > rbThreshold)) {
                horiz = rb.velocity.x;
                vert = rb.velocity.y;
                moving = true;
                if (debug && Math.random() < 0.02) console.log(`[AnimatorController] Movimiento detectado vía Rigidbody2D: H=${horiz.toFixed(2)}, V=${vert.toFixed(2)} (Threshold: ${rbThreshold})`);
            }
        }

        // 3. Fallback: Position tracking (Useful for custom movement scripts or editor dragging)
        if (!moving && transform) {
            if (this._hasLastPosition && deltaTime > 0) {
                const isGame = typeof window !== 'undefined' && (window.isGameRunning || window.CE_Standalone_Scripts);

                if (isGame) {
                    // In game, use velocity-based threshold
                    const dx = (transform.x - this._lastPosition.x) / deltaTime;
                    const dy = (transform.y - this._lastPosition.y) / deltaTime;

                    const isGroundedStop = isIntentionalStop && isGrounded;
                    const threshold = isGroundedStop ? 40.0 : 12.0; // Even higher thresholds
                    const checkY = !(isGroundedStop && rb && rb.gravityScale > 0);

                    if (Math.abs(dx) > threshold || (checkY && Math.abs(dy) > threshold)) {
                        horiz = dx;
                        vert = dy;
                        moving = true;
                        if (debug && Math.random() < 0.02) console.log(`[AnimatorController] Movimiento detectado vía DeltaPos: H=${horiz.toFixed(2)}, V=${vert.toFixed(2)} (Threshold: ${threshold})`);
                    }
                } else {
                    // In editor, use absolute distance threshold to avoid jitter from clicking/dragging
                    const distSq = (transform.x - this._lastPosition.x)**2 + (transform.y - this._lastPosition.y)**2;
                    const thresholdDist = 1.0; // At least 1 pixel movement required in the editor
                    if (distSq > thresholdDist**2) {
                        horiz = (transform.x - this._lastPosition.x);
                        vert = (transform.y - this._lastPosition.y);
                        moving = true;
                    }
                }

                if (moving && debug && Math.random() < 0.05) {
                    console.log(`[AnimatorController] Movimiento detectado vía DeltaPos: ${horiz}, ${vert}`);
                }
            }
        }

        // Always update last position if transform exists
        if (transform) {
            this._lastPosition.x = transform.x;
            this._lastPosition.y = transform.y;
            this._hasLastPosition = true;
        }

        // Apply smoothing/hysteresis to 'moving' state to prevent flickering
        if (moving) {
            this._isMovingSmooth = true;
            this._movingStopTimer = this.stopBuffer ?? 0.05; // Use configurable buffer
            this._lastMovingHoriz = horiz;
            this._lastMovingVert = vert;
        } else if (this._isMovingSmooth) {
            // If we are grounded and have no intentional input, reduce the buffer significantly
            // to avoid "sliding" animation when stopping.
            const isGroundedStop = isIntentionalStop && isGrounded;
            this._movingStopTimer -= isGroundedStop ? (deltaTime * 10) : deltaTime; // Even faster stop if grounded

            if (this._movingStopTimer <= 0) {
                this._isMovingSmooth = false;
            }
        }

        if (this._isMovingSmooth) {
            // Use current movement if available.
            // If we are in the hysteresis buffer, only use last values if NOT in an intentional stop.
            if (moving) {
                this.parameters.horizontal = horiz;
                this.parameters.vertical = vert;
            } else if (!isIntentionalStop) {
                this.parameters.horizontal = this._lastMovingHoriz;
                this.parameters.vertical = this._lastMovingVert;
            } else {
                this.parameters.horizontal = 0;
                this.parameters.vertical = 0;
            }

            this.parameters.speed = Math.sqrt(this.parameters.horizontal**2 + this.parameters.vertical**2);
            this.parameters.isMoving = true;
        } else {
            this.parameters.horizontal = 0;
            this.parameters.vertical = 0;
            this.parameters.speed = 0;
            this.parameters.isMoving = false;
        }

        const isGame = typeof window !== 'undefined' && (window.isGameRunning || window.CE_Standalone_Scripts);

        if (isGame) {
            if (this.smartMode) {
                this._handleSmartMode();
            }
            this._checkTransitions();
        }
    }

    _handleSmartMode() {
        const p = this.parameters;
        const debug = window.CE_DEBUG_ANIMATION;
        const deltaTime = this.materia.scene ? (1/60) : 0.016; // Fallback if no engine delta
        const engine = RuntimeAPIManager.getAPI('engine');
        const dt = engine ? engine.getDeltaTime() : deltaTime;

        if (!this.controller || !this.controller.movementMapping) {
            if (debug && Math.random() < 0.01) console.warn(`[AnimatorController] SmartMode activo pero no hay mapeo de movimiento.`);
            return;
        }

        let currentDirIndex = 4; // Center (Idle)

        if (p.isMoving) {
            let h = 0;
            const dz = this.deadZone ?? 0.1;
            if (p.horizontal > dz) h = 1;
            else if (p.horizontal < -dz) h = -1;

            let v = 0;
            if (p.vertical > dz) v = 1;
            else if (p.vertical < -dz) v = -1;

            currentDirIndex = (v + 1) * 3 + (h + 1);
        }

        // Direction Stability Check
        if (currentDirIndex !== this._desiredDirIndex) {
            this._desiredDirIndex = currentDirIndex;

            // Stability timers to filter out noise
            if (this._lastDirIndex === 4) {
                this._dirStabilityTimer = this.startDelay ?? 0.02;
            } else if (currentDirIndex === 4) {
                this._dirStabilityTimer = this.stopDelay ?? 0.02;
            } else {
                this._dirStabilityTimer = this.directionDelay ?? 0.05;
            }
        }

        if (this._dirStabilityTimer > 0) {
            this._dirStabilityTimer -= dt;
            if (this._dirStabilityTimer <= 0) {
                this._lastDirIndex = this._desiredDirIndex;
            }
        } else {
            this._lastDirIndex = currentDirIndex;
        }

        const dirIndexToPlay = this._lastDirIndex;
        const stateName = this.controller.movementMapping[dirIndexToPlay];

        if (debug && Math.random() < 0.04) {
            console.log(`[AnimatorController] SmartMode: target=${this._desiredDirIndex}, stable=${this._lastDirIndex}, state=${stateName}, isMoving=${p.isMoving}`);
        }

        if (stateName) {
            const isSameState = this.currentStateName === stateName;
            if (!isSameState || !this.animator.isPlaying) {
                // Smart mode follows transitions
                if (isSameState || this.canTransitionTo(stateName)) {
                    this.play(stateName);
                } else {
                    // If transition to movement state is denied, try to fallback to Idle (Principal)
                    // if it's connected, as requested by the user.
                    const idleState = this.controller.movementMapping[4] || this.controller.entryState;
                    if (idleState && idleState !== this.currentStateName && this.canTransitionTo(idleState)) {
                        if (debug) console.log(`[AnimatorController] SmartMode: Transición a '${stateName}' denegada. Volviendo a Idle '${idleState}'.`);
                        this.play(idleState);
                    } else if (idleState && idleState !== this.currentStateName) {
                        // If even fallback to idle is denied by graph, but we are stuck in a non-looping finished animation
                        // we MUST return to principal to avoid freezing, as it is the "root" animation.
                        if (!this.animator.isPlaying && this.animator._controlSource === 'controller') {
                            if (debug) console.log(`[AnimatorController] SmartMode: Stuck and denied. Forcing fallback to Principal '${this.controller.entryState}'.`);
                            this.play(this.controller.entryState, true);
                        }
                    }
                }
            }
        } else if (!stateName) {
            if (p.isMoving) {
                // Fallback for diagonals or missing directions
                let h = p.horizontal > 0.1 ? 1 : (p.horizontal < -0.1 ? -1 : 0);
                let v = p.vertical > 0.1 ? 1 : (p.vertical < -0.1 ? -1 : 0);

                let fallbackState = null;
                if (h !== 0 && v !== 0) {
                    // Try pure horizontal
                    fallbackState = this.controller.movementMapping[(1) * 3 + (h + 1)];
                    if (!fallbackState || !this.states.has(fallbackState)) {
                        // Try pure vertical
                        fallbackState = this.controller.movementMapping[(v + 1) * 3 + (1)];
                    }
                }

                if (!fallbackState || !this.states.has(fallbackState)) {
                    fallbackState = this.controller.movementMapping[4]; // Idle (Principal)
                }

                if (fallbackState && (this.currentStateName !== fallbackState || !this.animator.isPlaying)) {
                    if (this.canTransitionTo(fallbackState)) {
                        if (debug) console.log(`[AnimatorController] SmartMode Fallback: Usando '${fallbackState}' por falta de mapeo o denegación.`);
                        this.play(fallbackState);
                    }
                }
            } else {
                // If not moving and dirIndex 4 is not mapped directly, or we are in a walking state
                // and want to return to Idle.
                const idleState = this.controller.movementMapping[4];
                if (idleState && this.currentStateName !== idleState) {
                    if (this.canTransitionTo(idleState)) {
                        if (debug) console.log(`[AnimatorController] SmartMode: Deteniendo movimiento, volviendo a Idle '${idleState}'.`);
                        this.play(idleState);
                    }
                    // Else: continue playing current animation if no connection back to Idle
                    // as requested by the user ("se segura reproduciendo el de caminar por que no hay a donde devolver el estado")
                }
            }
        } else if (stateName && !this.states.has(stateName)) {
            if (debug) console.warn(`[AnimatorController] SmartMode: El estado mapeado '${stateName}' no existe.`);
        }
    }

    _checkTransitions() {
        if (!this.controller.transitions) return;

        for (const trans of this.controller.transitions) {
            if (trans.from === this.currentStateName) {
                if (this._evaluateConditions(trans.conditions)) {
                    this.play(trans.to);
                    break;
                }
            }
        }
    }

    _evaluateConditions(conditions) {
        if (!conditions || conditions.length === 0) return false;

        return conditions.every(cond => {
            const paramValue = this.parameters[cond.parameter];
            switch (cond.operator) {
                case 'Greater': return paramValue > cond.threshold;
                case 'Less': return paramValue < cond.threshold;
                case 'Equals': return paramValue === cond.threshold;
                case 'NotEqual': return paramValue !== cond.threshold;
                case 'True': return paramValue === true;
                case 'False': return paramValue === false;
                default: return false;
            }
        });
    }

    onAnimationEnd(clipName) {
        // Handle transitions with hasExitTime
        if (!this.controller || !this.controller.transitions) return;

        let transitionFound = false;

        for (const trans of this.controller.transitions) {
            if (trans.from === this.currentStateName && trans.hasExitTime) {
                const hasConditions = trans.conditions && trans.conditions.length > 0;

                // If there are conditions, they must be met
                if (hasConditions) {
                    if (this._evaluateConditions(trans.conditions)) {
                        this.play(trans.to);
                        transitionFound = true;
                        break;
                    }
                } else {
                    // Automatic transition (no conditions):
                    // Only follow if the current animation is NOT looping.
                    // This prevents "Idle -> Walk" automatic jumps when the user is just standing still.
                    if (!this.animator.loop) {
                        this.play(trans.to);
                        transitionFound = true;
                        break;
                    }
                }
            }
        }

        // Safety fallback: If a non-looping animation finished and no transition was found,
        // automatically return to the Principal (entryState) to avoid staying "frozen" on the last frame.
        if (!transitionFound && !this.animator.loop && this.controller.entryState && this.currentStateName !== this.controller.entryState) {
            if (window.CE_DEBUG_ANIMATION) console.log(`[AnimatorController] No hay transición de salida para '${this.currentStateName}'. Volviendo a Principal.`);
            this.play(this.controller.entryState, true); // Use force to bypass any connection issues for safety fallback
        }
    }

    clone() {
        const newController = new AnimatorController(null);
        newController.controllerPath = this.controllerPath;
        newController.smartMode = this.smartMode;
        newController.deadZone = this.deadZone;
        newController.startDelay = this.startDelay;
        newController.stopDelay = this.stopDelay;
        newController.directionDelay = this.directionDelay;
        newController.stopBuffer = this.stopBuffer;
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

export class UIEventTrigger extends Leyes {
    constructor(materia) {
        super(materia);
        this.interactable = true;
        this.showGizmo = true; // For editor visualization
        this.events = {
            onPointerDown: [],
            onPointerUp: [],
            onPointerEnter: [],
            onPointerExit: [],
            onPointerClick: [],
            onPointerDrag: [],
            onPointerHold: []
        };
    }

    clone() {
        const newTrigger = new UIEventTrigger(null);
        newTrigger.interactable = this.interactable;
        newTrigger.showGizmo = this.showGizmo;
        newTrigger.events = JSON.parse(JSON.stringify(this.events));
        return newTrigger;
    }
}
registerComponent('UIEventTrigger', UIEventTrigger);

registerComponent('PointLight2D', PointLight2D);
registerComponent('SpotLight2D', SpotLight2D);
registerComponent('FreeformLight2D', FreeformLight2D);
registerComponent('SpriteLight2D', SpriteLight2D);
registerComponent('AudioSource', AudioSource);
registerComponent('VideoPlayer', VideoPlayer);

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
        this.repeatX = false;
        this.repeatY = false;
        this.offset = { x: 0, y: 0 };
        this.autoscroll = { x: 0, y: 0 };

        // Internal state
        this._autoOffset = { x: 0, y: 0 };
    }
    update(deltaTime) {
        const isGame = typeof window !== 'undefined' && (window.isGameRunning || window.CE_Standalone_Scripts);
        if (!isGame) return;

        if (this.autoscroll.x !== 0 || this.autoscroll.y !== 0) {
            this._autoOffset.x += this.autoscroll.x * deltaTime;
            this._autoOffset.y += this.autoscroll.y * deltaTime;
        }
    }
    clone() {
        const newParallax = new Parallax(null);
        newParallax.scrollFactor = { ...this.scrollFactor };
        newParallax.mirroring = { ...this.mirroring };
        newParallax.repeatX = this.repeatX;
        newParallax.repeatY = this.repeatY;
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
        this.lastMove = { x: 0, y: 0 };
    }
    update(deltaTime) {
        const input = RuntimeAPIManager.getAPI('input');
        const engine = RuntimeAPIManager.getAPI('engine');
        if (!input) return;

        // Ground check
        if (this.groundTag && engine) {
            // Usamos estaTocandoTag para mayor robustez (detecta frame de inicio, frames de permanencia y triggers)
            this.isGrounded = engine.isTouchingTag(this.materia, this.groundTag);
        } else {
            this.isGrounded = true; // No ground tag means always grounded
        }

        let moveX = 0;
        let moveY = 0;

        if (input.isKeyPressed(this.rightKey)) moveX += 1;
        if (input.isKeyPressed(this.leftKey)) moveX -= 1;
        if (input.isKeyPressed(this.upKey)) moveY -= 1;
        if (input.isKeyPressed(this.downKey)) moveY += 1;

        // Normalize movement for diagonal speed consistency
        if (moveX !== 0 || moveY !== 0) {
            const length = Math.sqrt(moveX * moveX + moveY * moveY);
            if (length > 0) {
                moveX /= length;
                moveY /= length;
            }
        }

        this.lastMove.x = moveX;
        this.lastMove.y = moveY;

        const rb = this.materia.getComponent(Rigidbody2D);
        const transform = this.materia.getComponent(Transform);

        if (this.useRigidbody && rb) {
            rb.velocity.x = moveX * (this.speed / 10);

            // If gravity is disabled, allow vertical movement (Top-Down)
            if (rb.gravityScale === 0) {
                rb.velocity.y = moveY * (this.speed / 10);
            }

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
        this.clipCache = new Map();
    }

    getAnimationClip(path) {
        if (!path) return null;
        if (this.clipCache.get(path)) return this.clipCache.get(path);

        if (!this._loadingClips) this._loadingClips = new Set();
        if (this._loadingClips.has(path)) return null;

        this._loadingClips.add(path);

        // Background loading
        const dirHandle = window.projectsDirHandle;
        if (dirHandle) {
            getURLForAssetPath(path, dirHandle)
                .then(url => fetch(url))
                .then(res => res.json())
                .then(data => {
                    const anim = (data.animations && data.animations.length > 0) ? data.animations[0] : data;
                    this.clipCache.set(path, anim);
                    this._loadingClips.delete(path);
                })
                .catch(e => {
                    console.error(`Error al cargar clip de tilemap: ${path}`, e);
                    this._loadingClips.delete(path);
                });
        }
        return null;
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
        if (collider) {
            // Usar un debounce simple para no saturar el hilo principal durante el pintado
            if (this._collisionTimer) clearTimeout(this._collisionTimer);
            this._collisionTimer = setTimeout(() => {
                collider.isDirty = true;
                this._collisionTimer = null;
            }, 150);
        }
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
        newTerreno._width = this._width;
        newTerreno._height = this._height;
        newTerreno.layers = this.layers.map(l => {
            const newLayer = {
                texturePath: l.texturePath,
                opacity: l.opacity,
                serializedMask: l.serializedMask
            };
            newTerreno._initializeLayerCanvas(newLayer);
            if (l.maskCanvas && l.maskCanvas.width > 0 && l.maskCanvas.height > 0) {
                newLayer.maskCtx.drawImage(l.maskCanvas, 0, 0);
            }
            return newLayer;
        });
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
        this._mode = 'Rectangles'; // 'Rectangles' or 'Polygon'
        this.generatedColliders = [];
        this.generatedPolygons = [];
        this.debugPolygons = []; // Contornos completos para renderizado
        this._resolution = 16; // Tamaño del bloque para simplificar colisiones (en píxeles)
        this._simplifyTolerance = 2.0;
    }

    get mode() { return this._mode; }
    set mode(v) {
        if (this._mode !== v) {
            this._mode = v;
            this.isDirty = true;
        }
    }

    get resolution() { return this._resolution; }
    set resolution(v) {
        if (this._resolution !== v) {
            this._resolution = v;
            this.isDirty = true;
        }
    }

    get simplifyTolerance() { return this._simplifyTolerance; }
    set simplifyTolerance(v) {
        if (this._simplifyTolerance !== v) {
            this._simplifyTolerance = v;
            this.isDirty = true;
        }
    }

    generateColliders() {
        const terreno = this.materia.getComponent(Terreno2D);
        if (!terreno || terreno.layers.length === 0) return;

        const { width, height } = terreno;
        if (width <= 0 || height <= 0) return;

        this.generatedColliders = [];
        this.generatedPolygons = [];
        this.debugPolygons = [];

        // Crear un canvas temporal para combinar todas las máscaras
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tCtx = tempCanvas.getContext('2d');

        let hasData = false;
        for (const layer of terreno.layers) {
            if (layer.maskCanvas && layer.maskCanvas.width > 0 && layer.maskCanvas.height > 0) {
                tCtx.drawImage(layer.maskCanvas, 0, 0);
                hasData = true;
            }
        }

        if (!hasData) {
            this.isDirty = false;
            return;
        }

        const imgData = tCtx.getImageData(0, 0, width, height);

        if (this._mode === 'Polygon') {
            this._generatePolygonColliders(imgData);
        } else {
            this._generateRectangleColliders(imgData);
        }

        this.isDirty = false;
    }

    _getPolygonArea(vertices) {
        let area = 0;
        for (let i = 0; i < vertices.length; i++) {
            const j = (i + 1) % vertices.length;
            area += vertices[i].x * vertices[j].y;
            area -= vertices[j].x * vertices[i].y;
        }
        return area / 2;
    }

    _isPointInTriangle(p, a, b, c) {
        const det = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
        const s = ((b.y - c.y) * (p.x - c.x) + (c.x - b.x) * (p.y - c.y)) / det;
        const t = ((c.y - a.y) * (p.x - c.x) + (a.x - c.x) * (p.y - c.y)) / det;
        const u = 1 - s - t;
        return s >= 0 && t >= 0 && u >= 0;
    }

    _isEar(p1, p2, p3, allVertices) {
        // En coordenadas de pantalla (Y abajo), cross > 0 es CW.
        // Pero queremos triangles CCW para consistencia.
        // Un ángulo es convexo si el giro es hacia la "izquierda".
        const cross = (p2.x - p1.x) * (p3.y - p2.y) - (p2.y - p1.y) * (p3.x - p2.x);
        if (cross >= 0) return false; // Es CW o colineal (no convexo)

        for (const p of allVertices) {
            if (p === p1 || p === p2 || p === p3) continue;
            if (this._isPointInTriangle(p, p1, p2, p3)) return false;
        }
        return true;
    }

    _triangulate(vertices) {
        if (vertices.length < 3) return [];
        if (vertices.length === 3) return [vertices];

        const triangles = [];
        let workingVerts = vertices.map((v, i) => ({ x: v.x, y: v.y }));

        // Asegurar CCW para el algoritmo de orejas (area < 0 en pantalla)
        if (this._getPolygonArea(workingVerts) > 0) {
            workingVerts.reverse();
        }

        let iterations = 0;
        const maxIterations = workingVerts.length * 10;

        while (workingVerts.length > 3 && iterations < maxIterations) {
            let earFound = false;
            for (let i = 0; i < workingVerts.length; i++) {
                const prev = workingVerts[(i + workingVerts.length - 1) % workingVerts.length];
                const curr = workingVerts[i];
                const next = workingVerts[(i + 1) % workingVerts.length];

                if (this._isEar(prev, curr, next, workingVerts)) {
                    triangles.push([prev, curr, next]);
                    workingVerts.splice(i, 1);
                    earFound = true;
                    break;
                }
            }
            if (!earFound) {
                console.warn("[TerrenoCollider2D] No se pudo encontrar una oreja en la triangulación.");
                break;
            }
            iterations++;
        }

        if (workingVerts.length === 3) {
            triangles.push([workingVerts[0], workingVerts[1], workingVerts[2]]);
        }

        return triangles;
    }

    _generateRectangleColliders(imgData) {
        const { width, height, data } = imgData;
        const res = this._resolution;
        const cols = Math.ceil(width / res);
        const rows = Math.ceil(height / res);

        const grid = new Uint8Array(cols * rows);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let occupied = false;
                const startY = r * res;
                const endY = Math.min(height, (r + 1) * res);
                const startX = c * res;
                const endX = Math.min(width, (c + 1) * res);

                for (let py = startY; py < endY; py++) {
                    for (let px = startX; px < endX; px++) {
                        const idx = (py * width + px) * 4;
                        if (data[idx + 3] > 128) {
                            occupied = true;
                            break;
                        }
                    }
                    if (occupied) break;
                }
                if (occupied) grid[r * cols + c] = 1;
            }
        }

        const visited = new Uint8Array(cols * rows);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (grid[r * cols + c] === 1 && !visited[r * cols + c]) {
                    let w = 1;
                    while (c + w < cols && grid[r * cols + (c + w)] === 1 && !visited[r * cols + (c + w)]) w++;
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
                    for (let hh = 0; hh < h; hh++) {
                        for (let ww = 0; ww < w; ww++) visited[(r + hh) * cols + (c + ww)] = 1;
                    }
                    const rectWidth = w * res;
                    const rectHeight = h * res;
                    const centerX = (c * res + rectWidth / 2) - (width / 2);
                    const centerY = (r * res + rectHeight / 2) - (height / 2);
                    this.generatedColliders.push({ x: centerX, y: centerY, width: rectWidth, height: rectHeight });
                }
            }
        }
        console.log(`[TerrenoCollider2D] Generados ${this.generatedColliders.length} rectángulos.`);
    }

    _generatePolygonColliders(imgData) {
        const { width, height, data } = imgData;
        // Rejilla de booleanos para rastrear píxeles visitados al buscar contornos
        const visited = new Uint8Array(width * height);

        const getAlpha = (x, y) => {
            if (x < 0 || x >= width || y < 0 || y >= height) return 0;
            return data[(y * width + x) * 4 + 3];
        };

        const isBoundary = (x, y) => {
            if (getAlpha(x, y) <= 128) return false;
            // Si tiene algún vecino vacío, es borde
            return getAlpha(x - 1, y) <= 128 || getAlpha(x + 1, y) <= 128 ||
                   getAlpha(x, y - 1) <= 128 || getAlpha(x, y + 1) <= 128;
        };

        // Escanear con un paso mayor para mejorar rendimiento (mínimo 2px)
        const step = Math.max(2, Math.floor(this._resolution / 4));

        for (let y = 0; y < height; y += step) {
            for (let x = 0; x < width; x += step) {
                const idx = y * width + x;
                // Solo iniciamos trazado si es un píxel sólido no visitado Y está en el borde
                if (data[idx * 4 + 3] > 128 && !visited[idx] && isBoundary(x, y)) {
                    // Encontramos un píxel de borde sólido no visitado, trazar su contorno
                    const contour = this._traceContour(x, y, width, height, data, visited);
                    if (contour && contour.length > 3) {
                        // Simplificar el contorno
                        const simplified = this._ramerDouglasPeucker(contour, this._simplifyTolerance);
                        if (simplified.length > 2) {
                            // Centrar vértices respecto al terreno
                            const centered = simplified.map(v => ({
                                x: v.x - width / 2,
                                y: v.y - height / 2
                            }));

                            // Comprobar si es una isla o un hueco
                            // En coordenadas de pantalla (Y abajo), CW > 0 es isla, CCW < 0 es hueco
                            const area = this._getPolygonArea(centered);
                            if (area > 10) { // Ignorar islas minúsculas (menos de 10px² aprox)
                                // Guardar el polígono completo para el gizmo
                                this.debugPolygons.push({ vertices: centered });

                                // Solo triangular e incluir si es una isla (área positiva)
                                const triangles = this._triangulate(centered);
                                for (const tri of triangles) {
                                    this.generatedPolygons.push({ vertices: tri });
                                }
                            }
                        }
                    }
                }
            }
        }
        console.log(`[TerrenoCollider2D] Generados ${this.generatedPolygons.length} polígonos.`);
    }

    _traceContour(startX, startY, width, height, data, globalVisited) {
        const getAlpha = (x, y) => {
            if (x < 0 || x >= width || y < 0 || y >= height) return 0;
            return data[(y * width + x) * 4 + 3];
        };

        const points = [];
        let currX = startX;
        let currY = startY;

        // Moore-Neighbor Tracing
        // Direcciones: 0:N, 1:NE, 2:E, 3:SE, 4:S, 5:SW, 6:W, 7:NW
        const dx = [0, 1, 1, 1, 0, -1, -1, -1];
        const dy = [-1, -1, 0, 1, 1, 1, 0, -1];

        let backX = startX - 1;
        let backY = startY;
        let entryDir = 2; // Entramos desde el oeste, el primer vecino a chequear es N (dir 0)

        let iterations = 0;
        const maxIterations = width * height;

        do {
            points.push({ x: currX, y: currY });
            globalVisited[currY * width + currX] = 1;

            let found = false;
            // El primer vecino a chequear es (entryDir + 6) % 8
            let checkDir = (entryDir + 6) % 8;

            for (let i = 0; i < 8; i++) {
                const dir = (checkDir + i) % 8;
                const nextX = currX + dx[dir];
                const nextY = currY + dy[dir];

                if (getAlpha(nextX, nextY) > 128) {
                    // Marcar píxeles internos como visitados para no empezar nuevas islas dentro
                    // (Simplificación: marcar una pequeña área alrededor)
                    for (let sy = -1; sy <= 1; sy++) {
                        for (let sx = -1; sx <= 1; sx++) {
                            const vx = currX + sx;
                            const vy = currY + sy;
                            if (vx >= 0 && vx < width && vy >= 0 && vy < height) {
                                globalVisited[vy * width + vx] = 1;
                            }
                        }
                    }

                    currX = nextX;
                    currY = nextY;
                    entryDir = dir;
                    found = true;
                    break;
                }
            }

            if (!found) break;
            iterations++;
        } while ((currX !== startX || currY !== startY) && iterations < maxIterations);

        return points;
    }

    _ramerDouglasPeucker(points, epsilon) {
        if (points.length < 3) return points;

        let dmax = 0;
        let index = 0;
        const end = points.length - 1;

        for (let i = 1; i < end; i++) {
            const d = this._perpendicularDistance(points[i], points[0], points[end]);
            if (d > dmax) {
                index = i;
                dmax = d;
            }
        }

        if (dmax > epsilon) {
            const res1 = this._ramerDouglasPeucker(points.slice(0, index + 1), epsilon);
            const res2 = this._ramerDouglasPeucker(points.slice(index), epsilon);
            return res1.slice(0, res1.length - 1).concat(res2);
        } else {
            return [points[0], points[end]];
        }
    }

    _perpendicularDistance(p, p1, p2) {
        let x = p1.x, y = p1.y, dx = p2.x - x, dy = p2.y - y;
        if (dx !== 0 || dy !== 0) {
            let t = ((p.x - x) * dx + (p.y - y) * dy) / (dx * dx + dy * dy);
            if (t > 1) {
                x = p2.x; y = p2.y;
            } else if (t > 0) {
                x += dx * t; y += dy * t;
            }
        }
        dx = p.x - x; dy = p.y - y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    generate() {
        this.generateColliders();
    }

    clone() {
        const newCollider = new TerrenoCollider2D(null);
        newCollider.isTrigger = this.isTrigger;
        newCollider.offset = { ...this.offset };
        newCollider._mode = this._mode;
        newCollider._resolution = this._resolution;
        newCollider._simplifyTolerance = this._simplifyTolerance;
        newCollider.generatedColliders = JSON.parse(JSON.stringify(this.generatedColliders));
        newCollider.generatedPolygons = JSON.parse(JSON.stringify(this.generatedPolygons));
        newCollider.debugPolygons = JSON.parse(JSON.stringify(this.debugPolygons || []));
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
        this.orderInLayer = 0;

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
        newGyzmo.orderInLayer = this.orderInLayer;
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

/**
 * Componente RaycastSource (Rallo): Lanza múltiples rayos para detección.
 */
export class RaycastSource extends Leyes {
    constructor(materia) {
        super(materia);
        this.rays = [{ angle: 0, length: 200 }];
        this.multiHit = false;
        this.showGizmo = true;
        this.autoRotate = false; // Si debe rotar el objeto hacia el primer impacto
        this.rotationSpeed = 5;
        this.lastHits = []; // Resultados del último frame
    }

    update(deltaTime) {
        const scene = this.materia.scene;
        if (!scene || !scene.physicsSystem) return;

        const transform = this.materia.getComponent(Transform);
        if (!transform) return;

        const origin = transform.position;
        const baseRotation = transform.rotation;

        this.lastHits = this.rays.map(ray => {
            const rad = (baseRotation + ray.angle) * Math.PI / 180;
            const direction = { x: Math.cos(rad), y: Math.sin(rad) };
            return scene.physicsSystem.raycast(origin, direction, ray.length);
        });

        // Rotación automática hacia el impacto más cercano si está habilitado
        if (this.autoRotate && (window.isGameRunning || window.CE_Standalone_Scripts)) {
            const firstHit = this.lastHits.find(h => h !== null);
            if (firstHit) {
                const dx = firstHit.point.x - transform.x;
                const dy = firstHit.point.y - transform.y;
                const targetRot = Math.atan2(dy, dx) * 180 / Math.PI;
                transform.rotation += (targetRot - transform.rotation) * (this.rotationSpeed * deltaTime);
            }
        }
    }

    clone() {
        const copy = new RaycastSource(null);
        copy.rays = this.rays.map(r => ({ ...r }));
        copy.multiHit = this.multiHit;
        copy.showGizmo = this.showGizmo;
        return copy;
    }

    // Alias en español
    get rallo() { return this; }
    get rayos() { return this.rays; }
}

/**
 * Componente BasicAI (IA Básica): Comportamientos simples de seguimiento y evasión.
 */
/**
 * Componente Water (Agua): Simulación de fluidos basada en partículas.
 */
export class Water extends Leyes {
    constructor(materia) {
        super(materia);
        this.width = 400;
        this.height = 200;
        this.color = '#3498db'; // Azul por defecto
        this.texturePath = '';
        this.density = 1.0;
        this.viscosity = 0.2;
        this.orderInLayer = 5; // Draw on top of default objects
        this.isDirty = true;
        this.bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };

        // Mareas
        this.showTides = false;
        this.tideAmplitude = 10;
        this.tideSpeed = 1.0;
        this.tidePhase = 0;

        this._initializedWorldSpace = false;

        // Simulación interna
        this.particles = []; // {x, y, vx, vy, prevX, prevY, rho}
        this._particleRadius = 14; // Un poco más grandes para volumen visual
        this._restDensity = 1.2; // Reducido para evitar sobre-compresión
        this._stiffness = 0.15;  // Aumentado para mayor estabilidad y empuje
        this._spacing = 18;      // Mayor espacio inicial
    }

    // --- Spanish Aliases ---
    get ancho() { return this.width; }
    set ancho(v) { this.width = v; this.generateParticles(); }
    get alto() { return this.height; }
    set alto(v) { this.height = v; this.generateParticles(); }
    get densidad() { return this.density; }
    set densidad(v) { this.density = v; }
    get viscosidad() { return this.viscosity; }
    set viscosidad(v) { this.viscosity = v; }
    get mostrarMareas() { return this.showTides; }
    set mostrarMareas(v) { this.showTides = v; }
    get amplitudMarea() { return this.tideAmplitude; }
    set amplitudMarea(v) { this.tideAmplitude = v; }
    get velocidadMarea() { return this.tideSpeed; }
    set velocidadMarea(v) { this.tideSpeed = v; }

    start() {
        this.generateParticles();
    }

    generateParticles() {
        this.particles = [];
        const cols = Math.floor(this.width / this._spacing);
        const rows = Math.floor(this.height / this._spacing);

        const transform = this.materia?.getComponent(Transform);
        const isGame = typeof window !== 'undefined' && (window.isGameRunning || window.CE_Standalone_Scripts);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                let px = (c * this._spacing) - (this.width / 2) + (this._spacing / 2);
                let py = (r * this._spacing) - (this.height / 2) + (this._spacing / 2);

                // Si estamos en juego, spawnear directamente en espacio mundial
                if (isGame && transform) {
                    px += transform.x;
                    py += transform.y;
                    this._initializedWorldSpace = true;
                }

                this.particles.push({
                    x: px,
                    y: py,
                    vx: 0,
                    vy: 0,
                    prevX: px,
                    prevY: py
                });
            }
        }
    }

    update(deltaTime) {
        const isGame = typeof window !== 'undefined' && (window.isGameRunning || window.CE_Standalone_Scripts);

        if (this.particles.length === 0) {
            this.generateParticles();
        }

        if (!isGame) {
            this._updateBounds();
            return;
        }

        if (deltaTime <= 0) return;

        const transform = this.materia.getComponent(Transform);
        if (!transform) return;

        const scene = this.materia.scene;
        const rbWater = this.materia.getComponent(Rigidbody2D);

        // --- 1. Inicialización de Partículas en Espacio Mundial (si es la primera vez) ---
        if (this.particles.length > 0 && !this._initializedWorldSpace) {
            for (const p of this.particles) {
                p.x += transform.x;
                p.y += transform.y;
            }
            this._initializedWorldSpace = true;
        }

        // --- 2. Mareas ---
        let tideOffset = 0;
        if (this.showTides) {
            this.tidePhase += deltaTime * this.tideSpeed;
            tideOffset = Math.sin(this.tidePhase) * this.tideAmplitude;
        }

        // --- 3. Obtener Colisionadores del Mundo (Optimizado: con filtrado por cercanía) ---
        const colliders = [];
        const dynamicBodies = [];
        if (scene) {
            const materias = scene.getAllMaterias();
            const waterBounds = this.bounds;
            const margin = 500; // Aumentado para mayor seguridad con objetos grandes

            for (let i = 0; i < materias.length; i++) {
                const m = materias[i];
                if (!m.isActive || m === this.materia || m.tag.includes('NoWater')) continue;

                const trans = m.getComponent(Transform);
                if (!trans) continue;

                // Culling: solo considerar colisionadores cerca de la masa de agua
                if (trans.x < waterBounds.minX - margin || trans.x > waterBounds.maxX + margin ||
                    trans.y < waterBounds.minY - margin || trans.y > waterBounds.maxY + margin) {
                    if (!(m.getComponentByName('TilemapCollider2D'))) continue;
                }

                const col = m.getComponentByName('BoxCollider2D') || m.getComponentByName('CapsuleCollider2D') || m.getComponentByName('PolygonCollider2D') || m.getComponentByName('TilemapCollider2D');
                if (col) {
                    const rb = m.getComponentByName('Rigidbody2D');
                    const colData = { col, trans, rb };
                    colliders.push(colData);
                    if (rb && rb.bodyType === 'Dynamic') dynamicBodies.push(colData);
                }
            }
        }

        const gravityY = 9.8 * 100;
        const h = this._spacing * 1.5;
        const hSq = h * h;
        const invH = 1 / h;

        // --- 4. Simulación de Partículas (Pre-paso) ---
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];

            // Gravedad y Viscosidad Global
            p.vx *= (1 - this.viscosity * deltaTime);
            p.vy *= (1 - this.viscosity * deltaTime);
            p.vy += gravityY * deltaTime;

            // Interacción con Objetos Dinámicos
            for (let j = 0; j < dynamicBodies.length; j++) {
                const {trans, rb} = dynamicBodies[j];
                const dx = p.x - trans.x;
                const dy = p.y - trans.y;
                const dSq = dx * dx + dy * dy;
                const pushRadius = 60;
                if (dSq < pushRadius * pushRadius) {
                    const dist = Math.sqrt(dSq);
                    const pushForce = (1 - dist / pushRadius) * 400;
                    const invDist = 1 / (dist || 1);
                    p.vx += (dx * invDist) * pushForce * deltaTime;
                    p.vy += (dy * invDist) * pushForce * deltaTime;
                    p.vx += rb.velocity.x * 20 * deltaTime;
                    p.vy += rb.velocity.y * 20 * deltaTime;
                }
            }

            p.prevX = p.x;
            p.prevY = p.y;
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;

            // --- 4.1 Colisión con el Mundo (Suelo y Paredes) ---
            for (let j = 0; j < colliders.length; j++) {
                const {col, trans} = colliders[j];
                const colType = col.constructor.name;
                if (colType === 'BoxCollider2D') {
                    this._resolveParticleVsRect(p, trans.x, trans.y, col.size.x * trans.scale.x, col.size.y * trans.scale.y);
                } else if (colType === 'TilemapCollider2D') {
                    for (let r = 0; r < col.generatedColliders.length; r++) {
                        const rect = col.generatedColliders[r];
                        this._resolveParticleVsRect(p, trans.x + rect.x, trans.y + rect.y, rect.width, rect.height);
                    }
                }
            }
        }

        // --- 5. Spatial Grid (Optimizado para evitar Garbage Collection) ---
        this._updateBounds();
        const { minX, minY } = this.bounds;

        if (!this._spatialGrid) this._spatialGrid = new Map();
        else this._spatialGrid.clear();

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            const gx = Math.floor((p.x - minX) * invH);
            const gy = Math.floor((p.y - minY) * invH);
            const key = (gx & 0xFFFF) | ((gy & 0xFFFF) << 16); // Integer key is much faster than string

            let cell = this._spatialGrid.get(key);
            if (!cell) {
                cell = [];
                this._spatialGrid.set(key, cell);
            }
            cell.push(i);
        }

        // --- 6. Resolución de Densidad (Paso 1: Calcular Densidades) ---
        for (let i = 0; i < this.particles.length; i++) {
            const pi = this.particles[i];
            pi.rho = 0;
            const gx = Math.floor((pi.x - minX) * invH);
            const gy = Math.floor((pi.y - minY) * invH);

            for (let ox = -1; ox <= 1; ox++) {
                for (let oy = -1; oy <= 1; oy++) {
                    const key = ((gx + ox) & 0xFFFF) | (((gy + oy) & 0xFFFF) << 16);
                    const cell = this._spatialGrid.get(key);
                    if (!cell) continue;
                    for (let cIdx = 0; cIdx < cell.length; cIdx++) {
                        const j = cell[cIdx];
                        const pj = this.particles[j];
                        const dx = pi.x - pj.x;
                        const dy = pi.y - pj.y;
                        const dSq = dx * dx + dy * dy;
                        if (dSq < hSq) {
                            const weight = 1 - Math.sqrt(dSq) * invH;
                            pi.rho += weight * weight;
                        }
                    }
                }
            }
        }

        // --- 6.1 Resolución de Presión (Paso 2: Aplicar Desplazamientos) ---
        for (let i = 0; i < this.particles.length; i++) {
            const pi = this.particles[i];
            const pressure = (pi.rho - this._restDensity) * this._stiffness;
            if (pressure <= 0) continue;

            const gx = Math.floor((pi.x - minX) * invH);
            const gy = Math.floor((pi.y - minY) * invH);

            for (let ox = -1; ox <= 1; ox++) {
                for (let oy = -1; oy <= 1; oy++) {
                    const key = ((gx + ox) & 0xFFFF) | (((gy + oy) & 0xFFFF) << 16);
                    const cell = this._spatialGrid.get(key);
                    if (!cell) continue;
                    for (let cIdx = 0; cIdx < cell.length; cIdx++) {
                        const j = cell[cIdx];
                        if (i === j) continue;
                        const pj = this.particles[j];
                        const dx = pi.x - pj.x;
                        const dy = pi.y - pj.y;
                        const dSq = dx * dx + dy * dy;
                        if (dSq < hSq && dSq > 0.0001) {
                            const dist = Math.sqrt(dSq);
                            const weight = 1 - dist * invH;
                            // Presión compartida para estabilidad
                            const sharedPressure = (pressure + (pj.rho - this._restDensity) * this._stiffness) / 2;
                            const displacement = sharedPressure * weight * (0.5 / dist);
                            pi.x += dx * displacement;
                            pi.y += dy * displacement;
                            pj.x -= dx * displacement;
                            pj.y -= dy * displacement;
                        }
                    }
                }
            }
        }

        // --- 6.2 Mareas (Solo superficie) ---
        if (this.showTides) {
            for (let i = 0; i < this.particles.length; i++) {
                const pi = this.particles[i];
                if (pi.rho < this._restDensity * 0.8) {
                    const depthFactor = Math.max(0, 1 - (pi.y - this.bounds.minY) / 100);
                    pi.y += tideOffset * depthFactor * 0.5;
                }
            }
        }

        // --- 7. Recálculo de Velocidad y Limpieza ---
        const invDt = 1 / deltaTime;
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.vx = (p.x - p.prevX) * invDt;
            p.vy = (p.y - p.prevY) * invDt;
        }
    }

    _updateBounds() {
        const h = this._spacing * 1.5;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        if (this.particles.length === 0) {
            minX = minY = maxX = maxY = 0;
        } else {
            for (let i = 0; i < this.particles.length; i++) {
                const p = this.particles[i];
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            }
        }

        this.bounds = {
            minX: minX - h,
            minY: minY - h,
            maxX: maxX + h,
            maxY: maxY + h
        };
    }

    _resolveParticleVsRect(p, cx, cy, w, h) {
        const hw = w / 2;
        const hh = h / 2;
        if (p.x > cx - hw && p.x < cx + hw && p.y > cy - hh && p.y < cy + hh) {
            const overlapTop = p.y - (cy - hh);
            const overlapBottom = (cy + hh) - p.y;
            const overlapLeft = p.x - (cx - hw);
            const overlapRight = (cx + hw) - p.x;
            const minOverlap = Math.min(overlapTop, overlapBottom, overlapLeft, overlapRight);

            if (minOverlap === overlapTop) { p.y = cy - hh; p.vy *= -0.1; }
            else if (minOverlap === overlapBottom) { p.y = cy + hh; p.vy *= -0.1; }
            else if (minOverlap === overlapLeft) { p.x = cx - hw; p.vx *= -0.1; }
            else if (minOverlap === overlapRight) { p.x = cx + hw; p.vx *= -0.1; }
        }
    }

    clone() {
        const copy = new Water(null);
        copy.width = this.width;
        copy.height = this.height;
        copy.color = this.color;
        copy.texturePath = this.texturePath;
        copy.density = this.density;
        copy.viscosity = this.viscosity;
        copy.showTides = this.showTides;
        copy.tideAmplitude = this.tideAmplitude;
        copy.tideSpeed = this.tideSpeed;
        return copy;
    }
}

/**
 * LineCollider2D: Colisionador compuesto por múltiples líneas (cadenas).
 */
export class LineCollider2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.points = [{x: -50, y: 0}, {x: 50, y: 0}];
        this.isTrigger = false;
        this.offset = { x: 0, y: 0 };
    }

    clone() {
        const copy = new LineCollider2D(null);
        copy.points = this.points.map(p => ({...p}));
        copy.isTrigger = this.isTrigger;
        copy.offset = {...this.offset};
        return copy;
    }
}

export class BasicAI extends Leyes {
    constructor(materia) {
        super(materia);
        this.target = null; // ID de la materia objetivo
        this.behavior = 'Follow'; // 'Follow', 'Escape', 'Wander'
        this.movementType = 'Top-Down'; // 'Top-Down' or 'Platformer'
        this.speed = 100;
        this.autoRotate = true;
        this.rotationSpeed = 0.1;
        this.obstacleAvoidance = true;
        this.detectionTags = ['Player'];
        this.detectionDistance = 400;
        this.scriptTarget = null; // Materia con el script a ejecutar
        this.functionName = ''; // Nombre de la función

        this._wanderAngle = Math.random() * 360;
        this._wanderTimer = 0;
        this._velocity = { x: 0, y: 0 };
    }

    update(deltaTime) {
        if (typeof window !== 'undefined' && !window.isGameRunning && !window.CE_Standalone_Scripts) return;

        const scene = this.materia.scene;
        if (!scene) return;

        const transform = this.materia.getComponent(Transform);
        if (!transform) return;

        let targetObj = null;
        if (typeof this.target === 'number') {
            targetObj = scene.findMateriaById(this.target);
        } else if (this.target instanceof Materia) {
            targetObj = this.target;
        }

        // --- 1. Detección y ejecución de funciones ---
        this._handleDetection(scene, transform);

        // --- 2. Lógica de movimiento ---
        let desiredVelocity = { x: 0, y: 0 };

        if (this.behavior === 'Follow' && targetObj) {
            const dx = targetObj.getComponent(Transform).x - transform.x;
            const dy = (this.movementType === 'Platformer') ? 0 : (targetObj.getComponent(Transform).y - transform.y);
            const dist = Math.hypot(dx, dy);
            if (dist > 10) {
                desiredVelocity = { x: (dx / dist) * this.speed, y: (dy / dist) * this.speed };
            }
        } else if (this.behavior === 'Escape' && targetObj) {
            const dx = transform.x - targetObj.getComponent(Transform).x;
            const dy = (this.movementType === 'Platformer') ? 0 : (transform.y - targetObj.getComponent(Transform).y);
            const dist = Math.hypot(dx, dy);
            if (dist < 500) {
                desiredVelocity = { x: (dx / dist) * this.speed, y: (dy / dist) * this.speed };
            }
        } else if (this.behavior === 'Wander') {
            this._wanderTimer -= deltaTime;
            if (this._wanderTimer <= 0) {
                this._wanderAngle += (Math.random() - 0.5) * 90;
                this._wanderTimer = 1 + Math.random() * 2;
            }
            const rad = this._wanderAngle * Math.PI / 180;
            desiredVelocity = { x: Math.cos(rad) * this.speed, y: Math.sin(rad) * this.speed };
        }

        // --- 3. Esquivar obstáculos y decisiones por Raycast ---
        const raySource = this.materia.getComponent(RaycastSource);
        if (raySource && raySource.lastHits) {
            raySource.lastHits.forEach((hit, idx) => {
                if (hit) {
                    // Evitación de obstáculos
                    if (this.obstacleAvoidance && hit.distance < 100) {
                        desiredVelocity.x += hit.normal.x * this.speed * 2;
                        desiredVelocity.y += hit.normal.y * this.speed * 2;
                    }

                    // Cambio de comportamiento dinámico según tags detectados por rayos
                    if (this.detectionTags.includes(hit.materia.tag)) {
                        if (hit.distance < 150) {
                            // Si está muy cerca de algo que detecta, prioriza escapar o atacar
                            if (this.behavior === 'Wander') this.behavior = 'Escape';
                        }
                    }
                }
            });
        }

        // --- 4. Aplicar movimiento ---
        const rb = this.materia.getComponent(Rigidbody2D);
        if (rb && rb.bodyType === 'Dynamic') {
            rb.velocity.x = desiredVelocity.x / 100;
            // En modo Plataformas, no sobreescribimos la velocidad Y para dejar que la gravedad actúe
            if (this.movementType !== 'Platformer') {
                rb.velocity.y = desiredVelocity.y / 100;
            }
        } else {
            transform.x += desiredVelocity.x * deltaTime;
            if (this.movementType !== 'Platformer') {
                transform.y += desiredVelocity.y * deltaTime;
            }
        }

        // --- 5. Rotación automática ---
        if (this.autoRotate) {
            if (Math.hypot(desiredVelocity.x, desiredVelocity.y) > 1) {
                const targetRot = Math.atan2(desiredVelocity.y, desiredVelocity.x) * 180 / Math.PI;
                transform.rotation += (targetRot - transform.rotation) * this.rotationSpeed;
            }
        }
    }

    _handleDetection(scene, transform) {
        if (!this.functionName) return;

        let scriptTargetObj = null;
        if (typeof this.scriptTarget === 'number') {
            scriptTargetObj = scene.findMateriaById(this.scriptTarget);
        } else if (this.scriptTarget instanceof Materia) {
            scriptTargetObj = this.scriptTarget;
        }
        if (!scriptTargetObj) return;

        // Comprobar si algún objeto con los tags de detección está cerca
        const raySource = this.materia.getComponent(RaycastSource);
        let detected = false;

        if (raySource && raySource.lastHits) {
            detected = raySource.lastHits.some(hit => hit && this.detectionTags.includes(hit.materia.tag));
        }

        if (!detected) {
            // Detección por proximidad simple como fallback o complemento
            const materias = scene.getAllMaterias();
            for (const m of materias) {
                if (this.detectionTags.includes(m.tag)) {
                    const mTrans = m.getComponent(Transform);
                    if (mTrans) {
                        const dist = Math.hypot(mTrans.x - transform.x, mTrans.y - transform.y);
                        if (dist < this.detectionDistance) {
                            detected = true;
                            break;
                        }
                    }
                }
            }
        }

        if (detected) {
            // Ejecutar función en los scripts del objetivo
            scriptTargetObj.getComponents(CreativeScript).forEach(script => {
                if (script.instance && typeof script.instance[this.functionName] === 'function') {
                    script._safeInvoke(this.functionName, this.materia);
                }
            });
        }
    }

    clone() {
        const copy = new BasicAI(null);
        copy.target = this.target;
        copy.behavior = this.behavior;
        copy.movementType = this.movementType;
        copy.speed = this.speed;
        copy.autoRotate = this.autoRotate;
        copy.rotationSpeed = this.rotationSpeed;
        copy.obstacleAvoidance = this.obstacleAvoidance;
        copy.detectionTags = [...this.detectionTags];
        copy.detectionDistance = this.detectionDistance;
        copy.scriptTarget = this.scriptTarget;
        copy.functionName = this.functionName;
        return copy;
    }
}

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

export class VerticalLayoutGroup extends Leyes {
    constructor(materia) {
        super(materia);
        this.padding = { left: 0, right: 0, top: 0, bottom: 0 };
        this.spacing = 5;
    }

    update() {
        if (!this.isActive) return;
        const uiTransform = this.materia.getComponent(UITransform);
        const canvas = this.materia.getComponent(Canvas);
        if (!uiTransform && !canvas) return;

        let nextY = this.padding.top;
        for (const child of this.materia.children) {
            if (!child.isActive) continue;
            const childUI = child.getComponent(UITransform);
            if (childUI) {
                childUI.anchorPoint = 1; // Top Center
                childUI.position.x = 0;
                childUI.position.y = nextY + (childUI.size.height / 2);
                nextY += childUI.size.height + this.spacing;
            }
        }
    }

    clone() {
        const c = new VerticalLayoutGroup(null);
        c.padding = { ...this.padding };
        c.spacing = this.spacing;
        return c;
    }
}

export class HorizontalLayoutGroup extends Leyes {
    constructor(materia) {
        super(materia);
        this.padding = { left: 0, right: 0, top: 0, bottom: 0 };
        this.spacing = 5;
    }

    update() {
        if (!this.isActive) return;
        const uiTransform = this.materia.getComponent(UITransform);
        const canvas = this.materia.getComponent(Canvas);
        if (!uiTransform && !canvas) return;

        let nextX = this.padding.left;
        for (const child of this.materia.children) {
            if (!child.isActive) continue;
            const childUI = child.getComponent(UITransform);
            if (childUI) {
                childUI.anchorPoint = 3; // Middle Left
                childUI.position.x = nextX + (childUI.size.width / 2);
                childUI.position.y = 0;
                nextX += childUI.size.width + this.spacing;
            }
        }
    }

    clone() {
        const c = new HorizontalLayoutGroup(null);
        c.padding = { ...this.padding };
        c.spacing = this.spacing;
        return c;
    }
}

export class GridLayoutGroup extends Leyes {
    constructor(materia) {
        super(materia);
        this.padding = { left: 0, right: 0, top: 0, bottom: 0 };
        this.spacing = { x: 5, y: 5 };
        this.cellSize = { width: 50, height: 50 };
    }

    update() {
        if (!this.isActive) return;
        const uiTransform = this.materia.getComponent(UITransform);
        const canvas = this.materia.getComponent(Canvas);
        if (!uiTransform && !canvas) return;

        const parentWidth = uiTransform ? uiTransform.size.width : (canvas.referenceResolution?.width || 800);

        let nextX = this.padding.left;
        let nextY = this.padding.top;
        for (const child of this.materia.children) {
            if (!child.isActive) continue;
            const childUI = child.getComponent(UITransform);
            if (childUI) {
                childUI.anchorPoint = 0; // Top Left
                childUI.size = { ...this.cellSize };
                childUI.position.x = nextX + (childUI.size.width / 2);
                childUI.position.y = nextY + (childUI.size.height / 2);

                nextX += this.cellSize.width + this.spacing.x;
                if (nextX + this.cellSize.width > parentWidth - this.padding.right) {
                    nextX = this.padding.left;
                    nextY += this.cellSize.height + this.spacing.y;
                }
            }
        }
    }

    clone() {
        const c = new GridLayoutGroup(null);
        c.padding = { ...this.padding };
        c.spacing = { ...this.spacing };
        c.cellSize = { ...this.cellSize };
        return c;
    }
}

export class ContentSizeFitter extends Leyes {
    constructor(materia) {
        super(materia);
        this.horizontalFit = 'Unconstrained'; // 'Unconstrained', 'Preferred Size'
        this.verticalFit = 'Unconstrained';
    }

    update() {
        if (!this.isActive) return;
        const uiTransform = this.materia.getComponent(UITransform);
        if (!uiTransform) return;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        let hasChildren = false;

        for (const child of this.materia.children) {
            if (!child.isActive) continue;
            const childUI = child.getComponent(UITransform);
            if (childUI) {
                const halfW = childUI.size.width / 2;
                const halfH = childUI.size.height / 2;
                minX = Math.min(minX, childUI.position.x - halfW);
                maxX = Math.max(maxX, childUI.position.x + halfW);
                minY = Math.min(minY, childUI.position.y - halfH);
                maxY = Math.max(maxY, childUI.position.y + halfH);
                hasChildren = true;
            }
        }

        if (hasChildren) {
            if (this.horizontalFit === 'Preferred Size') {
                uiTransform.size.width = maxX - minX;
            }
            if (this.verticalFit === 'Preferred Size') {
                uiTransform.size.height = maxY - minY;
            }
        }
    }

    clone() {
        const c = new ContentSizeFitter(null);
        c.horizontalFit = this.horizontalFit;
        c.verticalFit = this.verticalFit;
        return c;
    }
}
registerComponent('ProjectileLauncher', ProjectileLauncher);
registerComponent('AutoDestroy', AutoDestroy);
registerComponent('Health', Health);
registerComponent('Patrol', Patrol);
registerComponent('ParticleSystem', ParticleSystem);
registerComponent('RaycastSource', RaycastSource);
registerComponent('BasicAI', BasicAI);
registerComponent('Water', Water);
registerComponent('LineCollider2D', LineCollider2D);
registerComponent('VerticalLayoutGroup', VerticalLayoutGroup);
registerComponent('HorizontalLayoutGroup', HorizontalLayoutGroup);
registerComponent('GridLayoutGroup', GridLayoutGroup);
registerComponent('ContentSizeFitter', ContentSizeFitter);
