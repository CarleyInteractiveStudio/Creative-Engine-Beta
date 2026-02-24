/**
 * @fileoverview Provides utility functions for mathematical and geometrical calculations.
 * Includes vector operations, matrix transformations, and collision detection algorithms.
 */

import { Transform, SpriteRenderer, Camera, Water, LineCollider2D, Gyzmo } from './Components.js';

// Vector operations can be added here if needed.

/**
 * Calculates the world-space vertices of an object's Oriented Bounding Box (OOB).
 * @param {Materia} materia The game object.
 * @param {{x:number, y:number}} [explicitPosition] Optional explicit world position.
 * @returns {Array<{x: number, y: number}>|null} An array of 4 vertex points or null if not applicable.
 */
export function getOOB(materia, explicitPosition = null) {
    const transform = materia.getComponent(Transform);
    if (!transform) return null;

    const spriteRenderer = materia.getComponent(SpriteRenderer);
    const water = materia.getComponent(Water);
    const lineCollider = materia.getComponent(LineCollider2D);
    const gyzmo = materia.getComponent(Gyzmo);

    // Special case for World-Space Water
    if (water && water._initializedWorldSpace) {
        const b = water.bounds;
        return [
            { x: b.minX, y: b.minY },
            { x: b.maxX, y: b.minY },
            { x: b.maxX, y: b.maxY },
            { x: b.minX, y: b.maxY }
        ];
    }

    let w, h, pivotX = 0.5, pivotY = 0.5;

    if (spriteRenderer && spriteRenderer.sprite && (spriteRenderer.sprite.naturalWidth || spriteRenderer.sprite.width)) {
        w = spriteRenderer.sprite.naturalWidth || spriteRenderer.sprite.width;
        h = spriteRenderer.sprite.naturalHeight || spriteRenderer.sprite.height;
        pivotX = spriteRenderer.pivot ? spriteRenderer.pivot.x : 0.5;
        pivotY = spriteRenderer.pivot ? spriteRenderer.pivot.y : 0.5;

        // If using a sprite sheet, use the sprite's rect dimensions and pivot
        if (spriteRenderer.spriteSheet && spriteRenderer.spriteName && spriteRenderer.spriteSheet.sprites[spriteRenderer.spriteName]) {
            const spriteData = spriteRenderer.spriteSheet.sprites[spriteRenderer.spriteName];
            if (spriteData.rect) {
                w = spriteData.rect.width;
                h = spriteData.rect.height;
                pivotX = spriteData.pivot.x;
                pivotY = spriteData.pivot.y;
            }
        }
    } else if (water) {
        w = water.width;
        h = water.height;
        pivotX = 0.5;
        pivotY = 0.5;
    } else if (lineCollider && lineCollider.points && lineCollider.points.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of lineCollider.points) {
            minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
        }
        w = maxX - minX;
        h = maxY - minY;
        // Adjust pivot to match the bounds center
        pivotX = -minX / (w || 1);
        pivotY = -minY / (h || 1);
    } else if (gyzmo && gyzmo.layers && gyzmo.layers.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const l of gyzmo.layers) {
            minX = Math.min(minX, l.x - l.width / 2); minY = Math.min(minY, l.y - l.height / 2);
            maxX = Math.max(maxX, l.x + l.width / 2); maxY = Math.max(maxY, l.y + l.height / 2);
        }
        w = maxX - minX;
        h = maxY - minY;
        pivotX = -minX / (w || 1);
        pivotY = -minY / (h || 1);
    } else {
        // For other objects (like empty transforms), don't cull
        return null;
    }
    const sx = transform.scale.x;
    const sy = transform.scale.y;

    // Local-space corners relative to pivot
    // We scale by sx/sy because we want the OOB in world units (pixels at scale 1)
    // but the local coordinates should reflect the scaling.
    // Wait, transform.scale is already used in the final multiplication or here?
    // Actually, localCorners should be in "sprite-local" space, then scaled.

    const drawX = -w * pivotX;
    const drawY = -h * pivotY;

    const localCorners = [
        { x: drawX * sx, y: drawY * sy }, // Top-left
        { x: (drawX + w) * sx, y: drawY * sy }, // Top-right
        { x: (drawX + w) * sx, y: (drawY + h) * sy }, // Bottom-right
        { x: drawX * sx, y: (drawY + h) * sy }  // Bottom-left
    ];

    const angleRad = transform.rotation * Math.PI / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);

    const pos = explicitPosition || transform.position;

    const worldCorners = localCorners.map(corner => {
        // Apply rotation
        const rotatedX = corner.x * cosA - corner.y * sinA;
        const rotatedY = corner.x * sinA + corner.y * cosA;

        // Apply translation
        return {
            x: rotatedX + pos.x,
            y: rotatedY + pos.y
        };
    });

    return worldCorners;
}


