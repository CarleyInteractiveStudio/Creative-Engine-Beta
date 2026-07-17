// js/engine/3d/Scene3D.js
// Independent Scene manager for the 3D Engine.

import { Materia3D } from './Materia3D.js';
import * as Components3D from './Components3D.js';

export class Scene3D {
    constructor() {
        this.materias = [];
        this.ambiente = {
            skyMode: 'Gradient',
            skyColor: '#4a90e2',
            horizonColor: '#ffffff',
            groundColor: '#1a1a1c',
            exposure: 1.0,
            ambientIntensity: 0.5
        };
        this.physicsSystem = null;
    }

    addMateria(materia) {
        if (materia instanceof Materia3D) {
            this.materias.push(materia);
            materia.scene = this;
            materia.traverse(m => m.scene = this);
        }
    }

    removeMateria(id) {
        const index = this.materias.findIndex(m => m.id === id);
        if (index > -1) {
            const m = this.materias[index];
            this.materias.splice(index, 1);
            m.destroy();
        }
    }

    findMateriaById(id) {
        let found = null;
        for (const root of this.materias) {
            root.traverse(m => { if (m.id === id) found = m; });
            if (found) break;
        }
        return found;
    }

    findMateriaByName(name) {
        let found = null;
        for (const root of this.materias) {
            root.traverse(m => { if (m.name === name) found = m; });
            if (found) break;
        }
        return found;
    }

    getAllMaterias() {
        let all = [];
        for (const root of this.materias) {
            root.traverse(m => all.push(m));
        }
        return all;
    }

    getRootMaterias() {
        return this.materias;
    }

    update(deltaTime) {
        for (const m of this.materias) {
            m.update(deltaTime);
        }
    }

    clone() {
        const copy = new Scene3D();
        copy.ambiente = JSON.parse(JSON.stringify(this.ambiente));
        for (const root of this.materias) {
            copy.addMateria(root.clone(true));
        }
        return copy;
    }

    findFirstCamera() {
        return this.getAllMaterias().find(m => m.getComponent('Camera3D'));
    }

    findAllCameras() {
        return this.getAllMaterias().filter(m => m.isActive && m.getComponent('Camera3D'));
    }
}
