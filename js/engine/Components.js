// Components.js
// This file contains all the component classes.

import { Leyes } from './Leyes.js';
import { Materia } from './Materia.js';
import { registerComponent } from './ComponentRegistry.js';
import { getURLForAssetPath, getFileHandleForPath, recordFetch } from './AssetUtils.js';
import { InputManager } from './Input.js';
import * as RuntimeAPIManager from './RuntimeAPIManager.js';
import * as PerformanceAPI from './PerformanceAPI.js';
import { bus as MessageBus } from './Messaging.js';
import * as MathUtils from './MathUtils.js';

// Import gl-matrix for 3D transformations
import * as glMatrix from 'gl-matrix';
const { mat4, vec3, quat, vec4 } = glMatrix;

let editorLogic = null;

export function setEditorLogic(logic) {
    editorLogic = logic;
}

// --- Bilingual Component Aliases ---
const componentAliases = {
    'Transform': ['posicion', 'transformacion'],
    'Rigidbody2D': 'fisica',
    'AnimatorController': ['controladorAnimacion', 'controlador'],
    'SpriteRenderer': 'renderizadorDeSprite',
    'AudioSource': 'fuenteDeAudio',
    'BoxCollider2D': 'colisionadorCaja2D',
    'CapsuleCollider2D': 'colisionadorCapsula2D',
    'CircleCollider2D': 'colisionadorCirculo2D',
    'Camera': 'camara',
    'Animator': ['animador', 'animacion'],
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
    'UIImage': 'imagen',
    'UITransform': 'posicionUI',
    'UIText': 'textoUI',
    'Button': 'boton',
    'UIEventTrigger': 'disparadorDeEventosUI',
    'CustomComponent': 'componentePersonalizado',
    'Parallax': 'parallax',
    'LateralMovement': 'movimientoLateral',
    'TopDownMovement': 'movimientoSuperior',
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
    'Suspension': 'suspension',
    'VehicleTopDown': 'controladorVehiculoTopDown',
    'PlaneController': 'controladorDeAvion',
    'HelicopterController': 'controladorDeHelicoptero',
    'Bone': 'hueso',
    'SkeletonRenderer': 'renderizadorDeEsqueleto',
    'IKManager2D': 'gestorIK2D',
    'Attack': 'ataque',
    'ProgressBar': 'barraDeProgreso',
    'SceneLoader': 'cargarEscena',
    'PlatformEffector2D': 'efectorPlataforma2D',
    'Rigidbody3D': 'fisica3D',
    'BoxCollider3D': 'colisionadorCaja3D',
    'SphereCollider3D': 'colisionadorEsfera3D',
    'MeshRenderer3D': 'renderizadorDeMalla3D',
    'SkinnedMeshRenderer3D': 'renderizadorDeMallaConHuesos3D',
    'Animator3D': 'animador3D',
    'HumanoidPhysics3D': 'fisicaHumanoide3D',
    'MovementControl3D': 'controlMovimiento3D',
    'HealthController3D': 'controladorSalud3D',
    'ThirdPersonController3D': 'controladorTerceraPersona3D',
    'CameraControl3D': 'controlCamara3D',
    'DeformableMesh3D': 'mallaDeformable3D',
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
            // Use 'in' to avoid overwriting existing getters on the prototype (like transform, fisica, etc.)
            if (!(shortcutName in this)) {
                this[shortcutName] = component;
            }

            // Create the Spanish alias if it exists in the map
            const aliases = componentAliases[componentName];
            if (aliases) {
                const aliasList = Array.isArray(aliases) ? aliases : [aliases];
                for (const alias of aliasList) {
                    if (!(alias in this)) {
                        this[alias] = component;
                    }
                }
            }

            if (componentName === 'UITransform') {
                if (!this.hasOwnProperty('transformacionUI')) {
                    this['transformacionUI'] = component;
                }
                if (!this.hasOwnProperty('posicionUI')) {
                    this['posicionUI'] = component;
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
    onLowPerformance(level) { /* To be overridden by user scripts */ }
    alBajoRendimiento(nivel) { /* To be overridden by user scripts */ }

    /**
     * Pausa la ejecución del script por una cantidad determinada de segundos.
     * Solo funciona dentro de métodos marcados como 'async' (todos los métodos .ces lo son por defecto).
     * @param {number} segundos - Tiempo a esperar en segundos.
     */
    async esperar(segundos) {
        return new Promise(resolve => setTimeout(resolve, segundos * 1000));
    }
    async wait(segundos) { return await this.esperar(segundos); }
    async esperarPT(segundos) { return await this.esperar(segundos); }
    async ждать(segundos) { return await this.esperar(segundos); }
    async 等待(segundos) { return await this.esperar(segundos); }

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
        return this.materia && this.materia.tieneTag(tag);
    }
    hasTag(tag) { return this.tieneTag(tag); }

    danar(materia, cantidad) {
        if (!materia) return;
        const health = materia.getComponent(window.Components.Health);
        if (health) health.damage(cantidad);
    }
    damage(materia, cantidad) { this.danar(materia, cantidad); }

    curar(materia, cantidad) {
        if (!materia) return;
        const health = materia.getComponent(window.Components.Health);
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

    /** Alias Multilingües */
    get tiempoDelta() { return this.deltaTime; }
    get tempoDelta() { return this.deltaTime; }
    get дельтаВремя() { return this.deltaTime; }
    get 增量时间() { return this.deltaTime; }

    get estaActivado() { return this.materia ? this.materia.isActive : false; }
    set estaActivado(v) { if (this.materia) this.materia.isActive = v; }
    get activo() { return this.estaActivado; }
    set activo(v) { this.estaActivado = v; }

    get nombre() { return this.materia ? this.materia.name : ''; }
    set nombre(v) { if (this.materia) this.materia.name = v; }
    get nome() { return this.nombre; }
    set nome(v) { this.nombre = v; }
    get имя() { return this.nombre; }
    set имя(v) { this.nombre = v; }
    get 名称() { return this.nombre; }
    set 名称(v) { this.nombre = v; }

    get tag() { return this.materia ? this.materia.tag : ''; }
    set tag(v) { if (this.materia) this.materia.tag = v; }
    get etiqueta() { return this.tag; }
    set etiqueta(v) { this.tag = v; }
    get тег() { return this.tag; }
    set тег(v) { this.tag = v; }
    get 标签() { return this.tag; }
    set 标签(v) { this.tag = v; }

    get voltearH() { return this.transform ? this.transform.flipX : false; }
    set voltearH(v) { if (this.transform) this.transform.flipX = v; }
    get voltearV() { return this.transform ? this.transform.flipY : false; }
    set voltearV(v) { if (this.transform) this.transform.flipY = v; }
    get flipX() { return this.voltearH; }
    set flipX(v) { this.voltearH = v; }
    get flipY() { return this.voltearV; }
    set flipY(v) { this.voltearV = v; }

    // --- Direct Transform Access ---
    get x() { return this.transform ? this.transform.x : 0; }
    set x(v) { if (this.transform) this.transform.x = v; }
    get y() { return this.transform ? this.transform.y : 0; }
    set y(v) { if (this.transform) this.transform.y = v; }
    get rotacion() { return this.transform ? this.transform.rotation : 0; }
    set rotacion(v) { if (this.transform) this.transform.rotation = v; }
    get rotation() { return this.rotacion; }
    set rotation(v) { this.rotacion = v; }
    get rotacao() { return this.rotacion; }
    set rotacao(v) { this.rotacion = v; }
    get вращение() { return this.rotacion; }
    set вращение(v) { this.rotacion = v; }
    get 旋转() { return this.rotacion; }
    set 旋转(v) { this.rotacion = v; }

    get escala() { return this.transform ? this.transform.scale : { x: 1, y: 1 }; }
    set escala(v) { if (this.transform) this.transform.scale = v; }
    get scale() { return this.escala; }
    set scale(v) { this.escala = v; }
    get масштаб() { return this.escala; }
    set масштаб(v) { this.escala = v; }
    get 缩放() { return this.escala; }
    set 缩放(v) { this.escala = v; }

    // --- Transform Proxy Methods ---
    mover(x, y) { if (this.transform) { if (typeof x === 'object') { this.transform.x += x.x || 0; this.transform.y += x.y || 0; } else { this.transform.x += x; this.transform.y += (y || 0); } } }
    rotar(deg) { if (this.transform) this.transform.rotation += deg; }
    escalar(x, y) { if (this.transform) { if (typeof x === 'object') { this.transform.scale.x *= x.x; this.transform.scale.y *= x.y; } else { this.transform.scale.x *= x; this.transform.scale.y *= (y === undefined ? x : y); } } }

    // English Aliases
    move(x, y) { this.mover(x, y); }
    moverPT(x, y) { this.mover(x, y); }
    переместить(x, y) { this.mover(x, y); }
    移动(x, y) { this.mover(x, y); }

    rotate(deg) { this.rotar(deg); }
    rotarPT(deg) { this.rotar(deg); }
    вращать(deg) { this.rotar(deg); }
    旋转(deg) { this.rotar(deg); }

    scale(x, y) { this.escalar(x, y); }
    escalarPT(x, y) { this.escalar(x, y); }
    масштабировать(x, y) { this.escalar(x, y); }
    缩放(x, y) { this.escalar(x, y); }

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

    /**
     * @private
     * Regresa un Proxy de seguridad que lanza un error descriptivo si se intenta acceder a un componente que no existe.
     */
    _missingComponentProxy(name, technicalName) {
        const handler = {
            get: (target, prop) => {
                throw new Error(`Intentaste usar '${name}', pero el componente '${technicalName}' no está añadido a este objeto en el Inspector.`);
            },
            set: (target, prop, value) => {
                throw new Error(`No puedes asignar '${prop}' en '${name}' porque el componente '${technicalName}' no existe en este objeto.`);
            },
            apply: (target, thisArg, args) => {
                throw new Error(`Intentaste llamar a '${name}' como función, pero el componente '${technicalName}' no existe.`);
            }
        };
        // We use a dummy function so it's also "callable" for proxies that might be used as functions
        return new Proxy(() => {}, handler);
    }

    // --- Common Component Shortcuts (Robust) ---
    get transform() { return this.obtenerComponente('Transform') || this._missingComponentProxy('posicion', 'Transform'); }
    get transformacion() { return this.transform; }
    get posicion() { return this.transform; }

    get fisica() { return this.obtenerComponente('Rigidbody2D') || this._missingComponentProxy('fisica', 'Rigidbody2D'); }
    get rigidbody2D() { return this.fisica; }

    get fisica3D() { return this.obtenerComponente('Rigidbody3D') || this._missingComponentProxy('fisica3D', 'Rigidbody3D'); }
    get rigidbody3D() { return this.fisica3D; }

    get animacion3D() { return this.obtenerComponente('Animator3D') || this._missingComponentProxy('animacion3D', 'Animator3D'); }
    get animador3D() { return this.animacion3D; }
    get animator3D() { return this.animacion3D; }

    get fisicaHumanoide3D() { return this.obtenerComponente('HumanoidPhysics3D') || this._missingComponentProxy('fisicaHumanoide3D', 'HumanoidPhysics3D'); }
    get humanoidPhysics3D() { return this.fisicaHumanoide3D; }

    get controlMovimiento3D() { return this.obtenerComponente('MovementControl3D') || this._missingComponentProxy('controlMovimiento3D', 'MovementControl3D'); }
    get movementControl3D() { return this.controlMovimiento3D; }

    get controladorSalud3D() { return this.obtenerComponente('HealthController3D') || this._missingComponentProxy('controladorSalud3D', 'HealthController3D'); }
    get healthController3D() { return this.controladorSalud3D; }

    get controladorTerceraPersona3D() { return this.obtenerComponente('ThirdPersonController3D') || this._missingComponentProxy('controladorTerceraPersona3D', 'ThirdPersonController3D'); }
    get thirdPersonController3D() { return this.controladorTerceraPersona3D; }

    get controlCamara3D() { return this.obtenerComponente('CameraControl3D') || this._missingComponentProxy('controlCamara3D', 'CameraControl3D'); }
    get cameraControl3D() { return this.controlCamara3D; }

    get mallaDeformable3D() { return this.obtenerComponente('DeformableMesh3D') || this._missingComponentProxy('mallaDeformable3D', 'DeformableMesh3D'); }
    get deformableMesh3D() { return this.mallaDeformable3D; }

    get vida() { return this.obtenerComponente('Health') || this._missingComponentProxy('vida', 'Health'); }
    get salud() { return this.vida; }
    get health() { return this.vida; }

    get animacion() { return this.obtenerComponente('Animator') || this._missingComponentProxy('animador', 'Animator'); }
    get animador() { return this.animacion; }
    get animator() { return this.animacion; }

    get controlador() { return this.obtenerComponente('AnimatorController') || this._missingComponentProxy('controlador', 'AnimatorController'); }
    get controladorAnimacion() { return this.controlador; }
    get animatorController() { return this.controlador; }

    get ataque() { return this.obtenerComponente('Attack') || this._missingComponentProxy('ataque', 'Attack'); }
    get attack() { return this.ataque; }

    get barra() { return this.obtenerComponente('ProgressBar') || this._missingComponentProxy('barra', 'ProgressBar'); }
    get uiBarra() { return this.barra; }
    get progressBar() { return this.barra; }

    get cargadorDeEscena() { return this.obtenerComponente('SceneLoader') || this._missingComponentProxy('cargadorDeEscena', 'SceneLoader'); }
    get sceneLoader() { return this.cargadorDeEscena; }

    get video() { return this.obtenerComponente('VideoPlayer') || this._missingComponentProxy('video', 'VideoPlayer'); }
    get pelicula() { return this.video; }

    get agua() { return this.obtenerComponente('Water') || this._missingComponentProxy('agua', 'Water'); }
    get water() { return this.agua; }

    get texto() { return this.obtenerComponente('UIText') || this._missingComponentProxy('texto', 'UIText'); }
    get boton() { return this.obtenerComponente('Button') || this._missingComponentProxy('boton', 'Button'); }
    get imagen() { return this.obtenerComponente('UIImage') || this._missingComponentProxy('imagen', 'UIImage'); }
    get lienzo() { return this.obtenerComponente('Canvas') || this._missingComponentProxy('lienzo', 'Canvas'); }

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
        const activeScript = window._currentlyExecutingScript;
        if (activeScript && window.ScriptMonitor && window.ScriptMonitor.onObjectDestroyed) {
            window.ScriptMonitor.onObjectDestroyed(activeScript);
        }
        const scene = materia.scene || (this.materia ? this.materia.scene : null);
        if (scene) {
            scene.removeMateria(materia.id);
        }
    }

    /**
     * Crea una copia de una Materia (objeto) existente y la añade a la escena actual.
     */
    instanciar(original, x, y) {
        const activeScript = window._currentlyExecutingScript;
        if (activeScript && window.ScriptMonitor && window.ScriptMonitor.onObjectInstantiated) {
            window.ScriptMonitor.onObjectInstantiated(activeScript);
        }
        // We import it dynamically or just use the global/RuntimeManager if available.
        // But the easiest is to just use what's already imported in this file if we add it.
        // Actually, SceneManager is not imported here.
        // Let's use the global one which is usually available or inject it.
        if (window.SceneManager && window.SceneManager.instanciar) {
            return window.SceneManager.instanciar(original, x, y);
        }
        return null;
    }

    // --- Multilingual Aliases ---

    // Scripts & Components
    getScript(name) { return this.obtenerScript(name); }
    obterScript(name) { return this.obtenerScript(name); }
    получитьСкрипт(name) { return this.obtenerScript(name); }
    获取脚本(name) { return this.obtenerScript(name); }

    getComponent(type) { return this.obtenerComponente(type); }
    obterComponente(type) { return this.obtenerComponente(type); }
    получитьКомпонент(type) { return this.obtenerComponente(type); }
    获取组件(type) { return this.obtenerComponente(type); }

    getComponentInParent(type) { return this.obtenerComponenteEnPadre(type); }
    obterComponenteNoPai(type) { return this.obtenerComponenteEnPadre(type); }
    получитьКомпонентВРодителе(type) { return this.obtenerComponenteEnPadre(type); }
    在父级中获取组件(type) { return this.obtenerComponenteEnPadre(type); }

    getComponentInChildren(type) { return this.obtenerComponenteEnHijos(type); }
    obterComponenteNosFilhos(type) { return this.obtenerComponenteEnHijos(type); }
    получитьКомпонентВДочерних(type) { return this.obtenerComponenteEnHijos(type); }
    在子级中获取组件(type) { return this.obtenerComponenteEnHijos(type); }

    // Lifecycle & Creation
    destroy(materia) { this.destruir(materia); }
    destruirPT(materia) { this.destruir(materia); }
    уничтожить(materia) { this.destruir(materia); }
    销毁(materia) { this.destruir(materia); }

    instantiate(original, x, y) { return this.instanciar(original, x, y); }
    instanciarPT(original, x, y) { return this.instanciar(original, x, y); }
    экземпляр(original, x, y) { return this.instanciar(original, x, y); }
    实例化(original, x, y) { return this.instanciar(original, x, y); }

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
    async criar(ruta, x, y) { return await this.crear(ruta, x, y); }
    async создать(ruta, x, y) { return await this.crear(ruta, x, y); }
    async 创建(ruta, x, y) { return await this.crear(ruta, x, y); }

    // Tags & Health
    hasTag(tag) { return this.tieneTag(tag); }
    temTag(tag) { return this.tieneTag(tag); }
    имеетТег(tag) { return this.tieneTag(tag); }
    有标签(tag) { return this.tieneTag(tag); }

    damage(materia, amount) { this.danar(materia, amount); }
    danarPT(materia, amount) { this.danar(materia, amount); }
    нанестиУрон(materia, amount) { this.danar(materia, amount); }
    造成伤害(materia, amount) { this.danar(materia, amount); }

    heal(materia, amount) { this.curar(materia, amount); }
    curarPT(materia, amount) { this.curar(materia, amount); }
    лечить(materia, amount) { this.curar(materia, amount); }
    治疗(materia, amount) { this.curar(materia, amount); }

    // Search & Raycast
    find(name) { return this.buscar(name); }
    procurar(name) { return this.buscar(name); }
    найти(name) { return this.buscar(name); }
    查找(name) { return this.buscar(name); }

    raycast(origin, direction, distance, tag) { return this.lanzarRayo(origin, direction, distance, tag); }
    lancarRaio(origin, direction, distance, tag) { return this.lanzarRayo(origin, direction, distance, tag); }
    пускатьЛуч(origin, direction, distance, tag) { return this.lanzarRayo(origin, direction, distance, tag); }
    射线检测(origin, direction, distance, tag) { return this.lanzarRayo(origin, direction, distance, tag); }

    // Messaging
    broadcast(message, data) { this.difundir(message, data); }
    difundirPT(message, data) { this.difundir(message, data); }
    вещать(message, data) { this.difundir(message, data); }
    广播(message, data) { this.difundir(message, data); }

    onReceive(message, callback) { this.alRecibir(message, callback); }
    aoReceber(message, callback) { this.alRecibir(message, callback); }
    приПолучении(message, callback) { this.alRecibir(message, callback); }
    收到时(message, callback) { this.alRecibir(message, callback); }

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

    // --- Input API Shortcuts ---
    teclaPresionada(k) { return this.input ? this.input.isKeyPressed(k) : false; }
    teclaRecienPresionada(k) { return this.input ? this.input.isKeyJustPressed(k) : false; }
    teclaLiberada(k) { return this.input ? this.input.isKeyReleased(k) : false; }
    tecla(k) { return this.teclaPresionada(k); }

    botonMousePresionado(b) { return this.input ? this.input.isMouseButtonPressed(b) : false; }
    botonMouseRecienPresionado(b) { return this.input ? this.input.isMouseButtonJustPressed(b) : false; }
    botonMouseLiberado(b) { return this.input ? this.input.isMouseButtonReleased(b) : false; }
    obtenerPosicionMouse() { return this.input ? this.input.getMousePosition() : { x: 0, y: 0 }; }

    // Multilingual Aliases
    isKeyPressed(k) { return this.teclaPresionada(k); }
    teclaPressionada(k) { return this.teclaPresionada(k); }
    клавишаНажата(k) { return this.teclaPresionada(k); }
    按键按下(k) { return this.teclaPresionada(k); }

    isKeyJustPressed(k) { return this.teclaRecienPresionada(k); }
    teclaRecemPressionada(k) { return this.teclaRecienPresionada(k); }
    клавишаТолькоЧтоНажата(k) { return this.teclaRecienPresionada(k); }
    按键刚刚按下(k) { return this.teclaRecienPresionada(k); }

    isKeyReleased(k) { return this.teclaLiberada(k); }
    teclaLiberadaPT(k) { return this.teclaLiberada(k); }
    клавишаОтпущена(k) { return this.teclaLiberada(k); }
    按键释放(k) { return this.teclaLiberada(k); }

    isMouseButtonPressed(b) { return this.botonMousePresionado(b); }
    botaoMousePressionado(b) { return this.botonMousePresionado(b); }
    кнопкаМышиНажата(b) { return this.botonMousePresionado(b); }
    鼠标按钮按下(b) { return this.botonMousePresionado(b); }

    isMouseButtonJustPressed(b) { return this.botonMouseRecienPresionado(b); }
    botaoMouseRecemPressionado(b) { return this.botonMouseRecienPresionado(b); }
    кнопкаМышиТолькоЧтоНажата(b) { return this.botonMouseRecienPresionado(b); }
    鼠标按钮刚刚按下(b) { return this.botonMouseRecienPresionado(b); }

    isMouseButtonReleased(b) { return this.botonMouseLiberado(b); }
    botaoMouseLiberado(b) { return this.botonMouseLiberado(b); }
    кнопкаМышиОтпущена(b) { return this.botonMouseLiberado(b); }
    鼠标按钮释放(b) { return this.isMouseButtonReleased(b); }

    getMousePosition() { return this.obtenerPosicionMouse(); }
    obterPosicaoMouse() { return this.obtenerPosicionMouse(); }
    получитьПозициюМыши() { return this.obtenerPosicionMouse(); }
    获取鼠标位置() { return this.obtenerPosicionMouse(); }

    // Gamepad API
    isGamepadConnected(index) { return this.input ? this.input.isGamepadConnected(index) : false; }
    mandoConectado(index) { return this.isGamepadConnected(index); }
    controleConectado(index) { return this.isGamepadConnected(index); }
    джойстикПодключен(index) { return this.isGamepadConnected(index); }
    手柄已连接(index) { return this.isGamepadConnected(index); }

    getGamepadButton(btn, index) { return this.input ? this.input.getGamepadButton(btn, index) : false; }
    mandoBotonPresionado(btn, index) { return this.getGamepadButton(btn, index); }
    controleBotaoPressionado(btn, index) { return this.getGamepadButton(btn, index); }
    кнопкаДжойстикаНажата(btn, index) { return this.getGamepadButton(btn, index); }
    手柄按钮按下(btn, index) { return this.getGamepadButton(btn, index); }

    getGamepadButtonDown(btn, index) { return this.input ? this.input.getGamepadButtonDown(btn, index) : false; }
    mandoBotonRecienPresionado(btn, index) { return this.getGamepadButtonDown(btn, index); }
    controleBotaoRecemPressionado(btn, index) { return this.getGamepadButtonDown(btn, index); }
    кнопкаДжойстикаТолькоЧтоНажата(btn, index) { return this.getGamepadButtonDown(btn, index); }
    手柄按钮刚刚按下(btn, index) { return this.getGamepadButtonDown(btn, index); }

    getGamepadAxis(axis, index) { return this.input ? this.input.getGamepadAxis(axis, index) : 0; }
    mandoEje(axis, index) { return this.getGamepadAxis(axis, index); }
    controleEixo(axis, index) { return this.getGamepadAxis(axis, index); }
    осьДжойстика(axis, index) { return this.getGamepadAxis(axis, index); }
    手柄轴(axis, index) { return this.getGamepadAxis(axis, index); }

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

    /** Alias Multilingües */
    playAnimation(path, loop, speed) { this.reproducirAnimacion(path, loop, speed); }
    reproduzirAnimacao(path, loop, speed) { this.reproducirAnimacion(path, loop, speed); }
    игратьАнимацию(path, loop, speed) { this.reproducirAnimacion(path, loop, speed); }
    播放动画(path, loop, speed) { this.reproducirAnimacion(path, loop, speed); }

    /**
     * Reproduce un estado del AnimatorController si existe una conexión.
     * @param {string} estado - Nombre del estado.
     * @param {boolean|object} [opciones] - Si es boolean, es el parámetro 'force'. Si es objeto, son overrides (loop, speed, etc).
     */
    reproducir(estado, opciones = false) {
        if (!this.materia) return;
        const activeScript = window._currentlyExecutingScript;
        if (activeScript && window.ScriptMonitor && window.ScriptMonitor.onAnimationPlayed) {
            window.ScriptMonitor.onAnimationPlayed(activeScript);
        }
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

    /** Alias Multilingües */
    play(estado, opciones) { this.reproducir(estado, opciones); }
    reproduzir(estado, opciones) { this.reproducir(estado, opciones); }
    играть(estado, opciones) { this.reproducir(estado, opciones); }
    播放(estado, opciones) { this.reproducir(estado, opciones); }

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

    /** Alias Multilingües */
    stopAnimation() { this.detenerAnimacion(); }
    pararAnimacao() { this.detenerAnimacion(); }
    остановитьАнимацию() { this.detenerAnimacion(); }
    停止动画() { this.detenerAnimacion(); }

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
        this.localPosition = { x: 0, y: 0, z: 0 };
        this.localRotation = { x: 0, y: 0, z: 0 }; // Euler angles
        this.localScale = { x: 1, y: 1, z: 1 };
        this.flipX = false;
        this.flipY = false;
    }

    // --- Posición Global (World Position) ---
    get position() {
        const is3D = window.currentProjectConfig?.projectType === '3d';

        if (!this.materia || !this.materia.parent) {
            const pos = { ...this.localPosition };
            if (!is3D) pos.z = 0;
            return pos;
        }

        const parentTransform = this.materia.parent.getComponent(Transform);
        if (!parentTransform) {
            const pos = { ...this.localPosition };
            if (!is3D) pos.z = 0;
            return pos;
        }

        const parentMatrix = parentTransform.worldMatrix;
        const localVec = vec4.fromValues(this.localPosition.x, this.localPosition.y, this.localPosition.z || 0, 1.0);
        const worldVec = vec4.create();
        vec4.transformMat4(worldVec, localVec, parentMatrix);

        return {
            x: worldVec[0],
            y: worldVec[1],
            z: is3D ? worldVec[2] : 0
        };
    }

    set position(worldPosition) {
        if (!this.materia || !this.materia.parent) {
            this.localPosition = { ...worldPosition };
            if (this.localPosition.z === undefined) this.localPosition.z = 0;
            return;
        }
        const parentTransform = this.materia.parent.getComponent(Transform);
        if (!parentTransform) {
            this.localPosition = { ...worldPosition };
            if (this.localPosition.z === undefined) this.localPosition.z = 0;
            return;
        }

        const invParentMatrix = mat4.create();
        mat4.invert(invParentMatrix, parentTransform.worldMatrix);

        const worldVec = vec4.fromValues(worldPosition.x, worldPosition.y, worldPosition.z || 0, 1.0);
        const localVec = vec4.create();
        vec4.transformMat4(localVec, worldVec, invParentMatrix);

        this.localPosition = {
            x: localVec[0],
            y: localVec[1],
            z: localVec[2]
        };
    }

    get worldMatrix() {
        const m = mat4.create();
        const q = quat.create();
        quat.fromEuler(q, this.localRotation.x || 0, this.localRotation.y || 0, this.localRotation.z || 0);

        const pos = [this.localPosition.x, this.localPosition.y, this.localPosition.z || 0];
        const scale = [this.localScale.x, this.localScale.y, this.localScale.z || 1];

        // Proper order: Scale -> Rotate -> Translate
        mat4.fromRotationTranslationScale(m, q, pos, scale);

        if (this.materia && this.materia.parent) {
            let parentMateria = this.materia.parent;
            // Resolve parent if it's an ID
            if (typeof parentMateria === 'number') {
                parentMateria = (this.materia.scene || window.SceneManager?.currentScene)?.findMateriaById(parentMateria);
            }

            const parentTransform = parentMateria ? parentMateria.getComponent(Transform) : null;
            if (parentTransform) {
                mat4.multiply(m, parentTransform.worldMatrix, m);
            }
        }
        return m;
    }

    // --- Rotación Global (World Rotation - Z axis only for legacy compatibility) ---
    get rotation() { return this.rotationZ; }
    set rotation(v) { this.rotationZ = v; }

    get rotationX() {
        const q = quat.create();
        mat4.getRotation(q, this.worldMatrix);
        const euler = vec3.create();
        MathUtils.quatToEuler(euler, q);
        return euler[0];
    }
    set rotationX(v) {
        if (!this.materia || !this.materia.parent) { this.localRotation.x = v; return; }
        const parentTransform = this.materia.parent.getComponent(Transform);
        if (!parentTransform) { this.localRotation.x = v; return; }

        const invParentMatrix = mat4.create();
        mat4.invert(invParentMatrix, parentTransform.worldMatrix);

        const worldQ = quat.create();
        quat.fromEuler(worldQ, v, this.rotationY, this.rotationZ);

        const parentQ = quat.create();
        mat4.getRotation(parentQ, parentTransform.worldMatrix);
        quat.invert(parentQ, parentQ);

        const localQ = quat.create();
        quat.multiply(localQ, parentQ, worldQ);

        const localEuler = vec3.create();
        MathUtils.quatToEuler(localEuler, localQ);
        this.localRotation.x = localEuler[0];
    }

    get rotationY() {
        const q = quat.create();
        mat4.getRotation(q, this.worldMatrix);
        const euler = vec3.create();
        MathUtils.quatToEuler(euler, q);
        return euler[1];
    }
    set rotationY(v) {
        if (!this.materia || !this.materia.parent) { this.localRotation.y = v; return; }
        const parentTransform = this.materia.parent.getComponent(Transform);
        if (!parentTransform) { this.localRotation.y = v; return; }

        const invParentMatrix = mat4.create();
        mat4.invert(invParentMatrix, parentTransform.worldMatrix);

        const worldQ = quat.create();
        quat.fromEuler(worldQ, this.rotationX, v, this.rotationZ);

        const parentQ = quat.create();
        mat4.getRotation(parentQ, parentTransform.worldMatrix);
        quat.invert(parentQ, parentQ);

        const localQ = quat.create();
        quat.multiply(localQ, parentQ, worldQ);

        const localEuler = vec3.create();
        MathUtils.quatToEuler(localEuler, localQ);
        this.localRotation.y = localEuler[1];
    }

    get rotationZ() {
        const q = quat.create();
        mat4.getRotation(q, this.worldMatrix);
        const euler = vec3.create();
        MathUtils.quatToEuler(euler, q);
        return euler[2];
    }
    set rotationZ(v) {
        if (!this.materia || !this.materia.parent) { this.localRotation.z = v; return; }
        const parentTransform = this.materia.parent.getComponent(Transform);
        if (!parentTransform) { this.localRotation.z = v; return; }

        const invParentMatrix = mat4.create();
        mat4.invert(invParentMatrix, parentTransform.worldMatrix);

        const worldQ = quat.create();
        quat.fromEuler(worldQ, this.rotationX, this.rotationY, v);

        const parentQ = quat.create();
        mat4.getRotation(parentQ, parentTransform.worldMatrix);
        quat.invert(parentQ, parentQ);

        const localQ = quat.create();
        quat.multiply(localQ, parentQ, worldQ);

        const localEuler = vec3.create();
        MathUtils.quatToEuler(localEuler, localQ);
        this.localRotation.z = localEuler[2];
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
                    y: parentScale.y * this.localScale.y,
                    z: parentScale.z * this.localScale.z
                };
            }
        }
        return {
            x: baseScale.x * (this.flipX ? -1 : 1),
            y: baseScale.y * (this.flipY ? -1 : 1),
            z: baseScale.z
        };
    }

    set scale(worldScale) {
        if (!this.materia || !this.materia.parent) {
            this.localScale = { ...worldScale };
            if (this.localScale.z === undefined) this.localScale.z = 1;
            return;
        }
        const parentTransform = this.materia.parent.getComponent(Transform);
        if (!parentTransform) {
             this.localScale = { ...worldScale };
             if (this.localScale.z === undefined) this.localScale.z = 1;
             return;
        }
        const parentScale = parentTransform.scale;
        this.localScale = {
            x: parentScale.x !== 0 ? worldScale.x / parentScale.x : 0,
            y: parentScale.y !== 0 ? worldScale.y / parentScale.y : 0,
            z: parentScale.z !== 0 ? (worldScale.z !== undefined ? worldScale.z / parentScale.z : this.localScale.z) : 0
        };
    }

    // --- Acceso directo a x/y/z para compatibilidad y conveniencia ---
    get x() { return this.position.x; }
    set x(value) { this.position = { ...this.position, x: value }; }
    get y() { return this.position.y; }
    set y(value) { this.position = { ...this.position, y: value }; }
    get z() { return this.position.z; }
    set z(value) { this.position = { ...this.position, z: value }; }

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

    /** Alias Multilingües */
    mirarA(x, y) { this.lookAt(x, y); }
    olharPara(x, y) { this.lookAt(x, y); }
    смотретьНа(x, y) { this.lookAt(x, y); }
    看向(x, y) { this.lookAt(x, y); }

    clone() {
        const newTransform = new Transform(null);
        newTransform.localPosition = { ...this.localPosition };
        newTransform.localRotation = (typeof this.localRotation === 'number') ? { x: 0, y: 0, z: this.localRotation } : { ...this.localRotation };
        newTransform.localScale = { ...this.localScale };
        newTransform.flipX = this.flipX;
        newTransform.flipY = this.flipY;
        return newTransform;
    }
}

