// Gizmos.js
// A collection of utility functions to draw gizmos in both 2D and 3D scenes.

import { world3DToScreen, drawLineClipped } from './3d/MathUtils3D.js';

export const Gizmos = {
    /**
     * Draws a wireframe cube in 3D space.
     */
    drawWireCube(ctx, center, size, rotation = {x:0, y:0, z:0}, color = 'rgba(0, 255, 255, 0.8)', proj = null, view = null, cw = null, ch = null) {
        const glm = window.glMatrix;
        if (!glm) return;
        const hw = size.x / 2;
        const hh = size.y / 2;
        const hd = size.z / 2;

        const points = [
            [ -hw, -hh, -hd ], [ hw, -hh, -hd ], [ hw, hh, -hd ], [ -hw, hh, -hd ],
            [ -hw, -hh, hd ], [ hw, -hh, hd ], [ hw, hh, hd ], [ -hw, hh, hd ]
        ];

        const q = glm.quat.create();
        glm.quat.fromEuler(q, rotation.x, rotation.y, rotation.z);

        const worldPoints = points.map(p => {
            const rotated = glm.vec3.create();
            glm.vec3.transformQuat(rotated, p, q);
            return {
                x: center.x + rotated[0],
                y: center.y + rotated[1],
                z: (center.z || 0) + rotated[2]
            };
        });

        for (let i = 0; i < 4; i++) {
            drawLineClipped(ctx, worldPoints[i], worldPoints[(i + 1) % 4], color, 1, proj, view, cw, ch);
            drawLineClipped(ctx, worldPoints[i + 4], worldPoints[((i + 1) % 4) + 4], color, 1, proj, view, cw, ch);
            drawLineClipped(ctx, worldPoints[i], worldPoints[i + 4], color, 1, proj, view, cw, ch);
        }
    },

    /**
     * Draws a wireframe sphere in 3D space.
     */
    drawWireSphere(ctx, center, radius, rotation = {x:0, y:0, z:0}, color = 'rgba(0, 255, 255, 0.8)', proj = null, view = null, cw = null, ch = null) {
        const glm = window.glMatrix;
        if (!glm) return;
        const segments = 16;
        const q = glm.quat.create();
        glm.quat.fromEuler(q, rotation.x, rotation.y, rotation.z);

        const drawRing = (axis) => {
            let lastWorld = null;
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                let pt = [Math.cos(angle) * radius, Math.sin(angle) * radius, 0];
                if (axis === 'xz') pt = [Math.cos(angle) * radius, 0, Math.sin(angle) * radius];
                else if (axis === 'yz') pt = [0, Math.cos(angle) * radius, Math.sin(angle) * radius];

                const rotated = glm.vec3.create();
                glm.vec3.transformQuat(rotated, pt, q);

                const currentWorld = {
                    x: center.x + rotated[0],
                    y: center.y + rotated[1],
                    z: (center.z || 0) + rotated[2]
                };

                if (lastWorld) drawLineClipped(ctx, lastWorld, currentWorld, color, 1, proj, view, cw, ch);
                lastWorld = currentWorld;
            }
        };

        drawRing('xy'); drawRing('xz'); drawRing('yz');
    },

    drawWireTriangle(ctx, center, size, rotation = {x:0, y:0, z:0}, color = 'rgba(0, 255, 255, 0.8)', proj = null, view = null, cw = null, ch = null) {
        const glm = window.glMatrix;
        if (!glm) return;
        const hw = size.x / 2;
        const hh = size.y / 2;
        const q = glm.quat.create();
        glm.quat.fromEuler(q, rotation.x, rotation.y, rotation.z);

        const points = [[0, hh, 0], [-hw, -hh, 0], [hw, -hh, 0]].map(p => {
            const rotated = glm.vec3.create();
            glm.vec3.transformQuat(rotated, p, q);
            return { x: center.x + rotated[0], y: center.y + rotated[1], z: (center.z || 0) + rotated[2] };
        });

        drawLineClipped(ctx, points[0], points[1], color, 1, proj, view, cw, ch);
        drawLineClipped(ctx, points[1], points[2], color, 1, proj, view, cw, ch);
        drawLineClipped(ctx, points[2], points[0], color, 1, proj, view, cw, ch);
    },

    drawWirePlane(ctx, center, size, rotation = {x:0, y:0, z:0}, color = 'rgba(255, 255, 255, 0.5)', proj = null, view = null, cw = null, ch = null) {
        const glm = window.glMatrix;
        if (!glm) return;
        const hw = size.x / 2;
        const hd = size.z / 2;
        const q = glm.quat.create();
        glm.quat.fromEuler(q, rotation.x, rotation.y, rotation.z);

        const points = [[-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd]].map(p => {
            const rotated = glm.vec3.create();
            glm.vec3.transformQuat(rotated, p, q);
            return { x: center.x + rotated[0], y: center.y + rotated[1], z: (center.z || 0) + rotated[2] };
        });

        for (let i = 0; i < 4; i++) drawLineClipped(ctx, points[i], points[(i + 1) % 4], color, 1, proj, view, cw, ch);
    },

    drawWireCapsule(ctx, center, radius, height, rotation = {x:0, y:0, z:0}, color = 'rgba(0, 255, 255, 0.8)', proj = null, view = null, cw = null, ch = null) {
        const glm = window.glMatrix;
        if (!glm) return;
        const hh = height / 2;
        const q = glm.quat.create();
        glm.quat.fromEuler(q, rotation.x, rotation.y, rotation.z);

        const drawL = (lx, lz) => {
            const r1 = glm.vec3.create(), r2 = glm.vec3.create();
            glm.vec3.transformQuat(r1, [lx, hh, lz], q);
            glm.vec3.transformQuat(r2, [lx, -hh, lz], q);
            drawLineClipped(ctx,
                { x: center.x + r1[0], y: center.y + r1[1], z: (center.z||0) + r1[2] },
                { x: center.x + r2[0], y: center.y + r2[1], z: (center.z||0) + r2[2] },
                color, 1, proj, view, cw, ch
            );
        };

        drawL(radius, 0); drawL(-radius, 0); drawL(0, radius); drawL(0, -radius);
        const tPos = glm.vec3.create(); glm.vec3.transformQuat(tPos, [0, hh, 0], q);
        const bPos = glm.vec3.create(); glm.vec3.transformQuat(bPos, [0, -hh, 0], q);
        this.drawWireSphere(ctx, { x: center.x + tPos[0], y: center.y + tPos[1], z: (center.z||0) + tPos[2] }, radius, rotation, color, proj, view, cw, ch);
        this.drawWireSphere(ctx, { x: center.x + bPos[0], y: center.y + bPos[1], z: (center.z||0) + bPos[2] }, radius, rotation, color, proj, view, cw, ch);
    }
};
