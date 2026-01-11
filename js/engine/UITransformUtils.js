/**
 * Módulo de utilidades para transformaciones de UI.
 * Se encarga de calcular posiciones y tamaños absolutos en el espacio del canvas/mundo.
 */

/**
 * FIX: Reintroducida función eliminada por error.
 * Devuelve los porcentajes de ancla min/max basados en un preset string.
 * Esta función es necesaria para el componente Canvas.
 */
export function getAnchorPercentages(preset) {
    const presets = {
        'top-left': { min: { x: 0, y: 1 }, max: { x: 0, y: 1 } },
        'top-center': { min: { x: 0.5, y: 1 }, max: { x: 0.5, y: 1 } },
        'top-right': { min: { x: 1, y: 1 }, max: { x: 1, y: 1 } },
        'middle-left': { min: { x: 0, y: 0.5 }, max: { x: 0, y: 0.5 } },
        'middle-center': { min: { x: 0.5, y: 0.5 }, max: { x: 0.5, y: 0.5 } },
        'middle-right': { min: { x: 1, y: 0.5 }, max: { x: 1, y: 0.5 } },
        'bottom-left': { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        'bottom-center': { min: { x: 0.5, y: 0 }, max: { x: 0.5, y: 0 } },
        'bottom-right': { min: { x: 1, y: 0 }, max: { x: 1, y: 0 } },
        'stretch-top': { min: { x: 0, y: 1 }, max: { x: 1, y: 1 } },
        'stretch-middle': { min: { x: 0, y: 0.5 }, max: { x: 1, y: 0.5 } },
        'stretch-bottom': { min: { x: 0, y: 0 }, max: { x: 1, y: 0 } },
        'stretch-left': { min: { x: 0, y: 0 }, max: { x: 0, y: 1 } },
        'stretch-center': { min: { x: 0.5, y: 0 }, max: { x: 0.5, y: 1 } },
        'stretch-right': { min: { x: 1, y: 0 }, max: { x: 1, y: 1 } },
        'stretch-full': { min: { x: 0, y: 0 }, max: { x: 1, y: 1 } },
    };
    // Devuelve el preset o un valor por defecto seguro.
    return presets[preset] || { min: { x: 0.5, y: 0.5 }, max: { x: 0.5, y: 0.5 } };
}


/**
 * Calcula el rectángulo absoluto (posición y tamaño) de un elemento de UI en el espacio del mundo.
 * Tiene en cuenta la jerarquía de transformaciones, pivotes y anclas.
 *
 * @param {import("./Materia.js").Materia} materia - La materia con el UITransform a calcular.
 * @param {Map<number, {rect: {x: number, y: number, width: number, height: number}, transform: object}>} rectCache - Un mapa para cachear los cálculos y evitar trabajo redundante en una sola pasada.
 * @returns {{x: number, y: number, width: number, height: number}} El rectángulo absoluto.
 */
export function getAbsoluteRect(materia, rectCache) {
    if (!materia) {
        return { x: 0, y: 0, width: 0, height: 0 };
    }
    if (rectCache.has(materia.id)) {
        return rectCache.get(materia.id).rect;
    }

    const uiTransform = materia.getComponent('UITransform');
    if (!uiTransform) {
        return { x: 0, y: 0, width: 0, height: 0 };
    }

    let parentRect = { x: 0, y: 0, width: 0, height: 0 };
    let parentTransformForWorld = { x: 0, y: 0 };

    if (materia.parent) {
        const parentCanvas = materia.parent.getComponent('Canvas');
        if (parentCanvas) {
            const worldTransform = materia.parent.getComponent('Transform');
            if (worldTransform) {
                parentTransformForWorld = { x: worldTransform.position.x, y: worldTransform.position.y };
            }
            parentRect = {
                x: -parentCanvas.size.x / 2,
                y: -parentCanvas.size.y / 2,
                width: parentCanvas.size.x,
                height: parentCanvas.size.y
            };
        } else {
            parentRect = getAbsoluteRect(materia.parent, rectCache);
            parentTransformForWorld = { x: 0, y: 0 };
        }
    } else {
        const worldTransform = materia.getComponent('Transform');
        const canvas = materia.getComponent('Canvas');
        if (worldTransform) {
            parentTransformForWorld = { x: worldTransform.position.x, y: worldTransform.position.y };
        }
        if (canvas) {
            parentRect = {
                x: -canvas.size.x / 2,
                y: -canvas.size.y / 2,
                width: canvas.size.x,
                height: canvas.size.y
            };
        }
    }

    // FIX: Obtener anclas desde el preset en lugar de propiedades inexistentes.
    const { min: anchorMin, max: anchorMax } = getAnchorPercentages(uiTransform.anchorPreset);

    const anchorWidth = parentRect.width * (anchorMax.x - anchorMin.x);
    const anchorHeight = parentRect.height * (anchorMax.y - anchorMin.y);

    const finalWidth = anchorWidth + uiTransform.size.width;
    const finalHeight = anchorHeight + uiTransform.size.height;

    const anchorMinPosX = parentRect.x + parentRect.width * anchorMin.x;
    const anchorMinPosY = parentRect.y + parentRect.height * anchorMin.y;

    let pivotPosX = anchorMinPosX + uiTransform.position.x;
    let pivotPosY = anchorMinPosY + uiTransform.position.y;

    const x = pivotPosX - (finalWidth * uiTransform.pivot.x);
    const y = pivotPosY - (finalHeight * uiTransform.pivot.y);

    const worldX = x + parentTransformForWorld.x;
    const worldY = y + parentTransformForWorld.y;

    const absoluteRect = { x: worldX, y: worldY, width: finalWidth, height: finalHeight };

    rectCache.set(materia.id, { rect: absoluteRect, transform: { x: worldX, y: worldY } });

    return absoluteRect;
}