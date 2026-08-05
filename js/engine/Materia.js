// Materia.js
// This file contains the Materia class.

import { Transform } from './Components.js';
import { currentScene } from './SceneManager.js';

let MATERIA_ID_COUNTER = 0;

export function updateMateriaIdCounter(id) {
    if (typeof id === 'number' && !isNaN(id)) {
        if (id >= MATERIA_ID_COUNTER) {
            MATERIA_ID_COUNTER = id + 1;
        }
    }
}

const standardTags = {
    'Untagged': ['untagged', 'sin etiqueta', 'sem etiqueta', 'без тега', '未标记'],
    'Player': ['player', 'jugador', 'jogador', 'игрок', '玩家'],
    'Enemy': ['enemy', 'enemigo', 'inimigo', 'враг', '敌人'],
    'Ground': ['ground', 'suelo', 'solo', 'земля/пол', '地面', 'земля', 'пол'],
    'Bullet': ['bullet', 'bala', 'пуля', '子弹'],
    'Item': ['item', 'objeto', 'предмет', '物品'],
    'Obstacle': ['obstacle', 'obstáculo', 'препятствие', '障碍物'],
    'Water': ['water', 'agua', 'água', 'вода', '水'],
    'NPC': ['npc', 'нпс'],
    'Trigger': ['trigger', 'activador', 'gatilho', 'триггер', '触发器']
};

export function normalizeTag(tag) {
    if (!tag) return 'untagged';
    const t = tag.trim().toLowerCase();
    for (const [key, aliases] of Object.entries(standardTags)) {
        if (key.toLowerCase() === t || aliases.includes(t)) {
            return key.toLowerCase();
        }
    }
    return t;
}

export class Materia {
    constructor(name = 'Materia') {
        this.id = MATERIA_ID_COUNTER++;
        this.name = `${name}`;
        this.isActive = true;
        this.isCollapsed = false; // For hierarchy view
        this._layers = [0]; // Render sorting layers indices
        this.tag = 'Untagged';
        this.flags = {};
        this.leyes = [];
        this.parent = null;
        this.children = [];
        this.prefabPath = null;
    }

    get layer() {
        return (this._layers && this._layers.length > 0) ? this._layers[0] : 0;
    }
    set layer(val) {
        const numericVal = parseInt(val, 10) || 0;
        if (!this._layers) {
            this._layers = [numericVal];
        } else {
            this._layers[0] = numericVal;
        }
    }

    get layers() {
        if (!this._layers) {
            this._layers = [0];
        }
        return this._layers;
    }
    set layers(vals) {
        if (Array.isArray(vals)) {
            this._layers = vals.map(v => parseInt(v, 10) || 0);
        } else {
            this._layers = [parseInt(vals, 10) || 0];
        }
    }

    setFlag(key, value) {
        this.flags[key] = value;
    }

    getFlag(key) {
        return this.flags[key];
    }

    // --- Spanish Aliases for Scripting ---
    get estaActivado() { return this.isActive; }
    set estaActivado(v) { this.isActive = v; }
    get activo() { return this.isActive; }
    set activo(v) { this.isActive = v; }

    // --- Fast Component Access Getters ---
    get transform() { return this.getComponentByName('Transform'); }
    get posicion() { return this.transform; }
    get transformacion() { return this.transform; }

    get rigidbody2D() { return this.getComponentByName('Rigidbody2D'); }
    get fisica() { return this.rigidbody2D; }

    get spriteRenderer() { return this.getComponentByName('SpriteRenderer'); }
    get renderizadorDeSprite() { return this.spriteRenderer; }

    get animator() { return this.getComponentByName('Animator'); }
    get animador() { return this.animator; }
    get animacion() { return this.animator; }

    get animatorController() { return this.getComponentByName('AnimatorController'); }
    get controlador() { return this.animatorController; }
    get controladorAnimacion() { return this.animatorController; }

