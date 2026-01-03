// ComponentRegistry.js
// This file will contain all the logic for registering and retrieving component classes.

const registry = {};

export function registerComponent(name, componentClass) {
    registry[name] = componentClass;
}

export function getComponent(name) {
    return registry[name];
}
