// Gizmos.js
// A collection of utility functions to draw gizmos in both 2D and 3D scenes.

import { world3DToScreen } from '../editor/SceneView.js';

export const Gizmos = {
    /**
     * Draws a wireframe cube in 3D space.
     */
    drawWireCube(ctx, center, size, color = 'rgba(0, 255, 255, 0.8)') {
        const hw = size.x / 2;
        const hh = size.y / 2;
        const hd = size.z / 2;

        const points = [
            { x: -hw, y: -hh, z: -hd }, { x: hw, y: -hh, z: -hd }, { x: hw, y: hh, z: -hd }, { x: -hw, y: hh, z: -hd },
            { x: -hw, y: -hh, z: hd }, { x: hw, y: -hh, z: hd }, { x: hw, y: hh, z: hd }, { x: -hw, y: hh, z: hd }
        ];

        const screenPoints = points.map(p => world3DToScreen({
            x: center.x + p.x,
            y: center.y + p.y,
            z: (center.z || 0) + p.z
        }));

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
    drawWireSphere(ctx, center, radius, color = 'rgba(0, 255, 255, 0.8)') {
        const segments = 16;

        const drawRing = (axis) => {
            ctx.beginPath();
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                let pt = { x: 0, y: 0, z: 0 };
                if (axis === 'xy') {
                    pt.x = Math.cos(angle) * radius;
                    pt.y = Math.sin(angle) * radius;
                } else if (axis === 'xz') {
                    pt.x = Math.cos(angle) * radius;
                    pt.z = Math.sin(angle) * radius;
                } else {
                    pt.y = Math.cos(angle) * radius;
                    pt.z = Math.sin(angle) * radius;
                }

                const screen = world3DToScreen({
                    x: center.x + pt.x,
                    y: center.y + pt.y,
                    z: (center.z || 0) + pt.z
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
    drawWireTriangle(ctx, center, size, color = 'rgba(0, 255, 255, 0.8)') {
        const hw = size.x / 2;
        const hh = size.y / 2;

        const points = [
            { x: 0, y: hh, z: 0 },
            { x: -hw, y: -hh, z: 0 },
            { x: hw, y: -hh, z: 0 }
        ];

        const screenPoints = points.map(p => world3DToScreen({
            x: center.x + p.x,
            y: center.y + p.y,
            z: (center.z || 0) + p.z
        }));

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
    drawWirePlane(ctx, center, size, color = 'rgba(255, 255, 255, 0.5)') {
        const hw = size.x / 2;
        const hd = size.z / 2;

        const points = [
            { x: -hw, y: 0, z: -hd },
            { x: hw, y: 0, z: -hd },
            { x: hw, y: 0, z: hd },
            { x: -hw, y: 0, z: hd }
        ];

        const screenPoints = points.map(p => world3DToScreen({
            x: center.x + p.x,
            y: center.y,
            z: (center.z || 0) + p.z
        }));

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
    drawWireCapsule(ctx, center, radius, height, color = 'rgba(0, 255, 255, 0.8)') {
        const hh = height / 2;

        // Draw vertical lines
        const drawLine = (lx, lz) => {
            const p1 = world3DToScreen({ x: center.x + lx, y: center.y + hh, z: (center.z || 0) + lz });
            const p2 = world3DToScreen({ x: center.x + lx, y: center.y - hh, z: (center.z || 0) + lz });
            if (p1 && p2) {
                ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
            }
        };

        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        drawLine(radius, 0); drawLine(-radius, 0); drawLine(0, radius); drawLine(0, -radius);

        // Draw top and bottom spheres (half)
        this.drawWireSphere(ctx, { x: center.x, y: center.y + hh, z: center.z }, radius, color);
        this.drawWireSphere(ctx, { x: center.x, y: center.y - hh, z: center.z }, radius, color);
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