export class Camera extends Leyes {
    constructor(materia) {
        super(materia);
        const is3D = window.currentProjectConfig?.projectType === '3d';
        this.depth = 0; // Rendering order. Higher is drawn on top.
        this.projection = is3D ? 'Perspective' : 'Orthographic';
        this.orthographicSize = 5; // Size for Orthographic
        this.fov = 60; // Field of view for Perspective
        this.nearClipPlane = 0.1;
        this.farClipPlane = 20000;
        this.clearFlags = 'Skybox'; // 'SolidColor', 'Skybox', or 'DontClear'
        this.backgroundColor = '#1e293b'; // Default solid color
        this.cullingMask = -1; // Bitmask, -1 means 'Everything'
        this.rect = { x: 0, y: 0, w: 1, h: 1 }; // Viewport rect (0-1)
        this.zoom = 1.0; // Editor-only zoom, not part of the component's data.

        // Camera Shake State
        this._shakeTime = 0;
        this._shakeIntensity = 0;
        this.shakeOffset = { x: 0, y: 0 };
    }

    sacudir(duracion = 0.3, intensidad = 10) {
        this._shakeTime = duracion;
        this._shakeIntensity = intensidad;
    }

    update(deltaTime) {
        const isGame = typeof window !== 'undefined' && (window.isGameRunning || window.CE_Standalone_Scripts);
        if (!isGame) return;

        if (this._shakeTime > 0) {
            this._shakeTime -= deltaTime;
            const angle = Math.random() * Math.PI * 2;
            const offset = Math.random() * this._shakeIntensity;
            this.shakeOffset.x = Math.cos(angle) * offset;
            this.shakeOffset.y = Math.sin(angle) * offset;
            if (this._shakeTime <= 0) {
                this.shakeOffset.x = 0;
                this.shakeOffset.y = 0;
            }
        } else {
            this.shakeOffset.x = 0;
            this.shakeOffset.y = 0;
        }
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
        newCamera.rect = { ...this.rect };
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
    _safeInvoke(methodName, ...args) {
        if (!this.instance || typeof this.instance[methodName] !== 'function') return;

        const startTime = performance.now();
        const startMem = (window.performance && window.performance.memory && window.performance.memory.usedJSHeapSize) ? window.performance.memory.usedJSHeapSize : 0;
        const prevScript = window._currentlyExecutingScript;
        window._currentlyExecutingScript = this.scriptName;

        if (window.ScriptMonitor && window.ScriptMonitor.onScriptStart) {
            window.ScriptMonitor.onScriptStart(this.scriptName, methodName);
        }

        const handleSuccess = (duration, memDelta) => {
            if (window.ScriptMonitor && window.ScriptMonitor.onScriptEnd) {
                window.ScriptMonitor.onScriptEnd(this.scriptName, methodName, duration, memDelta, false);
            }
        };

        const handleFailure = (e) => {
            let cesLine = 0;
            const stack = e.stack || "";

            // Attempt to parse JS line from stack and map to CES
            const match = stack.match(/<anonymous>:(\d+):/);
            if (match) {
                const jsLine = parseInt(match[1]);
                const metadataSource = window.CE_Script_Metadata || (editorLogic ? editorLogic.getAllMetadata() : {});
                const meta = metadataSource[this.scriptName];
                if (meta && meta.lineMap && meta.lineMap.methods[methodName]) {
                    const map = meta.lineMap.methods[methodName].find(m => m.js === jsLine);
                    if (map) cesLine = map.ces;
                }
            }

            const errorObj = {
                line: cesLine,
                message: e.message,
                scriptName: this.scriptName,
                methodName: methodName,
                materiaName: this.materia ? this.materia.name : 'Desconocido',
                materiaId: this.materia ? this.materia.id : null,
                stack: e.stack
            };

            if (typeof window !== 'undefined' && window.logToUIConsole) {
                window.logToUIConsole(errorObj, 'error', false);
            } else {
                console.error(`[CreativeScript] Error en '${this.scriptName}' (${methodName}):`, e);
            }

            if (window.ScriptMonitor && window.ScriptMonitor.onScriptEnd) {
                const duration = performance.now() - startTime;
                const endMem = (window.performance && window.performance.memory && window.performance.memory.usedJSHeapSize) ? window.performance.memory.usedJSHeapSize : 0;
                let memDelta = endMem - startMem;
                if (memDelta <= 0) {
                    const codeLength = (this.scriptName && window.CE_Script_Metadata && window.CE_Script_Metadata[this.scriptName]?.codeLength) || 500;
                    memDelta = Math.round(codeLength * 0.1 + duration * 1500 + Math.random() * 200);
                }
                window.ScriptMonitor.onScriptEnd(this.scriptName, methodName, duration, memDelta, true);
            }
        };

        try {
            const result = this.instance[methodName](...args);

            if (result && typeof result.then === 'function') {
                return result.then(() => {
                    const duration = performance.now() - startTime;
                    const endMem = (window.performance && window.performance.memory && window.performance.memory.usedJSHeapSize) ? window.performance.memory.usedJSHeapSize : 0;
                    let memDelta = endMem - startMem;
                    if (memDelta <= 0) {
                        const codeLength = (this.scriptName && window.CE_Script_Metadata && window.CE_Script_Metadata[this.scriptName]?.codeLength) || 500;
                        memDelta = Math.round(codeLength * 0.1 + duration * 1500 + Math.random() * 200);
                    }
                    handleSuccess(duration, memDelta);
                }).catch((e) => {
                    handleFailure(e);
                });
            } else {
                const duration = performance.now() - startTime;
                const endMem = (window.performance && window.performance.memory && window.performance.memory.usedJSHeapSize) ? window.performance.memory.usedJSHeapSize : 0;
                let memDelta = endMem - startMem;
                if (memDelta <= 0) {
                    const codeLength = (this.scriptName && window.CE_Script_Metadata && window.CE_Script_Metadata[this.scriptName]?.codeLength) || 500;
                    memDelta = Math.round(codeLength * 0.1 + duration * 1500 + Math.random() * 200);
                }
                handleSuccess(duration, memDelta);
            }
        } catch (e) {
            handleFailure(e);
        } finally {
            window._currentlyExecutingScript = prevScript;
        }
    }

    start() {
        this._safeInvoke('start');
    }

    update(deltaTime) {
        if (window._PerformanceMetrics) {
            window._PerformanceMetrics.scriptsRun = (window._PerformanceMetrics.scriptsRun || 0) + 1;
        }
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
                    alEntrarEnColision: ['OnCollisionEnter', 'alChocar'],
                    alPermanecerEnColision: ['OnCollisionStay'],
                    alSalirDeColision: ['OnCollisionExit'],
                    alEntrarEnTrigger: ['OnTriggerEnter'],
                    alPermanecerEnTrigger: ['OnTriggerStay'],
                    alSalirDeTrigger: ['OnTriggerExit'],
                    alFinalizarAnimacion: ['OnAnimationEnd'],
                    onPointerDown: ['alPresionar', 'alPulsar'],
                    onPointerUp: ['alSoltar'],
                    onPointerEnter: ['alEntrar'],
                    onPointerExit: ['alSalir'],
                    onPointerClick: ['alHacerClick', 'alClicar'],
                    onReceive: ['alRecibir'],
                    onLowPerformance: ['alBajoRendimiento'],
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
                if (window.ScriptMonitor && window.ScriptMonitor.onScriptRegistered) {
                    window.ScriptMonitor.onScriptRegistered(this.scriptName);
                }
            } else {
                throw new Error(`El script '${this.scriptName}' no exporta una clase por defecto.`);
            }
        } catch (error) {
            const errorObj = {
                line: 0,
                message: error.message,
                scriptName: this.scriptName,
                materiaName: this.materia ? this.materia.name : 'Desconocido',
                materiaId: this.materia ? this.materia.id : null,
                stack: error.stack
            };

            if (typeof window !== 'undefined' && window.logToUIConsole) {
                window.logToUIConsole(errorObj, 'error', false);
            } else {
                console.error(`Error al inicializar script '${this.scriptName}':`, error);
            }
            this.isInitialized = false;
        }
    }

    clone() {
        const newScript = new CreativeScript(null, this.scriptName);
        // Deep copy of public variables to preserve Inspector values
        if (this.publicVars) {
            newScript.publicVars = JSON.parse(JSON.stringify(this.publicVars));
        }
        return newScript;
    }
}

export class Rigidbody2D extends Leyes {
    static actionableMethods = {
        'addForce': ['aplicarFuerza', 'приложитьСилу', '施加力'],
        'addTorque': ['aplicarTorque', 'приложитьКрутящийМомент', '施加扭矩'],
        'stop': ['detener', 'остановить', '停止']
    };

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
    get velocidade() { return this.velocity; }
    set velocidade(v) { this.velocity = v; }
    get скорость() { return this.velocity; }
    set скорость(v) { this.velocity = v; }
    get 速度() { return this.velocity; }
    set 速度(v) { this.velocity = v; }

    get velocidadX() { return this.velocity.x; }
    set velocidadX(v) { this.velocity.x = v; }
    get velocidadeX() { return this.velocity.x; }
    set velocidadeX(v) { this.velocity.x = v; }
    get скоростьX() { return this.velocity.x; }
    set скоростьX(v) { this.velocity.x = v; }
    get 速度X() { return this.velocity.x; }
    set 速度X(v) { this.velocity.x = v; }

    get velocidadY() { return this.velocity.y; }
    set velocidadY(v) { this.velocity.y = v; }
    get velocidadeY() { return this.velocity.y; }
    set velocidadY(v) { this.velocity.y = v; }
    get скоростьY() { return this.velocity.y; }
    set скоростьY(v) { this.velocity.y = v; }
    get 速度Y() { return this.velocity.y; }
    set 速度Y(v) { this.velocity.y = v; }

    get velocityX() { return this.velocity.x; }
    set velocityX(v) { this.velocity.x = v; }
    get velocityY() { return this.velocity.y; }
    set velocityY(v) { this.velocity.y = v; }

    get velocidadAngular() { return this.angularVelocity; }
    set velocidadAngular(v) { this.angularVelocity = v; }
    get velocidadeAngular() { return this.angularVelocity; }
    set velocidadeAngular(v) { this.angularVelocity = v; }
    get угловаяСкорость() { return this.angularVelocity; }
    set угловаяСкорость(v) { this.angularVelocity = v; }
    get 角速度() { return this.angularVelocity; }
    set 角速度(v) { this.angularVelocity = v; }

    get masa() { return this.mass; }
    set masa(m) { this.mass = m; }
    get масса() { return this.mass; }
    set масса(m) { this.mass = m; }
    get 质量() { return this.mass; }
    set 质量(m) { this.mass = m; }

    get escalaGravedad() { return this.gravityScale; }
    set escalaGravedad(s) { this.gravityScale = s; }
    get escalaGravidade() { return this.gravityScale; }
    set escalaGravidade(s) { this.gravityScale = s; }
    get гравитация() { return this.gravityScale; }
    set гравитация(s) { this.gravityScale = s; }
    get 重力缩放() { return this.gravityScale; }
    set 重力缩放(s) { this.gravityScale = s; }

    get arrastreAngular() { return this.angularDrag; }
    set arrastreAngular(a) { this.angularDrag = a; }
    get arrastoAngular() { return this.angularDrag; }
    set arrastoAngular(a) { this.angularDrag = a; }
    get угловоеСопротивление() { return this.angularDrag; }
    set угловоеСопротивление(a) { this.angularDrag = a; }
    get 角阻力() { return this.angularDrag; }
    set 角阻力(a) { this.angularDrag = a; }

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
        // Better inertia approximation based on collider size
        let w = 50, h = 50;
        const box = this.materia.getComponent(BoxCollider2D);
        const circle = this.materia.getComponent(CircleCollider2D);
        const trans = this.materia.getComponent(Transform);

        if (box) {
            w = box.size.x * (trans ? Math.abs(trans.scale.x) : 1);
            h = box.size.y * (trans ? Math.abs(trans.scale.y) : 1);
        } else if (circle) {
            w = h = circle.radius * 2 * (trans ? Math.max(Math.abs(trans.scale.x), Math.abs(trans.scale.y)) : 1);
        }

        // Inertia for a rectangular plate: (1/12) * m * (w^2 + h^2)
        const inertia = (1/12) * mass * (w * w + h * h);
        this.angularVelocity += torque / Math.max(1, inertia);
    }

    aplicarTorque(torque) { this.addTorque(torque); }
    aplicarTorquePT(torque) { this.addTorque(torque); }
    приложитьКрутящийМомент(torque) { this.addTorque(torque); }
    施加扭矩(torque) { this.addTorque(torque); }

    establecerVelocidad(xOrObj = 0, y = 0) {
        if (typeof xOrObj === 'object') {
            this.velocity.x = xOrObj.x || 0;
            this.velocity.y = xOrObj.y || 0;
        } else {
            this.velocity.x = xOrObj;
            this.velocity.y = y;
        }
    }

    // --- Multilingual Aliases ---
    applyForce(x, y) { this.addForce(x, y); }
    aplicarForca(x, y) { this.addForce(x, y); }
    приложитьСилу(x, y) { this.addForce(x, y); }
    施加力(x, y) { this.addForce(x, y); }

    applyImpulse(x, y) { this.addImpulse(x, y); }
    aplicarImpulsoPT(x, y) { this.addImpulse(x, y); }
    приложитьИмпульс(x, y) { this.addImpulse(x, y); }
    施加脉冲(x, y) { this.addImpulse(x, y); }

    aplicarFuerza(x, y) { this.addForce(x, y); }
    aplicarImpulso(x, y) { this.addImpulse(x, y); }

    setVelocity(xOrObj, y) { this.establecerVelocidad(xOrObj, y); }
    definirVelocidade(xOrObj, y) { this.establecerVelocidad(xOrObj, y); }
    установитьСкорость(xOrObj, y) { this.establecerVelocidad(xOrObj, y); }
    设置速度(xOrObj, y) { this.establecerVelocidad(xOrObj, y); }

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

export class PlatformEffector2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.blockUp = true;
        this.blockDown = false;
        this.blockLeft = false;
        this.blockRight = false;
        this.surfaceArc = 180; // For future one-way rotation support
        this.useOneWay = true;
    }
    clone() {
        const newEffector = new PlatformEffector2D(null);
        newEffector.blockUp = this.blockUp;
        newEffector.blockDown = this.blockDown;
        newEffector.blockLeft = this.blockLeft;
        newEffector.blockRight = this.blockRight;
        newEffector.surfaceArc = this.surfaceArc;
        newEffector.useOneWay = this.useOneWay;
        return newEffector;
    }
}

export class CircleCollider2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.isTrigger = false;
        this.offset = { x: 0, y: 0 };
        this.radius = 25.0;
    }
    clone() {
        const newCollider = new CircleCollider2D(null);
        newCollider.isTrigger = this.isTrigger;
        newCollider.offset = { ...this.offset };
        newCollider.radius = this.radius;
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
        this.billboard = false; // For 3D mode
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
            if (typeof recordFetch === 'function') await recordFetch(response);
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
        this.type = 'frame'; // 'frame' or 'skeletal'
        this.frames = []; // Array of image source paths (for frame-based)
        this.keyframes = []; // Array of {time, data: {materiaId: {pos, rot, scale}}} (for skeletal)
        this.duration = 1.0; // Total duration in seconds (for skeletal)
        this.speed = 10; // Frames per second (for frame-based)
        this.loop = true;
    }
}

export class Animator extends Leyes {
    static actionableMethods = {
        'play': ['reproducir', 'воспроизвести', '播放'],
        'stop': ['detener', 'остановить', '停止'],
        'pause': ['pausar', 'приостановить', '暂停'],
        'resume': ['continuar', 'продолжить', '恢复']
    };

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

