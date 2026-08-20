// Gizmos.js
// A collection of utility functions to draw gizmos in both 2D and 3D scenes.

import { world3DToScreen, drawLineClipped } from './MathUtils.js';

export const Gizmos = {
    /**
     * Gets standard rotation matrix matching WebGL Renderer3D transform order.
     */
    getRotationMatrix(glm, rotation) {
        const q = glm.quat.create();
        glm.quat.fromEuler(q, rotation.x || 0, rotation.y || 0, rotation.z || 0);
        const rotMat = glm.mat4.create();
        glm.mat4.fromQuat(rotMat, q);
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
    }
};
