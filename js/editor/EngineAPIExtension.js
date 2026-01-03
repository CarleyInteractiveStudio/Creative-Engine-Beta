
// js/editor/EngineAPIExtension.js
import { transpile, getScriptMetadata } from './CES_Transpiler.js';
import * as Components from '../engine/Components.js';
import * as MateriaFactory from './MateriaFactory.js';
import { API as LibraryAPI } from './LibraryAPI.js';
import { showNotification } from './ui/DialogWindow.js';

/**
 * @namespace engine
 * @description La nueva API extendida para que las librerías interactúen con el núcleo del motor.
 */

// Registro central para las definiciones de componentes personalizados.
const customComponentDefinitions = new Map();

/**
 * Registra una nueva definición de componente personalizado para que esté disponible en el editor.
 * @param {object} definition - La definición del componente.
 * @param {string} definition.nombre - El nombre único del componente.
 * @param {object} definition.propiedades - Un objeto que define las propiedades públicas del componente.
 * @param {string} definition.script - El script en formato .ces que define la lógica del componente.
 * @returns {boolean} - Devuelve true si el registro fue exitoso, false en caso contrario.
 */
function registrarComponente(definition) {
    if (!definition || !definition.nombre) {
        console.error("Error al registrar el componente: La definición debe incluir un nombre.");
        return false;
    }
    if (customComponentDefinitions.has(definition.nombre)) {
        console.warn(`Se está sobrescribiendo un componente personalizado ya registrado: "${definition.nombre}"`);
    }

    let cesCode = '';
    if (definition.propiedades) {
        for (const [propName, propDef] of Object.entries(definition.propiedades)) {
            const type = propDef.tipo || 'dnumber';
            const defaultValue = propDef.valorPorDefecto !== undefined ? ` = ${JSON.stringify(propDef.valorPorDefecto)}` : '';
            cesCode += `publico ${type} ${propName}${defaultValue};\n`;
        }
    }

    let scriptContent = definition.script || '';
    scriptContent = scriptContent.trim().replace(/^\s*(\w+\s*\([^)]*\)\s*{)/gm, 'publico $1');
    cesCode += `\n${scriptContent}`;

    const scriptName = `${definition.nombre}.ces`;
    const { errors, jsCode } = transpile(cesCode, scriptName);

    if (errors) {
        console.error(`Error al transpilar el componente personalizado "${definition.nombre}":`);
        errors.forEach(err => console.error(`- ${err}`));
        return false;
    }

    const metadata = getScriptMetadata(scriptName);

    const finalDefinition = {
        ...definition,
        transpiledCode: jsCode,
        metadata: metadata || { publicVars: [] }
    };

    customComponentDefinitions.set(definition.nombre, finalDefinition);

    // Registrar el componente en el sistema global de Componentes
    Components.registerComponent(definition.nombre, Components.CustomComponent);

    console.log(`Componente personalizado "${definition.nombre}" registrado y transpilado con éxito.`);
    return true;
}

// El objeto `engine` que se expondrá a las librerías.
const engineAPI = {
    registrarComponente,
    crearMateria: (nombre) => {
        return MateriaFactory.createBaseMateria(nombre);
    },
    registrarVentana: (definicion) => {
        LibraryAPI.registrarVentana(definicion);
    },
    mostrarNotificacion: (titulo, mensaje) => {
        showNotification(titulo, mensaje);
    }
};

/**
 * Devuelve el objeto completo de la API del motor.
 * @returns {object}
 */
export function getEngineAPI() {
    return engineAPI;
}

/**
 * Devuelve el registro de definiciones de componentes personalizados.
 * @returns {Map<string, object>}
 */
export function getCustomComponentDefinitions() {
    return customComponentDefinitions;
}
