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
 * Calculates the absolute screen-space rectangle for a UI element by recursively traversing its parents.
 * Calculates the final, absolute rectangle for a UI element, relative to its root canvas.
 * This is the single source of truth for calculating a UI element's unscaled position and size.
 * Its logic mirrors the recursive drawing logic in `_drawUIElementAndChildren` in `Renderer.js`.
 * @param {Materia} materia The UI element to calculate the rectangle for.
 * @param {Map<number, object>} [rectCache=new Map()] A cache to store intermediate results for performance.
 * @returns {{x: number, y: number, width: number, height: number}} The element's rectangle in canvas-local coordinates.
 */
export function getWorldRectForUITransform(materia, rectCache = new Map()) {
    if (!materia) return { x: 0, y: 0, width: 0, height: 0 };
    if (rectCache.has(materia.id)) return rectCache.get(materia.id);

    const uiTransform = materia.getComponent(UITransform);
    if (!uiTransform) return { x: 0, y: 0, width: 0, height: 0 };

    let parentRect;
    // Recursive step: If the element has a parent, get its rect first.
    if (materia.parent) {
        parentRect = getWorldRectForUITransform(materia.parent, rectCache);
    } else {
        // Base case: This should be the root Canvas. Its parent rect is effectively at (0,0) with its own size.
        const canvas = materia.getComponent(Canvas);
        if (canvas) {
            parentRect = { x: 0, y: 0, width: canvas.size.x, height: canvas.size.y };
        } else {
            // If a UI element has no parent and isn't a canvas, it's an orphan. Treat it as relative to a default rect.
            parentRect = { x: 0, y: 0, width: 1920, height: 1080 }; // Default fallback
        }
    }

    // This logic is now a direct copy of the rendering logic in `_drawUIElementAndChildren`
    const anchorMin = getAnchorPercentages(uiTransform.anchorPreset);

    // X Calculation
    const anchorMinX_fromLeft = parentRect.width * anchorMin.x;
    const pivotPosX_fromLeft = anchorMinX_fromLeft + uiTransform.position.x;
    const rectX_fromLeft = pivotPosX_fromLeft - (uiTransform.size.width * uiTransform.pivot.x);
    const finalX = parentRect.x + rectX_fromLeft;

    // Y Calculation (using the unified Y-UP formula, converting to Y-DOWN)
    const rectY_fromTop = parentRect.height * (1 - anchorMin.y) - uiTransform.position.y - (uiTransform.size.height * (1 - uiTransform.pivot.y));
    const finalY = parentRect.y + rectY_fromTop;

    const result = {
        x: finalX,
        y: finalY,
        width: uiTransform.size.width,
        height: uiTransform.size.height,
    };

    rectCache.set(materia.id, result);
    return result;
}

/**
 * Calculates the scaling and offset required to fit a source rectangle into a target rectangle
 * while maintaining the source's aspect ratio (letterboxing).
 * @param {{width: number, height: number}} sourceRect The source rectangle (e.g., canvas design size).
 * @param {{width: number, height: number}} targetRect The target rectangle (e.g., screen size).
 * @returns {{scale: number, offsetX: number, offsetY: number}} The scale and offsets.
 */
export function calculateLetterbox(sourceRect, targetRect) {
    const targetAspect = targetRect.width / targetRect.height;
    const sourceAspect = sourceRect.width / sourceRect.height;

    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (targetAspect > sourceAspect) {
        // Target is wider than source, letterbox on the sides
        scale = targetRect.height / sourceRect.height;
        offsetX = (targetRect.width - sourceRect.width * scale) / 2;
    } else {
        // Target is taller than source, letterbox on top/bottom
        scale = targetRect.width / sourceRect.width;
        offsetY = (targetRect.height - sourceRect.height * scale) / 2;
    }

    return { scale, offsetX, offsetY };
}
