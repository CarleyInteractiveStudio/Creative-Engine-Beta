/**
 * Módulo de utilidades para transformaciones de UI.
 * Se encarga de calcular posiciones y tamaños absolutos en el espacio del canvas/mundo.
 */

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
        // Si no hay UITransform, podría ser el objeto raíz de la escena, devolvemos un rect por defecto.
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
        // FIX: Handle root UI elements (like a Canvas with no parent).
        // Its world position is its own Transform, and its parentRect is its own Canvas size.
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


    const anchorMin = uiTransform.anchorMin;
    const anchorMax = uiTransform.anchorMax;

    // 1. Calcular el tamaño del ancla en el espacio del padre
    const anchorWidth = parentRect.width * (anchorMax.x - anchorMin.x);
    const anchorHeight = parentRect.height * (anchorMax.y - anchorMin.y);

    // 2. Calcular el tamaño final del elemento
    const finalWidth = anchorWidth + uiTransform.size.width;
    const finalHeight = anchorHeight + uiTransform.size.height;


    // 3. Calcular la posición del pivote del elemento en el espacio del padre
    // La posición del ancla min en el espacio del padre
    const anchorMinPosX = parentRect.x + parentRect.width * anchorMin.x;
    const anchorMinPosY = parentRect.y + parentRect.height * anchorMin.y;

    // La posición del elemento (su pivote) relativa al ancla
    let pivotPosX = anchorMinPosX + uiTransform.position.x;
    let pivotPosY = anchorMinPosY + uiTransform.position.y;


    // 4. Calcular la esquina inferior izquierda (x, y) del elemento a partir de la posición de su pivote
    const x = pivotPosX - (finalWidth * uiTransform.pivot.x);
    // En UI, Y crece hacia arriba. En el canvas, Y crece hacia abajo.
    // Necesitamos ser consistentes. Por ahora, asumimos que Y en UI crece hacia arriba desde la esquina inferior-izquierda.
    // La lógica de renderizado y gizmos debe ser consistente con esto.
    const y = pivotPosY - (finalHeight * uiTransform.pivot.y);


    // Sumamos la transformación del canvas padre para obtener coordenadas de mundo REALES.
     const worldX = x + parentTransformForWorld.x;
     const worldY = y + parentTransformForWorld.y;


     const absoluteRect = { x: worldX, y: worldY, width: finalWidth, height: finalHeight };

    // Cachear el resultado antes de devolverlo
    rectCache.set(materia.id, { rect: absoluteRect, transform: { x: worldX, y: worldY } });

    return absoluteRect;
}