/**
 * @fileoverview Provides utility functions for mathematical and geometrical calculations.
 * Includes vector operations, matrix transformations, and collision detection algorithms.
 */

import { Transform, SpriteRenderer, Camera } from './Components.js';

// Vector operations can be added here if needed.

/**
 * Calculates the world-space vertices of an object's Oriented Bounding Box (OOB).
 * @param {Materia} materia The game object.
 * @returns {Array<{x: number, y: number}>|null} An array of 4 vertex points or null if not applicable.
 */
export function getOOB(materia) {
    const transform = materia.getComponent(Transform);
    const spriteRenderer = materia.getComponent(SpriteRenderer);

    if (!transform || !spriteRenderer) {
        return null;
    }

    // Use the component's width/height properties, not the sprite's natural size
    const w = spriteRenderer.width;
    const h = spriteRenderer.height;
    const sx = transform.scale.x;
    const sy = transform.scale.y;

    // Local-space corners of the scaled sprite
    const halfWidth = (w * sx) / 2;
    const halfHeight = (h * sy) / 2;
    const localCorners = [
        { x: -halfWidth, y: -halfHeight }, // Top-left
        { x:  halfWidth, y: -halfHeight }, // Top-right
        { x:  halfWidth, y:  halfHeight }, // Bottom-right
        { x: -halfWidth, y:  halfHeight }  // Bottom-left
    ];

    const angleRad = transform.rotation * Math.PI / 180;
    const cosA = Math.cos(angleRad);
    const sinA = Math.sin(angleRad);

    const worldCorners = localCorners.map(corner => {
        // Apply rotation
        const rotatedX = corner.x * cosA - corner.y * sinA;
        const rotatedY = corner.x * sinA + corner.y * cosA;

        // Apply translation
        return {
            x: rotatedX + transform.x,
            y: rotatedY + transform.y
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
