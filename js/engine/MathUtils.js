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

    if (!transform || !spriteRenderer || !spriteRenderer.sprite || !spriteRenderer.sprite.naturalWidth) {
        return null;
    }

    const w = spriteRenderer.sprite.naturalWidth;
    const h = spriteRenderer.sprite.naturalHeight;
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

// --- Matrix (mat4) Functions for WebGL ---

export function createMat4() {
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
}

export function translateMat4(out, a, v) {
    let x = v[0], y = v[1], z = v[2];
    out[12] = a[12] + a[0] * x + a[4] * y + a[8] * z;
    out[13] = a[13] + a[1] * x + a[5] * y + a[9] * z;
    out[14] = a[14] + a[2] * x + a[6] * y + a[10] * z;
    out[15] = a[15] + a[3] * x + a[7] * y + a[11] * z;
    if (a !== out) {
        out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
        out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
        out[8] = a[8]; out[9] = a[9]; out[10] = a[10]; out[11] = a[11];
    }
    return out;
}

export function scaleMat4(out, a, v) {
    let x = v[0], y = v[1], z = v[2];
    out[0] = a[0] * x;
    out[1] = a[1] * x;
    out[2] = a[2] * x;
    out[3] = a[3] * x;
    out[4] = a[4] * y;
    out[5] = a[5] * y;
    out[6] = a[6] * y;
    out[7] = a[7] * y;
    out[8] = a[8] * z;
    out[9] = a[9] * z;
    out[10] = a[10] * z;
    out[11] = a[11] * z;
    out[12] = a[12];
    out[13] = a[13];
    out[14] = a[14];
    out[15] = a[15];
    return out;
}

export function rotateMat4(out, a, rad, axis) {
    let x = axis[0], y = axis[1], z = axis[2];
    let len = Math.hypot(x, y, z);
    if (len < 0.000001) { return null; }
    len = 1 / len;
    x *= len; y *= len; z *= len;
    let s = Math.sin(rad);
    let c = Math.cos(rad);
    let t = 1 - c;
    let a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
    let a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
    let a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
    let b00 = x * x * t + c, b01 = y * x * t + z * s, b02 = z * x * t - y * s;
    let b10 = x * y * t - z * s, b11 = y * y * t + c, b12 = z * y * t + x * s;
    let b20 = x * z * t + y * s, b21 = y * z * t - x * s, b22 = z * z * t + c;
    out[0] = a00 * b00 + a10 * b01 + a20 * b02;
    out[1] = a01 * b00 + a11 * b01 + a21 * b02;
    out[2] = a02 * b00 + a12 * b01 + a22 * b02;
    out[3] = a03 * b00 + a13 * b01 + a23 * b02;
    out[4] = a00 * b10 + a10 * b11 + a20 * b12;
    out[5] = a01 * b10 + a11 * b11 + a21 * b12;
    out[6] = a02 * b10 + a12 * b11 + a22 * b12;
    out[7] = a03 * b10 + a13 * b11 + a23 * b12;
    out[8] = a00 * b20 + a10 * b21 + a20 * b22;
    out[9] = a01 * b20 + a11 * b21 + a21 * b22;
    out[10] = a02 * b20 + a12 * b21 + a22 * b22;
    out[11] = a03 * b20 + a13 * b21 + a23 * b22;
    if (a !== out) {
        out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
    }
    return out;
}

export function ortho(out, left, right, bottom, top, near, far) {
    let lr = 1 / (left - right);
    let bt = 1 / (bottom - top);
    let nf = 1 / (near - far);
    out[0] = -2 * lr;
    out[1] = 0;
    out[2] = 0;
    out[3] = 0;
    out[4] = 0;
    out[5] = -2 * bt;
    out[6] = 0;
    out[7] = 0;
    out[8] = 0;
    out[9] = 0;
    out[10] = 2 * nf;
    out[11] = 0;
    out[12] = (left + right) * lr;
    out[13] = (top + bottom) * bt;
    out[14] = (far + near) * nf;
    out[15] = 1;
    return out;
}