    get animador3D() { return this.getComponentByName('Animator3D'); }
    get animacion3D() { return this.animador3D; }

    get renderizadorDeMallaConHuesos3D() { return this.getComponentByName('SkinnedMeshRenderer3D'); }

    get uiTransform() { return this.getComponentByName('UITransform'); }
    get posicionUI() { return this.uiTransform; }
    get transformacionUI() { return this.uiTransform; }

    get health() { return this.getComponentByName('Health'); }
    get salud() { return this.health; }
    get vida() { return this.health; }
    get saude() { return this.health; } // PT
    get sante() { return this.health; } // FR
    get zdorovye() { return this.health; } // RU (romanized)
    get jiankang() { return this.health; } // ZH (romanized)

    get attack() { return this.getComponentByName('Attack'); }
    get ataque() { return this.attack; }
    get attaque() { return this.attack; } // FR
    get atack() { return this.attack; } // RU (approx)
    get gongji() { return this.attack; } // ZH (romanized)

    get progressBar() { return this.getComponentByName('ProgressBar'); }
    get barraDeProgreso() { return this.progressBar; }
    get barra() { return this.progressBar; }
    get uiBarra() { return this.progressBar; }
    get uiBar() { return this.progressBar; }
    get uiBarre() { return this.progressBar; } // FR
    get uiPolosa() { return this.progressBar; } // RU (romanized)
    get uiTiao() { return this.progressBar; } // ZH (romanized)
    get uiSlider() { return this.progressBar; }
    get deslizador() { return this.progressBar; }
    get barraProgresso() { return this.progressBar; } // PT

    get uiScrollRect() { return this.getComponentByName('UIScrollRect'); }
    get rectScroll() { return this.uiScrollRect; }
    get scroll() { return this.uiScrollRect; }
    get rolagem() { return this.uiScrollRect; } // PT
    get parcourir() { return this.uiScrollRect; } // FR
    get prokrutka() { return this.uiScrollRect; } // RU
    get gundong() { return this.uiScrollRect; } // ZH

    get uiMask() { return this.getComponentByName('UIMask'); }
    get mascaraUI() { return this.uiMask; }
    get mascara() { return this.uiMask; }
    get masque() { return this.uiMask; } // FR
    get maska() { return this.uiMask; } // RU
    get zhezao() { return this.uiMask; } // ZH

    get uiCollider() { return this.getComponentByName('UICollider'); }
    get colisionadorUI() { return this.uiCollider; }
    get colisorUI() { return this.uiCollider; } // PT
    get collisionneurUI() { return this.uiCollider; } // FR
    get kollayderUI() { return this.uiCollider; } // RU
    get pengzhuangUI() { return this.uiCollider; } // ZH

    addComponent(component) {
        this.leyes.push(component);
        component.materia = this;
    }

    getComponent(componentClass) {
        if (typeof componentClass === 'string') return this.getComponentByName(componentClass);
        if (typeof componentClass !== 'function') return null;
        return this.leyes.find(ley => (ley instanceof componentClass) || (ley.constructor.name === componentClass.name));
    }

    getComponents(componentClass) {
        if (typeof componentClass === 'string') return [this.getComponentByName(componentClass)].filter(Boolean);
        if (typeof componentClass !== 'function') return [];
        return this.leyes.filter(ley => (ley instanceof componentClass) || (ley.constructor.name === componentClass.name));
    }

    getChildrenWithComponent(componentClass) {
        if (typeof componentClass !== 'function') return [];
        return this.children.filter(child => child.getComponent(componentClass))
                           .map(child => child.getComponent(componentClass));
    }

    getComponentByName(name) {
        return this.leyes.find(ley => ley.constructor.name === name);
    }

    _resolveMateria(ref) {
        if (ref instanceof Materia) return ref;
        if (typeof ref === 'number') {
            const scene = this.scene || currentScene;
            return scene ? scene.findMateriaById(ref) : null;
        }
        return null;
    }

