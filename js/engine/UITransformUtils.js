// js/engine/UITransformUtils.js
import { UITransform, Canvas, Transform } from './Components.js';

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

/**
 * Comprueba si una posición del puntero (en coordenadas de pantalla) está sobre un elemento de la interfaz de usuario.
 * @param {UITransform} uiTransform El componente UITransform del elemento.
 * @param {Canvas} canvas El componente Canvas padre.
 * @param {{x: number, y: number}} pointerPosition La posición del puntero en el espacio de la pantalla.
 * @param {{width: number, height: number}} canvasSize Las dimensiones del canvas en pantalla.
 * @returns {boolean} True si el puntero está sobre el elemento.
 */
export function isPointerOverUIElement(uiTransform, canvas, pointerPosition, canvasSize) {
    if (!uiTransform || !canvas) return false;

    // TODO: Implementar la lógica para el modo 'World Space' si es necesario
    if (canvas.renderMode !== 'Screen Space') return false;

    const rect = getScreenRect(uiTransform, canvas, canvasSize);

    return (
        pointerPosition.x >= rect.x &&
        pointerPosition.x <= rect.x + rect.width &&
        pointerPosition.y >= rect.y &&
        pointerPosition.y <= rect.y + rect.height
    );
}

/**
 * Calcula el rectángulo en pantalla (coordenadas de píxeles) para un elemento de la interfaz de usuario.
 * @param {UITransform} uiTransform El componente UITransform del elemento.
 * @param {Canvas} canvas El componente Canvas padre.
 * @param {{width: number, height: number}} canvasSize Las dimensiones del canvas en pantalla.
 * @returns {{x: number, y: number, width: number, height: number}} El rectángulo en el espacio de la pantalla.
 */
export function getScreenRect(uiTransform, canvas, canvasSize) {
    const parentRect = { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height };
    let currentTransform = uiTransform;
    let finalRect = { ...currentTransform.size };

    // Calcular la posición del ancla en coordenadas de pantalla
    const anchor = getAnchorPoint(currentTransform.anchorPreset);
    const anchorPos = {
        x: parentRect.x + parentRect.width * anchor.x,
        y: parentRect.y + parentRect.height * anchor.y
    };

    // Aplicar la posición relativa al ancla
    let finalX = anchorPos.x + currentTransform.position.x;
    let finalY = anchorPos.y + currentTransform.position.y;

    // Ajustar por el pivote
    finalX -= currentTransform.size.width * currentTransform.pivot.x;
    finalY -= currentTransform.size.height * currentTransform.pivot.y;

    return {
        x: finalX,
        y: finalY,
        width: finalRect.width,
        height: finalRect.height
    };
}


/**
 * Obtiene el punto de anclaje normalizado {x, y} para un preset.
 * @param {string} preset El nombre del preset.
 * @returns {{x: number, y: number}} El punto de anclaje (0-1).
 */
function getAnchorPoint(preset) {
    const anchor = { x: 0.5, y: 0.5 }; // Default to middle-center

    if (preset.includes('left')) anchor.x = 0;
    if (preset.includes('right')) anchor.x = 1;
    if (preset.includes('stretch')) {
        // Para stretch, el ancla efectiva está en la esquina superior izquierda
        // pero el tamaño se ajustará después.
        anchor.x = 0;
        anchor.y = 0;
    }


    if (preset.includes('top')) anchor.y = 0;
    if (preset.includes('bottom')) anchor.y = 1;


    // Casos especiales para presets de una sola palabra
    if (preset === 'center') {
        anchor.x = 0.5;
    } else if (preset === 'middle') {
        anchor.y = 0.5;
    }


    return anchor;
}

/**
 * Helper to get anchor percentages from the preset string in a Y-UP system.
 * This is used for consistent calculations between the renderer and the gizmo.
 * @param {string} preset The anchor preset name (e.g., 'top-left').
 * @returns {{x: number, y: number}} The anchor percentages (0-1), where Y=0 is bottom.
 */
export const getAnchorPercentages = (preset) => {
    const anchor = { x: 0.5, y: 0.5 }; // Default: middle-center
    if (preset.includes('left')) anchor.x = 0;
    if (preset.includes('right')) anchor.x = 1;

    // In a Y-UP logical system, 'bottom' is the origin (0), 'top' is the max (1).
    if (preset.includes('top')) anchor.y = 1;
    if (preset.includes('bottom')) anchor.y = 0;

    return anchor;
};

/**
 * Calculates a UI element's rectangle relative to its parent's rectangle.
 * This is the new single source of truth for all UI layout calculations.
 * @param {UITransform} uiTransform The UITransform component of the element.
 * @param {{x: number, y: number, width: number, height: number}} parentRect The calculated rectangle of the parent container.
 * @returns {{x: number, y: number, width: number, height: number}} The element's calculated rectangle in the same coordinate system as the parent.
 */
export function getRelativeRect(uiTransform, parentRect) {
    if (!uiTransform || !parentRect) {
        return { x: 0, y: 0, width: 100, height: 100 };
    }

    const anchorMin = getAnchorPercentages(uiTransform.anchorPreset);

    // X Calculation (using standard left-to-right coordinates)
    const anchorMinX_fromLeft = parentRect.width * anchorMin.x;
    const pivotPosX_fromLeft = anchorMinX_fromLeft + uiTransform.position.x;
    const rectX_fromLeft = pivotPosX_fromLeft - (uiTransform.size.width * uiTransform.pivot.x);
    const finalX = parentRect.x + rectX_fromLeft;

    // Y Calculation (using a Y-UP logical system and converting to Y-DOWN screen/world coordinates)
    // The formula is: parent_top + parent_height * (1 - anchor_y) - position_y - height * (1 - pivot_y)
    const rectY_fromTop = parentRect.height * (1 - anchorMin.y) - uiTransform.position.y - (uiTransform.size.height * (1 - uiTransform.pivot.y));
    const finalY = parentRect.y + rectY_fromTop;

    return {
        x: finalX,
        y: finalY,
        width: uiTransform.size.width,
        height: uiTransform.size.height
    };
}


/**
 * Recursively calculates the absolute world-space rectangle for any UI element.
 * It traverses up the hierarchy until it finds the root Canvas.
 * @param {Materia} materia The Materia object with the UITransform.
 * @param {Scene} scene The current scene to find Materia by ID.
 * @param {object} editorRefs References to editor singletons like renderer.
 * @returns {{x: number, y: number, width: number, height: number}|null} The absolute rectangle or null if invalid.
 */
export function getUIRectRecursive(materia, scene, editorRefs) {
    const uiTransform = materia.getComponent(UITransform);
    if (!uiTransform) {
        return null;
    }

    const parentMateria = scene.findMateriaById(materia.parent);
    if (!parentMateria) {
        return null; // Orphaned UI element
    }

    const parentCanvas = parentMateria.getComponent(Canvas);
    if (parentCanvas) {
        // Base case: The parent is the Canvas. Get its root rect.
        const isGameView = editorRefs.getActiveView() === 'game-content';
        const viewSize = {
            width: editorRefs.renderer.canvas.width,
            height: editorRefs.renderer.canvas.height
        };
        const rootRect = parentCanvas.getRootRect(isGameView, viewSize);
        return getRelativeRect(uiTransform, rootRect);
    }

    // Recursive step: The parent is another UI element.
    // Get the parent's absolute rect first.
    const parentRect = getUIRectRecursive(parentMateria, scene, editorRefs);
    if (!parentRect) {
        return null; // Invalid parent chain
    }

    // Now calculate the current element's rect relative to its parent's absolute rect.
    return getRelativeRect(uiTransform, parentRect);
}
