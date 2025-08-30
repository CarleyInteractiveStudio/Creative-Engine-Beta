// Materia.ts
// This file contains the Materia class.

import { Leyes } from './Leyes.ts';

let MATERIA_ID_COUNTER: number = 0;

export class Materia {
    id: number;
    name: string;
    isActive: boolean;
    layer: string;
    flags: { [key: string]: any };
    leyes: Leyes[];
    parent: Materia | null;
    children: Materia[];

    constructor(name: string = 'Materia') {
        this.id = MATERIA_ID_COUNTER++;
        this.name = `${name}`;
        this.isActive = true;
        this.layer = 'Default';
        this.flags = {};
        this.leyes = [];
        this.parent = null;
        this.children = [];
    }

    setFlag(key: string, value: any): void {
        this.flags[key] = value;
    }

    getFlag(key: string): any {
        return this.flags[key];
    }

    addComponent(component: Leyes): void {
        this.leyes.push(component);
        component.materia = this;
    }

    getComponent<T extends Leyes>(componentClass: new (...args: any[]) => T): T | undefined {
        return this.leyes.find(ley => ley instanceof componentClass) as T | undefined;
    }

    removeComponent(ComponentClass: any): void {
        const index = this.leyes.findIndex(ley => ley instanceof ComponentClass);
        if (index !== -1) {
            this.leyes.splice(index, 1);
        }
    }

    addChild(child: Materia): void {
        if (child.parent) {
            child.parent.removeChild(child);
        }
        child.parent = this;
        this.children.push(child);
    }

    removeChild(child: Materia): void {
        const index = this.children.indexOf(child);
        if (index > -1) {
            this.children.splice(index, 1);
            child.parent = null;
        }
    }

    update(): void {
        for (const ley of this.leyes) {
            if(typeof ley.update === 'function') {
                ley.update();
            }
        }
    }
}
