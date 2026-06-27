// js/engine/3d/Scene3D.js
import { Materia3D } from './Materia3D.js';
import { Camera } from './Components3D.js';

export class Scene3D {
    constructor() {
        this.is3D = true;
        this.materias = [];
        this.ambiente = {
            skyMode: 'Gradient',
            skyColor: '#4a90e2',
            horizonColor: '#ffffff',
            groundColor: '#1a1a1c',
            hora: '12',
            cicloAutomatico: false,
            duracionDia: '60'
        };
        this.physicsSystem3D = null;
    }

    addMateria(materia) {
        this.materias.push(materia);
        this._setMateriaSceneRecursive(materia);
    }

    _setMateriaSceneRecursive(materia) {
        materia.scene = this;
        for (const child of materia.children) {
            this._setMateriaSceneRecursive(child);
        }
    }

    findMateriaById(id) {
        const findRecursive = (id, materias) => {
            for (const materia of materias) {
                if (materia.id === id) return materia;
                if (materia.children && materia.children.length > 0) {
                    const found = findRecursive(id, materia.children);
                    if (found) return found;
                }
            }
            return null;
        };
        return findRecursive(id, this.materias);
    }

    findMateriaByName(name) {
        const findRecursive = (name, materias) => {
            for (const materia of materias) {
                if (materia.name === name) return materia;
                if (materia.children && materia.children.length > 0) {
                    const found = findRecursive(name, materia.children);
                    if (found) return found;
                }
            }
            return null;
        };
        return findRecursive(name, this.materias);
    }

    getRootMaterias() {
        return this.materias.filter(m => m.parent === null);
    }

    findFirstCamera() {
        return this.getAllMaterias().find(m => m.getComponent(Camera));
    }

    findAllCameras() {
        return this.getAllMaterias().filter(m => m.isActive && m.getComponent(Camera));
    }

    getAllMaterias() {
        let all = [];
        for (const root of this.getRootMaterias()) {
            all = all.concat(this.getMateriasRecursive(root));
        }
        return all;
    }

    getMateriasRecursive(materia) {
        let materias = [materia];
        for (const child of materia.children) {
            materias = materias.concat(this.getMateriasRecursive(child));
        }
        return materias;
    }

    removeMateria(materiaId) {
        const materiaToRemove = this.findMateriaById(materiaId);
        if (!materiaToRemove) return;
        if (materiaToRemove.parent) {
            materiaToRemove.parent.removeChild(materiaToRemove);
        } else {
            const index = this.materias.findIndex(m => m.id === materiaId);
            if (index > -1) this.materias.splice(index, 1);
        }
        materiaToRemove.destroy();
    }

    clone() {
        const newScene = new Scene3D();
        newScene.ambiente = JSON.parse(JSON.stringify(this.ambiente));
        for (const rootMateria of this.getRootMaterias()) {
            newScene.addMateria(rootMateria.clone(true));
        }
        // Resolve references
        const allNewMaterias = newScene.getAllMaterias();
        const materiaMap = new Map(allNewMaterias.map(m => [m.id, m]));
        for (const materia of allNewMaterias) {
            if (materia.parent !== null && typeof materia.parent === 'number') {
                materia.parent = materiaMap.get(materia.parent) || null;
            }
        }
        return newScene;
    }

    async loadAllAssets(projectsDirHandle) {
        // Simplified loader for 3D assets
        const allMaterias = this.getAllMaterias();
        for (const materia of allMaterias) {
            for (const ley of materia.leyes) {
                if (ley.constructor.name === 'SkinnedMeshRenderer3D' && ley.modelPath) {
                   // Loading logic
                }
            }
        }
    }
}