/**
 * Calculates the world-space Oriented Bounding Box for a camera's view.
 * @param {Materia} cameraMateria The camera's game object.
 * @param {number} aspect The aspect ratio of the canvas (width / height).
 * @returns {Array<{x: number, y: number}>|null} An array of 4 vertex points for the camera's view box.
 */
export function getCameraViewBox(cameraMateria, aspect) {
    const transform = cameraMateria.getComponent(Transform);
    const camera = cameraMateria.getComponent(Camera);

    if (!transform || !camera) {
        return null;
    }

    let halfWidth, halfHeight;

    if (camera.projection === 'Orthographic') {
        halfHeight = camera.orthographicSize;
        halfWidth = halfHeight * aspect;
    } else { // Perspective
        // For a 2D perspective, the viewable area at the camera's focal plane (z=0)
        // is determined by FOV. We can calculate an equivalent orthographic size.
        // A distance of 1 is assumed for this calculation.
        const halfFov = camera.fov * 0.5 * Math.PI / 180;
        halfHeight = Math.tan(halfFov); // This gives a size for a distance of 1
        halfWidth = halfHeight * aspect;
        // This is a simplification but provides a reasonable culling box.
        // For a true culling, we'd check against the trapezoid, but box-to-box is faster.
    }

    const localCorners = [
        { x: -halfWidth, y: -halfHeight },
        { x:  halfWidth, y: -halfHeight },
        { x:  halfWidth, y:  halfHeight },
        { x: -halfWidth, y:  halfHeight }
    ];

    const angleRad = transform.rotation * Math.PI / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);

    const worldCorners = localCorners.map(corner => {
        const rotatedX = corner.x * cosA - corner.y * sinA;
        const rotatedY = corner.x * sinA + corner.y * cosA;
        return {
            x: rotatedX + transform.x,
            y: rotatedY + transform.y
        };
    });

    return worldCorners;
}

// --- Separating Axis Theorem (SAT) ---

/**
 * Projects a polygon onto an axis and returns the min and max projection values.
 * @param {Array<{x: number, y: number}>} vertices The vertices of the polygon.
 * @param {{x: number, y: number}} axis The axis to project onto.
 * @returns {{min: number, max: number}}
 */
function project(vertices, axis) {
    let min = Infinity;
    let max = -Infinity;
    for (const vertex of vertices) {
        const dotProduct = vertex.x * axis.x + vertex.y * axis.y;
        min = Math.min(min, dotProduct);
        max = Math.max(max, dotProduct);
    }
    return { min, max };
}

/**
 * Gets the perpendicular axes for each edge of a polygon.
 * @param {Array<{x: number, y: number}>} vertices The vertices of the polygon.
 * @returns {Array<{x: number, y: number}>} An array of normalized axis vectors.
 */
function getAxes(vertices) {
    const axes = [];
    for (let i = 0; i < vertices.length; i++) {
        const p1 = vertices[i];
        const p2 = vertices[i + 1] || vertices[0]; // Wrap around to the first vertex

        const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
        const normal = { x: -edge.y, y: edge.x }; // Perpendicular vector

        // Normalize the axis
        const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
        if (length > 0) {
            axes.push({ x: normal.x / length, y: normal.y / length });
        }
    }
    return axes;
}

/**
 * Checks for collision between two convex polygons using the Separating Axis Theorem.
 * @param {Array<{x: number, y: number}>} polyA Vertices of the first polygon.
 * @param {Array<{x: number, y: number}>} polyB Vertices of the second polygon.
 * @returns {boolean} True if they are intersecting, false otherwise.
 */
export function checkIntersection(polyA, polyB) {
    if (!polyA || !polyB) return false;

    const axesA = getAxes(polyA);
    const axesB = getAxes(polyB);

    // Loop through all axes of both polygons
    for (const axis of [...axesA, ...axesB]) {
        const pA = project(polyA, axis);
        const pB = project(polyB, axis);

        // Check for a gap between the projections. If there is a gap, they don't collide.
        if (pA.max < pB.min || pB.max < pA.min) {
            return false; // Found a separating axis
        }
    }

    // If no separating axis was found, the polygons are colliding.
    return true;
}

/**
 * Gets the bounding box from a set of corner points.
 * @param {Array<{x: number, y: number}>} corners
 */
export function getBoundsFromCorners(corners) {
    if (!corners || corners.length === 0) return null;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of corners) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
    }
    return { left: minX, right: maxX, top: minY, bottom: maxY };
}
