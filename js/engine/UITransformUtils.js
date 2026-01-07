// js/engine/UITransformUtils.js

/**
 * Devuelve el objeto de pivote {x, y} correspondiente a un preset de anclaje.
 * @param {string} preset - El nombre del ancla (ej: 'top-right').
 * @returns {{x: number, y: number}} El pivote correspondiente (ej: {x: 1, y: 1}).
 */
export function getPivotForAnchorPreset(preset) {
    const pivot = { x: 0.5, y: 0.5 }; // Default to center

    if (preset.includes('left')) pivot.x = 0;
    if (preset.includes('center')) pivot.x = 0.5;
    if (preset.includes('right')) pivot.x = 1;

    if (preset.includes('top')) pivot.y = 0;
    if (preset.includes('middle')) pivot.y = 0.5;
    if (preset.includes('bottom')) pivot.y = 1;

    return pivot;
}

/**
 * Determina en qué ancla de 9 áreas se encuentra una posición dentro de un rectángulo padre.
 * @param {{x: number, y: number}} position - La posición del objeto (punto de pivote) en coordenadas del padre.
 * @param {{width: number, height: number}} parentRect - Las dimensiones del contenedor padre.
 * @returns {string} El nombre del preset de anclaje (ej: 'top-right').
 */
export function getAnchorPresetFromPosition(position, parentRect) {
    const thirdW = parentRect.width / 3;
    const thirdH = parentRect.height / 3;

    let horizontal, vertical;

    // Determine horizontal part
    if (position.x < thirdW) {
        horizontal = 'left';
    } else if (position.x <= 2 * thirdW) {
        horizontal = 'center';
    } else {
        horizontal = 'right';
    }

    // Determine vertical part
    if (position.y < thirdH) {
        vertical = 'top';
    } else if (position.y <= 2 * thirdH) {
        vertical = 'middle';
    } else {
        vertical = 'bottom';
    }

    // Combine them, with a special case for the absolute center
    if (vertical === 'middle' && horizontal === 'center') {
        return 'middle-center';
    }

    return `${vertical}-${horizontal}`;
}
