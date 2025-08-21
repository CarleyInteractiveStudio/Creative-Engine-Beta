// Materia.js
// This file contains the Materia class.

import { Transform } from './Components.js';

let MATERIA_ID_COUNTER = 0;
export class Materia { constructor(name = 'Materia') { this.id = MATERIA_ID_COUNTER++; this.name = `${name}`; this.isActive = true; this.layer = 'Default'; this.leyes = []; this.parent = null; this.children = []; this.addComponent(new Transform(this)); } addComponent(component) { this.leyes.push(component); component.materia = this; } getComponent(componentClass) { return this.leyes.find(ley => ley instanceof componentClass); } addChild(child) { if (child.parent) { child.parent.removeChild(child); } child.parent = this; this.children.push(child); } removeChild(child) { const index = this.children.indexOf(child); if (index > -1) { this.children.splice(index, 1); child.parent = null; } } update() { for (const ley of this.leyes) { ley.update(); } } }
