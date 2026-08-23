// Gizmos.js
// A collection of utility functions to draw gizmos in both 2D and 3D scenes.

import { world3DToScreen, drawLineClipped } from './MathUtils.js';
import { CarleyMath } from '../carley-world/CarleyMath.js';

export const Gizmos = {
    /**
     * Gets standard rotation matrix matching WebGL Renderer3D / CarleyRenderer transform order (YXZ).
     */
    getRotationMatrix(glm, rotation) {
        const rotMat = glm ? glm.mat4.create() : new Float32Array(16);
        CarleyMath.mat4RotationYXZ(rotMat, rotation.x || 0, rotation.y || 0, rotation.z || 0);
        return rotMat;
    },

    /**
     * Draws a wireframe cube in 3D space.
     */
    drawWireCube(ctx, center, size, rotation = {x:0, y:0, z:0}, color = 'rgba(0, 255, 255, 0.8)', proj = null, view = null, cw = null, ch = null, width = 2) {
        const glm = window.glMatrix;
        if (!glm) return;
        const hw = size.x / 2;
        const hh = size.y / 2;
        const hd = size.z / 2;

        const points = [
            [ -hw, -hh, -hd ], [ hw, -hh, -hd ], [ hw, hh, -hd ], [ -hw, hh, -hd ],
            [ -hw, -hh, hd ], [ hw, -hh, hd ], [ hw, hh, hd ], [ -hw, hh, hd ]
        ];

        const rotMat = this.getRotationMatrix(glm, rotation);

        const worldPoints = points.map(p => {
            const rotated = glm.vec3.create();
            glm.vec3.transformMat4(rotated, p, rotMat);
            return {
                x: center.x + rotated[0],
                y: center.y + rotated[1],
                z: (center.z || 0) + rotated[2]
            };
        });

        for (let i = 0; i < 4; i++) {
            drawLineClipped(ctx, worldPoints[i], worldPoints[(i + 1) % 4], color, width, proj, view, cw, ch);
            drawLineClipped(ctx, worldPoints[i + 4], worldPoints[((i + 1) % 4) + 4], color, width, proj, view, cw, ch);
            drawLineClipped(ctx, worldPoints[i], worldPoints[i + 4], color, width, proj, view, cw, ch);
        }
    },

    /**
     * Draws a wireframe sphere in 3D space.
     */
    drawWireSphere(ctx, center, radius, rotation = {x:0, y:0, z:0}, color = 'rgba(0, 255, 255, 0.8)', proj = null, view = null, cw = null, ch = null, width = 2) {
        const glm = window.glMatrix;
        if (!glm) return;
        const segments = 16;
        const rotMat = this.getRotationMatrix(glm, rotation);

        const drawRing = (axis) => {
            let lastWorld = null;
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                let pt = [Math.cos(angle) * radius, Math.sin(angle) * radius, 0];
                if (axis === 'xz') pt = [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
                else if (axis === 'yz') pt = [0, Math.cos(angle) * radius, Math.sin(angle) * radius];

                const rotated = glm.vec3.create();
                glm.vec3.transformMat4(rotated, pt, rotMat);

                const currentWorld = {
                    x: center.x + rotated[0],
                    y: center.y + rotated[1],
                    z: (center.z || 0) + rotated[2]
                };

                if (lastWorld) drawLineClipped(ctx, lastWorld, currentWorld, color, width, proj, view, cw, ch);
                lastWorld = currentWorld;
            }
        };

        drawRing('xy'); drawRing('xz'); drawRing('yz');
    },

    drawWireTriangle(ctx, center, size, rotation = {x:0, y:0, z:0}, color = 'rgba(0, 255, 255, 0.8)', proj = null, view = null, cw = null, ch = null, width = 2) {
        const glm = window.glMatrix;
        if (!glm) return;
        const hw = size.x / 2;
        const hh = size.y / 2;
        const rotMat = this.getRotationMatrix(glm, rotation);

        const points = [[0, hh, 0], [-hw, -hh, 0], [hw, -hh, 0]].map(p => {
            const rotated = glm.vec3.create();
            glm.vec3.transformMat4(rotated, p, rotMat);
            return { x: center.x + rotated[0], y: center.y + rotated[1], z: (center.z || 0) + rotated[2] };
        });

        drawLineClipped(ctx, points[0], points[1], color, width, proj, view, cw, ch);
        drawLineClipped(ctx, points[1], points[2], color, width, proj, view, cw, ch);
        drawLineClipped(ctx, points[2], points[0], color, width, proj, view, cw, ch);
    },

    drawWirePlane(ctx, center, size, rotation = {x:0, y:0, z:0}, color = 'rgba(255, 255, 255, 0.5)', proj = null, view = null, cw = null, ch = null, width = 2) {
        const glm = window.glMatrix;
        if (!glm) return;
        const hw = size.x / 2;
        const hd = size.z / 2;
        const rotMat = this.getRotationMatrix(glm, rotation);

        const points = [[-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd]].map(p => {
            const rotated = glm.vec3.create();
            glm.vec3.transformMat4(rotated, p, rotMat);
            return { x: center.x + rotated[0], y: center.y + rotated[1], z: (center.z || 0) + rotated[2] };
        });

        for (let i = 0; i < 4; i++) drawLineClipped(ctx, points[i], points[(i + 1) % 4], color, width, proj, view, cw, ch);
    },

    drawWireCapsule(ctx, center, radius, height, rotation = {x:0, y:0, z:0}, color = 'rgba(0, 255, 255, 0.8)', proj = null, view = null, cw = null, ch = null, width = 2) {
        const glm = window.glMatrix;
        if (!glm) return;
        const hh = height / 2;
        const rotMat = this.getRotationMatrix(glm, rotation);

        const drawL = (lx, lz) => {
            const r1 = glm.vec3.create(), r2 = glm.vec3.create();
            glm.vec3.transformMat4(r1, [lx, hh, lz], rotMat);
            glm.vec3.transformMat4(r2, [lx, -hh, lz], rotMat);
            drawLineClipped(ctx,
                { x: center.x + r1[0], y: center.y + r1[1], z: (center.z||0) + r1[2] },
                { x: center.x + r2[0], y: center.y + r2[1], z: (center.z||0) + r2[2] },
                color, width, proj, view, cw, ch
            );
        };

        drawL(radius, 0); drawL(-radius, 0); drawL(0, radius); drawL(0, -radius);
        const tPos = glm.vec3.create(); glm.vec3.transformMat4(tPos, [0, hh, 0], rotMat);
        const bPos = glm.vec3.create(); glm.vec3.transformMat4(bPos, [0, -hh, 0], rotMat);
        this.drawWireSphere(ctx, { x: center.x + tPos[0], y: center.y + tPos[1], z: (center.z||0) + tPos[2] }, radius, rotation, color, proj, view, cw, ch, width);
        this.drawWireSphere(ctx, { x: center.x + bPos[0], y: center.y + bPos[1], z: (center.z||0) + bPos[2] }, radius, rotation, color, proj, view, cw, ch, width);
    },

    /**
     * Draws the exact 3D wireframe mesh geometry of a single materia.
     */
    drawSingleWireMesh(ctx, materia, color = 'rgba(0, 255, 255, 0.8)', proj = null, view = null, cw = null, ch = null, width = 1.5) {
        const glm = window.glMatrix;
        if (!glm || !materia) return;

        const smr = materia.getComponentByName ? (materia.getComponentByName('SkinnedMeshRenderer3D') || materia.getComponentByName('CarleySkinnedMeshRenderer3D')) : null;
        const mr = materia.getComponentByName ? (materia.getComponentByName('MeshRenderer3D') || materia.getComponentByName('CarleyMeshRenderer3D')) : null;
        const renderer = smr || mr;
        const transform = materia.getComponentByName ? (materia.getComponentByName('Transform') || materia.getComponentByName('CarleyTransform3D')) : null;

        if (!renderer || !renderer.cpuPositions || !transform) return;

        const worldMatrix = transform.worldMatrix;
        const positions = renderer.cpuPositions;
        const indices = renderer.cpuIndices;

        // Transform vertices to 3D world space
        const worldVerts = [];
        for (let i = 0; i < positions.length; i += 3) {
            const v = glm.vec4.fromValues(positions[i], positions[i + 1], positions[i + 2], 1.0);
            const wp = glm.vec4.create();
            glm.vec4.transformMat4(wp, v, worldMatrix);
            worldVerts.push({ x: wp[0], y: wp[1], z: wp[2] });
        }

        const numIndices = indices ? indices.length : worldVerts.length;
        const step = numIndices > 3000 ? Math.ceil(numIndices / 1500) : 1;

        if (indices) {
            for (let i = 0; i < indices.length; i += 3 * step) {
                const i0 = indices[i];
                const i1 = indices[i + 1];
                const i2 = indices[i + 2];
                if (worldVerts[i0] && worldVerts[i1] && worldVerts[i2]) {
                    drawLineClipped(ctx, worldVerts[i0], worldVerts[i1], color, width, proj, view, cw, ch);
                    drawLineClipped(ctx, worldVerts[i1], worldVerts[i2], color, width, proj, view, cw, ch);
                    drawLineClipped(ctx, worldVerts[i2], worldVerts[i0], color, width, proj, view, cw, ch);
                }
            }
        } else {
            for (let i = 0; i < worldVerts.length; i += 3 * step) {
                const p0 = worldVerts[i];
                const p1 = worldVerts[i + 1];
                const p2 = worldVerts[i + 2];
                if (p0 && p1 && p2) {
                    drawLineClipped(ctx, p0, p1, color, width, proj, view, cw, ch);
                    drawLineClipped(ctx, p1, p2, color, width, proj, view, cw, ch);
                    drawLineClipped(ctx, p2, p0, color, width, proj, view, cw, ch);
                }
            }
        }
    },

    /**
     * Draws the 3D wireframe mesh geometry for a materia and all its child sub-meshes.
     */
    drawWireMesh(ctx, materia, color = 'rgba(0, 255, 255, 0.8)', proj = null, view = null, cw = null, ch = null, width = 1.5) {
        if (!materia) return;
        if (typeof materia.traverse === 'function') {
            materia.traverse(mtr => {
                this.drawSingleWireMesh(ctx, mtr, color, proj, view, cw, ch, width);
            });
        } else {
            this.drawSingleWireMesh(ctx, materia, color, proj, view, cw, ch, width);
        }
    }
};
