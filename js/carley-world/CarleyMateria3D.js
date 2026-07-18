// CarleyMateria3D.js
// Clase independiente para representar entidades (game objects) tridimensionales en Carley World.

import { CarleyLeyes3D } from './CarleyLeyes3D.js';

let MATERIA3D_ID_COUNTER = 100000; // Un rango diferente para evitar confusiones de ID con 2D

export class CarleyMateria3D {
    constructor(name = 'Materia3D') {
        this.id = MATERIA3D_ID_COUNTER++;
        this.name = name;
        this.isActive = true;
        this.isCollapsed = false;
        this.layer = 0; // 0 = Default
        this.tag = 'Untagged';
        this.flags = {};
        this.leyes = [];
        this.parent = null;
        this.children = [];
        this.prefabPath = null;
    }

    setFlag(key, value) {
        this.flags[key] = value;
    }

    getFlag(key) {
        return this.flags[key];
    }

    // --- Spanish Aliases ---
    get estaActivado() { return this.isActive; }
    set estaActivado(v) { this.isActive = v; }
    get activo() { return this.isActive; }
    set activo(v) { this.isActive = v; }

    // --- Fast Law Access Getters ---
    get transform() { return this.getLawByName('CarleyTransform3D'); }
    get posicion() { return this.transform; }
    get transformacion() { return this.transform; }

    get rigidbody() { return this.getLawByName('CarleyRigidbody3D'); }
    get fisica() { return this.rigidbody; }

    get meshRenderer() { return this.getLawByName('CarleyMeshRenderer3D'); }
    get renderizador() { return this.meshRenderer; }

    addLaw(law) {
        if (law instanceof CarleyLeyes3D) {
            this.leyes.push(law);
            law.materia = this;
        }
    }

    // Alias en español para el método de añadir leyes
    agregarLey(ley) {
        this.addLaw(ley);
    }

    getLaw(lawClass) {
        if (typeof lawClass === 'string') {
            return this.getLawByName(lawClass);
        }
        if (typeof lawClass !== 'function') return null;
        return this.leyes.find(ley => ley instanceof lawClass);
    }

    getLaws(lawClass) {
        if (typeof lawClass === 'string') {
            const comp = this.getLawByName(lawClass);
            return comp ? [comp] : [];
        }
        if (typeof lawClass !== 'function') return [];
        return this.leyes.filter(ley => ley instanceof lawClass);
    }

    getLawByName(name) {
        return this.leyes.find(ley => ley.constructor.name === name);
    }

    // Compatibilidad transparente con los métodos de la interfaz del editor
    getComponent(componentClass) {
        if (componentClass) {
            const className = typeof componentClass === 'string' ? componentClass : componentClass.name;
            if (className === 'Transform' || className === 'CarleyTransform3D') {
                return this.transform;
            }
            if (className === 'MeshRenderer3D' || className === 'CarleyMeshRenderer3D') {
                return this.meshRenderer;
            }
            if (className === 'Rigidbody3D' || className === 'CarleyRigidbody3D') {
                return this.rigidbody;
            }
        }
        return this.getLaw(componentClass);
    }

    getComponents(componentClass) {
        const comp = this.getComponent(componentClass);
        return comp ? [comp] : [];
    }

    getComponentByName(name) {
        return this.getLawByName(name);
    }

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

    setParent(newParent) {
        if (this.parent === newParent) return;

        // Quitar del padre anterior
        if (this.parent) {
            const index = this.parent.children.indexOf(this);
            if (index > -1) {
                this.parent.children.splice(index, 1);
            }
        }

        this.parent = newParent;
        if (newParent) {
            newParent.children.push(this);
        }
    }

    addChild(child) {
        child.setParent(this);
    }

    removeChild(child) {
        child.setParent(null);
    }

    destroy() {
        for (const ley of this.leyes) {
            if (typeof ley.onDestroy === 'function') {
                try {
                    ley.onDestroy();
                } catch (e) {
                    console.error(`Error al destruir la ley ${ley.constructor.name} en Materia3D '${this.name}':`, e);
                }
            }
            ley.materia = null;
        }
        this.leyes = [];

        for (const child of this.children) {
            child.destroy();
        }
        this.children = [];
        this.parent = null;
    }

    update(deltaTime = 0) {
        for (const ley of this.leyes) {
            if (ley.isActive && typeof ley.update === 'function') {
                try {
                    ley.update(deltaTime);
                } catch (e) {
                    console.error(`Error actualizando ley ${ley.constructor.name} en Materia3D '${this.name}':`, e);
                }
            }
        }
    }

    clone(preserveId = false) {
        const copy = new CarleyMateria3D(this.name);
        if (preserveId) {
            copy.id = this.id;
        }
        copy.isActive = this.isActive;
        copy.isCollapsed = this.isCollapsed;
        copy.layer = this.layer;
        copy.tag = this.tag;
        copy.prefabPath = this.prefabPath;
        copy.flags = JSON.parse(JSON.stringify(this.flags));

        for (const ley of this.leyes) {
            const newLey = ley.clone();
            copy.addLaw(newLey);
        }

        for (const child of this.children) {
            const newChild = child.clone(preserveId);
            copy.addChild(newChild);
        }

        return copy;
    }
}
