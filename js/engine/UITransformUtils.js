// js/engine/UITransformUtils.js
import { UITransform, Canvas, Transform } from './Components.js';
import { InputManager } from './Input.js';

/**
 * Calculates the world-space position of a specific anchor point within a parent rectangle.
 * The coordinate system is Y-Down (top-left is 0,0).
 * @param {number} anchorPoint - The index of the anchor point (0-8).
 * @param {{x: number, y: number, width: number, height: number}} parentRect - The parent's absolute rectangle.
 * @returns {{x: number, y: number}} The world-space coordinates of the anchor point.
 */
export function getAnchorPosition(anchorPoint, parentRect) {
    const col = anchorPoint % 3; // 0 for left, 1 for center, 2 for right
    const row = Math.floor(anchorPoint / 3); // 0 for top, 1 for middle, 2 for bottom

    const x = parentRect.x + (parentRect.width * col * 0.5);
    const y = parentRect.y + (parentRect.height * row * 0.5);

    return { x, y };
}


/**
 * Calculates the absolute screen-space rectangle for a UI element by recursively traversing its parents.
 * This is the single source of truth for UI element positioning.
 * @param {Materia} materia The game object with the UITransform.
 * @param {Map<number, {x: number, y: number, width: number, height: number}>} rectCache A cache to store intermediate calculations.
 * @returns {{x: number, y: number, width: number, height: number}} The absolute rectangle in screen coordinates (Y-Down).
 */
export function getAbsoluteRect(materia, rectCache) {
    if (!materia) return { x: 0, y: 0, width: 0, height: 0 };
    if (rectCache.has(materia.id)) return rectCache.get(materia.id);

    // Base case: The recursion root is a Materia with a Canvas component.
    const canvas = materia.getComponent(Canvas);
    if (canvas) {
        const transform = materia.getComponent(Transform);
        if (!transform) {
            console.error(`Canvas '${materia.name}' is missing a Transform component.`);
            return { x: 0, y: 0, width: 0, height: 0 };
        }

        // For UI calculations, the Canvas's world transform defines the root rectangle.
        const size = canvas.renderMode === 'Screen Space'
            ? (canvas.referenceResolution || { width: 800, height: 600 })
            : (canvas.size || { x: 800, y: 600 });

        const width = size.width ?? size.x;
        const height = size.height ?? size.y;

        const absoluteRect = {
            x: transform.position.x - width / 2,
            y: transform.position.y - height / 2, // Y-Down, so this works as intended
            width: width,
            height: height
        };
        rectCache.set(materia.id, absoluteRect);
        return absoluteRect;
    }

    const uiTransform = materia.getComponent(UITransform);
    if (!uiTransform || !materia.parent) {
         // If there's no UI transform or no parent, we can't calculate a position.
         // Defer to the parent, or return a zero rect if there is no parent.
         return materia.parent
            ? getAbsoluteRect(materia.parent, rectCache)
            : { x: 0, y: 0, width: 0, height: 0 };
    }

    // Recurse to get the parent's calculated rectangle.
    const parentRect = getAbsoluteRect(materia.parent, rectCache);

    // Calculate this element's position based on the new 3x3 grid system.
    const anchorPos = getAnchorPosition(uiTransform.anchorPoint, parentRect);

    // The element's position is an offset from the anchor point.
    // This offset moves the CENTER of the element.
    const elementCenterX = anchorPos.x + uiTransform.position.x;
    const elementCenterY = anchorPos.y + uiTransform.position.y;

    // Calculate the top-left corner using the pivot.
    const pivotX = uiTransform.pivot?.x ?? 0.5;
    const pivotY = uiTransform.pivot?.y ?? 0.5;
    const finalX = elementCenterX - uiTransform.size.width * pivotX;
    const finalY = elementCenterY - uiTransform.size.height * pivotY;

    const absoluteRect = {
        x: finalX,
        y: finalY,
        width: uiTransform.size.width,
        height: uiTransform.size.height
    };

    rectCache.set(materia.id, absoluteRect);
    return absoluteRect;
}

/**
 * Calculates the screen-space rectangle (in Client/Browser coordinates) for a UI element.
 * @param {UITransform|Materia} target - The UI element or its UITransform.
 * @param {Canvas} canvas - The Canvas component it belongs to.
 * @returns {{x: number, y: number, width: number, height: number}} The absolute rectangle in client coordinates.
 */
export function getScreenRect(target, canvas) {
    const materia = target.materia || target;
    const rectCache = new Map();
    const canvasMateria = canvas.materia;

    // Determine the actual canvas element
    const canvasElement = (canvas.renderMode === 'Screen Space') ? InputManager.gameCanvas : InputManager.sceneCanvas;
    const canvasOffset = canvasElement ? canvasElement.getBoundingClientRect() : { left: 0, top: 0, width: 800, height: 600 };
    const canvasSize = { width: canvasOffset.width, height: canvasOffset.height };

    // Use a virtual rectangle for the canvas to compute children positions
    if (canvas.renderMode === 'Screen Space') {
        const refRes = canvas.referenceResolution || { width: 800, height: 600 };
        const virtualCanvasRect = { x: 0, y: 0, width: refRes.width, height: refRes.height };
        rectCache.set(canvasMateria.id, virtualCanvasRect);

        const virtualRect = getAbsoluteRect(materia, rectCache);

        const scaleX = canvasSize.width / refRes.width;
        const scaleY = canvasSize.height / refRes.height;

        return {
            x: canvasOffset.left + virtualRect.x * scaleX,
            y: canvasOffset.top + virtualRect.y * scaleY,
            width: virtualRect.width * scaleX,
            height: virtualRect.height * scaleY
        };
    } else {
        // World Space: For now, fallback to absolute world rect (this won't perfectly match screen coords without camera)
        return getAbsoluteRect(materia, rectCache);
    }
}


/**
 * Calculates the scale and offset to fit a source rectangle within a target rectangle,
 * maintaining aspect ratio (letterboxing).
 * @param {{width: number, height: number}} sourceRect The dimensions of the content.
 * @param {{width: number, height: number}} targetRect The dimensions of the container.
 * @returns {{scale: number, offsetX: number, offsetY: number}} The scale factor and offsets.
 */
export function calculateLetterbox(sourceRect, targetRect) {
    const scaleX = targetRect.width / sourceRect.width;
    const scaleY = targetRect.height / sourceRect.height;
    const scale = Math.min(scaleX, scaleY);

    const scaledWidth = sourceRect.width * scale;
    const scaledHeight = sourceRect.height * scale;

    const offsetX = (targetRect.width - scaledWidth) / 2;
    const offsetY = (targetRect.height - scaledHeight) / 2;

    return { scale, offsetX, offsetY };
}

/**
 * Determines which of the 9 anchor points is closest to a given position within a parent rect.
 * @param {{x: number, y: number}} positionInParentCoords - The position of the UI element's center relative to the parent's top-left corner.
 * @param {{width: number, height: number}} parentSize - The size of the parent rectangle.
 * @returns {number} The index (0-8) of the closest anchor point.
 */
export function getClosestAnchorPoint(positionInParentCoords, parentSize) {
    const col = Math.round((positionInParentCoords.x / parentSize.width) * 2);
    const row = Math.round((positionInParentCoords.y / parentSize.height) * 2);

    // Clamp values to be safe
    const finalCol = Math.max(0, Math.min(2, col));
    const finalRow = Math.max(0, Math.min(2, row));

    return finalRow * 3 + finalCol;
}
