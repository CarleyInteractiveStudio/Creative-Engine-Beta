/**
 * @fileoverview Provides utility functions for 3D mathematical and geometrical calculations.
 */

export function quatToEuler(out, q) {
    let x = q[0], y = q[1], z = q[2], w = q[3];
    let x2 = x + x, y2 = y + y, z2 = z + z;
    let xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
    out[0] = Math.atan2(yz + wx, 1 - (xx + yy)) * 180 / Math.PI;
    out[1] = Math.asin(Math.max(-1, Math.min(1, wy - xz))) * 180 / Math.PI;
    out[2] = Math.atan2(xy + wz, 1 - (yy + zz)) * 180 / Math.PI;
    return out;
}

/**
 * Calculates the Axis-Aligned Bounding Box (AABB) for a Materia and its children in 3D.
 */
export function getAABB3D(materia) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let found = false;

    const glm = window.glMatrix;

    materia.traverse(mtr => {
        const smr = mtr.getComponentByName('SkinnedMeshRenderer3D');
        const mr = mtr.getComponentByName('MeshRenderer3D');
        const transform = mtr.getComponentByName('Transform');

        if ((smr || mr) && transform) {
            const worldMatrix = transform.worldMatrix;
            const positions = smr ? smr.cpuPositions : null;

            if (positions) {
                for (let i = 0; i < positions.length; i += 3) {
                    const v = glm.vec4.fromValues(positions[i], positions[i+1], positions[i+2], 1.0);
                    const wp = glm.vec4.create();
                    glm.vec4.transformMat4(wp, v, worldMatrix);

                    minX = Math.min(minX, wp[0]); minY = Math.min(minY, wp[1]); minZ = Math.min(minZ, wp[2]);
                    maxX = Math.max(maxX, wp[0]); maxY = Math.max(maxY, wp[1]); maxZ = Math.max(maxZ, wp[2]);
                    found = true;
                }
            } else if (mr) {
                // Primitives
                const half = 50;
                const corners = [
                    [-half, -half, -half], [half, -half, -half], [-half, half, -half], [half, half, -half],
                    [-half, -half, half], [half, -half, half], [-half, half, half], [half, half, half]
                ];
                corners.forEach(c => {
                    const v = glm.vec4.fromValues(c[0], c[1], c[2], 1.0);
                    const wp = glm.vec4.create();
                    glm.vec4.transformMat4(wp, v, worldMatrix);
                    minX = Math.min(minX, wp[0]); minY = Math.min(minY, wp[1]); minZ = Math.min(minZ, wp[2]);
                    maxX = Math.max(maxX, wp[0]); maxY = Math.max(maxY, wp[1]); maxZ = Math.max(maxZ, wp[2]);
                });
                found = true;
            }
        }
    });

    if (!found) return null;
    return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ], center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2] };
}

/**
 * Converts a 3D world position to 2D screen coordinates.
 */
export function world3DToScreen(worldPos, customProj = null, customView = null, canvasWidth = null, canvasHeight = null) {
    const r3d = window._Renderer3D;
    const glm = window.glMatrix;
    const proj = customProj || r3d?.lastProjectionMatrix;
    const view = customView || r3d?.lastViewMatrix;

    if (!proj || !view || !glm) return null;

    const width = canvasWidth ?? r3d?.canvas?.width ?? 800;
    const height = canvasHeight ?? r3d?.canvas?.height ?? 600;

    const worldVec = glm.vec4.fromValues(worldPos.x, worldPos.y, worldPos.z || 0, 1.0);
    const mvp = glm.mat4.create();
    glm.mat4.multiply(mvp, proj, view);

    const clipPos = glm.vec4.create();
    glm.vec4.transformMat4(clipPos, worldVec, mvp);

    if (clipPos[3] < 0.01) return null;

    const ndc = [clipPos[0] / clipPos[3], clipPos[1] / clipPos[3], clipPos[2] / clipPos[3]];
    if (Math.abs(ndc[0]) > 10.0 || Math.abs(ndc[1]) > 10.0) return null;

    return {
        x: (ndc[0] * 0.5 + 0.5) * width,
        y: (0.5 - ndc[1] * 0.5) * height
    };
}

/**
 * Draws a 3D world line with clipping against the near plane.
 */
export function drawLineClipped(ctx, p1, p2, color, width = 1, customProj = null, customView = null, canvasWidth = null, canvasHeight = null) {
    const r3d = window._Renderer3D;
    const glm = window.glMatrix;
    const proj = customProj || r3d?.lastProjectionMatrix;
    const view = customView || r3d?.lastViewMatrix;

    if (!proj || !view || !glm) return;

    const w = canvasWidth ?? r3d?.canvas?.width ?? 800;
    const h = canvasHeight ?? r3d?.canvas?.height ?? 600;

    const mvp = glm.mat4.create();
    glm.mat4.multiply(mvp, proj, view);

    const v1 = glm.vec4.fromValues(p1.x, p1.y, p1.z || 0, 1.0);
    const v2 = glm.vec4.fromValues(p2.x, p2.y, p2.z || 0, 1.0);

    const c1 = glm.vec4.create(), c2 = glm.vec4.create();
    glm.vec4.transformMat4(c1, v1, mvp);
    glm.vec4.transformMat4(c2, v2, mvp);

    const wNear = 0.01;
    if (c1[3] < wNear && c2[3] < wNear) return;

    if (c1[3] < wNear) {
        const t = (wNear - c1[3]) / (c2[3] - c1[3]);
        glm.vec4.lerp(c1, c1, c2, t);
    } else if (c2[3] < wNear) {
        const t = (wNear - c2[3]) / (c1[3] - c2[3]);
        glm.vec4.lerp(c2, c2, c1, t);
    }

    const s1 = { x: (c1[0]/c1[3] * 0.5 + 0.5) * w, y: (0.5 - c1[1]/c1[3] * 0.5) * h };
    const s2 = { x: (c2[0]/c2[3] * 0.5 + 0.5) * w, y: (0.5 - c2[1]/c2[3] * 0.5) * h };

    if (isNaN(s1.x) || isNaN(s1.y) || isNaN(s2.x) || isNaN(s2.y)) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(s1.x, s1.y);
    ctx.lineTo(s2.x, s2.y);
    ctx.stroke();
}
