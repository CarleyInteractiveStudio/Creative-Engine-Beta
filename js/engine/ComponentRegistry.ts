// ComponentRegistry.ts
// This file will contain all the logic for registering and retrieving component classes.

const registry: { [key: string]: any } = {};

export function registerComponent(name: string, componentClass: any) {
    registry[name] = componentClass;
}

export function getComponent(name: string): any {
    return registry[name];
}
