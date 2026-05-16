// Gizmos.js
// A collection of utility functions to draw gizmos in both 2D and 3D scenes.

import { world3DToScreen } from '../editor/SceneView.js';

export const Gizmos = {
    /**
     * Draws a wireframe cube in 3D space.
     */
    drawWireCube(ctx, center, size, rotation = {x:0, y:0, z:0}, color = 'rgba(0, 255, 255, 0.8)') {
        const glm = window.glMatrix;
        const hw = size.x / 2;
        const hh = size.y / 2;
        const hd = size.z / 2;

        const points = [
            [ -hw, -hh, -hd ], [ hw, -hh, -hd ], [ hw, hh, -hd ], [ -hw, hh, -hd ],
            [ -hw, -hh, hd ], [ hw, -hh, hd ], [ hw, hh, hd ], [ -hw, hh, hd ]
        ];

        const q = glm.quat.create();
        glm.quat.fromEuler(q, rotation.x, rotation.y, rotation.z);

        const screenPoints = points.map(p => {
            const rotated = glm.vec3.create();
            glm.vec3.transformQuat(rotated, p, q);
            return world3DToScreen({
                x: center.x + rotated[0],
                y: center.y - rotated[1], // World Y is handled as inverted in world3DToScreen
                z: (center.z || 0) + rotated[2]
            });
        });

        if (screenPoints.some(p => p === null)) return;

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;

        // Bottom face
        ctx.beginPath();
        ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
        for (let i = 1; i < 4; i++) ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
        ctx.closePath(); ctx.stroke();

        // Top face
        ctx.beginPath();
        ctx.moveTo(screenPoints[4].x, screenPoints[4].y);
        for (let i = 5; i < 8; i++) ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
        ctx.closePath(); ctx.stroke();

        // Connecting lines
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(screenPoints[i].x, screenPoints[i].y);
            ctx.lineTo(screenPoints[i + 4].x, screenPoints[i + 4].y);
            ctx.stroke();
        }
    },

    /**
     * Draws a wireframe sphere in 3D space using 3 rings.
     */
    drawWireSphere(ctx, center, radius, rotation = {x:0, y:0, z:0}, color = 'rgba(0, 255, 255, 0.8)') {
        const glm = window.glMatrix;
        const segments = 16;
        const q = glm.quat.create();
        glm.quat.fromEuler(q, rotation.x, rotation.y, rotation.z);

        const drawRing = (axis) => {
            ctx.beginPath();
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                let pt = [0, 0, 0];
                if (axis === 'xy') {
                    pt[0] = Math.cos(angle) * radius;
                    pt[1] = Math.sin(angle) * radius;
                } else if (axis === 'xz') {
                    pt[0] = Math.cos(angle) * radius;
                    pt[2] = Math.sin(angle) * radius;
                } else {
                    pt[1] = Math.cos(angle) * radius;
                    pt[2] = Math.sin(angle) * radius;
                }

                const rotated = glm.vec3.create();
                glm.vec3.transformQuat(rotated, pt, q);

                const screen = world3DToScreen({
                    x: center.x + rotated[0],
                    y: center.y - rotated[1],
                    z: (center.z || 0) + rotated[2]
                });
                if (screen) {
                    if (i === 0) ctx.moveTo(screen.x, screen.y);
                    else ctx.lineTo(screen.x, screen.y);
                }
            }
            ctx.stroke();
        };

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        drawRing('xy');
        drawRing('xz');
        drawRing('yz');
    },

    /**
     * Draws a wireframe triangle in 3D.
     */
    drawWireTriangle(ctx, center, size, rotation = {x:0, y:0, z:0}, color = 'rgba(0, 255, 255, 0.8)') {
        const glm = window.glMatrix;
        const hw = size.x / 2;
        const hh = size.y / 2;

        const points = [
            [ 0, hh, 0 ],
            [ -hw, -hh, 0 ],
            [ hw, -hh, 0 ]
        ];

        const q = glm.quat.create();
        glm.quat.fromEuler(q, rotation.x, rotation.y, rotation.z);

        const screenPoints = points.map(p => {
            const rotated = glm.vec3.create();
            glm.vec3.transformQuat(rotated, p, q);
            return world3DToScreen({
                x: center.x + rotated[0],
                y: center.y - rotated[1],
                z: (center.z || 0) + rotated[2]
            });
        });

        if (screenPoints.some(p => p === null)) return;

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
        ctx.lineTo(screenPoints[1].x, screenPoints[1].y);
        ctx.lineTo(screenPoints[2].x, screenPoints[2].y);
        ctx.closePath();
        ctx.stroke();
    },

    /**
     * Draws a wireframe plane in 3D.
     */
    drawWirePlane(ctx, center, size, rotation = {x:0, y:0, z:0}, color = 'rgba(255, 255, 255, 0.5)') {
        const glm = window.glMatrix;
        const hw = size.x / 2;
        const hd = size.z / 2;

        const points = [
            [ -hw, 0, -hd ],
            [ hw, 0, -hd ],
            [ hw, 0, hd ],
            [ -hw, 0, hd ]
        ];

        const q = glm.quat.create();
        glm.quat.fromEuler(q, rotation.x, rotation.y, rotation.z);

        const screenPoints = points.map(p => {
            const rotated = glm.vec3.create();
            glm.vec3.transformQuat(rotated, p, q);
            return world3DToScreen({
                x: center.x + rotated[0],
                y: center.y - rotated[1],
                z: (center.z || 0) + rotated[2]
            });
        });

        if (screenPoints.some(p => p === null)) return;

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
        ctx.lineTo(screenPoints[1].x, screenPoints[1].y);
        ctx.lineTo(screenPoints[2].x, screenPoints[2].y);
        ctx.lineTo(screenPoints[3].x, screenPoints[3].y);
        ctx.closePath();
        ctx.stroke();
    },

    /**
     * Draws a wireframe capsule in 3D.
     */
    drawWireCapsule(ctx, center, radius, height, rotation = {x:0, y:0, z:0}, color = 'rgba(0, 255, 255, 0.8)') {
        const glm = window.glMatrix;
        const hh = height / 2;
        const q = glm.quat.create();
        glm.quat.fromEuler(q, rotation.x, rotation.y, rotation.z);

        // Draw vertical lines
        const drawLine = (lx, lz) => {
            const p1 = [lx, hh, lz];
            const p2 = [lx, -hh, lz];
            const r1 = glm.vec3.create(), r2 = glm.vec3.create();
            glm.vec3.transformQuat(r1, p1, q);
            glm.vec3.transformQuat(r2, p2, q);

            const s1 = world3DToScreen({ x: center.x + r1[0], y: center.y - r1[1], z: (center.z || 0) + r1[2] });
            const s2 = world3DToScreen({ x: center.x + r2[0], y: center.y - r2[1], z: (center.z || 0) + r2[2] });
            if (s1 && s2) {
                ctx.beginPath(); ctx.moveTo(s1.x, s1.y); ctx.lineTo(s2.x, s2.y); ctx.stroke();
            }
        };

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        drawLine(radius, 0); drawLine(-radius, 0); drawLine(0, radius); drawLine(0, -radius);

        // Draw top and bottom spheres (half) - these should ideally be hemi-spheres
        const topCenter = glm.vec3.create();
        glm.vec3.transformQuat(topCenter, [0, hh, 0], q);
        this.drawWireSphere(ctx, { x: center.x + topCenter[0], y: center.y + topCenter[1], z: (center.z || 0) + topCenter[2] }, radius, rotation, color);

        const bottomCenter = glm.vec3.create();
        glm.vec3.transformQuat(bottomCenter, [0, -hh, 0], q);
        this.drawWireSphere(ctx, { x: center.x + bottomCenter[0], y: center.y + bottomCenter[1], z: (center.z || 0) + bottomCenter[2] }, radius, rotation, color);
    },

    /**
     * Draws a 3D icon at a world position.
     */
    drawIcon(ctx, worldPos, iconImg, size = 32) {
        const screen = world3DToScreen(worldPos);
        if (!screen) return;

        ctx.drawImage(iconImg, screen.x - size / 2, screen.y - size / 2, size, size);
    }
};