    /**
     * Busca un componente en los padres de esta materia.
     */
    getComponentInParent(componentClass) {
        let current = this._resolveMateria(this.parent);

        while (current) {
            const comp = typeof componentClass === 'string' ? current.getComponentByName(componentClass) : current.getComponent(componentClass);
            if (comp) return comp;
            current = this._resolveMateria(current.parent);
        }
        return null;
    }

    /**
     * Busca un componente en los hijos de esta materia (recursivo).
     */
    getComponentInChildren(componentClass) {
        for (const child of this.children) {
            const comp = typeof componentClass === 'string' ? child.getComponentByName(componentClass) : child.getComponent(componentClass);
            if (comp) return comp;
            const nested = child.getComponentInChildren(componentClass);
            if (nested) return nested;
        }
        return null;
    }

    /**
     * Busca un hijo por su nombre de forma recursiva.
     * @param {string} name
     * @param {boolean} recursive
     */
    findChildByName(name, recursive = true) {
        for (const child of this.children) {
            if (child.name === name) return child;
            if (recursive) {
                const found = child.findChildByName(name, true);
                if (found) return found;
            }
        }
        return null;
    }

    /**
     * Busca un script específico en esta Materia por su nombre.
     * @param {string} name - El nombre del script (ej: 'ControladorJugador').
     * @returns {object|null} La instancia del script o null si no se encuentra.
     */
    obtenerScript(name) {
        const scriptComp = this.leyes.find(ley => ley.constructor.name === 'CreativeScript' && ley.scriptName === name);
        return scriptComp ? scriptComp.instance : null;
    }

    // Alias en inglés
    getScript(name) { return this.obtenerScript(name); }

    /**
     * Comprueba si esta materia tiene un tag específico.
     * @param {string} tag
     */
    tieneTag(tag) {
        if (!tag) return false;
        if (!this.tag) return false;

        const queryNormalized = normalizeTag(tag);
        const currentTags = this.tag.split(',').map(t => normalizeTag(t));

        return currentTags.includes(queryNormalized);
    }

    // Alias en inglés
    hasTag(tag) { return this.tieneTag(tag); }

    findAncestorWithComponent(componentClass) {
        let current = this._resolveMateria(this.parent);

        while (current) {
            if (current.getComponent(componentClass)) {
                return current;
            }
            current = this._resolveMateria(current.parent);
        }
        return null;
    }

    removeComponent(ComponentClass) {
        const index = this.leyes.findIndex(ley => ley instanceof ComponentClass);
        if (index !== -1) {
            const component = this.leyes[index];
            if (typeof component.onDestroy === 'function') component.onDestroy();
            this.leyes.splice(index, 1);
        }
    }

    removeComponentByInstance(componentInstance) {
        const index = this.leyes.indexOf(componentInstance);
        if (index !== -1) {
            if (typeof componentInstance.onDestroy === 'function') componentInstance.onDestroy();
            this.leyes.splice(index, 1);
        }
    }

    isAncestorOf(potentialDescendant) {
        let current = this._resolveMateria(potentialDescendant.parent);
        while (current) {
            if (current.id === this.id) {
                return true;
            }
            current = this._resolveMateria(current.parent);
        }
        return false;
    }

    setParent(newParent, keepWorldTransform = true) {
        if (this.parent === newParent) return;

        let worldPos, worldRot, worldScale;
        const transform = this.getComponentByName('Transform');

        if (keepWorldTransform && transform) {
            worldPos = transform.position;
            worldRot = transform.rotation;
            worldScale = transform.scale;
        }

        // Remove from old parent if exists
        if (this.parent) {
            let oldParent = this.parent;
            if (typeof oldParent === 'number') {
                try { oldParent = (this.scene || currentScene).findMateriaById(oldParent); } catch (e) { oldParent = null; }
            }
            if (oldParent && typeof oldParent.removeChild === 'function') {
                oldParent.removeChild(this);
            }
        } else {
            // Remove from root if it was at root
            const scene = this.scene || currentScene;
            if (scene && scene.materias) {
                const index = scene.materias.indexOf(this);
                if (index > -1) {
                    scene.materias.splice(index, 1);
                }
            }
        }

        if (newParent) {
            newParent.children.push(this);
            this.parent = newParent;
            if (newParent.scene) {
                this._setMateriaSceneRecursive(newParent.scene);
            }
        } else {
            this.parent = null;
            const scene = this.scene || currentScene;
            if (scene) {
                scene.addMateria(this);
            }
        }

        if (keepWorldTransform && transform) {
            transform.position = worldPos;
            transform.rotation = worldRot;
            transform.scale = worldScale;
        }
    }