        // Blending State
        this._isBlending = false;
        this._blendTimer = 0;
        this._blendDuration = 0;
        this._prevPose = null; // Map of boneName -> {pos, rot, scale}

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
        // Validation check
        if (this.playOnAwake && !this.materia.getComponentByName('Rigidbody2D') && !this.materia.getComponentByName('Transform')) {
             console.error(`[Animator] El objeto '${this.materia.name}' no tiene Rigidbody2D ni Transform para ser renderizado.`);
        }
    }

    async loadAnimationClip(projectsDirHandle) {
        if (!this.animationClipPath) return;
        this.projectsDirHandle = projectsDirHandle;
        const pathToLoad = this.animationClipPath;
        this._loadingPath = pathToLoad;
        this._isLoading = true;

        this.spriteRenderer = this.materia.getComponent(SpriteRenderer);

        try {
            const url = await getURLForAssetPath(pathToLoad, projectsDirHandle);
            if (!url) throw new Error(`Could not get URL for animation clip: ${pathToLoad}`);

            const response = await fetch(url);
            if (typeof recordFetch === 'function') await recordFetch(response);
            const data = await response.json();

            // Ignore stale load result if the path was changed during asynchronous load
            if (this.animationClipPath !== pathToLoad) {
                return;
            }

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
            if (clip && clip.frames && (!clip.type || clip.type === 'frame')) {
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
                                        if (typeof recordFetch === 'function') await recordFetch(sheetRes);
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
     * Comienza una transición suave a una nueva animación.
     * @param {string} path - Ruta al nuevo clip.
     * @param {number} duration - Duración del crossfade en segundos.
     * @param {object} options - Opciones adicionales.
     */
    clone() {
        const newAnimator = new Animator(null);
        newAnimator.animationClipPath = this.animationClipPath;
        newAnimator.speed = this.speed;
        newAnimator.loop = this.loop;
        newAnimator.playOnAwake = this.playOnAwake;
        return newAnimator;
    }

    crossfade(path, duration = 0.3, options = {}) {
        if (this.animationClipPath === path && this.isPlaying) return;

        // Capture current skeletal pose
        this._prevPose = this.captureSkeletalPose();
        this._isBlending = true;
        this._blendTimer = 0;
        this._blendDuration = duration;

        this.play(path, options);
    }

    captureSkeletalPose() {
        const pose = new Map();
        // Capture transforms of all children that might be bones
        const captureRecursive = (mtr) => {
            const trans = mtr.getComponent(Transform);
            if (trans) {
                pose.set(mtr.name || mtr.id.toString(), {
                    pos: { ...trans.localPosition },
                    rot: trans.localRotation,
                    scale: { ...trans.localScale }
                });
            }
            mtr.children.forEach(captureRecursive);
        };
        captureRecursive(this.materia);
        return pose;
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
        const needsLoad = !this.animationClip && this.animationClipPath && (!this._isLoading || this._loadingPath !== this.animationClipPath);
        if (needsLoad) {
            const desiredLoop = options.loop !== undefined ? options.loop : this.loop;
            this.loadAnimationClip(this.projectsDirHandle || window.projectsDirHandle).then(() => {
                if (desiredLoop !== undefined) {
                    this.loop = desiredLoop;
                }
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

    /** Alias Multilingües */
    reproducir(ruta, opciones) { this.play(ruta, opciones); }
    reproduzir(ruta, opciones) { this.play(ruta, opciones); }
    играть(ruta, opciones) { this.play(ruta, opciones); }
    播放(ruta, opciones) { this.play(ruta, opciones); }

    detener() { this.stop(); }
    parar() { this.stop(); }
    остановить() { this.stop(); }
    停止() { this.stop(); }

    reiniciar() { this.reset(); }
    reiniciarPT() { this.reset(); }
    сбросить() { this.reset(); }
    重置() { this.reset(); }

    update(deltaTime) {
        const debug = window.CE_DEBUG_ANIMATION;

        if (!this.spriteRenderer && this.materia) {
            this.spriteRenderer = this.materia.getComponent(SpriteRenderer);
        }

        // Auto-load if path exists but no data
        if (!this.animationClip && this.animationClipPath && !this._isLoading) {
            this.loadAnimationClip(this.projectsDirHandle || window.projectsDirHandle);
        }

        if (this._isBlending) {
            this._blendTimer += deltaTime;
            if (this._blendTimer >= this._blendDuration) {
                this._isBlending = false;
                this._prevPose = null;
            }
        }

        if (!this.isPlaying || !this.animationClip) {
            return;
        }

        const clip = this.animationClip;
        const isSkeletal = clip.type === 'skeletal' || (clip.keyframes && clip.keyframes.length > 0);

        if (isSkeletal) {
            this._updateSkeletalAnimation(deltaTime);
        } else {
            this._updateFrameAnimation(deltaTime);
        }
    }

    _updateSkeletalAnimation(deltaTime) {
        const clip = this.animationClip;
        const duration = clip.duration || 1.0;
        const speed = Math.max(0.1, this.speed || 1.0);

        this.frameTimer += deltaTime * speed;

        if (this.frameTimer >= duration) {
            if (this.loop) {
                this.frameTimer %= duration;
            } else {
                this.frameTimer = duration;
                this.stop();
            }
            // Trigger events
            const scripts = this.materia.getComponents(CreativeScript);
            scripts.forEach(s => {
                s._safeInvoke('alFinalizarAnimacion', clip.name || this.animationClipPath);
                s._safeInvoke('OnAnimationEnd', clip.name || this.animationClipPath);
            });
        }

        this.applySkeletalFrame(this.frameTimer);
    }

    _updateFrameAnimation(deltaTime) {
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

    applySkeletalFrame(time) {
        const clip = this.animationClip;
        if (!clip || !clip.keyframes || clip.keyframes.length === 0) return;

        const keyframes = clip.keyframes;
        let k1 = keyframes[0], k2 = keyframes[keyframes.length - 1];
        for (let i = 0; i < keyframes.length - 1; i++) {
            if (time >= keyframes[i].time && time <= keyframes[i+1].time) {
                k1 = keyframes[i];
                k2 = keyframes[i+1];
                break;
            }
        }

        const t = (k1 === k2) ? 0 : (time - k1.time) / (k2.time - k1.time);
        const blendFactor = this._isBlending ? (this._blendTimer / this._blendDuration) : 1.0;

        const allKeys = new Set([...Object.keys(k1.data), ...Object.keys(k2.data)]);
        for (const key of allKeys) {
            let mtr = isNaN(key) ? this.materia.findChildByName(key, true) : (this.materia.scene?.findMateriaById(parseInt(key)) || window.SceneManager.currentScene.findMateriaById(parseInt(key)));
            if (!mtr) continue;

            const trans = mtr.getComponent(Transform);
            if (!trans) continue;

            // Skipping bones driven by physics ragdoll
            const bone = mtr.getComponent(Bone);
            if (bone && bone.isRagdoll) continue;

            const d1 = k1.data[key] || k2.data[key];
            const d2 = k2.data[key] || k1.data[key];

            if (d1 && d2) {
                // Target pose from animation
                let targetPos = {
                    x: d1.pos.x + (d2.pos.x - d1.pos.x) * t,
                    y: d1.pos.y + (d2.pos.y - d1.pos.y) * t
                };
                let targetRot = d1.rot;
                let r2 = d2.rot;
                while (r2 - targetRot > 180) r2 -= 360;
                while (r2 - targetRot < -180) r2 += 360;
                targetRot += (r2 - targetRot) * t;

                let targetScale = {
                    x: d1.scale.x + (d2.scale.x - d1.scale.x) * t,
                    y: d1.scale.y + (d2.scale.y - d1.scale.y) * t
                };

                // Apply blending with previous pose if necessary
                if (this._isBlending && this._prevPose && this._prevPose.has(key)) {
                    const prev = this._prevPose.get(key);

                    trans.localPosition.x = prev.pos.x + (targetPos.x - prev.pos.x) * blendFactor;
                    trans.localPosition.y = prev.pos.y + (targetPos.y - prev.pos.y) * blendFactor;

                    let r1 = prev.rot;
                    let r2_blend = targetRot;
                    while (r2_blend - r1 > 180) r2_blend -= 360;
                    while (r2_blend - r1 < -180) r2_blend += 360;
                    const finalRotZ = r1 + (r2_blend - r1) * blendFactor;
                    if (typeof trans.localRotation === 'object') trans.localRotation.z = finalRotZ;
                    else trans.localRotation = finalRotZ;

                    trans.localScale.x = prev.scale.x + (targetScale.x - prev.scale.x) * blendFactor;
                    trans.localScale.y = prev.scale.y + (targetScale.y - prev.scale.y) * blendFactor;
                } else {
                    trans.localPosition.x = targetPos.x;
                    trans.localPosition.y = targetPos.y;
                    if (typeof trans.localRotation === 'object') trans.localRotation.z = targetRot;
                    else trans.localRotation = targetRot;
                    trans.localScale.x = targetScale.x;
                    trans.localScale.y = targetScale.y;
                }
            }
        }
    }

    applyCurrentFrame() {
        if (!this.spriteRenderer && this.materia) {
            this.spriteRenderer = this.materia.getComponent(SpriteRenderer);
        }
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
        this.pivot = { x: 0.5, y: 0.5 };
        this.anchorPoint = 4; // 0-8, representing the 3x3 grid. 4 is center.
    }

    clone() {
        const newUITransform = new UITransform(null);
        newUITransform.position = { ...this.position };
        newUITransform.size = { ...this.size };
        newUITransform.pivot = { ...this.pivot };
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
        this.opacity = 1.0;
        this.isError = false;
        this.isLoading = false;
        this._lastLoadedSource = '';
    }

    async setSourcePath(path, projectsDirHandle) {
        this.source = path;
        await this.loadSprite(projectsDirHandle);
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
        newImage.opacity = this.opacity;
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

    async setSourcePath(path, projectsDirHandle) {
        this.source = path;
        await this.loadSprite(projectsDirHandle);
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
    static actionableMethods = {
        'play': ['reproducir', 'воспроизвести', '播放'],
        'stop': ['detener', 'остановить', '停止'],
        'pause': ['pausar', 'приостановить', '暂停']
    };

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

    async setSourcePath(path) {
        this.source = path;
        await this.load();
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

    // --- Multilingual Aliases ---
    reproducir(tiempoInicio) { this.play(tiempoInicio); }
    reproduzir(tiempoInicio) { this.play(tiempoInicio); }
    играть(tiempoInicio) { this.play(tiempoInicio); }
    播放(tiempoInicio) { this.play(tiempoInicio); }

    detener() { this.stop(); }
    parar() { this.stop(); }
    остановить() { this.stop(); }
    停止() { this.stop(); }

    pausar() { this.pause(); }
    pausarPT() { this.pause(); }
    пауза() { this.pause(); }
    暂停() { this.pause(); }

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
    static actionableMethods = {
        'play': ['reproducir', 'воспроизвести', '播放'],
        'stop': ['detener', 'остановить', '停止'],
        'pause': ['pausar', 'приостановить', '暂停'],
        'mute': ['silenciar', 'выключитьЗвук', '静音'],
        'unmute': ['activarSonido', 'включитьЗвук', '取消静音']
    };

    constructor(materia) {
        super(materia);
        this.source = '';
        this.volume = 1.0;
        this.loop = false;
        this.playOnAwake = true;
        this.playbackRate = 1.0;
        this.scalingMode = 'Fit'; // 'Stretch', 'Fit', 'Fill'
        this.muted = false;
        this.preload = 'auto'; // 'auto', 'metadata', 'none'

        this._video = null;
        this._isLoaded = false;
        this.isLoading = false;
        this._lastLoadedSource = '';
    }

    async start() {
        if (this.playOnAwake) {
            this.play();
        }
    }

    async setSourcePath(path) {
        this.source = path;
        await this.load();
    }

    update(deltaTime) {
        // Auto-load if source is set but not yet loaded
        if (this.source && this.source !== this._lastLoadedSource && !this._video && !this.isLoading) {
            this.load();
        }

        if (!this._video) return;

        // Sincronizar volumen con AudioSource si existe en la misma Materia
        const audioSource = this.materia.getComponent(AudioSource);
        if (audioSource) {
            this._video.volume = audioSource.spatial ? audioSource._currentVolume : audioSource.volume;
        } else {
            this._video.volume = this.volume;
        }

        this._video.loop = this.loop;
        this._video.playbackRate = this.playbackRate;
        this._video.muted = this.muted;
    }

    get isPlaying() {
        return this._video && !this._video.paused && !this._video.ended;
    }

    get videoWidth() {
        return this._video ? this._video.videoWidth : 0;
    }

    get videoHeight() {
        return this._video ? this._video.videoHeight : 0;
    }

    syncSizeToUITransform() {
        const uiTransform = this.materia.getComponent(window.Components.UITransform);
        if (uiTransform && this.videoWidth > 0 && this.videoHeight > 0) {
            uiTransform.size.width = this.videoWidth;
            uiTransform.size.height = this.videoHeight;
        }
    }

    async load() {
        if (!this.source || this.isLoading) return;

        try {
            this.isLoading = true;
            const url = await getURLForAssetPath(this.source, window.projectsDirHandle);
            if (!url) {
                this.isLoading = false;
                return;
            }

            if (!this._video) {
                this._video = document.createElement('video');
                this._video.crossOrigin = 'anonymous';
                this._video.playsInline = true;
                this._video.muted = this.muted;
                this._video.preload = this.preload;
            }

            if (this._video.src !== url) {
                this._video.src = url;
                this._lastLoadedSource = this.source;

                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        this._video.oncanplay = null;
                        this._video.onerror = null;
                        reject(new Error("Timeout loading video"));
                    }, 10000);

                    this._video.oncanplay = () => {
                        clearTimeout(timeout);
                        this._video.oncanplay = null;
                        this._video.onerror = null;
                        resolve();
                    };
                    this._video.onerror = (e) => {
                        clearTimeout(timeout);
                        this._video.oncanplay = null;
                        this._video.onerror = null;
                        reject(e);
                    };
                    this._video.load();
                });
                this._isLoaded = true;
            }
        } catch (e) {
            console.warn(`[VideoPlayer] Error al cargar video: ${this.source}.`, e);
        } finally {
            this.isLoading = false;
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

    // --- Multilingual Aliases ---
    reproducir() { this.play(); }
    reproduzir() { this.play(); }
    играть() { this.play(); }
    播放() { this.play(); }

    pausar() { this.pause(); }
    pausarPT() { this.pause(); }
    пауза() { this.pause(); }
    暂停() { this.pause(); }

    detener() { this.stop(); }
    parar() { this.stop(); }
    остановить() { this.stop(); }
    停止() { this.stop(); }

    buscarTiempo(t) { this.seek(t); }
    buscarTempo(t) { this.seek(t); }
    перемотать(t) { this.seek(t); }
    跳转时间(t) { this.seek(t); }

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
        this.wrapMode = 'Clamp'; // 'Clamp' (fijar borde) or 'Repeat' (repetir)
        this._lastLoadedPath = '';
        this.isLoading = false;
        this.isError = false;
        this.billboard = false; // For 3D mode
    }

    update(deltaTime) {
        // Auto-load if path is set but not yet loaded
        if (this.texturePath && this.texturePath !== this._lastLoadedPath && !this.isLoading && !this.isError) {
            this.loadTexture(window.projectsDirHandle);
        }
    }

    async loadTexture(projectsDirHandle) {
        if (!this.texturePath) {
            this.texture = null;
            this._lastLoadedPath = '';
            this.isError = false;
            this.isLoading = false;
            return;
        }

        const currentDirHandle = projectsDirHandle || window.projectsDirHandle;
        this.isLoading = true;
        this.isError = false;

        try {
            // Load wrapMode from metadata
            this.wrapMode = 'Clamp';
            try {
                const { getFileHandleForPath } = await import('./AssetUtils.js');
                const metaFileHandle = await getFileHandleForPath(`${this.texturePath}.meta`, currentDirHandle);
                if (metaFileHandle) {
                    const metaFile = await metaFileHandle.getFile();
                    const metaData = JSON.parse(await metaFile.text());
                    if (metaData.wrapMode) {
                        this.wrapMode = metaData.wrapMode;
                    }
                }
            } catch (metaErr) {
                // Ignore or fallback
            }

            const url = await getURLForAssetPath(this.texturePath, currentDirHandle);
            if (url) {
                this.texture = new Image();
                await new Promise((resolve, reject) => {
                    this.texture.onload = resolve;
                    this.texture.onerror = reject;
                    this.texture.src = url;
                });
                this._lastLoadedPath = this.texturePath;
            } else {
                this.isError = true;
            }
        } catch (e) {
            console.error(`Failed to load texture: ${this.texturePath}`, e);
            this.isError = true;
        } finally {
            this.isLoading = false;
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
registerComponent('PlatformEffector2D', PlatformEffector2D);
registerComponent('CapsuleCollider2D', CapsuleCollider2D);
registerComponent('CircleCollider2D', CircleCollider2D);
registerComponent('PolygonCollider2D', PolygonCollider2D);
registerComponent('Transform', Transform);
registerComponent('Camera', Camera);
registerComponent('SpriteRenderer', SpriteRenderer);
registerComponent('Animator', Animator);

export class AnimatorController extends Leyes {
    static actionableMethods = {
        'play': ['reproducir', 'воспроизвести', '播放'],
        'setParameter': ['establecerParametro', 'установитьПараметр', '设置参数'],
        'trigger': ['disparar', 'триггер', '触发']
    };

    constructor(materia) {
        super(materia);
        this.controllerPath = ''; // Path to the .ceanim asset
        this.targetMateria = null; // Materia principal a la que se le hará el seguimiento de movimiento y animación
        this.extraTargets = ""; // IDs extras de materias (separadas por comas) para animar en conjunto

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
        await this.loadController(projectsDirHandle);

        if (this.controller && this.controller.entryState) {
            // In editor or at start, just set the state to show the first frame
            this.currentStateName = this.controller.entryState;
            const state = this.states.get(this.currentStateName);
            if (state && state.animationClip) {
                const animators = this._resolveAllTargets();
                for (let i = 0; i < animators.length; i++) {
                    const anim = animators[i];
                    anim.animationClipPath = state.animationClip;
                    anim.projectsDirHandle = projectsDirHandle;
                    // Just load it to show the first frame
                    anim.loadAnimationClip(projectsDirHandle);
                }
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

    _resolveMateria(val) {
        if (!val) return null;
        if (typeof val === 'object') return val;
        if (typeof val === 'number' || typeof val === 'string') {
            const id = parseInt(val, 10);
            if (isNaN(id)) return null;
            const scene = this.materia.scene || (typeof window !== 'undefined' ? window.SceneManager?.currentScene : null);
            if (scene) return scene.findMateriaById(id);
        }
        return null;
    }

    _resolveAllTargets() {
        const list = [];
        // Local animator
        if (!this.animator && this.materia) {
            this.animator = this.materia.getComponent(Animator);
        }
        if (this.animator) {
            list.push(this.animator);
        }
        // Primary target animator
        const primary = this._resolveMateria(this.targetMateria);
        if (primary) {
            const anim = primary.getComponent(Animator);
            if (anim && !list.includes(anim)) {
                list.push(anim);
            }
        }
        // Extra target animators
        if (this.extraTargets) {
            const parts = String(this.extraTargets).split(',');
            for (let i = 0; i < parts.length; i++) {
                const target = this._resolveMateria(parts[i].trim());
                if (target) {
                    const anim = target.getComponent(Animator);
                    if (anim && !list.includes(anim)) {
                        list.push(anim);
                    }
                }
            }
        }
        return list;
    }

    play(stateName, force = true, overrides = {}) {
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

        if (!(this.states instanceof Map)) {
            this.states = new Map();
        }

        if (!this.states.has(stateName)) {
            if (debug) console.warn(`[AnimatorController] El estado '${stateName}' no existe en este controlador.`);
            return;
        }

        const state = this.states.get(stateName);
        if (!state) return;

        // Guard: Prevent redundant play calls from resetting current animation frame on every frame.
        if (this.currentStateName === stateName && !overrides.forceRestart) {
            const animators = this._resolveAllTargets();
            let allCorrect = animators.length > 0;
            for (let i = 0; i < animators.length; i++) {
                const anim = animators[i];
                if (!anim.isPlaying || anim.animationClipPath !== state.animationClip) {
                    allCorrect = false;
                    break;
                }
            }
            if (allCorrect) {
                return;
            }
        }

        const animators = this._resolveAllTargets();
        if (animators.length === 0) {
            if (debug) console.warn(`[AnimatorController] No se encontraron animadores para reproducir.`);
            return;
        }

        // If animator is under script control, don't interrupt unless forced (checked on primary/local animator)
        const primaryAnim = this.animator || animators[0];
        if (!force && primaryAnim && primaryAnim._controlSource === 'script' && primaryAnim.isPlaying) {
            if (debug) console.log(`[AnimatorController] Ignorando cambio a '${stateName}' porque el script tiene la prioridad.`);
            return;
        }

        this.currentStateName = stateName;

        for (let i = 0; i < animators.length; i++) {
            const anim = animators[i];
            // Handle projectsDirHandle assignment for external animators
            if (this.projectsDirHandle) {
                anim.projectsDirHandle = this.projectsDirHandle;
            }

            // Handle flipping
            const transform = anim.materia ? anim.materia.getComponent(Transform) : null;
            if (transform) {
                transform.flipX = !!state.flipX;
                transform.flipY = !!state.flipY;
            }

            // Handle empty clip
            if (!state.animationClip) {
                anim.stop();
                continue;
            }

            const sameClip = anim.animationClipPath === state.animationClip && anim.isPlaying;
            // Pass control to animator with overrides support
            anim.play(state.animationClip, {
                loop: overrides.loop !== undefined ? overrides.loop : (state.loop !== undefined ? state.loop : true),
                speed: overrides.speed || state.speed || 12,
                startFrame: overrides.startFrame !== undefined ? overrides.startFrame : (state.startFrame || 0),
                endFrame: overrides.endFrame !== undefined ? overrides.endFrame : (state.endFrame !== undefined ? state.endFrame : -1),
                source: 'controller',
                force: sameClip ? false : force
            });
        }
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

        const animators = this._resolveAllTargets();
        if (animators.length === 0 || !this.controller) return;

        // Fallback to Principal (Entry State) on animation failure
        const primaryAnim = this.animator || animators[0];
        if (primaryAnim && primaryAnim.hasError && this.controller.entryState && this.currentStateName !== this.controller.entryState) {
            if (debug) console.log(`[AnimatorController] Fallback a estado principal '${this.controller.entryState}' por error en animación.`);
            this.play(this.controller.entryState, true); // force fallback
            primaryAnim.hasError = false; // reset error after fallback
        }

        // Resolve tracking target materia (parent/assigned target)
        const trackingMateria = this._resolveMateria(this.targetMateria) || this.materia;

        // Auto-update parameters from components
        const rb = trackingMateria.getComponent(Rigidbody2D);
        const movement = trackingMateria.getComponent(LateralMovement) || trackingMateria.getComponent(TopDownMovement);
        const transform = trackingMateria.getComponent(Transform);

        const isGrounded = movement && movement.isActive && (movement.isGrounded !== undefined ? movement.isGrounded : true);
        const isLateral = movement instanceof LateralMovement;
        const isCrouching = movement && movement.isActive && (movement.isCrouching === true);
        // Intention check: is the user trying to move via Input? (Crouching is an active movement state and shouldn't be counted as a stopped state)
        const isIntentionalStop = movement && movement.isActive && movement.lastMove.x === 0 && ((isLateral && !isCrouching) || movement.lastMove.y === 0) && isGrounded;

        let horiz = 0, vert = 0, moving = false;

        // 1. Check Movement component (Highest priority for intentional input)
        if (movement && movement.isActive && !isIntentionalStop) {
            horiz = movement.lastMove.x;
            if (isLateral && !isGrounded) {
                // In the air, vertical state is always UP (airborne/jump/fall row)
                vert = 1.0;
                moving = true;
            } else {
                vert = movement.lastMove.y;
                moving = true;
            }
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
                if (isLateral && !isGrounded) {
                    vert = 1.0;
                } else {
                    vert = rb.velocity.y;
                }
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

        if (isLateral && !isGrounded) {
            vert = 1.0;
            this._lastMovingVert = 1.0;
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
            if (this.smartMode && !isLateral) {
                this._handleSmartMode();
            }
            // Bypass graph transitions if LateralMovement is active
            // to allow exclusive control over driving states.
            const bypassTransitions = isLateral && movement && movement.isActive;
            if (!bypassTransitions) {
                this._checkTransitions();
            }
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

        const trackingMateria = this._resolveMateria(this.targetMateria) || this.materia;
        const movement = trackingMateria.getComponent(LateralMovement) || trackingMateria.getComponent(TopDownMovement);
        const isLateral = movement instanceof LateralMovement;

        let currentDirIndex = 4; // Center (Idle)

        if (p.isMoving) {
            let h = 0;
            const dz = this.deadZone ?? 0.1;
            if (p.horizontal > dz) h = 1;
            else if (p.horizontal < -dz) h = -1;

            let v = 0;
            if (p.vertical > dz) v = 1;
            else if (p.vertical < -dz) v = -1;

            currentDirIndex = (1 - v) * 3 + (h + 1);
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
            if (!isSameState || !this.animator || !this.animator.isPlaying) {
                // Smart mode should play the direction state directly (bypassing graph transition restrictions)
                // to make movement 100% responsive and avoid requiring 72 manual transition connections.
                this.play(stateName, true);
            }
        } else if (!stateName) {
            if (p.isMoving) {
                // Fallback for diagonals or missing directions
                let h = p.horizontal > 0.1 ? 1 : (p.horizontal < -0.1 ? -1 : 0);
                let v = p.vertical > 0.1 ? 1 : (p.vertical < -0.1 ? -1 : 0);

                let fallbackState = null;
                if (h !== 0 && v !== 0) {
                    if (v !== 0 && isLateral) {
                        // In lateral movement, if in the air, do NOT fall back to walking (horizontal).
                        // Instead, try the pure vertical animation first (like Up / Down).
                        fallbackState = this.controller.movementMapping[(1 - v) * 3 + 1];
                    } else {
                        // Try pure horizontal
                        fallbackState = this.controller.movementMapping[(1) * 3 + (h + 1)];
                        if (!fallbackState || !this.states.has(fallbackState)) {
                            // Try pure vertical
                            fallbackState = this.controller.movementMapping[(1 - v) * 3 + 1];
                        }
                    }
                }

                if (!fallbackState || !this.states.has(fallbackState)) {
                    fallbackState = this.controller.movementMapping[4]; // Idle (Principal)
                }

                if (fallbackState && (this.currentStateName !== fallbackState || !this.animator || !this.animator.isPlaying)) {
                    this.play(fallbackState, true);
                }
            } else {
                // If not moving and dirIndex 4 is not mapped directly, or we are in a walking state
                // and want to return to Idle.
                const idleState = this.controller.movementMapping[4];
                if (idleState && this.currentStateName !== idleState) {
                    this.play(idleState, true);
                }
            }
        } else if (stateName && !this.states.has(stateName)) {
            if (debug) console.warn(`[AnimatorController] SmartMode: El estado mapeado '${stateName}' no existe.`);
        }
    }

    _checkTransitions() {
        if (!this.controller || !this.controller.transitions) return;

        let transitionTaken = false;
        for (const trans of this.controller.transitions) {
            if (trans.from === this.currentStateName) {
                if (this._evaluateConditions(trans.conditions)) {
                    if (trans.duration > 0) {
                        this.crossfade(trans.to, trans.duration, false);
                    } else {
                        this.play(trans.to, false);
                    }
                    transitionTaken = true;
                    break;
                }
            }
        }

        // Automatic fallback if we are in a sub-state and none of its incoming conditions are met anymore
        if (!transitionTaken && this.currentStateName && this.controller.entryState && this.currentStateName !== this.controller.entryState) {
            const incomingTransitions = this.controller.transitions.filter(t => t.to === this.currentStateName);
            if (incomingTransitions.length > 0) {
                const anyIncomingMet = incomingTransitions.some(t => {
                    return !t.conditions || t.conditions.length === 0 || this._evaluateConditions(t.conditions);
                });
                if (!anyIncomingMet) {
                    if (window.CE_DEBUG_ANIMATION) {
                        console.log(`[AnimatorController] Las condiciones para estar en el estado '${this.currentStateName}' ya no se cumplen. Volviendo al estado principal '${this.controller.entryState}'.`);
                    }
                    this.play(this.controller.entryState, true);
                }
            }
        }
    }

    crossfade(stateName, duration = 0.3, force = true, overrides = {}) {
        if (!stateName) return;
        const debug = window.CE_DEBUG_ANIMATION;

        if (!force && this.currentStateName && this.currentStateName !== stateName) {
            if (!this.canTransitionTo(stateName)) return;
        }

        if (!this.animator && this.materia) {
            this.animator = this.materia.getComponent(Animator);
        }

        if (!this.animator || !this.states.has(stateName)) return;

        const state = this.states.get(stateName);
        this.currentStateName = stateName;

        const transform = this.materia.getComponent(Transform);
        if (transform) {
            transform.flipX = !!state.flipX;
            transform.flipY = !!state.flipY;
        }

        if (!state.animationClip) {
            this.animator.stop();
            return;
        }

        this.animator.crossfade(state.animationClip, duration, {
            loop: overrides.loop !== undefined ? overrides.loop : (state.loop !== undefined ? state.loop : true),
            speed: overrides.speed || state.speed || 12,
            source: 'controller',
            force: force
        });
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

        // Bypass transitions and safety fallback if LateralMovement is directly driving the states (Smart Mode)
        const trackingMateria = this._resolveMateria(this.targetMateria) || this.materia;
        if (trackingMateria) {
            const movement = trackingMateria.getComponent(LateralMovement) || trackingMateria.getComponent(TopDownMovement);
            const isLateral = movement instanceof LateralMovement;
            const bypassTransitions = isLateral && movement && movement.isActive;
            if (bypassTransitions) {
                return;
            }
        }

        let transitionFound = false;

        for (const trans of this.controller.transitions) {
            if (trans.from === this.currentStateName && trans.hasExitTime) {
                const hasConditions = trans.conditions && trans.conditions.length > 0;

                // If there are conditions, they must be met
                if (hasConditions) {
                    if (this._evaluateConditions(trans.conditions)) {
                        if (trans.duration > 0) this.crossfade(trans.to, trans.duration);
                        else this.play(trans.to);
                        transitionFound = true;
                        break;
                    }
                } else {
                    // Automatic transition (no conditions):
                    // Only follow if the current animation is NOT looping.
                    // This prevents "Idle -> Walk" automatic jumps when the user is just standing still.
                    if (!this.animator.loop) {
                        if (trans.duration > 0) this.crossfade(trans.to, trans.duration);
                        else this.play(trans.to);
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
        newController.targetMateria = this.targetMateria;
        newController.extraTargets = this.extraTargets;
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

/**
 * Componente UIMask: Recorta los hijos de este objeto para que solo sean visibles dentro de su área.
 */
export class UIMask extends Leyes {
    constructor(materia) {
        super(materia);
        this.showGizmo = false;
    }
    clone() {
        const copy = new UIMask(null);
        copy.showGizmo = this.showGizmo;
        return copy;
    }
}
registerComponent('UIMask', UIMask);

/**
 * Componente UIScrollRect: Permite el desplazamiento de contenido UI.
 */
export class UIScrollRect extends Leyes {
    constructor(materia) {
        super(materia);
        this.contentMateria = null; // Objeto que contiene los elementos a desplazar
        this.horizontal = false;
        this.vertical = true;
        this.scrollPosition = { x: 0, y: 0 };
        this.scrollSensitivity = 1.0;
        this.inertia = 0.9;

        this.horizontalScrollbar = null; // Referencia a un ProgressBar
        this.verticalScrollbar = null;

        this._velocity = { x: 0, y: 0 };
    }

    update(deltaTime) {
        if (this.inertia > 0 && (Math.abs(this._velocity.x) > 0.01 || Math.abs(this._velocity.y) > 0.01)) {
            this.scrollPosition.x += this._velocity.x * deltaTime;
            this.scrollPosition.y += this._velocity.y * deltaTime;
            this._velocity.x *= this.inertia;
            this._velocity.y *= this.inertia;
        }

        // Aplicar posición al contenido
        let content = this.contentMateria;
        if (typeof content === 'number') content = this.materia.scene.findMateriaById(content);
        else if (typeof content === 'string') content = this.materia.findChildByName(content, true);

        if (content) {
            const ui = content.getComponent(window.Components.UITransform);
            const myUI = this.materia.getComponent(window.Components.UITransform);
            if (ui && myUI) {
                // Limitar scroll según el tamaño del contenido
                const maxScrollX = Math.max(0, ui.size.width - myUI.size.width);
                const maxScrollY = Math.max(0, ui.size.height - myUI.size.height);

                this.scrollPosition.x = Math.max(0, Math.min(maxScrollX, this.scrollPosition.x));
                this.scrollPosition.y = Math.max(0, Math.min(maxScrollY, this.scrollPosition.y));

                if (this.horizontal) ui.position.x = -this.scrollPosition.x + (ui.size.width - myUI.size.width) / 2;
                if (this.vertical) ui.position.y = -this.scrollPosition.y + (ui.size.height - myUI.size.height) / 2;

                // Sincronizar barras
                this._syncScrollbar(this.verticalScrollbar, this.scrollPosition.y, maxScrollY);
                this._syncScrollbar(this.horizontalScrollbar, this.scrollPosition.x, maxScrollX);
            }
        }
    }

    _syncScrollbar(sbRef, pos, max) {
        if (!sbRef) return;
        let sb = sbRef;
        if (typeof sb === 'number') sb = this.materia.scene.findMateriaById(sb);
        else if (typeof sb === 'string') sb = this.materia.findChildByName(sb, true);

        if (sb) {
            const pb = sb.getComponent(ProgressBar);
            if (pb) {
                pb.maxValue = max || 1;
                pb.value = pos;
            }
        }
    }

    clone() {
        const copy = new UIScrollRect(null);
        copy.contentMateria = this.contentMateria;
        copy.horizontal = this.horizontal;
        copy.vertical = this.vertical;
        copy.scrollPosition = { ...this.scrollPosition };
        copy.scrollSensitivity = this.scrollSensitivity;
        copy.inertia = this.inertia;
        copy.horizontalScrollbar = this.horizontalScrollbar;
        copy.verticalScrollbar = this.verticalScrollbar;
        return copy;
    }
}
registerComponent('UIScrollRect', UIScrollRect);

/**
 * Componente UICollider: Define un área de colisión específica para elementos UI.
 */
export class UICollider extends Leyes {
    constructor(materia) {
        super(materia);
        this.isTrigger = true;
    }
    clone() {
        const copy = new UICollider(null);
        copy.isTrigger = this.isTrigger;
        return copy;
    }
}
registerComponent('UICollider', UICollider);

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
        this.targetMateria = null; // ID or Name of target Materia to follow
        this.offset = { x: 0, y: 0 };
        this.autoscroll = { x: 0, y: 0 };

        // Internal state
        this._autoOffset = { x: 0, y: 0 };
        this._initialPosition = null;
        this._initialTargetPosition = null;
    }
    update(deltaTime) {
        const isGame = typeof window !== 'undefined' && (window.isGameRunning || window.CE_Standalone_Scripts);
        if (!isGame) {
            this._initialPosition = null;
            this._initialTargetPosition = null;
            return;
        }

        if (this.autoscroll.x !== 0 || this.autoscroll.y !== 0) {
            this._autoOffset.x += this.autoscroll.x * deltaTime;
            this._autoOffset.y += this.autoscroll.y * deltaTime;
        }
    }
    clone() {
        const newParallax = new Parallax(null);
        newParallax.scrollFactor = { ...this.scrollFactor };
        newParallax.targetMateria = this.targetMateria;
        newParallax.offset = { ...this.offset };
        newParallax.autoscroll = { ...this.autoscroll };
        return newParallax;
    }
}
registerComponent('Parallax', Parallax);

export class LateralMovement extends Leyes {
    static actionableMethods = {
        'jump': ['saltar', 'прыгать', '跳跃'],
        'stop': ['detener', 'остановить', '停止']
    };

    constructor(materia) {
        super(materia);
        this.leftKey = 'a';
        this.rightKey = 'd';
        this.downKey = 's'; // Tecla para agacharse
        this.jumpKey = 'space';
        this.speed = 200;
        this.jumpForce = 400;
        this.useRigidbody = true;
        this.crouchSpeedMultiplier = 0.5; // Multiplicador de velocidad al agacharse
        this.groundTag = 'Ground';
        this.isGrounded = false;
        this.isCrouching = false;
        this.lastMove = { x: 0, y: 0 };

        this.moveSound = ""; // Ruta al sonido de movimiento
        this.jumpSound = ""; // Ruta al sonido de salto

        this.useCustomAnimations = false; // Casilla para animaciones específicas

        // Animations
        this.idleAnim = "idle";
        this.runAnim = "run";
        this.jumpAnim = "jump";
        this.fallAnim = "fall";
        this.crouchAnim = "crouch"; // Animación de agachado
        this.jumpLeftAnim = "";
        this.jumpRightAnim = "";
        this.crouchLeftAnim = "";
        this.crouchRightAnim = "";

        this._warnedMissing = new Set();
        this._lastErrorTime = 0;
    }

    start() {
        if (this.useRigidbody && !this.materia.getComponentByName('Rigidbody2D')) {
            console.error(`[LateralMovement] El objeto '${this.materia.name}' requiere un componente 'Rigidbody2D' (Fisicas) para caer y moverse.`);
        }
    }
    update(deltaTime) {
        if (this.useRigidbody && !this.materia.getComponentByName('Rigidbody2D')) {
            if (!this._lastErrorTime || (performance.now() - this._lastErrorTime > 5000)) {
                console.error(`[FÍSICAS] ¡El objeto '${this.materia.name}' no tiene Rigidbody2D! No podrá caer ni moverse físicamente.`);
                this._lastErrorTime = performance.now();
            }
            return;
        }

        const input = RuntimeAPIManager.getAPI('input');
        const engine = RuntimeAPIManager.getAPI('engine');
        if (!input) return;

        const rb = this.materia.getComponent(Rigidbody2D);
        const transform = this.materia.getComponent(Transform);

        // Ground check with stability buffer to avoid contact flicker
        let grounded = false;
        if (this.groundTag && engine) {
            grounded = engine.isTouchingTag(this.materia, this.groundTag);
        } else {
            grounded = true;
        }

        // Stability buffer: if the physics engine has a tiny fluctuation but vertical velocity is close to zero,
        // and we were already grounded, keep us grounded to prevent single-frame air stutters.
        if (rb) {
            const isRestingY = Math.abs(rb.velocity.y) < 1.0;
            if (!grounded && isRestingY && this.isGrounded) {
                grounded = true;
            }
        }

        const wasGrounded = this._lastLoggedGrounded !== undefined ? this._lastLoggedGrounded : this.isGrounded;
        this.isGrounded = grounded;

        let moveX = 0;
        if (input.isKeyPressed(this.rightKey)) moveX += 1;
        if (input.isKeyPressed(this.leftKey)) moveX -= 1;

        this.lastMove.x = moveX;

        const wasCrouching = this._lastLoggedCrouching !== undefined ? this._lastLoggedCrouching : this.isCrouching;
        const isCrouching = this.isGrounded && input.isKeyPressed(this.downKey);
        this.isCrouching = isCrouching;
        this.lastMove.y = isCrouching ? -1 : 0;
        const currentSpeed = isCrouching ? this.speed * (this.crouchSpeedMultiplier !== undefined ? this.crouchSpeedMultiplier : 0.5) : this.speed;

        if (this.isGrounded !== wasGrounded || this.isCrouching !== wasCrouching) {
            console.log(`[LateralMovement DEBUG] grounded: ${wasGrounded} -> ${this.isGrounded} | crouching: ${wasCrouching} -> ${this.isCrouching} (rb.velocity.y: ${rb ? rb.velocity.y.toFixed(2) : '0.00'})`);
            this._lastLoggedGrounded = this.isGrounded;
            this._lastLoggedCrouching = this.isCrouching;
        }

        if (this.useRigidbody) {
            if (rb) {
                rb.velocity.x = moveX * (currentSpeed / 10);

                if (this.isGrounded && input.isKeyJustPressed(this.jumpKey) && !isCrouching) {
                    rb.addImpulse(0, this.jumpForce / 10);

                    // Stop running sound when jumping
                    const audio = this.materia.getComponent(AudioSource);
                    if (audio && this.moveSound && audio.isPlaying) audio.stop();

                    if (this.jumpSound) {
                        const audio = this.materia.getComponent(AudioSource);
                        if (audio) audio.play(this.jumpSound);
                        else if (!this._warnedMissing.has('AudioSource')) {
                            this._warnedMissing.add('AudioSource');
                            throw new Error(`El componente 'LateralMovement' requiere un 'AudioSource' para reproducir el sonido de salto.`);
                        }
                    }
                }
            } else if (!this._warnedMissing.has('Rigidbody2D')) {
                this._warnedMissing.add('Rigidbody2D');
                throw new Error(`El componente 'LateralMovement' tiene activado 'Usar Rigidbody' pero no hay un 'Rigidbody2D' en el objeto.`);
            }
        } else if (transform) {
            transform.x += moveX * currentSpeed * deltaTime;
        }

        // Sonido de movimiento (no reproducir si está quieto o agachado sin moverse, o agachado si lo prefieres)
        if (this.isGrounded && moveX !== 0 && this.moveSound) {
            const audio = this.materia.getComponent(AudioSource);
            if (audio) {
                if (!audio.isPlaying) audio.play(this.moveSound);
            } else if (!this._warnedMissing.has('AudioSource')) {
                this._warnedMissing.add('AudioSource');
                throw new Error(`El componente 'LateralMovement' requiere un 'AudioSource' para reproducir el sonido de movimiento.`);
            }
        } else if (moveX === 0 || !this.isGrounded) {
            const audio = this.materia.getComponent(AudioSource);
            if (audio && audio.isPlaying && this.moveSound) {
                if (audio.source === this.moveSound) audio.stop();
            }
        }

        // --- Animation Integration ---
        this._updateAnimations(moveX, 0, rb);
    }

    _updateAnimations(moveX, moveY, rb) {
        const controller = this.materia.getComponent(AnimatorController);
        const animator = this.materia.getComponent(Animator);
        if (!controller && !animator) return;

        const transform = this.materia.getComponent(Transform);

        // Determine active horizontal direction from keys or physics velocity (ONLY while in the air for jump/fall accuracy)
        let activeMoveX = moveX;
        if (!this.isGrounded && activeMoveX === 0 && rb) {
            if (rb.velocity.x > 0.5) activeMoveX = 1;
            else if (rb.velocity.x < -0.5) activeMoveX = -1;
        }

        if (!this.useCustomAnimations) {
            // If useCustomAnimations is false, and there's an AnimatorController, LateralMovement takes direct control
            // of driving the states mapped to the 3x3 direction grid (Smart Mode)
            if (controller && controller.controller && controller.controller.movementMapping) {
                let dirIndex = 4; // Center (Idle)

                if (!this.isGrounded) {
                    if (activeMoveX < -0.01) {
                        dirIndex = 0; // Up-Left (Jump Left)
                    } else if (activeMoveX > 0.01) {
                        dirIndex = 2; // Up-Right (Jump Right)
                    } else {
                        dirIndex = 1; // Up (Jump straight)
                    }
                } else if (this.isCrouching) {
                    if (activeMoveX < -0.01) {
                        dirIndex = 6; // Down-Left (Crouch Left)
                    } else if (activeMoveX > 0.01) {
                        dirIndex = 8; // Down-Right (Crouch Right)
                    } else {
                        dirIndex = 7; // Down (Crouch still)
                    }
                } else {
                    if (activeMoveX < -0.01) {
                        dirIndex = 3; // Left (Run Left)
                    } else if (activeMoveX > 0.01) {
                        dirIndex = 5; // Right (Run Right)
                    } else {
                        dirIndex = 4; // Idle / Center
                    }
                }

                let stateName = controller.controller.movementMapping[dirIndex];
                if (!stateName) {
                    // Fallback for missing diagonal or specific states
                    if (dirIndex === 0 || dirIndex === 2) {
                        stateName = controller.controller.movementMapping[1]; // Fallback to Up (Jump straight)
                    } else if (dirIndex === 6 || dirIndex === 8) {
                        stateName = controller.controller.movementMapping[7]; // Fallback to Down (Crouch still)
                    }
                    if (!stateName) {
                        stateName = controller.controller.movementMapping[4] || controller.controller.entryState; // Final fallback to Idle or Entry State
                    }
                }

                if (stateName) {
                    controller.play(stateName, true);
                    if (transform && activeMoveX !== 0) {
                        transform.flipX = activeMoveX < 0;
                    }
                    return;
                }
            }
            return;
        }

        const play = (name) => {
            if (!name) return;
            if (controller) controller.play(name, true); // Explicitly force-play direct calls from LateralMovement
            else animator.play(name);
        };

        if (!this.isGrounded) {
            let animToPlay = "";
            if (activeMoveX < -0.01) {
                animToPlay = this.jumpLeftAnim || this.jumpAnim || this.fallAnim || "jump";
            } else if (activeMoveX > 0.01) {
                animToPlay = this.jumpRightAnim || this.jumpAnim || this.fallAnim || "jump";
            } else {
                if (rb && rb.velocity.y < -0.1) {
                    animToPlay = this.fallAnim || this.jumpAnim || "jump";
                } else {
                    animToPlay = this.jumpAnim || "jump";
                }
            }
            play(animToPlay);
            if (transform && activeMoveX !== 0) {
                transform.flipX = activeMoveX < 0;
            }
        } else {
            if (this.isCrouching) {
                let animToPlay = "";
                if (activeMoveX < -0.01) {
                    animToPlay = this.crouchLeftAnim || this.crouchAnim || "crouch";
                } else if (activeMoveX > 0.01) {
                    animToPlay = this.crouchRightAnim || this.crouchAnim || "crouch";
                } else {
                    animToPlay = this.crouchAnim || "crouch";
                }
                play(animToPlay);
                if (transform && activeMoveX !== 0) {
                    transform.flipX = activeMoveX < 0;
                }
            } else if (Math.abs(activeMoveX) > 0.01) {
                play(this.runAnim || "run");
                if (transform && activeMoveX !== 0) {
                    transform.flipX = activeMoveX < 0;
                }
            } else {
                play(this.idleAnim || "idle");
            }
        }
    }

    jump() {
        const rb = this.materia.getComponent(Rigidbody2D);
        if (rb && this.isGrounded) {
            rb.addImpulse(0, this.jumpForce / 10);
            if (this.jumpSound) {
                const audio = this.materia.getComponent(AudioSource);
                if (audio) audio.play(this.jumpSound);
            }
        }
    }

    stop() {
        const rb = this.materia.getComponent(Rigidbody2D);
        if (rb) {
            rb.velocity.x = 0;
        }
        this.lastMove.x = 0;
    }

    clone() {
        const newMovement = new LateralMovement(null);
        newMovement.leftKey = this.leftKey;
        newMovement.rightKey = this.rightKey;
        newMovement.downKey = this.downKey;
        newMovement.jumpKey = this.jumpKey;
        newMovement.speed = this.speed;
        newMovement.jumpForce = this.jumpForce;
        newMovement.useRigidbody = this.useRigidbody;
        newMovement.crouchSpeedMultiplier = this.crouchSpeedMultiplier;
        newMovement.groundTag = this.groundTag;
        newMovement.moveSound = this.moveSound;
        newMovement.jumpSound = this.jumpSound;
        newMovement.useCustomAnimations = this.useCustomAnimations;
        newMovement.idleAnim = this.idleAnim;
        newMovement.runAnim = this.runAnim;
        newMovement.jumpAnim = this.jumpAnim;
        newMovement.fallAnim = this.fallAnim;
        newMovement.crouchAnim = this.crouchAnim;
        newMovement.jumpLeftAnim = this.jumpLeftAnim;
        newMovement.jumpRightAnim = this.jumpRightAnim;
        newMovement.crouchLeftAnim = this.crouchLeftAnim;
        newMovement.crouchRightAnim = this.crouchRightAnim;
        return newMovement;
    }
}
registerComponent('LateralMovement', LateralMovement);

export class TopDownMovement extends Leyes {
    static actionableMethods = {
        'stop': ['detener', 'остановить', '停止']
    };

    constructor(materia) {
        super(materia);
        this.upKey = 'w';
        this.downKey = 's';
        this.leftKey = 'a';
        this.rightKey = 'd';
        this.speed = 200;
        this.useRigidbody = true;
        this.lastMove = { x: 0, y: 0 };

        this.moveSound = ""; // Ruta al sonido de movimiento

        this.useCustomAnimations = true; // Casilla para animaciones específicas

        // Animations
        this.idleAnim = "idle";
        this.runAnim = "run";

        this._warnedMissing = new Set();
        this._lastErrorTime = 0;
    }

    start() {
        if (this.useRigidbody && !this.materia.getComponentByName('Rigidbody2D')) {
            console.error(`[TopDownMovement] El objeto '${this.materia.name}' requiere un componente 'Rigidbody2D' (Fisicas) para moverse.`);
        }
    }
    update(deltaTime) {
        if (this.useRigidbody && !this.materia.getComponentByName('Rigidbody2D')) {
            if (!this._lastErrorTime || (performance.now() - this._lastErrorTime > 5000)) {
                console.error(`[FÍSICAS] ¡El objeto '${this.materia.name}' no tiene Rigidbody2D! No podrá moverse físicamente.`);
                this._lastErrorTime = performance.now();
            }
            return;
        }

        const input = RuntimeAPIManager.getAPI('input');
        if (!input) return;

        let moveX = 0;
        let moveY = 0;

        if (input.isKeyPressed(this.rightKey)) moveX += 1;
        if (input.isKeyPressed(this.leftKey)) moveX -= 1;
        if (input.isKeyPressed(this.upKey)) moveY += 1;
        if (input.isKeyPressed(this.downKey)) moveY -= 1;

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

        if (this.useRigidbody) {
            if (rb) {
                rb.velocity.x = moveX * (this.speed / 10);
                rb.velocity.y = moveY * (this.speed / 10);
            } else if (!this._warnedMissing.has('Rigidbody2D')) {
                this._warnedMissing.add('Rigidbody2D');
                throw new Error(`El componente 'TopDownMovement' tiene activado 'Usar Rigidbody' pero no hay un 'Rigidbody2D' en el objeto.`);
            }
        } else if (transform) {
            transform.x += moveX * this.speed * deltaTime;
            transform.y += moveY * this.speed * deltaTime;
        }

        // Sonido de movimiento
        if ((moveX !== 0 || moveY !== 0) && this.moveSound) {
            const audio = this.materia.getComponent(AudioSource);
            if (audio) {
                if (!audio.isPlaying) audio.play(this.moveSound);
            } else if (!this._warnedMissing.has('AudioSource')) {
                this._warnedMissing.add('AudioSource');
                throw new Error(`El componente 'TopDownMovement' requiere un 'AudioSource' para reproducir el sonido de movimiento.`);
            }
        } else if (moveX === 0 && moveY === 0) {
            const audio = this.materia.getComponent(AudioSource);
            if (audio && audio.isPlaying && this.moveSound) {
                if (audio.source === this.moveSound) audio.stop();
            }
        }

        // --- Animation Integration ---
        this._updateAnimations(moveX, moveY, rb);
    }

    _updateAnimations(moveX, moveY, rb) {
        if (!this.useCustomAnimations) return;

        const controller = this.materia.getComponent(AnimatorController);
        const animator = this.materia.getComponent(Animator);
        if (!controller && !animator) return;

        const play = (name) => {
            if (!name) return;
            if (controller) controller.play(name);
            else animator.play(name);
        };

        const transform = this.materia.getComponent(Transform);

        if (Math.abs(moveX) > 0.01 || Math.abs(moveY) > 0.01) {
            play(this.runAnim);
            if (transform && moveX !== 0) {
                transform.flipX = moveX < 0;
            }
        } else {
            play(this.idleAnim);
        }
    }

    stop() {
        const rb = this.materia.getComponent(Rigidbody2D);
        if (rb) {
            rb.velocity.x = 0;
            rb.velocity.y = 0;
        }
        this.lastMove.x = 0;
        this.lastMove.y = 0;
    }

    clone() {
        const newMovement = new TopDownMovement(null);
        newMovement.upKey = this.upKey;
        newMovement.downKey = this.downKey;
        newMovement.leftKey = this.leftKey;
        newMovement.rightKey = this.rightKey;
        newMovement.speed = this.speed;
        newMovement.useRigidbody = this.useRigidbody;
        newMovement.moveSound = this.moveSound;
        newMovement.useCustomAnimations = this.useCustomAnimations;
        newMovement.idleAnim = this.idleAnim;
        newMovement.runAnim = this.runAnim;
        return newMovement;
    }
}
registerComponent('TopDownMovement', TopDownMovement);

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
            const scene = this.materia.scene || (typeof window !== 'undefined' ? window.SceneManager?.currentScene : null);
            if (scene) targetObj = scene.findMateriaById(targetObj);
        }
        if (!targetObj) return;

        const targetTransform = targetObj.getComponent(Transform);
        const camTransform = this.materia.getComponent(Transform);
        if (!targetTransform || !camTransform) return;

        const targetX = this.followX ? targetTransform.position.x + this.offset.x : camTransform.x;
        const targetY = this.followY ? targetTransform.position.y + this.offset.y : camTransform.y;

        // Apply movement using setters to ensure the actual transform is updated
        camTransform.x += (targetX - camTransform.x) * this.smoothness;
        camTransform.y += (targetY - camTransform.y) * this.smoothness;
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
        this._width = 30;
        this._height = 20;
        this.manualSize = false;
        this.layers = [{
            name: 'Base',
            position: { x: 0, y: 0 },
            tileData: new Map()
        }];
        this.activeLayerIndex = 0;
    }

    get width() { return this._width; }
    set width(v) {
        const val = parseInt(v, 10) || 0;
        if (this._width !== val) {
            this._width = val;
            this._dirtyCollider();
        }
    }

    get height() { return this._height; }
    set height(v) {
        const val = parseInt(v, 10) || 0;
        if (this._height !== val) {
            this._height = val;
            this._dirtyCollider();
        }
    }

    addLayer(x = 0, y = 0) {
        this.layers.push({
            name: 'Layer ' + this.layers.length,
            position: { x, y },
            tileData: new Map()
        });
        this._dirtyCollider();
    }

    removeLayer(index) {
        if (index > 0 && index < this.layers.length) {
            this.layers.splice(index, 1);
            if (this.activeLayerIndex >= index) {
                this.activeLayerIndex = Math.max(0, this.activeLayerIndex - 1);
            }
            this._dirtyCollider();
        }
    }

    _dirtyCollider() {
        if (!this.materia) return;
        const collider = this.materia.getComponent(TilemapCollider2D);
        if (collider) collider.isDirty = true;
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
        this._sourceLayerIndex = 0; // Which layer to use for collision
        this._useAllLayers = false;
        this.generatedColliders = []; // Array of {x, y, width, height} objects
        this.isDirty = true;

        // Always initialize _cachedMesh as a Map. This prevents corrupted data
        // from scene deserialization from breaking the renderer.
        this._cachedMesh = new Map();
    }

    get sourceLayerIndex() { return this._sourceLayerIndex; }
    set sourceLayerIndex(v) {
        const val = parseInt(v, 10) || 0;
        if (this._sourceLayerIndex !== val) {
            this._sourceLayerIndex = val;
            this.isDirty = true;
        }
    }

    get useAllLayers() { return this._useAllLayers; }
    set useAllLayers(v) {
        const val = v === true || v === 'true';
        if (this._useAllLayers !== val) {
            this._useAllLayers = val;
            this.isDirty = true;
        }
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

    get usarTodasLasCapas() { return this.useAllLayers; }
    set usarTodasLasCapas(v) { this.useAllLayers = v; }

    /**
     * Generates an optimized mesh of rectangles for a specific layer using a greedy meshing algorithm.
     * The result is cached.
     */
    generateMesh() {
        // Self-healing is now handled by the constructor and getMeshForLayer
        if (!(this._cachedMesh instanceof Map)) {
            this._cachedMesh = new Map();
        }

        const tilemap = this.materia.getComponent(Tilemap) || this.materia.getComponentInParent(Tilemap) || this.materia.getComponentInChildren(Tilemap);
        const grid = this.materia.getComponentInParent(Grid) || this.materia.getComponent(Grid) || this.materia.getComponentInChildren(Grid);

        if (!tilemap || !grid) {
            console.warn("[TilemapCollider2D] No se encontró el componente Tilemap o Grid para generar colisiones.");
            this._cachedMesh.clear();
            this.generatedColliders = [];
            this.isDirty = false;
            return;
        }

        this.generatedColliders = [];
        this.generatedPolygons = []; // For slopes
        const { cellSize } = grid;
        const layerWidth = tilemap.width * cellSize.x;
        const layerHeight = tilemap.height * cellSize.y;

        for (let i = 0; i < tilemap.layers.length; i++) {
            const layer = tilemap.layers[i];
            const tiles = new Set();
            const slopeTiles = new Map(); // key -> type

            for (const [key, value] of layer.tileData.entries()) {
                if (value) {
                    const slopeType = this._detectSlopeType(value);
                    if (slopeType !== 'none') {
                        slopeTiles.set(key, slopeType);
                    } else {
                        tiles.add(key);
                    }
                }
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

            // Generate Slopes (Polygons)
            if (this.useAllLayers || i == this.sourceLayerIndex) {
                const layerOffsetX = layer.position.x * layerWidth;
                const layerOffsetY = layer.position.y * layerHeight;

                for (const [key, type] of slopeTiles.entries()) {
                    const [c, r] = key.split(',').map(Number);
                    const rectWidth_pixels = cellSize.x;
                    const rectHeight_pixels = cellSize.y;
                    const rectCenterX = (c * cellSize.x) - (layerWidth / 2) + layerOffsetX + rectWidth_pixels / 2;
                    const rectCenterY = (layerHeight / 2) - (r * cellSize.y) - (rectHeight_pixels / 2) + layerOffsetY;

                    const hw = rectWidth_pixels / 2;
                    const hh = rectHeight_pixels / 2;

                    let vertices = [];
                    // Standard Y-UP coordinates: -hh is Bottom, hh is Top. -hw is Left, hw is Right.
                    // slope_up (Floor /): BL, BR, TR
                    if (type === 'slope_up') vertices = [{x: -hw, y: -hh}, {x: hw, y: -hh}, {x: hw, y: hh}];
                    // slope_down (Floor \): BL, BR, TL
                    else if (type === 'slope_down') vertices = [{x: -hw, y: -hh}, {x: hw, y: -hh}, {x: -hw, y: hh}];
                    // slope_up_inv (Ceiling \): TL, TR, BR
                    else if (type === 'slope_up_inv') vertices = [{x: -hw, y: hh}, {x: hw, y: hh}, {x: hw, y: -hh}];
                    // slope_down_inv (Ceiling /): TL, TR, BL
                    else if (type === 'slope_down_inv') vertices = [{x: -hw, y: hh}, {x: hw, y: hh}, {x: -hw, y: -hh}];

                    if (vertices.length > 0) {
                        this.generatedPolygons.push({
                            vertices: vertices.map(v => ({ x: v.x + rectCenterX, y: v.y + rectCenterY }))
                        });
                    }
                }
            }

            // Now, convert these rects to world-space colliders for the physics engine
            // This is only done for the layer specified in the component's properties
            // We use loose comparison just in case types are mixed
            if (this.useAllLayers || i == this.sourceLayerIndex) {
                const layerOffsetX = layer.position.x * layerWidth;
                const layerOffsetY = layer.position.y * layerHeight;

                for (const rect of rects) {
                    const rectWidth_pixels = rect.width * cellSize.x;
                    const rectHeight_pixels = rect.height * cellSize.y;

                    // In +Y UP, Row 0 is at the top of the layer.
                    // Visual Top Y of layer = layerHeight / 2 + layerOffsetY
                    // Center Y = Top Y - (rect.row * cellSize.y) - (rectHeight_pixels / 2)
                    const centerX = (rect.col * cellSize.x) - (layerWidth / 2) + layerOffsetX + rectWidth_pixels / 2;
                    const centerY = -((rect.row * cellSize.y) - (layerHeight / 2) + (rectHeight_pixels / 2)) + layerOffsetY;

                    this.generatedColliders.push({
                        x: centerX,
                        y: centerY,
                        width: rectWidth_pixels,
                        height: rectHeight_pixels
                    });
                }
            }
        }
        this.isDirty = false;
    }

    _detectSlopeType(tile) {
        // We use the tile's metadata if present, or analyze name
        const name = (tile.name || "").toLowerCase();
        if (name.includes("slope")) {
            if (name.includes("up") && name.includes("inv")) return "slope_up_inv";
            if (name.includes("down") && name.includes("inv")) return "slope_down_inv";
            if (name.includes("up")) return "slope_up";
            if (name.includes("down")) return "slope_down";
        }

        if (tile.isSlope) return tile.slopeType || 'slope_up';

        return "none";
    }

    generate() {
        this.generateMesh();
    }

    clone() {
        const newCollider = new TilemapCollider2D(null);
        newCollider.usedByComposite = this.usedByComposite;
        newCollider.usedByEffector = this.usedByEffector;
        newCollider.isTrigger = this.isTrigger;
        newCollider.offset = { ...this.offset };
        newCollider.sourceLayerIndex = this.sourceLayerIndex;
        newCollider.useAllLayers = this.useAllLayers;

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
                    // In +Y UP, row 0 is top. CenterY = (Height/2) - (r*res) - (rectHeight/2)
                    const centerY = (height / 2) - (r * res) - (rectHeight / 2);
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
                            // In +Y UP, Pixel Y=0 is top. World Y = (Height/2) - Pixel Y
                            const centered = simplified.map(v => ({
                                x: v.x - width / 2,
                                y: (height / 2) - v.y
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
    static actionableMethods = {
        'launch': ['lanzar', 'запустить', '发射'],
        'fire': ['disparar', 'огонь', '开火']
    };

    constructor(materia) {
        super(materia);
        this.projectilePrefab = ""; // Ruta al .ceprefab
        this.fireKey = "Space";
        this.fireRate = 0.5;
        this.projectileSpeed = 500;
        this.offset = { x: 0, y: 0 };
        this.direction = { x: 1, y: 0 };
        this.fireSound = "";

        this._lastFireTime = 0;
        this._warnedMissing = new Set();
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

        if (this.fireSound) {
            const audio = this.materia.getComponent(AudioSource);
            if (audio) {
                audio.play(this.fireSound);
            } else if (!this._warnedMissing.has('AudioSource')) {
                this._warnedMissing.add('AudioSource');
                console.error(`[Lanzador] El objeto '${this.materia.name}' necesita un componente 'AudioSource' para reproducir el sonido: ${this.fireSound}`);
            }
        }

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
    get sonidoDisparo() { return this.fireSound; }
    set sonidoDisparo(v) { this.fireSound = v; }

    clone() {
        const newPl = new ProjectileLauncher(null);
        newPl.projectilePrefab = this.projectilePrefab;
        newPl.fireKey = this.fireKey;
        newPl.fireRate = this.fireRate;
        newPl.projectileSpeed = this.projectileSpeed;
        newPl.direction = { ...this.direction };
        newPl.offset = { ...this.offset };
        newPl.fireSound = this.fireSound;
        newPl._warnedMissing = new Set();
        return newPl;
    }
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

    clone() {
        const newAd = new AutoDestroy(null);
        newAd.delay = this.delay;
        return newAd;
    }
}

/**
 * Componente que gestiona la vida de un objeto.
 */
export class Health extends Leyes {
    static actionableMethods = {
        'damage': ['danar', 'causarDano', 'нанестиУрон', '造成伤害'],
        'heal': ['curar', 'curarPT', 'лечить', '治疗'],
        'onDeath': ['alMorir', 'умереть', '死亡']
    };

    constructor(materia) {
        super(materia);
        this.maxHealth = 100;
        this.currentHealth = 100;
        this.destroyOnDeath = true;
        this.deathAnimation = "";
        this.freezeFrame = -1;
        this.destructionDelay = 2.0;
        this.disableMovementOnDeath = true;
        this.isDead = false;
    }

    damage(amount) {
        if (this.isDead) return;
        this.currentHealth -= amount;
        if (this.currentHealth <= 0) {
            this.currentHealth = 0;
            this.onDeath();
        }
    }

    danar(cantidad) { this.damage(cantidad); }
    causarDano(cantidad) { this.damage(cantidad); }
    нанестиУрон(cantidad) { this.damage(cantidad); }
    造成伤害(cantidad) { this.damage(cantidad); }

    heal(amount) {
        if (this.isDead) return;
        this.currentHealth += amount;
        if (this.currentHealth > this.maxHealth) {
            this.currentHealth = this.maxHealth;
        }
    }

    curar(cantidad) { this.heal(cantidad); }
    curarPT(cantidad) { this.heal(cantidad); }
    лечить(cantidad) { this.heal(cantidad); }
    治疗(cantidad) { this.heal(cantidad); }

    onDeath() {
        if (this.isDead) return;
        this.isDead = true;

        // Play death animation
        const animator = this.materia.getComponent(Animator);
        if (animator && this.deathAnimation) {
            animator.play(this.deathAnimation, {
                loop: false,
                endFrame: this.freezeFrame !== -1 ? this.freezeFrame : undefined,
                force: true
            });
        }

        // Disable movement and control components
        if (this.disableMovementOnDeath) {
            const moveComponents = [
                'Movement', 'VehicleTopDown', 'PlaneController', 'HelicopterController', 'BasicAI', 'Rigidbody2D'
            ];
            moveComponents.forEach(name => {
                const comp = this.materia.getComponentByName(name);
                if (comp) {
                    if (name === 'Rigidbody2D') {
                        comp.velocity = { x: 0, y: 0 };
                        comp.angularVelocity = 0;
                    } else {
                        comp.isActive = false;
                    }
                }
            });
        }

        // Send death message to scripts
        this.materia.leyes.forEach(ley => {
            if (ley instanceof CreativeScript) {
                ley._safeInvoke('alMorir');
                ley._safeInvoke('onDeath');
            }
        });

        // Optional destruction after delay
        if (this.destroyOnDeath && this.materia.scene && this.destructionDelay >= 0) {
            setTimeout(() => {
                if (this.materia && this.materia.scene) {
                    this.materia.scene.removeMateria(this.materia.id);
                }
            }, this.destructionDelay * 1000);
        }
    }

    get vidaMaxima() { return this.maxHealth; }
    set vidaMaxima(v) { this.maxHealth = v; }
    get vidaMaximaPT() { return this.maxHealth; }
    set vidaMaximaPT(v) { this.maxHealth = v; }
    get максЗдоровье() { return this.maxHealth; }
    set максЗдоровье(v) { this.maxHealth = v; }
    get 最大健康() { return this.maxHealth; }
    set 最大健康(v) { this.maxHealth = v; }

    get vidaActual() { return this.currentHealth; }
    set vidaActual(v) { this.currentHealth = v; }
    get vidaAtual() { return this.currentHealth; }
    set vidaAtual(v) { this.currentHealth = v; }
    get текущееЗдоровье() { return this.currentHealth; }
    set текущееЗдоровье(v) { this.currentHealth = v; }
    get 当前健康() { return this.currentHealth; }
    set 当前健康(v) { this.currentHealth = v; }
    get animacionMuerte() { return this.deathAnimation; }
    set animacionMuerte(v) { this.deathAnimation = v; }
    get fotogramaCongelado() { return this.freezeFrame; }
    set fotogramaCongelado(v) { this.freezeFrame = v; }
    get tiempoDesaparicion() { return this.destructionDelay; }
    set tiempoDesaparicion(v) { this.destructionDelay = v; }

    clone() {
        const newHealth = new Health(null);
        newHealth.maxHealth = this.maxHealth;
        newHealth.currentHealth = this.currentHealth;
        newHealth.destroyOnDeath = this.destroyOnDeath;
        newHealth.deathAnimation = this.deathAnimation;
        newHealth.freezeFrame = this.freezeFrame;
        newHealth.destructionDelay = this.destructionDelay;
        newHealth.disableMovementOnDeath = this.disableMovementOnDeath;
        newHealth.isDead = this.isDead;
        return newHealth;
    }
}

/**
 * Componente que gestiona el ataque de un objeto.
 */
export class Attack extends Leyes {
    static actionableMethods = {
        'attack': ['atacar', 'выполнитьАтаку', '进行攻击'],
        'atacar': ['atacar', 'выполнитьАтаку', '进行攻击']
    };

    constructor(materia) {
        super(materia);
        this.attacks = [
            { key: 'j', animation: '', sound: '', damage: 10, pushForce: 5, duration: 0.2 }
        ];
        this.colliderMateria = null; // Materia ID that acts as the hit area
        this.cooldown = 0.3;
        this.cycleKey = ""; // If set, this key will cycle through the attacks list

        this._timer = 0;
        this._cycleIndex = 0;
        this._isAttacking = false;
        this._attackWindow = 0;
        this._currentAttack = null;
        this._hitObjects = new Set();
        this._warnedMissing = new Set();
    }

    update(deltaTime) {
        if (this._timer > 0) this._timer -= deltaTime;

        if (this._isAttacking) {
            this._attackWindow -= deltaTime;
            this._applyHitLogic();
            if (this._attackWindow <= 0) {
                this._isAttacking = false;
            }
            return;
        }

        const input = RuntimeAPIManager.getAPI('input');
        if (input && this._timer <= 0) {
            // Check for individual attack keys
            for (const atk of this.attacks) {
                if (atk.key && input.isKeyJustPressed(atk.key)) {
                    this.executeAttack(atk);
                    return;
                }
            }

            // Check for cycle key
            if (this.cycleKey && input.isKeyJustPressed(this.cycleKey) && this.attacks.length > 0) {
                const atk = this.attacks[this._cycleIndex];
                this.executeAttack(atk);
                this._cycleIndex = (this._cycleIndex + 1) % this.attacks.length;
            }
        }
    }

    executeAttack(atk) {
        const audio = this.materia.getComponentByName('AudioSource');
        if (atk.sound && !audio) {
            console.error(`[Ataque] El objeto '${this.materia.name}' necesita un componente 'AudioSource' para reproducir el sonido: ${atk.sound}`);
        }

        this._isAttacking = true;
        this._currentAttack = atk;
        this._attackWindow = atk.duration || 0.2;
        this._timer = this.cooldown;
        this._hitObjects.clear();

        const animator = this.materia.getComponent(Animator) || this.materia.getComponent(AnimatorController);
        if (animator && atk.animation) {
            animator.play(atk.animation, { loop: false, force: true });
        }

        if (atk.sound) {
            const audio = this.materia.getComponent(AudioSource);
            if (audio) audio.play(atk.sound);
            else if (!this._warnedMissing.has('AudioSource')) {
                this._warnedMissing.add('AudioSource');
                throw new Error(`El componente 'Attack' requiere un 'AudioSource' para reproducir sonidos de ataque.`);
            }
        }
    }

    _applyHitLogic() {
        const scene = this.materia.scene;
        if (!scene) return;
        const engine = RuntimeAPIManager.getAPI('engine');
        if (!engine) return;

        let colMtr = this.colliderMateria;
        if (typeof colMtr === 'number') colMtr = scene.findMateriaById(colMtr);
        else if (typeof colMtr === 'string') colMtr = this.materia.findChildByName(colMtr, true) || scene.findMateriaByName(colMtr);
        if (!colMtr) colMtr = this.materia;

        const overlaps = engine.alPermanecerEnColision(colMtr);
        for (const other of overlaps) {
            if (other === this.materia || this._hitObjects.has(other.id)) continue;

            const health = other.getComponent(window.Components.Health);
            if (health) {
                health.damage(this._currentAttack.damage);
                this._hitObjects.add(other.id);
            }

            const rb = other.getComponent(Rigidbody2D);
            if (rb && this._currentAttack.pushForce > 0) {
                const t1 = this.materia.getComponent(Transform);
                const t2 = other.getComponent(Transform);
                if (t1 && t2) {
                    const dx = t2.x - t1.x;
                    const dy = t2.y - t1.y;
                    const mag = Math.hypot(dx, dy) || 1;
                    rb.applyImpulse((dx / mag) * this._currentAttack.pushForce, (dy / mag) * this._currentAttack.pushForce);
                }
            }
        }
    }

    cargar() { this.load(); }
    carregar() { this.load(); }
    загрузить() { this.load(); }
    加载() { this.load(); }

    // Multilingual Aliases
    get ataques() { return this.attacks; }
    set ataques(v) { this.attacks = v; }
    get ataquesPT() { return this.attacks; }
    set ataquesPT(v) { this.attacks = v; }
    get атаки() { return this.attacks; }
    set атаки(v) { this.attacks = v; }
    get 攻击列表() { return this.attacks; }
    set 攻击列表(v) { this.attacks = v; }

    get materiaColisionador() { return this.colliderMateria; }
    set materiaColisionador(v) { this.colliderMateria = v; }
    get materiaColisor() { return this.colliderMateria; }
    set materiaColisor(v) { this.colliderMateria = v; }
    get материяКоллайдера() { return this.colliderMateria; }
    set материяКоллайдера(v) { this.colliderMateria = v; }
    get 碰撞体物质() { return this.colliderMateria; }
    set 碰撞体物质(v) { this.colliderMateria = v; }

    get tiempoEspera() { return this.cooldown; }
    set tiempoEspera(v) { this.cooldown = v; }
    get tempoEspera() { return this.cooldown; }
    set tempoEspera(v) { this.cooldown = v; }
    get времяОжидания() { return this.cooldown; }
    set времяОжидания(v) { this.cooldown = v; }
    get 冷却时间() { return this.cooldown; }
    set 冷却时间(v) { this.cooldown = v; }

    get teclaCiclo() { return this.cycleKey; }
    set teclaCiclo(v) { this.cycleKey = v; }
    get teclaCicloPT() { return this.cycleKey; }
    set teclaCicloPT(v) { this.cycleKey = v; }
    get клавишаЦикла() { return this.cycleKey; }
    set клавишаЦикла(v) { this.cycleKey = v; }
    get 循环按键() { return this.cycleKey; }
    set 循环按键(v) { this.cycleKey = v; }

    attack(index = 0) {
        if (this._timer > 0 || this._isAttacking) return;
        const atk = this.attacks[index];
        if (!atk) return;
        this._currentAttack = atk;
        this._isAttacking = true;
        this._attackWindow = atk.duration;
        this._timer = this.cooldown;
        this._hitObjects.clear();

        // Play sound/animation if any
        if (atk.sound) {
            const audio = this.materia.getComponent(AudioSource);
            if (audio) audio.play(atk.sound);
        }
        if (atk.animation) {
            const controller = this.materia.getComponent(AnimatorController);
            if (controller) controller.play(atk.animation, true);
        }
    }

    atacar(index = 0) {
        this.attack(index);
    }

    clone() {
        const newAtk = new Attack(null);
        newAtk.attacks = JSON.parse(JSON.stringify(this.attacks));
        newAtk.colliderMateria = this.colliderMateria;
        newAtk.cooldown = this.cooldown;
        newAtk.cycleKey = this.cycleKey;
        newAtk._warnedMissing = new Set();
        return newAtk;
    }
}

/**
 * Componente que muestra una barra de progreso vinculada a un valor o componente.
 */
export class ProgressBar extends Leyes {
    constructor(materia) {
        super(materia);
        this.value = 100;
        this.maxValue = 100;
        this.targetMateria = null; // Sync with this Materia's Health
        this.fillMateria = null;   // The UI element that will be scaled
        this.fullSize = 100;
        this.orientation = 'Horizontal'; // 'Horizontal' or 'Vertical'
        this.isSceneLoading = false;
        this.interactable = false; // Slider mode
    }

    update() {
        const scene = this.materia.scene;

        if (this.isSceneLoading) {
            const sceneAPI = RuntimeAPIManager.getAPI('scene');
            this.value = sceneAPI ? sceneAPI.loadingProgress : 0;
            this.maxValue = 1.0;
        } else if (scene) {
            let target = this.targetMateria;
            if (typeof target === 'number') target = scene.findMateriaById(target);
            else if (typeof target === 'string') target = scene.findMateriaByName(target);

            if (target) {
                const health = target.getComponent(window.Components.Health);
                if (health) {
                    this.value = health.currentHealth;
                    this.maxValue = health.maxHealth;
                }
            }
        }

        let fill = this.fillMateria;
        if (typeof fill === 'number' && scene) fill = scene.findMateriaById(fill);
        else if (typeof fill === 'string' && scene) fill = this.materia.findChildByName(fill, true);

        if (fill) {
            const ui = fill.getComponent(window.Components.UITransform);
            if (ui) {
                const ratio = Math.max(0, Math.min(1, this.value / (this.maxValue || 1)));
                if (this.orientation === 'Horizontal') {
                    ui.size.width = this.fullSize * ratio;
                } else {
                    ui.size.height = this.fullSize * ratio;
                }
            }
        }
    }

    // Multilingual Aliases
    get valor() { return this.value; }
    set valor(v) { this.value = v; }
    get valorPT() { return this.value; }
    set valorPT(v) { this.value = v; }
    get значение() { return this.value; }
    set значение(v) { this.value = v; }
    get 值() { return this.value; }
    set 值(v) { this.value = v; }

    get valorMaximo() { return this.maxValue; }
    set valorMaximo(v) { this.maxValue = v; }
    get valorMaximoPT() { return this.maxValue; }
    set valorMaximoPT(v) { this.maxValue = v; }
    get максЗначение() { return this.maxValue; }
    set максЗначение(v) { this.maxValue = v; }
    get 最大值() { return this.maxValue; }
    set 最大值(v) { this.maxValue = v; }

    get materiaObjetivo() { return this.targetMateria; }
    set materiaObjetivo(v) { this.targetMateria = v; }
    get materiaObjetivoPT() { return this.targetMateria; }
    set materiaObjetivoPT(v) { this.targetMateria = v; }
    get целеваяМатерия() { return this.targetMateria; }
    set целеваяМатерия(v) { this.targetMateria = v; }
    get 目标物质() { return this.targetMateria; }
    set 目标物质(v) { this.targetMateria = v; }

    get materiaRelleno() { return this.fillMateria; }
    set materiaRelleno(v) { this.fillMateria = v; }
    get materiaPreenchimento() { return this.fillMateria; }
    set materiaPreenchimento(v) { this.fillMateria = v; }
    get заполняющаяМатерия() { return this.fillMateria; }
    set заполняющаяМатерия(v) { this.fillMateria = v; }
    get 填充物质() { return this.fillMateria; }
    set 填充物质(v) { this.fillMateria = v; }

    get tamanoTotal() { return this.fullSize; }
    set tamanoTotal(v) { this.fullSize = v; }
    get tamanhoTotal() { return this.fullSize; }
    set tamanhoTotal(v) { this.fullSize = v; }
    get общийРазмер() { return this.fullSize; }
    set общийРазмер(v) { this.fullSize = v; }
    get 总大小() { return this.fullSize; }
    set 总大小(v) { this.fullSize = v; }

    clone() {
        const newPb = new ProgressBar(null);
        newPb.value = this.value;
        newPb.maxValue = this.maxValue;
        newPb.targetMateria = this.targetMateria;
        newPb.fillMateria = this.fillMateria;
        newPb.fullSize = this.fullSize;
        newPb.orientation = this.orientation;
        newPb.isSceneLoading = this.isSceneLoading;
        newPb.interactable = this.interactable;
        return newPb;
    }
}

/**
 * Componente que hace que el objeto patrulle entre dos puntos o direcciones.
 */
export class Patrol extends Leyes {
    static actionableMethods = {
        'start': ['iniciar', 'начать', '开始'],
        'stop': ['detener', 'остановить', '停止']
    };

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

        // Animations
        this.idleAnim = "idle";
        this.moveAnim = "move";
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
            this._updateAnimations(false, transform);
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

        this._updateAnimations(true, transform);
    }

    _updateAnimations(isMoving, transform) {
        const controller = this.materia.getComponent(AnimatorController);
        const animator = this.materia.getComponent(Animator);
        if (!controller && !animator) return;

        const play = (name) => {
            if (!name) return;
            if (controller) controller.play(name);
            else animator.play(name);
        };

        if (isMoving) {
            play(this.moveAnim);
            if (this.horizontal && transform) {
                transform.flipX = this._direction < 0;
            }
        } else {
            play(this.idleAnim);
        }
    }

    get velocidad() { return this.speed; }
    set velocidad(v) { this.speed = v; }
    get velocidade() { return this.speed; }
    set velocidade(v) { this.speed = v; }
    get скорость() { return this.speed; }
    set скорость(v) { this.speed = v; }
    get 速度() { return this.speed; }
    set 速度(v) { this.speed = v; }

    get distancia() { return this.distance; }
    set distancia(v) { this.distance = v; }
    get distanciaPT() { return this.distance; }
    set distanciaPT(v) { this.distance = v; }
    get дистанция() { return this.distance; }
    set дистанция(v) { this.distance = v; }
    get 距离() { return this.distance; }
    set 距离(v) { this.distance = v; }

    get tiempoPausa() { return this.pauseTime; }
    set tiempoPausa(v) { this.pauseTime = v; }
    get tempoPausa() { return this.pauseTime; }
    set tempoPausa(v) { this.pauseTime = v; }
    get времяПаузы() { return this.pauseTime; }
    set времяПаузы(v) { this.pauseTime = v; }
    get 暂停时间() { return this.pauseTime; }
    set 暂停时间(v) { this.pauseTime = v; }

    clone() {
        const newPatrol = new Patrol(null);
        newPatrol.speed = this.speed;
        newPatrol.distance = this.distance;
        newPatrol.horizontal = this.horizontal;
        newPatrol.pauseTime = this.pauseTime;
        return newPatrol;
    }
}


/**
 * Componente que emite prefabs como partículas con optimización de pooling.
 */
export class ParticleSystem extends Leyes {
    static actionableMethods = {
        'play': ['reproducir', 'воспроизвести', '播放'],
        'stop': ['detener', 'остановить', '停止'],
        'emit': ['emitir', 'излучать', '发射']
    };

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

        // Advanced Visuals
        this.startColor = "#ffffff";
        this.endColor = "#ffffff";
        this.startSize = 1.0;
        this.endSize = 1.0;
        this.gravityScale = 0.0;
        this.fadeAlpha = true;

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
    reproduzir() { this.play(); }
    играть() { this.play(); }
    播放() { this.play(); }

    detener() { this.stop(); }
    parar() { this.stop(); }
    остановить() { this.stop(); }
    停止() { this.stop(); }

    update(deltaTime) {
        const perfMonitor = PerformanceAPI.getPerformanceMonitor();
        const throttle = perfMonitor ? perfMonitor.getParticleThrottle() : 1.0;

        // Gestionar vida de partículas activas en el pool
        for (let i = 0; i < this._pool.length; i++) {
            const p = this._pool[i];
            if (p.isActive) {
                p._remainingLifetime -= deltaTime;
                if (p._remainingLifetime <= 0) {
                    p.isActive = false;
                } else {
                    // Actualizar visuales de la partícula basados en el tiempo de vida
                    this._updateParticleVisuals(p);
                }
            }
        }

        if (!this._active) return;

        this._emissionAccumulator += deltaTime;
        const interval = 1 / Math.max(0.1, this.emissionRate * throttle);

        while (this._emissionAccumulator >= interval) {
            this.emit();
            this._emissionAccumulator -= interval;
        }
    }

    _updateParticleVisuals(p) {
        const lifePercent = 1 - (p._remainingLifetime / this.lifetime);
        const transform = p.getComponent(Transform);
        const renderer = p.getComponent(SpriteRenderer);

        // Actualizar Escala
        if (transform) {
            const scale = this.startSize + (this.endSize - this.startSize) * lifePercent;
            transform.scale = { x: scale, y: scale };
        }

        // Actualizar Color y Alpha
        if (renderer) {
            if (this.startColor !== this.endColor) {
                renderer.color = this._interpolateColors(this.startColor, this.endColor, lifePercent);
            }
            if (this.fadeAlpha) {
                renderer.opacity = 1 - lifePercent;
            }
        }

        // Aplicar Gravedad (Movimiento manual si no hay Rigidbody)
        const rb = p.getComponent(Rigidbody2D);
        if (!rb && this.gravityScale !== 0) {
            const trans = p.getComponent(Transform);
            if (trans) {
                // In +Y UP, gravity is negative
                p._gravityVelocity = (p._gravityVelocity || 0) - (9.8 * this.gravityScale);
                trans.y += p._gravityVelocity;
            }
        }
    }

    _interpolateColors(hex1, hex2, factor) {
        const r1 = parseInt(hex1.substring(1, 3), 16);
        const g1 = parseInt(hex1.substring(3, 5), 16);
        const b1 = parseInt(hex1.substring(5, 7), 16);

        const r2 = parseInt(hex2.substring(1, 3), 16);
        const g2 = parseInt(hex2.substring(3, 5), 16);
        const b2 = parseInt(hex2.substring(5, 7), 16);

        const r = Math.round(r1 + (r2 - r1) * factor);
        const g = Math.round(g1 + (g2 - g1) * factor);
        const b = Math.round(b1 + (b2 - b1) * factor);

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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
                p._gravityVelocity = 0;
                p.isActive = true;

                // Initial state
                this._updateParticleVisuals(p);
            }
        }
    }

    // --- Multilingual Aliases ---
    get prefab() { return this.prefabPath; }
    set prefab(v) { this.prefabPath = v; }
    get префаб() { return this.prefabPath; }
    set префаб(v) { this.prefabPath = v; }
    get 预制件() { return this.prefabPath; }
    set 预制件(v) { this.prefabPath = v; }

    get maxParticulas() { return this.maxParticles; }
    set maxParticulas(v) { this.maxParticles = v; }
    get maxParticulasPT() { return this.maxParticles; }
    set maxParticulasPT(v) { this.maxParticles = v; }
    get максЧастиц() { return this.maxParticles; }
    set максЧастиц(v) { this.maxParticles = v; }
    get 最大粒子数() { return this.maxParticles; }
    set 最大粒子数(v) { this.maxParticles = v; }

    get tasaEmision() { return this.emissionRate; }
    set tasaEmision(v) { this.emissionRate = v; }
    get taxaEmissao() { return this.emissionRate; }
    set taxaEmissao(v) { this.emissionRate = v; }
    get скоростьЭмиссии() { return this.emissionRate; }
    set скоростьЭмиссии(v) { this.emissionRate = v; }
    get 发射率() { return this.emissionRate; }
    set 发射率(v) { this.emissionRate = v; }

    get vidaParticula() { return this.lifetime; }
    set vidaParticula(v) { this.lifetime = v; }
    get vidaParticulaPT() { return this.lifetime; }
    set vidaParticulaPT(v) { this.lifetime = v; }
    get времяЖизни() { return this.lifetime; }
    set времяЖизни(v) { this.lifetime = v; }
    get 粒子寿命() { return this.lifetime; }
    set 粒子寿命(v) { this.lifetime = v; }

    get velocidad() { return this.speed; }
    set velocidad(v) { this.speed = v; }
    get velocidade() { return this.speed; }
    set velocidade(v) { this.speed = v; }
    get скорость() { return this.speed; }
    set скорость(v) { this.speed = v; }
    get 速度() { return this.speed; }
    set 速度(v) { this.speed = v; }

    get dispersion() { return this.spread; }
    set dispersion(v) { this.spread = v; }
    get dispersao() { return this.spread; }
    set dispersao(v) { this.spread = v; }
    get разброс() { return this.spread; }
    set разброс(v) { this.spread = v; }
    get 扩散() { return this.spread; }
    set 扩散(v) { this.spread = v; }

    get bucle() { return this.loop; }
    set bucle(v) { this.loop = v; }
    get loopPT() { return this.loop; }
    set loopPT(v) { this.loop = v; }
    get цикл() { return this.loop; }
    set цикл(v) { this.loop = v; }
    get 循环() { return this.loop; }
    set 循环(v) { this.loop = v; }

    get reproducirAlEmpezar() { return this.playOnAwake; }
    set reproducirAlEmpezar(v) { this.playOnAwake = v; }
    get reproduzirAoIniciar() { return this.playOnAwake; }
    set reproduzirAoIniciar(v) { this.playOnAwake = v; }
    get игратьПриЗапуске() { return this.playOnAwake; }
    set игратьПриЗапуске(v) { this.playOnAwake = v; }
    get 唤醒时播放() { return this.playOnAwake; }
    set 唤醒时播放(v) { this.playOnAwake = v; }

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

        newPs.startColor = this.startColor;
        newPs.endColor = this.endColor;
        newPs.startSize = this.startSize;
        newPs.endSize = this.endSize;
        newPs.gravityScale = this.gravityScale;
        newPs.fadeAlpha = this.fadeAlpha;
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
        const engine = RuntimeAPIManager.getAPI('engine');
        if (!scene || (!scene.physicsSystem && !engine)) return;

        const transform = this.materia.getComponent(Transform);
        if (!transform) return;

        const origin = transform.position;
        const baseRotation = transform.rotation;

        this.lastHits = this.rays.map(ray => {
            const rad = (baseRotation + ray.angle) * Math.PI / 180;
            const direction = { x: Math.cos(rad), y: Math.sin(rad) };
            if (engine) return engine.lanzarRayo(origin, direction, ray.length);
            if (scene.physicsSystem) return scene.physicsSystem.raycast(origin, direction, ray.length);
            return null;
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
    static actionableMethods = {
        'play': ['reproducir', 'воспроизвести', '播放'],
        'stop': ['detener', 'остановить', '停止'],
        'pause': ['pausar', 'приостановить', '暂停'],
        'resume': ['continuar', 'продолжить', '恢复']
    };

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

    // --- Multilingual Aliases ---
    get ancho() { return this.width; }
    set ancho(v) { this.width = v; this.generateParticles(); }
    get largura() { return this.width; }
    set largura(v) { this.width = v; this.generateParticles(); }
    get ширина() { return this.width; }
    set ширина(v) { this.width = v; this.generateParticles(); }
    get 宽度() { return this.width; }
    set 宽度(v) { this.width = v; this.generateParticles(); }

    get alto() { return this.height; }
    set alto(v) { this.height = v; this.generateParticles(); }
    get altura() { return this.height; }
    set altura(v) { this.height = v; this.generateParticles(); }
    get высота() { return this.height; }
    set высота(v) { this.height = v; this.generateParticles(); }
    get 高度() { return this.height; }
    set 高度(v) { this.height = v; this.generateParticles(); }

    get densidad() { return this.density; }
    set densidad(v) { this.density = v; }
    get densidade() { return this.density; }
    set densidade(v) { this.density = v; }
    get плотность() { return this.density; }
    set плотность(v) { this.density = v; }
    get 密度() { return this.density; }
    set 密度(v) { this.density = v; }

    get viscosidad() { return this.viscosity; }
    set viscosidad(v) { this.viscosity = v; }
    get viscosidade() { return this.viscosity; }
    set viscosidade(v) { this.viscosity = v; }
    get вязкость() { return this.viscosity; }
    set вязкость(v) { this.viscosity = v; }
    get 粘度() { return this.viscosity; }
    set 粘度(v) { this.viscosity = v; }

    get mostrarMareas() { return this.showTides; }
    set mostrarMareas(v) { this.showTides = v; }
    get mostrarMares() { return this.showTides; }
    set mostrarMares(v) { this.showTides = v; }
    get показыватьПриливы() { return this.showTides; }
    set показыватьПриливы(v) { this.showTides = v; }
    get 显示潮汐() { return this.showTides; }
    set 显示潮汐(v) { this.showTides = v; }

    get amplitudMarea() { return this.tideAmplitude; }
    set amplitudMarea(v) { this.tideAmplitude = v; }
    get amplitudeMarea() { return this.tideAmplitude; }
    set amplitudeMarea(v) { this.tideAmplitude = v; }
    get амплитудаПрилива() { return this.tideAmplitude; }
    set амплитудаПрилива(v) { this.tideAmplitude = v; }
    get 潮汐幅度() { return this.tideAmplitude; }
    set 潮汐幅度(v) { this.tideAmplitude = v; }

    get velocidadMarea() { return this.tideSpeed; }
    set velocidadMarea(v) { this.tideSpeed = v; }
    get velocidadeMarea() { return this.tideSpeed; }
    set velocidadeMarea(v) { this.tideSpeed = v; }
    get скоростьПрилива() { return this.tideSpeed; }
    set скоростьПрилива(v) { this.tideSpeed = v; }
    get 潮汐速度() { return this.tideSpeed; }
    set 潮汐速度(v) { this.tideSpeed = v; }

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

        const gravityY = -9.8 * 100;
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
            // In +Y UP: Top is MAX Y, Bottom is MIN Y
            const overlapTop = (cy + hh) - p.y;
            const overlapBottom = p.y - (cy - hh);
            const overlapLeft = p.x - (cx - hw);
            const overlapRight = (cx + hw) - p.x;
            const minOverlap = Math.min(overlapTop, overlapBottom, overlapLeft, overlapRight);

            if (minOverlap === overlapTop) { p.y = cy + hh; p.vy *= -0.1; }
            else if (minOverlap === overlapBottom) { p.y = cy - hh; p.vy *= -0.1; }
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
 * Componente HelicopterController: Controlador de helicóptero en vista lateral.
 * Maneja potencia vertical, potencia de despegue y giro (inclinación).
 */
export class HelicopterController extends Leyes {
    static actionableMethods = {
        'takeOff': ['despegar', 'взлететь', '起飞'],
        'land': ['aterrizar', 'приземлиться', '着陆']
    };

    constructor(materia) {
        super(materia);
        this.potenciaMotor = 2000;
        this.potenciaDespegue = 1000; // Fuerza base de sustentación
        this.velocidadMaxima = 1000;
        this.agilidadGiro = 150;
        this.autoEstabilizar = true;
        this.estabilidad = 0.5; // Fuerza de auto-nivelación
        this.arrastreAire = 0.1;

        // Controles
        this.teclaPotencia = 'w';
        this.teclaDescenso = 's';
        this.teclaGiroIzquierda = 'a';
        this.teclaGiroDerecha = 'd';

        // Sonidos
        this.engineSound = "";

        // Animations
        this.idleAnim = "idle";
        this.flyAnim = "fly";

        // Scripting API
        this.potenciaActual = 0;
        this.giroActual = 0;
        this._warnedMissing = new Set();
    }

    // --- Multilingual Aliases ---
    get potencia() { return this.potenciaMotor; }
    set potencia(v) { this.potenciaMotor = v; }
    get potenciaPT() { return this.potenciaMotor; }
    set potenciaPT(v) { this.potenciaMotor = v; }
    get мощность() { return this.potenciaMotor; }
    set мощность(v) { this.potenciaMotor = v; }
    get 功率() { return this.potenciaMotor; }
    set 功率(v) { this.potenciaMotor = v; }

    get vDespegue() { return this.potenciaDespegue; }
    set vDespegue(v) { this.potenciaDespegue = v; }
    get vDecolagem() { return this.potenciaDespegue; }
    set vDecolagem(v) { this.potenciaDespegue = v; }
    get скоростьВзлета() { return this.potenciaDespegue; }
    set скоростьВзлета(v) { this.potenciaDespegue = v; }
    get 起飞速度() { return this.potenciaDespegue; }
    set 起飞速度(v) { this.potenciaDespegue = v; }

    get giro() { return this.agilidadGiro; }
    set giro(v) { this.agilidadGiro = v; }
    get agilidadeGiro() { return this.agilidadGiro; }
    set agilidadeGiro(v) { this.agilidadGiro = v; }
    get маневренность() { return this.agilidadGiro; }
    set маневренность(v) { this.agilidadGiro = v; }
    get 转向灵敏度() { return this.agilidadGiro; }
    set 转向灵敏度(v) { this.agilidadGiro = v; }

    get autoEstabilidad() { return this.autoEstabilizar; }
    set autoEstabilidad(v) { this.autoEstabilizar = v; }
    get autoEstabilidade() { return this.autoEstabilizar; }
    set autoEstabilidade(v) { this.autoEstabilizar = v; }
    get автоСтабилизация() { return this.autoEstabilizar; }
    set автоСтабилизация(v) { this.autoEstabilizar = v; }
    get 自动稳定() { return this.autoEstabilizar; }
    set 自动稳定(v) { this.autoEstabilizar = v; }

    get arrastre() { return this.arrastreAire; }
    set arrastre(v) { this.arrastreAire = v; }
    get arrasto() { return this.arrastreAire; }
    set arrasto(v) { this.arrastreAire = v; }
    get сопротивление() { return this.arrastreAire; }
    set сопротивление(v) { this.arrastreAire = v; }
    get 阻力() { return this.arrastreAire; }
    set 阻力(v) { this.arrastreAire = v; }

    get controladorDeHelicoptero() { return this; }

    fixedUpdate(deltaTime) {
        const isGame = typeof window !== 'undefined' && (window.isGameRunning || window.CE_Standalone_Scripts);
        if (!isGame) return;

        const rb = this.materia.getComponent(Rigidbody2D);
        const transform = this.materia.getComponent(Transform);
        if (!rb || !transform) return;

        const input = RuntimeAPIManager.getAPI('input');
        if (!input) return;

        // 1. Manejar Potencia (Empuje Vertical)
        let thrustInput = 0;
        if (input.isKeyPressed(this.teclaPotencia)) thrustInput = 1;
        if (input.isKeyPressed(this.teclaDescenso)) thrustInput = -1;

        this.potenciaActual = thrustInput;

        const rad = transform.rotation * Math.PI / 180;
        const up = { x: -Math.sin(rad), y: Math.cos(rad) }; // Dirección "arriba" relativa al helicóptero (+Y UP)

        // Fuerza de sustentación (Lift)
        // Combinamos la potencia de despegue (base) con el input del motor
        let liftForceMagnitude = this.potenciaDespegue;
        if (thrustInput > 0) {
            liftForceMagnitude += thrustInput * this.potenciaMotor;
        } else if (thrustInput < 0) {
            liftForceMagnitude += thrustInput * (this.potenciaDespegue * 0.8); // Descenso controlado
        }

        // Aplicar fuerza en el eje local UP del helicóptero
        const finalForce = {
            x: up.x * liftForceMagnitude * deltaTime * 10,
            y: up.y * liftForceMagnitude * deltaTime * 10
        };
        rb.addForce(finalForce.x, finalForce.y);

        if (this.engineSound && Math.abs(thrustInput) > 0) {
            const audio = this.materia.getComponent(AudioSource);
            if (audio) {
                if (!audio.isPlaying) audio.play(this.engineSound);
            } else if (!this._warnedMissing.has('AudioSource')) {
                this._warnedMissing.add('AudioSource');
                throw new Error(`El componente 'HelicopterController' requiere un 'AudioSource' para reproducir el sonido de motor.`);
            }
        } else {
            const audio = this.materia.getComponent(AudioSource);
            if (audio && audio.isPlaying && this.engineSound && audio.source === this.engineSound) {
                audio.stop();
            }
        }

        // 2. Manejar Giro (Inclinación / Pitch)
        let steerInput = 0;
        if (input.isKeyPressed(this.teclaGiroIzquierda)) steerInput = -1;
        if (input.isKeyPressed(this.teclaGiroDerecha)) steerInput = 1;

        this.giroActual = steerInput;

        if (steerInput !== 0) {
            const torque = steerInput * this.agilidadGiro * 5000 * deltaTime;
            rb.addTorque(torque);
        } else if (this.autoEstabilizar) {
            // Auto-nivelación: intentar mantener la rotación en 0
            let currentRot = transform.rotation % 360;
            if (currentRot > 180) currentRot -= 360;
            if (currentRot < -180) currentRot += 360;

            const stabilityTorque = -currentRot * this.estabilidad * 2000 * deltaTime;
            rb.addTorque(stabilityTorque);

            // Amortiguar rotación para evitar balanceo infinito
            rb.angularVelocity *= Math.pow(0.9, deltaTime * 60);
        }

        // 3. Arrastre de Aire (Resistencia)
        if (this.arrastreAire > 0) {
            const drag = Math.pow(1.0 - this.arrastreAire, deltaTime);
            rb.velocity.x *= drag;
            rb.velocity.y *= drag;
            rb.angularVelocity *= drag;
        }

        // 4. Limitar Velocidad Máxima
        const speed = Math.sqrt(rb.velocity.x**2 + rb.velocity.y**2);
        if (speed > (this.velocidadMaxima / 50)) {
            const ratio = (this.velocidadMaxima / 50) / speed;
            rb.velocity.x *= ratio;
            rb.velocity.y *= ratio;
        }

        // --- Animation Integration ---
        this._updateAnimations(thrustInput, rb);
    }

    _updateAnimations(thrustInput, rb) {
        const controller = this.materia.getComponent(AnimatorController);
        const animator = this.materia.getComponent(Animator);
        if (!controller && !animator) return;

        const play = (name) => {
            if (!name) return;
            if (controller) controller.play(name);
            else animator.play(name);
        };

        if (Math.abs(thrustInput) > 0.01 || Math.abs(rb.velocity.x) > 0.05 || Math.abs(rb.velocity.y) > 0.05) {
            play(this.flyAnim);
        } else {
            play(this.idleAnim);
        }
    }

    // Scripting methods
    establecerPotencia(n) { this.potenciaMotor = n; }
    establecerGiro(n) { this.agilidadGiro = n; }

    clone() {
        const copy = new HelicopterController(null);
        Object.assign(copy, this);
        copy._warnedMissing = new Set();
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

/**
 * Componente Suspension: Sistema de amortiguación tipo Hill Climb Racing.
 * Se añade a las ruedas y las conecta con un chasis.
 */
/**
 * Componente VehicleTopDown: Controlador de vehículo arcade en vista cenital (2D).
 * Inspirado en Reckless Getaway 2.
 */
export class VehicleTopDown extends Leyes {
    static actionableMethods = {
        'accelerate': ['acelerar', 'ускориться', '加速'],
        'brake': ['frenar', 'тормозить', '制动']
    };

    constructor(materia) {
        super(materia);
        this.autoAcelerar = true;
        this.potencia = 1000;
        this.velocidadMaxima = 800;
        this.velocidadGiro = 180; // Grados por segundo
        this.intensidadDerrape = 0.8; // 0: Sin derrape (agarre total), 1: Derrape total (hielo)
        this.frenadoMotor = 0.1;

        // Controles
        this.teclaIzquierda = 'a';
        this.teclaDerecha = 'd';
        this.teclaAcelerar = 'w';
        this.teclaFrenar = 's';

        // Sonidos
        this.engineSound = "";
        this.brakeSound = "";

        // Animations
        this.idleAnim = "idle";
        this.driveAnim = "drive";
        this.reverseAnim = "reverse";

        // Estado interno
        this._isInitialized = false;
        this._warnedMissing = new Set();
    }

    // --- Multilingual Aliases ---
    get potenciaMotor() { return this.potencia; }
    set potenciaMotor(v) { this.potencia = v; }
    get potenciaPT() { return this.potencia; }
    set potenciaPT(v) { this.potencia = v; }
    get мощностьДвигателя() { return this.potencia; }
    set мощностьДвигателя(v) { this.potencia = v; }
    get 发动机功率() { return this.potencia; }
    set 发动机功率(v) { this.potencia = v; }

    get velocidadLimite() { return this.velocidadMaxima; }
    set velocidadLimite(v) { this.velocidadMaxima = v; }
    get velocidadeLimite() { return this.velocidadMaxima; }
    set velocidadeLimite(v) { this.velocidadMaxima = v; }
    get пределСкорости() { return this.velocidadMaxima; }
    set пределСкорости(v) { this.velocidadMaxima = v; }
    get 速度限制() { return this.velocidadMaxima; }
    set 速度限制(v) { this.velocidadMaxima = v; }

    get giro() { return this.velocidadGiro; }
    set giro(v) { this.velocidadGiro = v; }
    get curva() { return this.velocidadGiro; }
    set curva(v) { this.velocidadGiro = v; }
    get поворот() { return this.velocidadGiro; }
    set поворот(v) { this.velocidadGiro = v; }
    get 转向() { return this.velocidadGiro; }
    set 转向(v) { this.velocidadGiro = v; }

    get derrape() { return this.intensidadDerrape; }
    set derrape(v) { this.intensidadDerrape = v; }
    get derrapagem() { return this.intensidadDerrape; }
    set derrapagem(v) { this.intensidadDerrape = v; }
    get занос() { return this.intensidadDerrape; }
    set занос(v) { this.intensidadDerrape = v; }
    get 漂移() { return this.intensidadDerrape; }
    set 漂移(v) { this.intensidadDerrape = v; }

    get freno() { return this.frenadoMotor; }
    set freno(v) { this.frenadoMotor = v; }
    get freio() { return this.frenadoMotor; }
    set freio(v) { this.frenadoMotor = v; }
    get тормоз() { return this.frenadoMotor; }
    set тормоз(v) { this.frenadoMotor = v; }
    get 制动() { return this.frenadoMotor; }
    set 制动(v) { this.frenadoMotor = v; }

    fixedUpdate(deltaTime) {
        const isGame = typeof window !== 'undefined' && (window.isGameRunning || window.CE_Standalone_Scripts);
        if (!isGame) return;

        const rb = this.materia.getComponent(Rigidbody2D);
        const transform = this.materia.getComponent(Transform);
        if (!rb || !transform) return;

        const input = RuntimeAPIManager.getAPI('input');
        if (!input) return;

        // 1. Manejar Giro (Rotación)
        let steerInput = 0;
        if (input.isKeyPressed(this.teclaIzquierda)) steerInput -= 1;
        if (input.isKeyPressed(this.teclaDerecha)) steerInput += 1;

        // Girar solo si el coche tiene algo de velocidad (opcional, para realismo arcade)
        const speedSq = rb.velocity.x * rb.velocity.x + rb.velocity.y * rb.velocity.y;
        if (speedSq > 0.01) {
            const rotationStep = steerInput * this.velocidadGiro * deltaTime;
            transform.rotation += rotationStep;
        }

        // 2. Manejar Aceleración
        let accelInput = this.autoAcelerar ? 1 : 0;
        if (input.isKeyPressed(this.teclaAcelerar)) accelInput = 1;
        if (input.isKeyPressed(this.teclaFrenar)) accelInput = -1;

        const rad = transform.rotation * Math.PI / 180;
        const forward = { x: Math.cos(rad), y: Math.sin(rad) };
        const right = { x: -forward.y, y: forward.x };

        // Aplicar fuerza de motor
        if (accelInput !== 0) {
            const currentSpeed = rb.velocity.x * forward.x + rb.velocity.y * forward.y;
            if (Math.abs(currentSpeed) < this.velocidadMaxima / 100) {
                const force = accelInput * this.potencia * deltaTime * 10;
                rb.addForce(forward.x * force, forward.y * force);

                if (this.engineSound) {
                    const audio = this.materia.getComponent(AudioSource);
                    if (audio) {
                        if (!audio.isPlaying) audio.play(this.engineSound);
                    } else if (!this._warnedMissing.has('AudioSource')) {
                        this._warnedMissing.add('AudioSource');
                        throw new Error(`El componente 'VehicleTopDown' requiere un 'AudioSource' para reproducir el sonido de motor.`);
                    }
                }
            }
        } else {
            const audio = this.materia.getComponent(AudioSource);
            if (audio && audio.isPlaying && this.engineSound && audio.source === this.engineSound) {
                audio.stop();
            }
            // Freno motor suave
            if (this.frenadoMotor > 0) {
                rb.velocity.x *= Math.exp(-this.frenadoMotor * deltaTime * 5);
                rb.velocity.y *= Math.exp(-this.frenadoMotor * deltaTime * 5);
            }
        }

        // 3. Simulación de Derrape (Drifting)
        // Calculamos la velocidad lateral (cuánto se desliza hacia los lados)
        const lateralVelocity = rb.velocity.x * right.x + rb.velocity.y * right.y;

        // El agarre arcade: eliminamos parte de la velocidad lateral cada frame
        // intensidadDerrape 0 = agarre total (velocidad lateral -> 0)
        // intensidadDerrape 1 = sin agarre (mantiene velocidad lateral)
        const gripFactor = 1.0 - this.intensidadDerrape;

        // Aplicamos la fricción lateral restando velocidad en el eje 'right'
        const lateralForce = -lateralVelocity * gripFactor * 20; // Multiplicador arcade
        rb.addForce(right.x * lateralForce * deltaTime * 60, right.y * lateralForce * deltaTime * 60);

        // 4. Limitar velocidad máxima absoluta por seguridad física
        const speed = Math.sqrt(rb.velocity.x**2 + rb.velocity.y**2);
        if (speed > (this.velocidadMaxima / 50)) {
            const ratio = (this.velocidadMaxima / 50) / speed;
            rb.velocity.x *= ratio;
            rb.velocity.y *= ratio;
        }

        // --- Animation Integration ---
        this._updateAnimations(accelInput, rb, forward);
    }

    _updateAnimations(accelInput, rb, forward) {
        const controller = this.materia.getComponent(AnimatorController);
        const animator = this.materia.getComponent(Animator);
        if (!controller && !animator) return;

        const play = (name) => {
            if (!name) return;
            if (controller) controller.play(name);
            else animator.play(name);
        };

        const currentForwardVel = rb.velocity.x * forward.x + rb.velocity.y * forward.y;

        if (Math.abs(currentForwardVel) < 0.05) {
            play(this.idleAnim);
        } else if (currentForwardVel > 0) {
            play(this.driveAnim);
        } else {
            play(this.reverseAnim);
        }
    }

    clone() {
        const copy = new VehicleTopDown(null);
        Object.assign(copy, this);
        copy._warnedMissing = new Set();
        return copy;
    }
}

/**
 * Componente PlaneController: Controlador de vuelo lateral (Side-scroller).
 * Maneja potencia, sustentación, giro y coordina con la suspensión de las ruedas.
 */
export class PlaneController extends Leyes {
    static actionableMethods = {
        'accelerate': ['acelerar', 'ускориться', '加速'],
        'brake': ['frenar', 'тормозить', '制动']
    };

    constructor(materia) {
        super(materia);
        this.potenciaMotor = 1500;
        this.velocidadMaxima = 1200;
        this.velocidadDespegue = 400;
        this.fuerzaSustentacion = 1.2;
        this.agilidadGiro = 120; // Grados por segundo
        this.arrastreAire = 0.05;

        // Controles
        this.teclaPotencia = 'w';
        this.teclaFreno = 's';
        this.teclaBotonFreno = 'space'; // New dedicated brake key
        this.teclaNarizArriba = 'a';
        this.teclaNarizAbajo = 'd';

        // Sonidos
        this.engineSound = "";
        this.takeoffSound = "";

        // Animations
        this.idleAnim = "idle";
        this.flyAnim = "fly";
        this.groundAnim = "ground";

        // Estado interno
        this.estaEnSuelo = false;
        this.velocidadAvance = 0;
        this._warnedMissing = new Set();
    }

    // --- Multilingual Aliases ---
    get potencia() { return this.potenciaMotor; }
    set potencia(v) { this.potenciaMotor = v; }
    get potenciaPT() { return this.potenciaMotor; }
    set potenciaPT(v) { this.potenciaMotor = v; }
    get мощность() { return this.potenciaMotor; }
    set мощность(v) { this.potenciaMotor = v; }
    get 功率() { return this.potenciaMotor; }
    set 功率(v) { this.potenciaMotor = v; }

    get vDespegue() { return this.velocidadDespegue; }
    set vDespegue(v) { this.velocidadDespegue = v; }
    get vDecolagem() { return this.velocidadDespegue; }
    set vDecolagem(v) { this.velocidadDespegue = v; }
    get скоростьВзлета() { return this.velocidadDespegue; }
    set скоростьВзлета(v) { this.velocidadDespegue = v; }
    get 起飞速度() { return this.velocidadDespegue; }
    set 起飞速度(v) { this.velocidadDespegue = v; }

    get sustentacion() { return this.fuerzaSustentacion; }
    set sustentacion(v) { this.fuerzaSustentacion = v; }
    get sustentacao() { return this.fuerzaSustentacion; }
    set sustentacao(v) { this.fuerzaSustentacion = v; }
    get подъемнаяСила() { return this.fuerzaSustentacion; }
    set подъемнаяСила(v) { this.fuerzaSustentacion = v; }
    get 升力() { return this.fuerzaSustentacion; }
    set 升力(v) { this.fuerzaSustentacion = v; }

    get giro() { return this.agilidadGiro; }
    set giro(v) { this.agilidadGiro = v; }
    get agilidadeGiro() { return this.agilidadGiro; }
    set agilidadeGiro(v) { this.agilidadGiro = v; }
    get маневренность() { return this.agilidadGiro; }
    set маневренность(v) { this.agilidadGiro = v; }
    get 转向灵敏度() { return this.agilidadGiro; }
    set 转向灵敏度(v) { this.agilidadGiro = v; }

    get arrastre() { return this.arrastreAire; }
    set arrastre(v) { this.arrastreAire = v; }
    get arrasto() { return this.arrastreAire; }
    set arrasto(v) { this.arrastreAire = v; }
    get сопротивление() { return this.arrastreAire; }
    set сопротивление(v) { this.arrastreAire = v; }
    get 阻力() { return this.arrastreAire; }
    set 阻力(v) { this.arrastreAire = v; }

    get frenoEspacio() { return this.teclaBotonFreno; }
    set frenoEspacio(v) { this.teclaBotonFreno = v; }
    get freioEspaco() { return this.teclaBotonFreno; }
    set freioEspaco(v) { this.teclaBotonFreno = v; }
    get пробелТормоз() { return this.teclaBotonFreno; }
    set пробелТормоз(v) { this.teclaBotonFreno = v; }
    get 空格制动() { return this.teclaBotonFreno; }
    set 空格制动(v) { this.teclaBotonFreno = v; }

    get controladorDeAvion() { return this; }

    fixedUpdate(deltaTime) {
        const isGame = typeof window !== 'undefined' && (window.isGameRunning || window.CE_Standalone_Scripts);
        if (!isGame) return;

        const rb = this.materia.getComponent(Rigidbody2D);
        const transform = this.materia.getComponent(Transform);
        if (!rb || !transform) return;

        const input = RuntimeAPIManager.getAPI('input');
        const engine = RuntimeAPIManager.getAPI('engine');
        if (!input) return;

        // 1. Detección de Suelo
        // El avión está en el suelo si ALGUNA de sus ruedas (hijos con Suspension) toca algo
        this.estaEnSuelo = false;
        const suspensiones = this.materia.getChildrenWithComponent(Suspension);
        for (const susp of suspensiones) {
            if (engine && (engine.alPermanecerEnColision(susp.materia).length > 0 ||
                           engine.alEntrarEnColision(susp.materia).length > 0)) {
                this.estaEnSuelo = true;
                break;
            }
        }

        // 2. Manejar Potencia (Thrust)
        let thrustInput = 0;
        if (input.isKeyPressed(this.teclaPotencia)) thrustInput = 1;
        if (input.isKeyPressed(this.teclaFreno)) thrustInput = -1;

        const rad = transform.rotation * Math.PI / 180;
        const forward = { x: Math.cos(rad), y: Math.sin(rad) };

        this.velocidadAvance = rb.velocity.x * forward.x + rb.velocity.y * forward.y;

        // 2.1 Manejar Frenado (Brake)
        const isBraking = input.isKeyPressed(this.teclaBotonFreno);
        if (isBraking) {
            // Deceleración aerodinámica y de motor suave
            // Reducido brakeStrength de 2.0 a 0.8 para evitar paradas "en seco" irreales
            const brakeStrength = 0.8;
            rb.velocity.x *= Math.exp(-brakeStrength * deltaTime);
            rb.velocity.y *= Math.exp(-brakeStrength * deltaTime);

            // Amortiguar rotación ligeramente durante el frenado para estabilidad
            rb.angularVelocity *= Math.exp(-0.5 * deltaTime);
        }

        if (thrustInput !== 0) {
            if (Math.abs(this.velocidadAvance) < this.velocidadMaxima / 100) {
                // Reverse thrust (thrustInput < 0) is much weaker than forward thrust
                const thrustMult = thrustInput > 0 ? 1.0 : 0.3;
                const force = thrustInput * this.potenciaMotor * thrustMult * deltaTime * 10;
                rb.addForce(forward.x * force, forward.y * force);

                if (this.engineSound) {
                    const audio = this.materia.getComponent(AudioSource);
                    if (audio) {
                        if (!audio.isPlaying) audio.play(this.engineSound);
                    } else if (!this._warnedMissing.has('AudioSource')) {
                        this._warnedMissing.add('AudioSource');
                        throw new Error(`El componente 'PlaneController' requiere un 'AudioSource' para reproducir el sonido de motor.`);
                    }
                }

                // Si estamos en el suelo, también damos potencia a las ruedas para taxear
                if (this.estaEnSuelo) {
                    for (const susp of suspensiones) {
                        const rbRueda = susp.materia.getComponent(Rigidbody2D);
                        if (rbRueda) {
                            rbRueda.addTorque(thrustInput * susp.potenciaMotor * 500 * deltaTime);
                        }
                    }
                }
            }
        }

        // 3. Manejar Rotación (Pitch)
        let pitchInput = 0;
        if (input.isKeyPressed(this.teclaNarizArriba)) pitchInput = -1; // En muchos juegos A es subir nariz
        if (input.isKeyPressed(this.teclaNarizAbajo)) pitchInput = 1;

        if (pitchInput !== 0) {
            // La efectividad del giro depende de la velocidad del aire
            const maneuverability = Math.min(1.0, Math.abs(this.velocidadAvance) / 2);
            const torque = pitchInput * this.agilidadGiro * maneuverability * 5000 * deltaTime;
            rb.addTorque(torque);
        }

        // 4. Física de Sustentación (Lift) y Direccionalidad
        const speedKmh = Math.abs(this.velocidadAvance) * 100;

        // Arrastre parásito (aumenta con el cuadrado de la velocidad)
        const dragFactor = (speedKmh / 1000) ** 2;
        rb.addForce(-rb.velocity.x * this.arrastreAire * dragFactor * deltaTime * 100,
                    -rb.velocity.y * this.arrastreAire * dragFactor * deltaTime * 100);

        if (speedKmh > this.velocidadDespegue * 0.5) {
            // Factor de sustentación mejorado: decae si el ángulo de ataque es demasiado alto (stall)
            const AoA = Math.abs(transform.rotation % 360); // Simplificado
            const stallFactor = (AoA > 60 && AoA < 300) ? 0.2 : 1.0;

            const liftFactor = Math.min(1.5, (speedKmh - this.velocidadDespegue * 0.5) / 400) * stallFactor;

            // Fuerza hacia arriba relativa al avión (sustentación pura)
            const liftDir = { x: -forward.y, y: forward.x };
            const liftMag = liftFactor * this.fuerzaSustentacion * 600 * deltaTime;
            rb.addForce(liftDir.x * liftMag, liftDir.y * liftMag);

            // 4.1 Alineación Aerodinámica (Seguir la nariz)
            // Esto hace que el vector de velocidad se incline hacia donde apunta el avión
            const velMag = Math.sqrt(rb.velocity.x**2 + rb.velocity.y**2);
            if (velMag > 0.5) {
                // Mezclamos la velocidad actual con la dirección 'forward'
                // Factor de alineación más agresivo para evitar que "salga volando" de lado
                const alignmentStrength = Math.min(0.2, (speedKmh / 1500) * deltaTime * 15);
                rb.velocity.x = rb.velocity.x * (1 - alignmentStrength) + (forward.x * velMag) * alignmentStrength;
                rb.velocity.y = rb.velocity.y * (1 - alignmentStrength) + (forward.y * velMag) * alignmentStrength;
            }

            // Efecto de estabilidad: el avión tiende a nivelarse solo si no hay input y tiene velocidad
            if (pitchInput === 0) {
                rb.angularVelocity *= Math.pow(0.85, deltaTime * 60);
            }
        }

        // 5. Arrastre de Aire Base
        if (this.arrastreAire > 0) {
            const drag = Math.pow(1.0 - this.arrastreAire, deltaTime);
            rb.velocity.x *= drag;
            rb.velocity.y *= drag;
            rb.angularVelocity *= drag;
        }

        // Engine sound fallback/loop
        if (this.engineSound && Math.abs(rb.velocity.x) > 0.1) {
            const audio = this.materia.getComponent(AudioSource);
            if (audio && !audio.isPlaying) audio.play(this.engineSound);
        } else {
            const audio = this.materia.getComponent(AudioSource);
            if (audio && audio.isPlaying && this.engineSound && audio.source === this.engineSound) {
                audio.stop();
            }
        }

        // --- Animation Integration ---
        this._updateAnimations(thrustInput, rb);
    }

    _updateAnimations(thrustInput, rb) {
        const controller = this.materia.getComponent(AnimatorController);
        const animator = this.materia.getComponent(Animator);
        if (!controller && !animator) return;

        const play = (name) => {
            if (!name) return;
            if (controller) controller.play(name);
            else animator.play(name);
        };

        if (this.estaEnSuelo) {
            if (Math.abs(rb.velocity.x) > 0.1) play(this.groundAnim);
            else play(this.idleAnim);
        } else {
            play(this.flyAnim);
        }
    }

    clone() {
        const copy = new PlaneController(null);
        Object.assign(copy, this);
        return copy;
    }
}

/**
 * Componente Suspension: Sistema de amortiguación física para ruedas.
 * Conecta una Materia (Rueda) a otra (Chasis) mediante un muelle físico.
 */
export class Suspension extends Leyes {
    static actionableMethods = {
        'suspension': ['suspension', 'suspensão', 'подвеска', '悬挂']
    };

    constructor(materia) {
        super(materia);
        this.chasis = null; // ID de la Materia que actúa como cuerpo del vehículo
        this.dureza = 50;
        this.amortiguacion = 2;
        this.longitudReposo = 60;
        this.eje = { x: 0, y: -1 }; // Dirección del muelle (normalmente hacia abajo)
        this.suspensionSound = ""; // Opcional: sonido al amortiguar

        // Estado interno
        this._puntoAnclajeLocal = null;
        this._isInitialized = false;
        this._warnedMissing = new Set();
    }

    get hardness() { return this.dureza; }
    set hardness(v) { this.dureza = v; }
    get damping() { return this.amortiguacion; }
    set damping(v) { this.amortiguacion = v; }
    get restLength() { return this.longitudReposo; }
    set restLength(v) { this.longitudReposo = v; }

    update(deltaTime) {
        const isGame = typeof window !== 'undefined' && (window.isGameRunning || window.CE_Standalone_Scripts);
        this.materia.isWheel = true;
        if (!isGame) return;
    }

    fixedUpdate(deltaTime) {
        const isGame = typeof window !== 'undefined' && (window.isGameRunning || window.CE_Standalone_Scripts);
        if (!isGame) return;

        const scene = this.materia.scene;
        if (!scene) return;

        let chasisMtr = this.chasis;
        if (typeof chasisMtr === 'number') chasisMtr = scene.findMateriaById(this.chasis);
        if (!chasisMtr) return;

        const rbRueda = this.materia.getComponent(Rigidbody2D);
        const rbChasis = chasisMtr.getComponent(Rigidbody2D);
        const transRueda = this.materia.getComponent(Transform);
        const transChasis = chasisMtr.getComponent(Transform);

        if (!rbRueda || !rbChasis || !transRueda || !transChasis) return;

        // 1. Inicializar punto de anclaje relativo al chasis
        if (!this._isInitialized) {
            const dx = transRueda.x - transChasis.x;
            const dy = transRueda.y - transChasis.y;
            const rad = -transChasis.rotation * Math.PI / 180;
            const cos = Math.cos(rad), sin = Math.sin(rad);
            this._puntoAnclajeLocal = {
                x: dx * cos - dy * sin,
                y: dx * sin + dy * cos
            };
            this.materia.isWheel = true;
            this._isInitialized = true;
        }

        // 2. Calcular posiciones y direcciones en el mundo
        const radC = transChasis.rotation * Math.PI / 180;
        const cosC = Math.cos(radC), sinC = Math.sin(radC);

        const worldAnchor = {
            x: transChasis.x + (this._puntoAnclajeLocal.x * cosC - this._puntoAnclajeLocal.y * sinC),
            y: transChasis.y + (this._puntoAnclajeLocal.x * sinC + this._puntoAnclajeLocal.y * cosC)
        };

        const worldAxis = {
            x: this.eje.x * cosC - this.eje.y * sinC,
            y: this.eje.x * sinC + this.eje.y * cosC
        };

        // 3. Física de muelle amortiguado
        const diff = { x: transRueda.x - worldAnchor.x, y: transRueda.y - worldAnchor.y };
        const currentLength = diff.x * worldAxis.x + diff.y * worldAxis.y;

        // Velocidades en escala física (unidades/s)
        const vRueda = { x: rbRueda.velocity.x * 100, y: rbRueda.velocity.y * 100 };
        const vChasis = { x: rbChasis.velocity.x * 100, y: rbChasis.velocity.y * 100 };

        const relVel = { x: vRueda.x - vChasis.x, y: vRueda.y - vChasis.y };
        const relVelAlongAxis = relVel.x * worldAxis.x + relVel.y * worldAxis.y;

        const springForce = (this.longitudReposo - currentLength) * this.dureza;
        const dampingForce = -relVelAlongAxis * this.amortiguacion;
        let totalForce = springForce + dampingForce;

        const maxForce = 5000;
        totalForce = Math.max(-maxForce, Math.min(maxForce, totalForce));

        const forceVec = { x: worldAxis.x * totalForce, y: worldAxis.y * totalForce };

        // Aplicar fuerzas
        const forceScale = deltaTime;
        rbRueda.addForce(forceVec.x * forceScale, forceVec.y * forceScale);
        rbChasis.addForce(-forceVec.x * forceScale, -forceVec.y * forceScale);

        // 4. Restricción lateral
        const perpAxis = { x: -worldAxis.y, y: worldAxis.x };
        const lateralDiff = diff.x * perpAxis.x + diff.y * perpAxis.y;
        const lateralVel = relVel.x * perpAxis.x + relVel.y * perpAxis.y;

        const lateralCorrection = -lateralDiff * 100 - lateralVel * 10;
        rbRueda.addForce(perpAxis.x * lateralCorrection * forceScale, perpAxis.y * lateralCorrection * forceScale);
        rbChasis.addForce(-perpAxis.x * lateralCorrection * forceScale, -perpAxis.y * lateralCorrection * forceScale);
    }

    clone() {
        const copy = new Suspension(null);
        Object.assign(copy, this);
        copy._puntoAnclajeLocal = this._puntoAnclajeLocal ? { ...this._puntoAnclajeLocal } : null;
        copy._warnedMissing = new Set();
        return copy;
    }
}

/**
 * Componente VehicleSideView2D: Controlador de vehículos en vista lateral.
 * Maneja la aceleración, frenado y equilibrio del chasis.
 */
export class VehicleSideView2D extends Leyes {
    static actionableMethods = {
        'accelerate': ['acelerar', 'ускориться', '加速'],
        'brake': ['frenar', 'тормозить', '制动']
    };

    constructor(materia) {
        super(materia);
        this.wheels = []; // IDs de las Materias que actúan como ruedas
        this.potenciaMotor = 1000;
        this.velocidadMaxima = 2000;
        this.frenadoMotor = 0.5;
        this.fuerzaInclinacion = 1.0;
        this.controlAire = 500;
        this.estabilidadAire = 0.5;
        this.recuperacionGiro = 0.5;
        this.teclaAcelerar = "flechaderecha";
        this.teclaFrenar = "flechaizquierda";
        this.motorSound = "";

        this._warnedMissing = new Set();
    }

    get vehicle() { return this; }
    get motor() { return this.potenciaMotor; }
    set motor(v) { this.potenciaMotor = v; }
    get maxVel() { return this.velocidadMaxima; }
    set maxVel(v) { this.velocidadMaxima = v; }

    fixedUpdate(deltaTime) {
        const isGame = typeof window !== 'undefined' && (window.isGameRunning || window.CE_Standalone_Scripts);
        if (!isGame) return;

        const scene = this.materia.scene;
        if (!scene) return;

        const rbChasis = this.materia.getComponent(Rigidbody2D);
        const transChasis = this.materia.getComponent(Transform);
        if (!rbChasis || !transChasis) return;

        // Autodetectar ruedas si la lista está vacía
        if (this.wheels.length === 0) {
            const hijos = this.materia.getChildrenWithComponent(Suspension);
            if (hijos.length > 0) {
                this.wheels = hijos.map(h => h.id);
            }
        }

        const input = RuntimeAPIManager.getAPI('input');
        if (!input) return;

        let moveInput = 0;
        if (input.isKeyPressed(this.teclaAcelerar)) moveInput += 1;
        if (input.isKeyPressed(this.teclaFrenar)) moveInput -= 1;

        const engine = RuntimeAPIManager.getAPI('engine');
        let anyWheelGrounded = false;
        const wheelObjects = [];

        this.wheels.forEach(wheelId => {
            const wheelMtr = scene.findMateriaById(wheelId);
            if (wheelMtr) {
                wheelObjects.push(wheelMtr);
                if (engine && (engine.alPermanecerEnColision(wheelMtr).length > 0 ||
                              engine.alEntrarEnColision(wheelMtr).length > 0)) {
                    anyWheelGrounded = true;
                }
            }
        });

        if (anyWheelGrounded) {
            // Fricción de chasis
            rbChasis.angularVelocity *= Math.pow(0.9, deltaTime * 60);

            wheelObjects.forEach(wheelMtr => {
                const rbRueda = wheelMtr.getComponent(Rigidbody2D);
                if (!rbRueda) return;

                if (moveInput !== 0) {
                    if (Math.abs(rbRueda.angularVelocity) < this.velocidadMaxima / 100) {
                        const torqueScale = 1500;
                        const torque = moveInput * this.potenciaMotor * torqueScale * deltaTime;
                        rbRueda.addTorque(torque);

                        // Reaction torque on chassis (Tilt)
                        rbChasis.addTorque(-torque * 1.5 * this.fuerzaInclinacion);

                        if (this.motorSound) {
                            const audio = this.materia.getComponent(AudioSource);
                            if (audio) {
                                if (!audio.isPlaying) audio.play(this.motorSound);
                            } else if (!this._warnedMissing.has('AudioSource')) {
                                this._warnedMissing.add('AudioSource');
                                throw new Error(`El componente 'VehicleSideView2D' requiere un 'AudioSource' para reproducir el sonido del motor.`);
                            }
                        }
                    }
                } else {
                    if (this.frenadoMotor > 0) {
                        rbRueda.angularVelocity *= Math.pow(0.95, deltaTime * 60);
                    }
                }
            });

            // Recuperación de giro en suelo
            if (moveInput === 0 && this.recuperacionGiro > 0) {
                let currentRot = transChasis.rotation % 360;
                if (currentRot > 180) currentRot -= 360;
                if (currentRot < -180) currentRot += 360;
                rbChasis.addTorque(-currentRot * this.recuperacionGiro * 2000 * deltaTime);
            }
        } else {
            // Control en aire
            if (moveInput !== 0) {
                rbChasis.addTorque(-moveInput * this.controlAire * 2000 * deltaTime);
            } else if (this.estabilidadAire > 0) {
                let currentRot = transChasis.rotation % 360;
                if (currentRot > 180) currentRot -= 360;
                if (currentRot < -180) currentRot += 360;
                rbChasis.addTorque(-currentRot * this.estabilidadAire * 1000 * deltaTime);
                rbChasis.angularVelocity *= Math.pow(0.95, deltaTime * 60);
            }
        }
    }

    clone() {
        const copy = new VehicleSideView2D(null);
        Object.assign(copy, this);
        copy.wheels = [...this.wheels];
        copy._warnedMissing = new Set();
        return copy;
    }
}

export class BasicAI extends Leyes {
    constructor(materia) {
        super(materia);
        this.target = null; // ID de la materia objetivo
        this.behavior = 'Follow'; // 'Follow', 'Escape', 'Wander'
        this.movementType = 'Top-Down'; // 'Top-Down', 'Platformer', 'Fighter'
        this.speed = 100;
        this.stopDistance = 50;
        this.attackDistance = 30;
        this.jumpForce = 400;
        this.autoRotate = true;
        this.rotationSpeed = 0.1;
        this.obstacleAvoidance = true;
        this.detectionTags = ['Player'];
        this.detectionDistance = 400;

        // Raycast Steering
        this.rayCount = 5;
        this.raySpread = 90;
        this.rayLength = 100;

        // Script Execution
        this.scriptTarget = null;
        this.functionName = ''; // Legacy
        this.onTargetSeen = '';
        this.onTargetLost = '';
        this.onTargetNear = '';
        this.onAttackRange = '';

        this._wanderAngle = Math.random() * 360;
        this._wanderTimer = 0;
        this._velocity = { x: 0, y: 0 };
        this._isTargetInView = false;
        this._isTargetNear = false;
        this._isAttackRange = false;
        this._jumpCooldown = 0;
    }

    update(deltaTime) {
        if (typeof window !== 'undefined' && !window.isGameRunning && !window.CE_Standalone_Scripts) return;

        const scene = this.materia.scene;
        const engine = RuntimeAPIManager.getAPI('engine');
        if (!scene || (!scene.physicsSystem && !engine)) return;

        const transform = this.materia.getComponent(Transform);
        if (!transform) return;

        let targetObj = null;
        if (typeof this.target === 'number') {
            targetObj = scene.findMateriaById(this.target);
        } else if (this.target instanceof Materia) {
            targetObj = this.target;
        }

        // --- 1. Detección y ejecución de funciones ---
        const bestTarget = this._handleAdvancedDetection(scene, transform, targetObj);

        // --- 2. Lógica de movimiento y Steering ---
        let desiredVelocity = { x: 0, y: 0 };
        let currentTargetPos = null;

        if (bestTarget) {
            const targetTransform = bestTarget.getComponent(Transform);
            if (targetTransform) currentTargetPos = { x: targetTransform.x, y: targetTransform.y };
        }

        if (this.behavior === 'Follow' && currentTargetPos) {
            const dx = currentTargetPos.x - transform.x;
            const dy = (this.movementType === 'Platformer' || this.movementType === 'Fighter') ? 0 : (currentTargetPos.y - transform.y);
            const dist = Math.hypot(dx, dy);

            if (dist > this.stopDistance) {
                desiredVelocity = { x: (dx / dist) * this.speed, y: (dy / dist) * this.speed };
            }
        } else if (this.behavior === 'Escape' && currentTargetPos) {
            const dx = transform.x - currentTargetPos.x;
            const dy = (this.movementType === 'Platformer' || this.movementType === 'Fighter') ? 0 : (transform.y - currentTargetPos.y);
            const dist = Math.hypot(dx, dy);

            if (dist < this.detectionDistance) {
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

        // --- 3. Obstacle Avoidance & Steering ---
        if (this.obstacleAvoidance) {
            desiredVelocity = this._applySteering(desiredVelocity, transform);
        }

        // --- 4. Jumping Logic (Platformer/Fighter) ---
        if ((this.movementType === 'Platformer' || this.movementType === 'Fighter') && this._jumpCooldown <= 0) {
            if (this._checkShouldJump(transform)) {
                this._jump();
                this._jumpCooldown = 1.0;
            }
        }
        if (this._jumpCooldown > 0) this._jumpCooldown -= deltaTime;

        // --- 5. Aplicar movimiento ---
        this._applyMovement(desiredVelocity, deltaTime, transform);

        // --- 6. Rotación automática ---
        if (this.autoRotate) {
            if (Math.hypot(desiredVelocity.x, desiredVelocity.y) > 1) {
                const targetRot = Math.atan2(desiredVelocity.y, desiredVelocity.x) * 180 / Math.PI;
                let diff = targetRot - transform.rotation;
                while (diff > 180) diff -= 360;
                while (diff < -180) diff += 360;
                transform.rotation += diff * this.rotationSpeed;
            }
        }
    }

    _applySteering(velocity, transform) {
        const engine = RuntimeAPIManager.getAPI('engine');
        if (!engine) return velocity;

        let avoidanceForce = { x: 0, y: 0 };
        const startAngle = -this.raySpread / 2;
        const step = this.rayCount > 1 ? this.raySpread / (this.rayCount - 1) : 0;

        // Base direction for rays: prefer velocity direction, fallback to rotation
        let baseAngle = transform.rotation;
        if (Math.hypot(velocity.x, velocity.y) > 0.1) {
            baseAngle = Math.atan2(velocity.y, velocity.x) * 180 / Math.PI;
        }

        let obstacleDetected = false;

        for (let i = 0; i < this.rayCount; i++) {
            const angle = (baseAngle + startAngle + step * i) * Math.PI / 180;
            const dir = { x: Math.cos(angle), y: Math.sin(angle) };

            // Usamos un raycast manual si no hay RaycastSource configurado
            const hit = engine.raycast(transform.position, dir, this.rayLength, [this.materia.id]);

            if (hit && hit.materia) {
                // Si es algo que no está en detectionTags, es un obstáculo
                if (!this.detectionTags.includes(hit.materia.tag)) {
                    const weight = (1.0 - hit.distance / this.rayLength);
                    avoidanceForce.x += hit.normal.x * weight * this.speed * 2;
                    avoidanceForce.y += hit.normal.y * weight * this.speed * 2;
                    obstacleDetected = true;
                }
            }
        }

        if (obstacleDetected) {
            velocity.x += avoidanceForce.x;
            velocity.y += avoidanceForce.y;

            // Normalizar de nuevo a la velocidad máxima
            const mag = Math.hypot(velocity.x, velocity.y);
            if (mag > 0) {
                velocity.x = (velocity.x / mag) * this.speed;
                velocity.y = (velocity.y / mag) * this.speed;
            }
        }

        return velocity;
    }

    _checkShouldJump(transform) {
        const engine = RuntimeAPIManager.getAPI('engine');
        if (!engine) return false;

        // Rayo hacia adelante a la altura de los "pies"
        const rad = transform.rotation * Math.PI / 180;
        const forward = { x: Math.cos(rad), y: Math.sin(rad) };
        const hit = engine.raycast ? engine.raycast(transform.position, forward, 40, [this.materia.id]) : null;

        if (hit && hit.materia && !this.detectionTags.includes(hit.materia.tag)) {
            // Hay algo al frente, comprobar si hay espacio arriba para saltar
            const up = { x: 0, y: 1 };
            const upClear = !engine.raycast(transform.position, up, 60, [this.materia.id]);
            return upClear;
        }
        return false;
    }

    _jump() {
        const rb = this.materia.getComponent(Rigidbody2D);
        if (rb) {
            if (rb.bodyType === 'Dynamic') {
                rb.applyForce({ x: 0, y: this.jumpForce * 50 });
            }
        }
    }

    _applyMovement(desiredVelocity, deltaTime, transform) {
        const rb = this.materia.getComponent(Rigidbody2D);
        if (rb && rb.bodyType === 'Dynamic') {
            // Fighter y Platformer solo mueven X directamente o con fuerzas
            if (this.movementType === 'Platformer' || this.movementType === 'Fighter') {
                rb.velocity.x = desiredVelocity.x / 50;
                // Y se deja a la gravedad/salto
            } else {
                // Top-Down
                rb.velocity.x = desiredVelocity.x / 50;
                rb.velocity.y = desiredVelocity.y / 50;
            }
        } else {
            transform.x += desiredVelocity.x * deltaTime;
            transform.y += desiredVelocity.y * deltaTime;
        }
    }

    _handleAdvancedDetection(scene, transform, targetObj) {
        let bestTarget = targetObj;
        let minDist = targetObj ? Math.hypot(targetObj.getComponent(Transform).x - transform.x, targetObj.getComponent(Transform).y - transform.y) : Infinity;

        // Si no hay target fijo, o si queremos buscar otros objetivos por Tag
        if (this.detectionTags && this.detectionTags.length > 0) {
            const materias = scene.getAllMaterias();
            for (const m of materias) {
                if (m.id === this.materia.id) continue;
                if (this.detectionTags.includes(m.tag)) {
                    const mTrans = m.getComponent(Transform);
                    if (mTrans) {
                        const d = Math.hypot(mTrans.x - transform.x, mTrans.y - transform.y);
                        if (d < this.detectionDistance && d < minDist) {
                            minDist = d;
                            bestTarget = m;
                        }
                    }
                }
            }
        }

        const dist = minDist;
        const previouslyInView = this._isTargetInView;
        const previouslyNear = this._isTargetNear;
        const previouslyAttack = this._isAttackRange;

        this._isTargetInView = dist < this.detectionDistance;
        this._isTargetNear = dist < this.stopDistance * 1.5;
        this._isAttackRange = dist < this.attackDistance;

        // Si estamos en modo Follow y no tenemos un target fijo, seguir al detectado
        if (this.behavior === 'Follow' && !this.target && bestTarget) {
            // No asignamos this.target permanentemente para permitir cambiar de objetivo dinámicamente
            // Pero usamos bestTarget para las notificaciones y el movimiento de este frame
        }

        // Events
        if (this._isTargetInView && !previouslyInView) this._invokeAIEvent(this.onTargetSeen, bestTarget);
        if (!this._isTargetInView && previouslyInView) this._invokeAIEvent(this.onTargetLost, bestTarget);
        if (this._isTargetNear && !previouslyNear) this._invokeAIEvent(this.onTargetNear, bestTarget);
        if (this._isAttackRange && !previouslyAttack) this._invokeAIEvent(this.onAttackRange, bestTarget);

        // Legacy
        if (this._isTargetInView && this.functionName) this._invokeAIEvent(this.functionName, bestTarget);

        return bestTarget;
    }

    _invokeAIEvent(funcName, target) {
        if (!funcName) return;

        let scriptTargetObj = null;
        if (typeof this.scriptTarget === 'number') {
            scriptTargetObj = this.materia.scene.findMateriaById(this.scriptTarget);
        } else if (this.scriptTarget instanceof Materia) {
            scriptTargetObj = this.scriptTarget;
        } else {
            scriptTargetObj = this.materia; // Default to self
        }

        if (!scriptTargetObj) return;

        scriptTargetObj.getComponents(CreativeScript).forEach(script => {
            if (script.instance && typeof script.instance[funcName] === 'function') {
                script._safeInvoke(funcName, target, this.materia);
            }
        });
    }

    clone() {
        const copy = new BasicAI(null);
        copy.target = this.target;
        copy.behavior = this.behavior;
        copy.movementType = this.movementType;
        copy.speed = this.speed;
        copy.stopDistance = this.stopDistance;
        copy.attackDistance = this.attackDistance;
        copy.jumpForce = this.jumpForce;
        copy.autoRotate = this.autoRotate;
        copy.rotationSpeed = this.rotationSpeed;
        copy.obstacleAvoidance = this.obstacleAvoidance;
        copy.detectionTags = [...this.detectionTags];
        copy.detectionDistance = this.detectionDistance;
        copy.rayCount = this.rayCount;
        copy.raySpread = this.raySpread;
        copy.rayLength = this.rayLength;
        copy.scriptTarget = this.scriptTarget;
        copy.functionName = this.functionName;
        copy.onTargetSeen = this.onTargetSeen;
        copy.onTargetLost = this.onTargetLost;
        copy.onTargetNear = this.onTargetNear;
        copy.onAttackRange = this.onAttackRange;
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
        const uiTransform = this.materia.getComponent(window.Components.UITransform);
        const canvas = this.materia.getComponent(Canvas);
        if (!uiTransform && !canvas) return;

        let nextY = this.padding.top;
        for (const child of this.materia.children) {
            if (!child.isActive) continue;
            const childUI = child.getComponent(window.Components.UITransform);
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
        const uiTransform = this.materia.getComponent(window.Components.UITransform);
        const canvas = this.materia.getComponent(Canvas);
        if (!uiTransform && !canvas) return;

        let nextX = this.padding.left;
        for (const child of this.materia.children) {
            if (!child.isActive) continue;
            const childUI = child.getComponent(window.Components.UITransform);
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
        const uiTransform = this.materia.getComponent(window.Components.UITransform);
        const canvas = this.materia.getComponent(Canvas);
        if (!uiTransform && !canvas) return;

        const parentWidth = uiTransform ? uiTransform.size.width : (canvas.referenceResolution?.width || 800);

        let nextX = this.padding.left;
        let nextY = this.padding.top;
        for (const child of this.materia.children) {
            if (!child.isActive) continue;
            const childUI = child.getComponent(window.Components.UITransform);
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
        const uiTransform = this.materia.getComponent(window.Components.UITransform);
        if (!uiTransform) return;

        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        let hasChildren = false;

        for (const child of this.materia.children) {
            if (!child.isActive) continue;
            const childUI = child.getComponent(window.Components.UITransform);
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
registerComponent('Suspension', Suspension);
registerComponent('VehicleSideView2D', VehicleSideView2D);
registerComponent('VehicleTopDown', VehicleTopDown);
registerComponent('PlaneController', PlaneController);
registerComponent('HelicopterController', HelicopterController);
registerComponent('LineCollider2D', LineCollider2D);
registerComponent('VerticalLayoutGroup', VerticalLayoutGroup);
registerComponent('HorizontalLayoutGroup', HorizontalLayoutGroup);
registerComponent('GridLayoutGroup', GridLayoutGroup);
registerComponent('ContentSizeFitter', ContentSizeFitter);
registerComponent('Attack', Attack);
registerComponent('ProgressBar', ProgressBar);

/**
 * Componente SceneLoader: Carga una escena nueva al detectar colisiones, teclas o clicks en UI.
 */
export class SceneLoader extends Leyes {
    constructor(materia) {
        super(materia);
        this.scenePath = ""; // Ruta a la escena (ej: Assets/Nivel2.ceScene)
        this.triggerTag = "Player"; // Tag que debe colisionar
        this.triggerKey = ""; // Tecla opcional (ej: 'Enter')
        this.buttonMateria = null; // ID o nombre de la Materia UI (Botón)

        this._isSceneLoaded = false;
        this._buttonListenerAdded = false;
    }

    async start() {
        this._isSceneLoaded = false;
        this._buttonListenerAdded = false;
    }

    update(deltaTime) {
        if (this._isSceneLoaded || !this.scenePath) return;

        // 1. Detectar Tecla
        if (this.triggerKey) {
            const input = RuntimeAPIManager.getAPI('input');
            if (input && input.isKeyJustPressed(this.triggerKey)) {
                this.load();
                return;
            }
        }

        // 2. Detectar Botón UI y registrar listener
        if (this.buttonMateria && !this._buttonListenerAdded) {
            const scene = this.materia.scene;
            if (scene) {
                let btnMtr = null;
                if (typeof this.buttonMateria === 'number') btnMtr = scene.findMateriaById(this.buttonMateria);
                else if (typeof this.buttonMateria === 'string') btnMtr = scene.findMateriaByName(this.buttonMateria) || this.materia.findChildByName(this.buttonMateria, true);

                if (btnMtr) {
                    const btn = btnMtr.getComponentByName('Button');
                    if (btn) {
                        this._buttonListenerAdded = true;
                        if (!btn.onClick) btn.onClick = [];
                        btn.onClick.push(() => this.load());
                    }
                    const trigger = btnMtr.getComponentByName('UIEventTrigger');
                    if (trigger) {
                        this._buttonListenerAdded = true;
                        if (!trigger.events.onPointerClick) trigger.events.onPointerClick = [];
                        trigger.events.onPointerClick.push(() => this.load());
                    }
                }
            }
        }
    }

    alEntrarEnColision(col) {
        if (this._isSceneLoaded || !this.scenePath) return;
        if (this.triggerTag && col.materia && col.materia.tieneTag(this.triggerTag)) {
            this.load();
        }
    }

    load() {
        if (this._isSceneLoaded || !this.scenePath) return;
        this._isSceneLoaded = true;

        const sceneAPI = RuntimeAPIManager.getAPI('scene');
        if (sceneAPI && sceneAPI.loadScene) {
            console.log(`[SceneLoader] Cargando nueva escena: ${this.scenePath}`);
            sceneAPI.loadScene(this.scenePath);
        }
    }

    // Spanish Aliases
    get rutaEscena() { return this.scenePath; }
    set rutaEscena(v) { this.scenePath = v; }
    get caminhoCena() { return this.scenePath; }
    set caminhoCena(v) { this.scenePath = v; }
    get путьКПроекту() { return this.scenePath; }
    set путьКПроекту(v) { this.scenePath = v; }
    get 场景路径() { return this.scenePath; }
    set 场景路径(v) { this.scenePath = v; }

    get tagActivador() { return this.triggerTag; }
    set tagActivador(v) { this.triggerTag = v; }
    get etiquetaAtivadora() { return this.triggerTag; }
    set etiquetaAtivadora(v) { this.triggerTag = v; }
    get активирующийТег() { return this.triggerTag; }
    set активирующийТег(v) { this.triggerTag = v; }
    get 激活标签() { return this.triggerTag; }
    set 激活标签(v) { this.triggerTag = v; }

    get teclaActivadora() { return this.triggerKey; }
    set teclaActivadora(v) { this.triggerKey = v; }
    get teclaAtivadora() { return this.triggerKey; }
    set teclaAtivadora(v) { this.triggerKey = v; }
    get активирующаяКлавиша() { return this.triggerKey; }
    set активирующаяКлавиша(v) { this.triggerKey = v; }
    get 激活按键() { return this.triggerKey; }
    set 激活按键(v) { this.triggerKey = v; }

    get materiaBoton() { return this.buttonMateria; }
    set materiaBoton(v) { this.buttonMateria = v; }
    get materiaBotao() { return this.buttonMateria; }
    set materiaBotao(v) { this.buttonMateria = v; }
    get материяКнопки() { return this.buttonMateria; }
    set материяКнопки(v) { this.buttonMateria = v; }
    get 按钮物质() { return this.buttonMateria; }
    set 按钮物质(v) { this.buttonMateria = v; }

    clone() {
        const copy = new SceneLoader(null);
        copy.scenePath = this.scenePath;
        copy.triggerTag = this.triggerTag;
        copy.triggerKey = this.triggerKey;
        copy.buttonMateria = this.buttonMateria;
        return copy;
    }
}
registerComponent('SceneLoader', SceneLoader);

/**
 * Componente Bone (Hueso): Define un hueso en una jerarquía esquelética.
 */
export class Bone extends Leyes {
    constructor(materia) {
        super(materia);
        this.length = 100;
        this.color = '#00ff00';
        this.thickness = 5;

        // Ragdoll Properties
        this.isRagdoll = false;
        this.angularLimits = { min: -45, max: 45 };
        this.stiffness = 0.5;
        this.damping = 0.1;
    }

    clone() {
        const copy = new Bone(null);
        copy.length = this.length;
        copy.color = this.color;
        copy.thickness = this.thickness;
        copy.isRagdoll = this.isRagdoll;
        copy.angularLimits = { ...this.angularLimits };
        copy.stiffness = this.stiffness;
        copy.damping = this.damping;
        return copy;
    }
}
registerComponent('Bone', Bone);

/**
 * Componente SkeletonRenderer: Renderiza una malla deformada por huesos (Skinning).
 */
export class SkeletonRenderer extends Leyes {
    constructor(materia) {
        super(materia);
        this.source = ''; // Imagen base
        this.spriteAssetPath = '';
        this.mesh = {
            vertices: [], // [x, y, x, y, ...] locales a la materia (bind pose)
            uvs: [],      // [u, v, u, v, ...]
            indices: [],  // [0, 1, 2, ...]
            weights: []   // [[{boneIndex, weight}, ...], ...] (one array per vertex)
        };
        this.bones = []; // IDs de las materias que actúan como huesos
        this.bindPoses = []; // {x, y, rotation, scale} inverse world transforms for each bone
        this.orderInLayer = 0;
        this.opacity = 1.0;
        this.color = '#ffffff';

        this._texture = new Image();
        this._lastLoadedSource = '';
        this._boneMateriaCache = []; // Cached Materia references
    }

    _updateBoneCache() {
        const scene = this.materia.scene || window.SceneManager.currentScene;
        this._boneMateriaCache = this.bones.map(key => {
            if (typeof key === 'number') return scene.findMateriaById(key);
            return this.materia.findChildByName(key, true);
        });
    }

    async setSourcePath(path, projectsDirHandle) {
        this.source = path;
        await this.loadTexture(projectsDirHandle);
    }

    async loadTexture(projectsDirHandle) {
        if (!this.source) return;
        const url = await getURLForAssetPath(this.source, projectsDirHandle);
        if (url) {
            this._texture.src = url;
            this._lastLoadedSource = this.source;
        }
    }

    clone() {
        const copy = new SkeletonRenderer(null);
        copy.source = this.source;
        copy.spriteAssetPath = this.spriteAssetPath;
        copy.mesh = JSON.parse(JSON.stringify(this.mesh));
        copy.bones = [...this.bones];
        copy.orderInLayer = this.orderInLayer;
        copy.opacity = this.opacity;
        copy.color = this.color;
        return copy;
    }
}
registerComponent('SkeletonRenderer', SkeletonRenderer);

/**
 * Componente IKManager2D: Gestiona la cinemática inversa en una cadena de huesos.
 */
export class IKManager2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.target = null; // ID de la materia objetivo (effector target)
        this.chainLength = 2;
        this.iterations = 10;
        this.tolerance = 0.1;
    }

    update(deltaTime) {
        if (!this.isActive || !this.target) return;

        const scene = this.materia.scene || window.SceneManager.currentScene;
        const targetMtr = scene.findMateriaById(this.target);
        if (!targetMtr) return;

        const targetPos = targetMtr.getComponent(Transform).position;
        this.solveFABRIK(targetPos);
    }

    solveFABRIK(targetPos) {
        const chain = [];
        let current = this.materia;
        for (let i = 0; i < this.chainLength + 1; i++) {
            if (!current) break;
            const trans = current.getComponent(Transform);
            if (!trans) break;
            chain.push({
                materia: current,
                transform: trans,
                pos: trans.position
            });
            current = current.parent;
        }

        if (chain.length < 2) return;

        const origin = { ...chain[chain.length - 1].pos };
        const lengths = [];
        for (let i = 0; i < chain.length - 1; i++) {
            lengths.push(Math.hypot(chain[i].pos.x - chain[i+1].pos.x, chain[i].pos.y - chain[i+1].pos.y));
        }

        // FABRIK Algorithm
        for (let iter = 0; iter < this.iterations; iter++) {
            // Forward pass
            chain[0].pos = { ...targetPos };
            for (let i = 1; i < chain.length; i++) {
                const dir = { x: chain[i].pos.x - chain[i-1].pos.x, y: chain[i].pos.y - chain[i-1].pos.y };
                const dist = Math.hypot(dir.x, dir.y) || 1;
                const ratio = lengths[i-1] / dist;
                chain[i].pos = {
                    x: chain[i-1].pos.x + dir.x * ratio,
                    y: chain[i-1].pos.y + dir.y * ratio
                };
            }

            // Backward pass
            chain[chain.length - 1].pos = { ...origin };
            for (let i = chain.length - 2; i >= 0; i--) {
                const dir = { x: chain[i].pos.x - chain[i+1].pos.x, y: chain[i].pos.y - chain[i+1].pos.y };
                const dist = Math.hypot(dir.x, dir.y) || 1;
                const ratio = lengths[i] / dist;
                chain[i].pos = {
                    x: chain[i+1].pos.x + dir.x * ratio,
                    y: chain[i+1].pos.y + dir.y * ratio
                };
            }

            // Check if close enough
            if (Math.hypot(chain[0].pos.x - targetPos.x, chain[0].pos.y - targetPos.y) < this.tolerance) break;
        }

        // Apply results and update rotations
        for (let i = chain.length - 1; i > 0; i--) {
            const current = chain[i];
            const next = chain[i-1];

            // Update position (only for children, root stays put)
            if (i < chain.length - 1) {
                current.transform.position = current.pos;
            }

            // Update rotation to point to next joint
            const dx = next.pos.x - current.pos.x;
            const dy = next.pos.y - current.pos.y;
            current.transform.rotation = Math.atan2(dy, dx) * 180 / Math.PI;
        }
        // Final effector position
        chain[0].transform.position = chain[0].pos;
    }

    clone() {
        const copy = new IKManager2D(null);
        copy.target = this.target;
        copy.chainLength = this.chainLength;
        copy.iterations = this.iterations;
        copy.tolerance = this.tolerance;
        return copy;
    }
}
registerComponent('IKManager2D', IKManager2D);


/**
 * Componente Inventario: Gestiona una lista de objetos recolectables.
 */
export class Inventario extends Leyes {
    constructor(materia) {
        super(materia);
        this.items = [];
        this.maxEspacios = 20;
        this.limitesMaximos = {};
        this.cantidadMaximaPorDefecto = 99;
    }

    establecerLimite(nombre, maximo) {
        this.limitesMaximos[nombre] = maximo;
    }

    obtenerCantidad(nombre) {
        const item = this.items.find(i => i.nombre === nombre);
        return item ? item.amount || item.cantidad : 0;
    }

    agregarItem(nombre, cantidad = 1, datos = {}) {
        const limite = this.limitesMaximos[nombre] !== undefined ? this.limitesMaximos[nombre] : this.cantidadMaximaPorDefecto;
        const itemExistente = this.items.find(i => i.nombre === nombre);

        if (itemExistente) {
            const espacioDisponible = Math.max(0, limite - itemExistente.cantidad);
            const aAgregar = Math.min(cantidad, espacioDisponible);
            itemExistente.cantidad += aAgregar;
            this._notificarCambio();
            return cantidad - aAgregar; // Sobrante
        } else if (this.items.length < this.maxEspacios) {
            const aAgregar = Math.min(cantidad, limite);
            this.items.push({ nombre, cantidad: aAgregar, datos });
            this._notificarCambio();
            return cantidad - aAgregar; // Sobrante
        }
        return cantidad;
    }

    quitarItem(nombre, cantidad = 1) {
        const index = this.items.findIndex(i => i.nombre === nombre);
        if (index !== -1) {
            this.items[index].cantidad -= cantidad;
            if (this.items[index].cantidad <= 0) {
                this.items.splice(index, 1);
            }
        }
        this._notificarCambio();
    }

    tieneItem(nombre, cantidad = 1) {
        const item = this.items.find(i => i.nombre === nombre);
        return item && item.cantidad >= cantidad;
    }

    vaciarInventario() {
        this.items = [];
        this._notificarCambio();
    }

    _notificarCambio() {
        if (this.materia) {
            this.materia.emitir('cambio-inventario', this.items);
        }
    }

    clone() {
        const copy = new Inventario(null);
        copy.items = JSON.parse(JSON.stringify(this.items));
        copy.maxEspacios = this.maxEspacios;
        copy.limitesMaximos = { ...this.limitesMaximos };
        copy.cantidadMaximaPorDefecto = this.cantidadMaximaPorDefecto;
        return copy;
    }
}
registerComponent('Inventario', Inventario);

/**
 * Componente SistemaDialogos: Gestiona el flujo de texto y nodos de conversación.
 */
export class SistemaDialogos extends Leyes {
    constructor(materia) {
        super(materia);
        this.nodos = [];
        this.indiceActual = -1;
        this.estaActivo = false;
        this.nombreHablante = "";
        this.textoActual = "";
    }

    iniciarDialogo(nodos) {
        this.nodos = nodos;
        this.indiceActual = 0;
        this.estaActivo = true;
        this._mostrarNodoActual();
    }

    siguiente() {
        if (!this.estaActivo) return;
        this.indiceActual++;
        if (this.indiceActual < this.nodos.length) {
            this._mostrarNodoActual();
        } else {
            this.finalizar();
        }
    }

    _mostrarNodoActual() {
        const nodo = this.nodos[this.indiceActual];
        this.nombreHablante = nodo.hablante || "???";
        this.textoActual = nodo.texto || "";
        this.materia.emitir('cambio-dialogo', { hablante: this.nombreHablante, texto: this.textoActual });
    }

    finalizar() {
        this.estaActivo = false;
        this.materia.emitir('finalizar-dialogo');
    }

    clone() {
        return new SistemaDialogos(null);
    }
}
registerComponent('SistemaDialogos', SistemaDialogos);

/**
 * Componente GestorMisiones: Rastrea objetivos globales o de nivel.
 */
export class GestorMisiones extends Leyes {
    constructor(materia) {
        super(materia);
        this.misiones = {}; // { id: { completada: bool, objetivos: [] } }
    }

    iniciarMision(id, titulo, objetivos = []) {
        this.misiones[id] = { titulo, completada: false, objetivos: objetivos.map(o => ({ desc: o, completado: false })) };
        this._notificarMisiones();
    }

    completarObjetivo(misionId, index) {
        if (this.misiones[misionId] && this.misiones[misionId].objetivos[index]) {
            this.misiones[misionId].objetivos[index].completado = true;
            this._verificarMision(misionId);
        }
    }

    _verificarMision(id) {
        const m = this.misiones[id];
        if (m && m.objetivos.every(o => o.completado)) {
            m.completada = true;
            console.log(`[Quest] Misión completada: ${m.titulo}`);
        }
        this._notificarMisiones();
    }

    _notificarMisiones() {
        this.materia.emitir('cambio-misiones', this.misiones);
    }

    clone() {
        const copy = new GestorMisiones(null);
        copy.misiones = JSON.parse(JSON.stringify(this.misiones));
        return copy;
    }
}
registerComponent('GestorMisiones', GestorMisiones);

/**
 * Componente UIController: Administra prefabs de UI (Joysticks, Inventarios) y los auto-configura.
 */
export class UIController extends Leyes {
    constructor(materia) {
        super(materia);
        this.type = 'General'; // 'Joystick', 'Inventory', 'HealthBar'
        this.targetMateriaName = ''; // Materia a la que afecta
        this.isDragging = false;
        this.dragData = { startX: 0, startY: 0, currentX: 0, currentY: 0 };
        this.joystickRadius = 75;
    }

    onEnable() {
        if (!this.targetMateriaName) {
            // Intento de auto-detección de Jugador
            const scene = this.materia.scene;
            if (scene) {
                const player = scene.getAllMaterias().find(m => m.tieneTag('Player') || m.name.toLowerCase().includes('jugador'));
                if (player) {
                    this.targetMateriaName = player.name;
                    console.log(`[UIController] Auto-configurado: Objetivo detectado -> ${player.name}`);
                }
            }
        }
    }

    update(dt) {
        if (this.type === 'Joystick' && this.isDragging) {
            this._handleJoystickLogic();
        }
    }

    startDrag(x, y) {
        this.isDragging = true;
        this.dragData.startX = x;
        this.dragData.startY = y;
    }

    updateDrag(x, y) {
        if (!this.isDragging) return;

        let dx = x - this.dragData.startX;
        let dy = y - this.dragData.startY;

        // Limitar circularmente para Joysticks
        if (this.type === 'Joystick') {
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > this.joystickRadius) {
                const ratio = this.joystickRadius / dist;
                dx *= ratio;
                dy *= ratio;
            }
        }

        this.dragData.currentX = dx;
        this.dragData.currentY = dy;

        // Actualizar visual si hay un hijo llamado 'Handle'
        const handle = this.materia.children.find(c => c.name.includes('Handle') || c.name.includes('Punto'));
        if (handle) {
            const uiTrans = handle.getComponent(window.Components.UITransform);
            if (uiTrans) {
                uiTrans.position = { x: dx, y: dy };
            }
        }
    }

    endDrag() {
        this.isDragging = false;
        this.dragData = { startX: 0, startY: 0, currentX: 0, currentY: 0 };

        const handle = this.materia.children.find(c => c.name.includes('Handle') || c.name.includes('Punto'));
        if (handle) {
            const uiTrans = handle.getComponent(window.Components.UITransform);
            if (uiTrans) uiTrans.position = { x: 0, y: 0 };
        }
    }

    _handleJoystickLogic() {
        const scene = this.materia.scene;
        if (!scene || !this.targetMateriaName) return;

        const target = scene.findMateriaByName(this.targetMateriaName);
        if (!target) return;

        // Normalizar valores -1 a 1
        const inputX = this.dragData.currentX / this.joystickRadius;
        const inputY = this.dragData.currentY / this.joystickRadius;

        // Emitir evento de movimiento para que el controlador del jugador lo escuche
        target.emitir('ui-move', { x: inputX, y: inputY });
    }

    clone() {
        const copy = new UIController(null);
        copy.type = this.type;
        copy.targetMateriaName = this.targetMateriaName;
        copy.joystickRadius = this.joystickRadius;
        return copy;
    }
}
registerComponent('UIController', UIController);

// --- Optimization Components ---

export class AutoCulling2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.margin = 150; // Padding to prevent objects clipping at the screen edge
        this.onlyDisableRenderer = true; // If false, disables the whole materia
    }

    update(deltaTime) {
        const isGame = typeof window !== 'undefined' && (window.isGameRunning || window.CE_Standalone_Scripts);
        if (!isGame) return;

        const scene = this.materia.scene;
        if (!scene) return;

        const camera = scene.findFirstCamera();
        if (!camera) return;

        const camTrans = camera.getComponent(Transform);
        const camComp = camera.getComponent(Camera);
        const myTrans = this.materia.getComponent(Transform);
        if (!camTrans || !camComp || !myTrans) return;

        // Viewport sizes
        const orthographicSize = camComp.orthographicSize || 5;
        const aspect = (window.innerWidth / (window.innerHeight || 1)) || 1.6;
        const height = orthographicSize * 2 * 100; // world units estimate
        const width = height * aspect;

        const camMinX = camTrans.x - width / 2 - this.margin;
        const camMaxX = camTrans.x + width / 2 + this.margin;
        const camMinY = camTrans.y - height / 2 - this.margin;
        const camMaxY = camTrans.y + height / 2 + this.margin;

        const inViewport = myTrans.x >= camMinX && myTrans.x <= camMaxX &&
                           myTrans.y >= camMinY && myTrans.y <= camMaxY;

        if (this.onlyDisableRenderer) {
            const r = this.materia.getComponent(SpriteRenderer) || this.materia.getComponent(TextureRender);
            if (r) {
                r.isActive = inViewport;
            }
        } else {
            this.materia.isActive = inViewport;
        }
    }

    clone() {
        const copy = new AutoCulling2D(null);
        copy.margin = this.margin;
        copy.onlyDisableRenderer = this.onlyDisableRenderer;
        return copy;
    }
}

export class ObjectPooler extends Leyes {
    constructor(materia) {
        super(materia);
        this.prefabPath = "";
        this.poolSize = 30;
        this._pool = [];
        this._isInitialized = false;
    }

    start() {
        const isGame = typeof window !== 'undefined' && (window.isGameRunning || window.CE_Standalone_Scripts);
        if (!isGame) return;
        this.initializePool();
    }

    async initializePool() {
        if (this._isInitialized || !this.prefabPath) return;
        this._isInitialized = true;
        this._pool = [];

        if (window.SceneManager && window.SceneManager.instantiatePrefabFromPath) {
            for (let i = 0; i < this.poolSize; i++) {
                const p = await window.SceneManager.instantiatePrefabFromPath(this.prefabPath);
                if (p) {
                    p.isActive = false;
                    this._pool.push(p);
                }
            }
        }
    }

    getPooledObject(x = 0, y = 0) {
        let obj = this._pool.find(p => !p.isActive);
        if (!obj && this._pool.length < this.poolSize * 2) {
            if (window.SceneManager && window.SceneManager.instantiatePrefabFromPath) {
                window.SceneManager.instantiatePrefabFromPath(this.prefabPath).then(p => {
                    if (p) {
                        p.isActive = false;
                        this._pool.push(p);
                    }
                });
            }
        }

        if (obj) {
            const trans = obj.getComponent(Transform);
            if (trans) {
                trans.position = { x, y };
            }
            obj.isActive = true;

            const rb = obj.getComponent(Rigidbody2D);
            if (rb) {
                rb.velocity = { x: 0, y: 0 };
                rb.angularVelocity = 0;
            }
        }
        return obj;
    }

    clone() {
        const copy = new ObjectPooler(null);
        copy.prefabPath = this.prefabPath;
        copy.poolSize = this.poolSize;
        return copy;
    }
}

export class DistanceDeactivator extends Leyes {
    constructor(materia) {
        super(materia);
        this.maxDistance = 1500;
        this.onlyDisablePhysicsAndScripts = true;
    }

    update(deltaTime) {
        const isGame = typeof window !== 'undefined' && (window.isGameRunning || window.CE_Standalone_Scripts);
        if (!isGame) return;

        const scene = this.materia.scene;
        if (!scene) return;

        const camera = scene.findFirstCamera();
        if (!camera) return;

        const camTrans = camera.getComponent(Transform);
        const myTrans = this.materia.getComponent(Transform);
        if (!camTrans || !myTrans) return;

        const dist = Math.hypot(camTrans.x - myTrans.x, camTrans.y - myTrans.y);
        const shouldActive = dist <= this.maxDistance;

        if (this.onlyDisablePhysicsAndScripts) {
            const rb = this.materia.getComponent(Rigidbody2D);
            if (rb) rb.simulated = shouldActive;

            const anim = this.materia.getComponent(Animator) || this.materia.getComponent(window.Components.AnimatorController);
            if (anim) anim.isPlaying = shouldActive;

            this.materia.leyes.forEach(ley => {
                if (ley !== this && ley.constructor.name === 'CreativeScript') {
                    ley.isActive = shouldActive;
                }
            });
        } else {
            this.materia.isActive = shouldActive;
        }
    }

    clone() {
        const copy = new DistanceDeactivator(null);
        copy.maxDistance = this.maxDistance;
        copy.onlyDisablePhysicsAndScripts = this.onlyDisablePhysicsAndScripts;
        return copy;
    }
}

registerComponent('AutoCulling2D', AutoCulling2D);
registerComponent('ObjectPooler', ObjectPooler);
registerComponent('DistanceDeactivator', DistanceDeactivator);


/**
 * Componente Proyectil2D: Controla el movimiento lineal de un proyectil,
 * su tiempo de vida, y realiza daño a cualquier entidad con Health al impactar.
 */
export class Proyectil2D extends Leyes {
    constructor(materia) {
        super(materia);
        this.velocidad = 500;
        this.dano = 10;
        this.direccion = { x: 1, y: 0 };
        this.tiempoVida = 5.0;
        this.autor = null; // Materia que disparó la bala
        this._hasCollided = false;
    }

    update(deltaTime) {
        const isGame = typeof window !== 'undefined' && (window.isGameRunning || window.CE_Standalone_Scripts);
        if (!isGame) return;

        const rb = this.materia.getComponent(Rigidbody2D);
        if (rb) {
            rb.velocity = {
                x: (this.direccion.x * this.velocidad) / 100,
                y: (this.direccion.y * this.velocidad) / 100
            };
        } else {
            const trans = this.materia.getComponent(Transform);
            if (trans) {
                trans.x += this.direccion.x * this.velocidad * deltaTime;
                trans.y += this.direccion.y * this.velocidad * deltaTime;
            }
        }

        this.tiempoVida -= deltaTime;
        if (this.tiempoVida <= 0) {
            this.destroyBullet();
        }
    }

    alEntrarEnColision(collision) {
        this.handleHit(collision.materia);
    }

    alEntrarEnTrigger(collision) {
        this.handleHit(collision.materia);
    }

    handleHit(otherMateria) {
        if (this._hasCollided) return;

        // Evitar colisionar con el autor o con otros proyectiles del mismo autor
        if (this.autor && otherMateria.id === this.autor.id) return;
        const otherProj = otherMateria.getComponent(Proyectil2D);
        if (otherProj && otherProj.autor && this.autor && otherProj.autor.id === this.autor.id) return;

        this._hasCollided = true;

        const health = otherMateria.getComponent(Health);
        if (health) {
            const wasDeadBefore = health.isDead || (health.currentHealth <= 0);
            health.damage(this.dano);
            const isDeadAfter = health.isDead || (health.currentHealth <= 0);

            if (!wasDeadBefore && isDeadAfter && this.autor) {
                this.rewardAuthor(this.autor, otherMateria);
            }
        }

        this.destroyBullet();
    }

    rewardAuthor(autor, target) {
        autor.emitir('kill', { target, bullet: this.materia });
        const reward = autor.getComponent(DetectorBajas);
        if (reward) {
            reward.concederRecompensa(target);
        }
    }

    destroyBullet() {
        if (this.materia && this.materia.scene) {
            this.materia.scene.removeMateria(this.materia.id);
        }
    }

    clone() {
        const copy = new Proyectil2D(null);
        copy.velocidad = this.velocidad;
        copy.dano = this.dano;
        copy.direccion = { ...this.direccion };
        copy.tiempoVida = this.tiempoVida;
        return copy;
    }
}

/**
 * Componente DetectorBajas: Otorga recompensas (puntos, items de inventario, etc.)
 * cuando el portador elimina/mata a un enemigo usando proyectiles.
 */
export class DetectorBajas extends Leyes {
    constructor(materia) {
        super(materia);
        this.recompensaPuntos = 100;
        this.itemARecompensar = "";
        this.cantidadItem = 1;
        this.mensajeConsola = "¡Enemigo eliminado!";
    }

    concederRecompensa(target) {
        console.log(`[DetectorBajas] ${this.mensajeConsola}. Víctima: ${target.name}`);
        this.materia.emitir('score-add', this.recompensaPuntos);

        if (this.itemARecompensar) {
            const inv = this.materia.getComponent(Inventario);
            if (inv) {
                inv.agregarItem(this.itemARecompensar, this.cantidadItem);
                console.log(`[DetectorBajas] Se otorgó ${this.cantidadItem}x ${this.itemARecompensar} al inventario.`);
            }
        }
    }

    clone() {
        const copy = new DetectorBajas(null);
        copy.recompensaPuntos = this.recompensaPuntos;
        copy.itemARecompensar = this.itemARecompensar;
        copy.cantidadItem = this.cantidadItem;
        copy.mensajeConsola = this.mensajeConsola;
        return copy;
    }
}

/**
 * Componente ManejoArmasLateral: Controla el sistema de armas y munición
 * en un juego con vista lateral (Side-Scrolling / Plataformas).
 */
export class ManejoArmasLateral extends Leyes {
    constructor(materia) {
        super(materia);
        this.municionMaxima = 30;
        this.municionInicial = 30;
        this.municionActual = 30;
        this.proyectilPrefab = "";
        this.teclaDisparo = "Space";
        this.tiempoDisparo = 0.2;
        this.fuerzaRetroceso = 15;
        this.velocidadRetroceso = 5;
        this.dispararAutomatico = false;

        // Camera Shake options
        this.sacudirCamaraAlDisparar = false;
        this.intensidadSacudida = 5;
        this.duracionSacudida = 0.2;

        // Animation options
        this.animacionDisparo = "";

        this._cooldown = 0;
        this._initializedAmmo = false;
        this._lastKeyState = false;
    }

    onEnable() {
        if (!this._initializedAmmo) {
            this.municionActual = this.municionInicial;
            this._initializedAmmo = true;
        }
    }

    update(deltaTime) {
        const isGame = typeof window !== 'undefined' && (window.isGameRunning || window.CE_Standalone_Scripts);
        if (!isGame) return;

        if (this._cooldown > 0) {
            this._cooldown -= deltaTime;
        }

        // Obtener estado de entrada
        let isPressed = false;
        if (this.teclaDisparo === "Mouse0" || this.teclaDisparo === "Click" || this.teclaDisparo === "MouseLeft") {
            isPressed = InputManager.getMouseButton(0);
        } else {
            isPressed = InputManager.isKeyPressed(this.teclaDisparo);
        }

        const canShoot = this.dispararAutomatico ? isPressed : (isPressed && !this._lastKeyState);
        this._lastKeyState = isPressed;

        if (canShoot && this._cooldown <= 0 && this.municionActual > 0) {
            this.disparar();
        }
    }

    async disparar() {
        this.municionActual--;
        this._cooldown = this.tiempoDisparo;

        const trans = this.materia.getComponent(Transform);
        if (!trans) return;

        // Determinar dirección de disparo basada en flipX de SpriteRenderer o escala horizontal
        let dirX = 1;
        const sr = this.materia.getComponent(SpriteRenderer);
        if (sr && (sr.flipX || (sr.sprite && sr.sprite.src && sr.sprite.src.includes('flip')))) {
            dirX = -1;
        } else if (trans.scale && trans.scale.x < 0) {
            dirX = -1;
        }

        // Punto de aparición de bala
        const spawnX = trans.x + dirX * 30;
        const spawnY = trans.y;

        // Efecto retroceso (visual o físico)
        const rb = this.materia.getComponent(Rigidbody2D);
        if (rb) {
            rb.velocity.x -= dirX * this.fuerzaRetroceso * 0.1;
        } else {
            trans.x -= dirX * this.fuerzaRetroceso * 0.5;
        }

        // Sacudida de cámara
        if (this.sacudirCamaraAlDisparar && this.materia.scene) {
            const cameras = this.materia.scene.getComponents(Camera);
            if (cameras && cameras.length > 0) {
                cameras.forEach(cam => {
                    if (typeof cam.sacudir === 'function') {
                        cam.sacudir(this.duracionSacudida, this.intensidadSacudida);
                    }
                });
            }
        }

        // Animación de disparo
        if (this.animacionDisparo) {
            const animator = this.materia.getComponent(Animator) || this.materia.getComponent(AnimatorController);
            if (animator && typeof animator.play === 'function') {
                animator.play(this.animacionDisparo, { loop: false, force: true });
            }
        }

        let proj = null;
        if (typeof this.proyectilPrefab === 'object' && this.proyectilPrefab !== null) {
            if (typeof this.proyectilPrefab.clone === 'function') {
                proj = this.proyectilPrefab.clone();
                proj.transform.position.x = spawnX;
                proj.transform.position.y = spawnY;
                if (this.materia.scene) {
                    this.materia.scene.addMateria(proj);
                }
            }
        } else if (window.SceneManager && typeof this.proyectilPrefab === 'string' && this.proyectilPrefab) {
            try {
                proj = await window.SceneManager.instantiatePrefabFromPath(this.proyectilPrefab, spawnX, spawnY);
            } catch (e) {
                console.warn("[ManejoArmasLateral] No se pudo instanciar el prefab de bala, usando bala por defecto.", e);
            }
        }

        if (proj) {
            const bulletComp = proj.getComponent(Proyectil2D) || proj.addComponent(Proyectil2D);
            bulletComp.direccion = { x: dirX, y: 0 };
            bulletComp.autor = this.materia;
        } else {
            this._crearBalaPorDefecto(spawnX, spawnY, dirX, 0);
        }
    }

    _crearBalaPorDefecto(x, y, dx, dy) {
        if (this.materia.scene) {
            const bullet = new Materia("Bala_Lateral");
            const trans = bullet.addComponent(Transform);
            trans.x = x;
            trans.y = y;
            const sr = bullet.addComponent(SpriteRenderer);
            sr.color = "#ffdd00";

            const col = bullet.addComponent(CircleCollider2D);
            col.radius = 4;
            col.isTrigger = true;

            const bulletComp = bullet.addComponent(Proyectil2D);
            bulletComp.direccion = { x: dx, y: dy };
            bulletComp.autor = this.materia;

            this.materia.scene.addMateria(bullet);
        }
    }

    clone() {
        const copy = new ManejoArmasLateral(null);
        Object.assign(copy, this);
        copy._cooldown = 0;
        copy._lastKeyState = false;
        return copy;
    }
}

/**
 * Componente ManejoArmasCenital: Controla el sistema de armas y munición
 * en un juego con vista superior / cenital (Top-Down), apuntando hacia el ratón.
 */
export class ManejoArmasCenital extends Leyes {
    constructor(materia) {
        super(materia);
        this.municionMaxima = 30;
        this.municionInicial = 30;
        this.municionActual = 30;
        this.proyectilPrefab = "";
        this.teclaDisparo = "Mouse0";
        this.tiempoDisparo = 0.2;
        this.fuerzaRetroceso = 15;
        this.velocidadRetroceso = 5;
        this.dispararAutomatico = false;

        // Camera Shake options
        this.sacudirCamaraAlDisparar = false;
        this.intensidadSacudida = 5;
        this.duracionSacudida = 0.2;

        // Animation options
        this.animacionDisparo = "";

        this._cooldown = 0;
        this._initializedAmmo = false;
        this._lastKeyState = false;
    }

    onEnable() {
        if (!this._initializedAmmo) {
            this.municionActual = this.municionInicial;
            this._initializedAmmo = true;
        }
    }

    update(deltaTime) {
        const isGame = typeof window !== 'undefined' && (window.isGameRunning || window.CE_Standalone_Scripts);
        if (!isGame) return;

        if (this._cooldown > 0) {
            this._cooldown -= deltaTime;
        }

        let isPressed = false;
        if (this.teclaDisparo === "Mouse0" || this.teclaDisparo === "Click" || this.teclaDisparo === "MouseLeft") {
            isPressed = InputManager.getMouseButton(0);
        } else {
            isPressed = InputManager.isKeyPressed(this.teclaDisparo);
        }

        const canShoot = this.dispararAutomatico ? isPressed : (isPressed && !this._lastKeyState);
        this._lastKeyState = isPressed;

        if (canShoot && this._cooldown <= 0 && this.municionActual > 0) {
            this.disparar();
        }
    }

    async disparar() {
        const trans = this.materia.getComponent(Transform);
        if (!trans) return;

        // Calcular ángulo hacia el puntero del ratón en el mundo
        let angle = 0;
        const scene = this.materia.scene;
        if (scene) {
            const camMateria = scene.findFirstCamera();
            if (camMateria) {
                const camera = camMateria.getComponent(Camera);
                let r = window.renderer;
                if (!r && typeof window !== 'undefined' && window.CE_Standalone_Runtime) {
                    r = window.CE_Standalone_Runtime.renderer;
                }
                const canvas = InputManager.activeCanvas || InputManager.sceneCanvas || InputManager.gameCanvas || (r ? r.canvas : null);
                if (camera && canvas) {
                    // Adapt camera zoom format for InputManager
                    const camFake = {
                        effectiveZoom: r && r.camera ? r.camera.effectiveZoom : 1.0,
                        x: camMateria.getComponent(Transform)?.x || 0,
                        y: camMateria.getComponent(Transform)?.y || 0
                    };
                    const mouseWorld = InputManager.getMouseWorldPosition(camFake, canvas);
                    angle = Math.atan2(mouseWorld.y - trans.y, mouseWorld.x - trans.x);
                }
            }
        }

        this.municionActual--;
        this._cooldown = this.tiempoDisparo;

        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        // Punto de aparición de bala
        const spawnX = trans.x + cosA * 30;
        const spawnY = trans.y + sinA * 30;

        // Retroceso físico/visual
        const rb = this.materia.getComponent(Rigidbody2D);
        if (rb) {
            rb.velocity.x -= cosA * this.fuerzaRetroceso * 0.1;
            rb.velocity.y -= sinA * this.fuerzaRetroceso * 0.1;
        } else {
            trans.x -= cosA * this.fuerzaRetroceso * 0.5;
            trans.y -= sinA * this.fuerzaRetroceso * 0.5;
        }

        // Sacudida de cámara
        if (this.sacudirCamaraAlDisparar && this.materia.scene) {
            const cameras = this.materia.scene.getComponents(Camera);
            if (cameras && cameras.length > 0) {
                cameras.forEach(cam => {
                    if (typeof cam.sacudir === 'function') {
                        cam.sacudir(this.duracionSacudida, this.intensidadSacudida);
                    }
                });
            }
        }

        // Animación de disparo
        if (this.animacionDisparo) {
            const animator = this.materia.getComponent(Animator) || this.materia.getComponent(AnimatorController);
            if (animator && typeof animator.play === 'function') {
                animator.play(this.animacionDisparo, { loop: false, force: true });
            }
        }

        let proj = null;
        if (typeof this.proyectilPrefab === 'object' && this.proyectilPrefab !== null) {
            if (typeof this.proyectilPrefab.clone === 'function') {
                proj = this.proyectilPrefab.clone();
                proj.transform.position.x = spawnX;
                proj.transform.position.y = spawnY;
                if (this.materia.scene) {
                    this.materia.scene.addMateria(proj);
                }
            }
        } else if (window.SceneManager && typeof this.proyectilPrefab === 'string' && this.proyectilPrefab) {
            try {
                proj = await window.SceneManager.instantiatePrefabFromPath(this.proyectilPrefab, spawnX, spawnY);
            } catch (e) {
                console.warn("[ManejoArmasCenital] No se pudo instanciar prefab, usando bala genérica.", e);
            }
        }

        if (proj) {
            const bulletComp = proj.getComponent(Proyectil2D) || proj.addComponent(Proyectil2D);
            bulletComp.direccion = { x: cosA, y: sinA };
            bulletComp.autor = this.materia;
        } else {
            this._crearBalaPorDefecto(spawnX, spawnY, cosA, sinA);
        }
    }

    _crearBalaPorDefecto(x, y, dx, dy) {
        if (this.materia.scene) {
            const bullet = new Materia("Bala_Cenital");
            const trans = bullet.addComponent(Transform);
            trans.x = x;
            trans.y = y;
            const sr = bullet.addComponent(SpriteRenderer);
            sr.color = "#ff5500";

            const col = bullet.addComponent(CircleCollider2D);
            col.radius = 4;
            col.isTrigger = true;

            const bulletComp = bullet.addComponent(Proyectil2D);
            bulletComp.direccion = { x: dx, y: dy };
            bulletComp.autor = this.materia;

            this.materia.scene.addMateria(bullet);
        }
    }

    clone() {
        const copy = new ManejoArmasCenital(null);
        Object.assign(copy, this);
        copy._cooldown = 0;
        copy._lastKeyState = false;
        return copy;
    }
}

/**
 * Componente ItemRecolectable: Almacena información sobre un objeto
 * que puede ser recogido por un jugador.
 */
export class ItemRecolectable extends Leyes {
    constructor(materia) {
        super(materia);
        this.nombreItem = "Moneda";
        this.cantidad = 1;
        this.sonidoRecogida = "";
        this.destruirAlRecoger = true;
    }

    clone() {
        const copy = new ItemRecolectable(null);
        copy.nombreItem = this.nombreItem;
        copy.cantidad = this.cantidad;
        copy.sonidoRecogida = this.sonidoRecogida;
        copy.destruirAlRecoger = this.destruirAlRecoger;
        return copy;
    }
}

/**
 * Componente RecolectorObjetos: Permite a la entidad absorber objetos
 * del tipo ItemRecolectable por colisión o presionando una tecla interactiva.
 */
export class RecolectorObjetos extends Leyes {
    constructor(materia) {
        super(materia);
        this.metodoRecogida = "colision"; // "colision" o "tecla"
        this.teclaRecogida = "KeyE";
        this.distanciaDeteccion = 100;
        this._lastKeyState = false;
    }

    update(deltaTime) {
        const isGame = typeof window !== 'undefined' && (window.isGameRunning || window.CE_Standalone_Scripts);
        if (!isGame) return;

        if (this.metodoRecogida === "tecla") {
            const isPressed = InputManager.isKeyPressed(this.teclaRecogida);
            const keyJustPressed = isPressed && !this._lastKeyState;
            this._lastKeyState = isPressed;

            if (keyJustPressed) {
                this.buscarYRecogerCercanos();
            }
        }
    }

    alEntrarEnColision(collision) {
        if (this.metodoRecogida === "colision") {
            this.intentarRecoger(collision.materia);
        }
    }

    alEntrarEnTrigger(collision) {
        if (this.metodoRecogida === "colision") {
            this.intentarRecoger(collision.materia);
        }
    }

    buscarYRecogerCercanos() {
        const scene = this.materia.scene;
        if (!scene) return;

        const myTrans = this.materia.getComponent(Transform);
        if (!myTrans) return;

        const items = scene.getAllMaterias().filter(m => m.isActive && m.getComponent(ItemRecolectable));

        for (const itemMateria of items) {
            const itemTrans = itemMateria.getComponent(Transform);
            if (!itemTrans) continue;

            const dist = Math.hypot(itemTrans.x - myTrans.x, itemTrans.y - myTrans.y);
            if (dist <= this.distanciaDeteccion) {
                this.intentarRecoger(itemMateria);
            }
        }
    }

    intentarRecoger(itemMateria) {
        const item = itemMateria.getComponent(ItemRecolectable);
        if (!item) return;

        // Requiere un componente Inventario en este recolector
        const inv = this.materia.getComponent(Inventario);
        if (inv) {
            inv.agregarItem(item.nombreItem, item.cantidad);
            console.log(`[RecolectorObjetos] Recogido: ${item.cantidad}x ${item.nombreItem}`);

            // Reproducir sonido si existe AudioSource
            if (item.sonidoRecogida) {
                const audio = this.materia.getComponent(AudioSource);
                if (audio) {
                    audio.play(item.sonidoRecogida);
                }
            }

            itemMateria.emitir('recogido', { recolector: this.materia });
            this.materia.emitir('objeto-recogido', { item: itemMateria, info: item });

            if (item.destruirAlRecoger) {
                if (itemMateria.scene) {
                    itemMateria.scene.removeMateria(itemMateria.id);
                }
            }
        } else {
            console.warn("[RecolectorObjetos] El recolector necesita tener un componente 'Inventario' para guardar los objetos.");
        }
    }

    clone() {
        const copy = new RecolectorObjetos(null);
        copy.metodoRecogida = this.metodoRecogida;
        copy.teclaRecogida = this.teclaRecogida;
        copy.distanciaDeteccion = this.distanciaDeteccion;
        return copy;
    }
}


registerComponent('AutoCulling2D', AutoCulling2D);
registerComponent('ObjectPooler', ObjectPooler);
registerComponent('DistanceDeactivator', DistanceDeactivator);
registerComponent('Proyectil2D', Proyectil2D);
registerComponent('DetectorBajas', DetectorBajas);
registerComponent('ManejoArmasLateral', ManejoArmasLateral);
registerComponent('ManejoArmasCenital', ManejoArmasCenital);
registerComponent('ItemRecolectable', ItemRecolectable);
registerComponent('RecolectorObjetos', RecolectorObjetos);

/**
 * Componente IAAmiga: IA para aliados o compañeros que siguen al jugador o patrullan.
 */
export class IAAmiga extends Leyes {
    constructor(materia) {
        super(materia);
        this.targetTag = 'Player';
        this.speed = 120;
        this.stopDistance = 60;
        this.patrolPoints = ""; // Coordenadas X separadas por comas (ej. 100, 300)

        this._currentPatrolIdx = 0;
        this._patrolCoords = [];
        this._direction = 1;
    }

    start() {
        if (this.patrolPoints) {
            this._patrolCoords = this.patrolPoints.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
        }
    }

    update(deltaTime) {
        const transform = this.materia.getComponent(Transform);
        const rb = this.materia.getComponent(Rigidbody2D);
        if (!transform) return;

        const engine = RuntimeAPIManager.getAPI('engine');
        let targetMateria = null;

        if (this.targetTag && engine) {
            // Find first active materia with targetTag
            const scene = this.materia.scene || window.SceneManager?.currentScene;
            if (scene) {
                targetMateria = scene.materias.find(m => m.tag && m.tag.split(',').map(t => t.trim()).includes(this.targetTag));
            }
        }

        if (targetMateria) {
            const targetTrans = targetMateria.getComponent(Transform);
            if (targetTrans) {
                const dx = targetTrans.x - transform.x;
                const dist = Math.abs(dx);
                if (dist > this.stopDistance) {
                    const dir = dx > 0 ? 1 : -1;
                    if (rb) {
                        rb.velocity.x = dir * (this.speed / 10);
                    } else {
                        transform.x += dir * this.speed * deltaTime;
                    }
                    transform.flipX = dir < 0;
                } else if (rb) {
                    rb.velocity.x = 0;
                }
            }
        } else if (this._patrolCoords.length > 0) {
            const targetX = this._patrolCoords[this._currentPatrolIdx];
            const dx = targetX - transform.x;
            if (Math.abs(dx) < 5) {
                this._currentPatrolIdx = (this._currentPatrolIdx + 1) % this._patrolCoords.length;
            } else {
                const dir = dx > 0 ? 1 : -1;
                if (rb) {
                    rb.velocity.x = dir * (this.speed / 10);
                } else {
                    transform.x += dir * this.speed * deltaTime;
                }
                transform.flipX = dir < 0;
            }
        }
    }

    clone() {
        const copy = new IAAmiga(null);
        copy.targetTag = this.targetTag;
        copy.speed = this.speed;
        copy.stopDistance = this.stopDistance;
        copy.patrolPoints = this.patrolPoints;
        return copy;
    }
}
registerComponent('IAAmiga', IAAmiga);

/**
 * Componente IAEnemiga: IA agresiva que busca al jugador y lo ataca al estar cerca.
 */
export class IAEnemiga extends Leyes {
    constructor(materia) {
        super(materia);
        this.targetTag = 'Player';
        this.speed = 100;
        this.detectionDistance = 300;
        this.attackDistance = 40;
        this.damageAmount = 10;
        this.attackCooldown = 1.5;

        this._cooldownTimer = 0;
    }

    update(deltaTime) {
        if (this._cooldownTimer > 0) this._cooldownTimer -= deltaTime;

        const transform = this.materia.getComponent(Transform);
        const rb = this.materia.getComponent(Rigidbody2D);
        if (!transform) return;

        // Find Player
        const scene = this.materia.scene || window.SceneManager?.currentScene;
        if (!scene) return;

        const player = scene.materias.find(m => m.tag && m.tag.split(',').map(t => t.trim()).includes(this.targetTag));
        if (!player) return;

        const playerTrans = player.getComponent(Transform);
        if (!playerTrans) return;

        const dx = playerTrans.x - transform.x;
        const dy = playerTrans.y - transform.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist <= this.detectionDistance) {
            const dirX = dx > 0 ? 1 : -1;
            transform.flipX = dirX < 0;

            if (dist > this.attackDistance) {
                // Move towards Player
                if (rb) {
                    rb.velocity.x = dirX * (this.speed / 10);
                } else {
                    transform.x += dirX * this.speed * deltaTime;
                }
            } else {
                // Stop and attack
                if (rb) rb.velocity.x = 0;

                if (this._cooldownTimer <= 0) {
                    this._cooldownTimer = this.attackCooldown;

                    // Try to trigger Attack component if present
                    const attackComp = this.materia.getComponent(Attack);
                    if (attackComp) {
                        attackComp.attack(0);
                    } else {
                        // Directly deal damage to player's Health component
                        const playerHealth = player.getComponent(Health);
                        if (playerHealth) {
                            playerHealth.damage(this.damageAmount);
                        }
                    }

                    // Play attack animation if we have an AnimatorController
                    const controller = this.materia.getComponent(AnimatorController);
                    if (controller && controller.states.has("attack")) {
                        controller.play("attack", true);
                    }
                }
            }
        } else if (rb) {
            rb.velocity.x = 0;
        }
    }

    clone() {
        const copy = new IAEnemiga(null);
        copy.targetTag = this.targetTag;
        copy.speed = this.speed;
        copy.detectionDistance = this.detectionDistance;
        copy.attackDistance = this.attackDistance;
        copy.damageAmount = this.damageAmount;
        copy.attackCooldown = this.attackCooldown;
        return copy;
    }
}
registerComponent('IAEnemiga', IAEnemiga);

/**
 * Componente ControlesTactiles: Ofrece una superposición de controles táctiles en pantalla para móviles (Joystick y Botones).
 */
export class ControlesTactiles extends Leyes {
    constructor(materia) {
        super(materia);
        this.izquierdaSuelo = true; // Mostrar Joystick a la izquierda
        this.botonSaltar = true; // Botón de Salto a la derecha
        this.botonAgachar = true; // Botón de Agachar a la derecha
        this.colorPrincipal = "rgba(255, 255, 255, 0.3)";
        this.usarJoystickCircular = true; // El joystick con diseño circular ("cosita redonda dentro de forma redonda")

        this._container = null;
    }

    start() {
        const isGame = typeof window !== 'undefined' && (window.isGameRunning || window.CE_Standalone_Scripts);
        if (!isGame) return; // Only instantiate in-game

        // Build HTML overlay
        const container = document.createElement('div');
        container.id = 'touch-controls-overlay';
        container.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            height: 180px;
            pointer-events: none;
            z-index: 999999;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            user-select: none;
            -webkit-user-select: none;
        `;

        const input = RuntimeAPIManager.getAPI('input');

        // Create Joystick (circular thumb inside circular base)
        if (this.izquierdaSuelo) {
            const joystickBase = document.createElement('div');
            joystickBase.style.cssText = `
                width: 120px;
                height: 120px;
                background: ${this.colorPrincipal};
                border: 2px solid rgba(255, 255, 255, 0.4);
                border-radius: 50%;
                position: relative;
                pointer-events: auto;
                display: flex;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(5px);
            `;

            const joystickKnob = document.createElement('div');
            joystickKnob.style.cssText = `
                width: 50px;
                height: 50px;
                background: rgba(255, 255, 255, 0.8);
                border-radius: 50%;
                position: absolute;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                transition: transform 0.05s ease;
                pointer-events: none;
            `;

            joystickBase.appendChild(joystickKnob);
            container.appendChild(joystickBase);

            // Handle touch drag events for joystick
            let activeTouchId = null;

            const handleStart = (e) => {
                e.preventDefault();
                const touch = e.changedTouches[0];
                activeTouchId = touch.identifier;
                updateJoystickPosition(touch);
            };

            const handleMove = (e) => {
                e.preventDefault();
                for (let i = 0; i < e.touches.length; i++) {
                    const touch = e.touches[i];
                    if (touch.identifier === activeTouchId) {
                        updateJoystickPosition(touch);
                        break;
                    }
                }
            };

            const handleEnd = (e) => {
                e.preventDefault();
                for (let i = 0; i < e.changedTouches.length; i++) {
                    const touch = e.changedTouches[i];
                    if (touch.identifier === activeTouchId) {
                        activeTouchId = null;
                        resetJoystick();
                        break;
                    }
                }
            };

            const updateJoystickPosition = (touch) => {
                const rect = joystickBase.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                let dx = touch.clientX - centerX;
                let dy = touch.clientY - centerY;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const maxDist = 45; // limit drag distance

                if (dist > maxDist) {
                    dx = (dx / dist) * maxDist;
                    dy = (dy / dist) * maxDist;
                }

                joystickKnob.style.transform = `translate(${dx}px, ${dy}px)`;

                // Update InputManager._virtualKeys
                if (input && InputManager) {
                    InputManager._virtualKeys.set('a', dx < -15);
                    InputManager._virtualKeys.set('d', dx > 15);
                    InputManager._virtualKeys.set('w', dy < -15);
                    InputManager._virtualKeys.set('s', dy > 15);
                    // Support Arrow keys too
                    InputManager._virtualKeys.set('ArrowLeft', dx < -15);
                    InputManager._virtualKeys.set('ArrowRight', dx > 15);
                    InputManager._virtualKeys.set('ArrowUp', dy < -15);
                    InputManager._virtualKeys.set('ArrowDown', dy > 15);
                }
            };

            const resetJoystick = () => {
                joystickKnob.style.transform = 'translate(0px, 0px)';
                if (input && InputManager) {
                    InputManager._virtualKeys.set('a', false);
                    InputManager._virtualKeys.set('d', false);
                    InputManager._virtualKeys.set('w', false);
                    InputManager._virtualKeys.set('s', false);
                    InputManager._virtualKeys.set('ArrowLeft', false);
                    InputManager._virtualKeys.set('ArrowRight', false);
                    InputManager._virtualKeys.set('ArrowUp', false);
                    InputManager._virtualKeys.set('ArrowDown', false);
                }
            };

            joystickBase.addEventListener('touchstart', handleStart);
            joystickBase.addEventListener('touchmove', handleMove);
            joystickBase.addEventListener('touchend', handleEnd);
            joystickBase.addEventListener('touchcancel', handleEnd);
        }

        // Action Buttons on Right
        const buttonsContainer = document.createElement('div');
        buttonsContainer.style.cssText = `
            display: flex;
            gap: 15px;
            pointer-events: none;
        `;

        const createButton = (label, keySymbol) => {
            const btn = document.createElement('div');
            btn.textContent = label;
            btn.style.cssText = `
                width: 65px;
                height: 65px;
                background: ${this.colorPrincipal};
                border: 2px solid rgba(255, 255, 255, 0.4);
                border-radius: 50%;
                color: white;
                font-weight: bold;
                font-size: 16px;
                display: flex;
                align-items: center;
                justify-content: center;
                pointer-events: auto;
                cursor: pointer;
                box-shadow: 0 4px 6px rgba(0,0,0,0.2);
                backdrop-filter: blur(5px);
            `;

            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                btn.style.background = 'rgba(255, 255, 255, 0.6)';
                if (InputManager) {
                    InputManager._virtualKeys.set(keySymbol, true);
                    InputManager._keysDown.add(keySymbol);
                }
            });

            const release = (e) => {
                e.preventDefault();
                btn.style.background = this.colorPrincipal;
                if (InputManager) {
                    InputManager._virtualKeys.set(keySymbol, false);
                    InputManager._keysUp.add(keySymbol);
                }
            };

            btn.addEventListener('touchend', release);
            btn.addEventListener('touchcancel', release);

            return btn;
        };

        if (this.botonAgachar) {
            const agacharBtn = createButton('Agachar', 's');
            buttonsContainer.appendChild(agacharBtn);
        }

        if (this.botonSaltar) {
            const saltarBtn = createButton('Salto', ' ');
            buttonsContainer.appendChild(saltarBtn);
        }

        container.appendChild(buttonsContainer);
        document.body.appendChild(container);
        this._container = container;
    }

    onDestroy() {
        if (this._container && this._container.parentNode) {
            this._container.parentNode.removeChild(this._container);
        }
    }

    clone() {
        const copy = new ControlesTactiles(null);
        copy.izquierdaSuelo = this.izquierdaSuelo;
        copy.botonSaltar = this.botonSaltar;
        copy.botonAgachar = this.botonAgachar;
        copy.colorPrincipal = this.colorPrincipal;
        copy.usarJoystickCircular = this.usarJoystickCircular;
        return copy;
    }
}
registerComponent('ControlesTactiles', ControlesTactiles);
