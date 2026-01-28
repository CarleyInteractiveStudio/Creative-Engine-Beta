// Leyes.js
// Base class for all components.

import * as ComponentRegistry from './ComponentRegistry.js';
import { Vector2, Color } from './DataTypes.js';


export class Leyes {
    constructor(materia) {
        this.materia = materia;
    }
    update() {}

    getIdentifier() {
        return this.constructor.name;
    }

    /**
     * Serializes the component into a JSON-friendly object.
     * This base implementation iterates over own properties and packs them.
     * It automatically calls .serialize() on nested objects if they have the method.
     * @returns {object} A serializable representation of the component.
     */
    serialize() {
        const properties = {};
        for (const key in this) {
            // Exclude materia reference to prevent circular dependencies, and only serialize own properties.
            if (key !== 'materia' && this.hasOwnProperty(key)) {
                const value = this[key];

                if (value && typeof value.serialize === 'function') {
                    // If the property has its own serialize method (e.g., Vector2, Color), use it.
                    properties[key] = value.serialize();
                } else if (Array.isArray(value)) {
                    // For arrays, map over them and serialize items if they are serializable.
                    properties[key] = value.map(item =>
                        (item && typeof item.serialize === 'function') ? item.serialize() : item
                    );
                } else {
                    // For primitives and plain objects, assign the value directly.
                    properties[key] = value;
                }
            }
        }
        return {
            type: this.constructor.name,
            properties: properties
        };
    }

    /**
     * Deserializes component data and applies it to a component instance.
     * @param {object} data - The serialized component data.
     * @param {import('./Materia.js').Materia} materia - The materia the component belongs to.
     * @returns {Leyes|null} A new component instance with the data applied, or null on failure.
     */
    static deserialize(data, materia) {
        const ComponentClass = ComponentRegistry.getComponent(data.type);
        if (!ComponentClass) {
            console.warn(`Component type '${data.type}' not found in registry. Skipping.`);
            return null;
        }

        const component = new ComponentClass(materia);

        for (const key in data.properties) {
            if (component.hasOwnProperty(key)) {
                const propData = data.properties[key];

                // Handle complex data types that need their own deserialization
                if (propData && propData.__dataType) {
                    if (propData.__dataType === 'Vector2') {
                        component[key] = Vector2.deserialize(propData);
                    } else if (propData.__dataType === 'Color') {
                        component[key] = Color.deserialize(propData);
                    }
                } else {
                    component[key] = propData;
                }
            }
        }
        return component;
    }
}