    _setMateriaSceneRecursive(scene) {
        this.scene = scene;
        for (const child of this.children) {
            child._setMateriaSceneRecursive(scene);
        }
    }

    addChild(child) {
        child.setParent(this, false); // Legacy addChild doesn't preserve world transform by default
    }

    removeChild(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
            child.parent = null;
        }
    }

    /**
     * Destruye recursivamente esta materia, todos sus componentes y todos sus hijos.
     * Esencial para evitar fugas de memoria (limpieza de suscripciones, timers, etc).
     */
    destruir() { this.destroy(); }
    destroy() {
        // Notificar destrucción a los componentes de esta materia
        for (const ley of this.leyes) {
            if (typeof ley.onDestroy === 'function') {
                try {
                    ley.onDestroy();
                } catch (e) {
                    console.error(`Error destroying component ${ley.constructor.name} on Materia '${this.name}':`, e);
                }
            }
            // Limpiar referencia circular
            ley.materia = null;
        }
        this.leyes = [];

        // Destruir hijos recursivamente
        for (const child of this.children) {
            child.destroy();
        }
        this.children = [];

        // Limpiar referencias
        this.parent = null;
        this.scene = null;
    }

    traverse(callback) {
        callback(this);
        for (const child of this.children) {
            child.traverse(callback);
        }
    }

    update(deltaTime = 0) {
        const recordCall = window.SceneMonitor && window.SceneMonitor.recordComponentCall;
        for (const ley of this.leyes) {
            if (ley.isActive && typeof ley.update === 'function') {
                const compName = ley.constructor.name;
                const startTime = recordCall ? performance.now() : 0;
                try {
                    ley.update(deltaTime);
                    if (recordCall) {
                        recordCall(compName, performance.now() - startTime, true);
                    }
                } catch (e) {
                    console.error(`Error updating component ${compName} on Materia '${this.name}':`, e);
                    if (recordCall) {
                        recordCall(compName, performance.now() - startTime, false);
                    }
                }
            }
        }
    }

    clone(preserveId = false) {
        // When cloning for scene snapshots, we need to preserve IDs.
        // When duplicating an object in the editor, we need a new ID.
        const newMateria = new Materia(this.name);
        if (preserveId) {
            newMateria.id = this.id;
            updateMateriaIdCounter(this.id);
        }

        newMateria.isActive = this.isActive;
        newMateria.isCollapsed = this.isCollapsed;
        newMateria.layer = this.layer;
        newMateria.layers = [...this.layers];
        newMateria.prefabPath = this.prefabPath;
        newMateria.tag = this.tag;
        newMateria.flags = JSON.parse(JSON.stringify(this.flags)); // Deep copy

        // The parent ID is copied directly. The scene clone method will resolve this to an object reference.
        newMateria.parent = this.parent ? (typeof this.parent === 'number' ? this.parent : this.parent.id) : null;

        // Clone components
        for (const component of this.leyes) {
            if (typeof component.clone === 'function') {
                const newComponent = component.clone();
                newMateria.addComponent(newComponent);
            }
        }

        // Clone children recursively, preserving their IDs
        for (const child of this.children) {
            const newChild = child.clone(preserveId);
            newMateria.addChild(newChild);
        }

        return newMateria;
    }
}
