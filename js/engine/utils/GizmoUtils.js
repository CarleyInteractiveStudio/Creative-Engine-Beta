
export function _drawShapeForGizmo(ctx, gizmo, width, height, drawMode = 'fill') {
    // The caller is responsible for setting color, alpha, and line width.
    ctx.beginPath();

    switch (gizmo.shape) {
        case 'Rectangle':
            ctx.rect(-width / 2, -height / 2, width, height);
            break;
        case 'Circle':
            {
                const radius = Math.min(width, height) / 2;
                ctx.arc(0, 0, radius, 0, 2 * Math.PI);
                break;
            }
        case 'Capsule':
            {
                const radius = Math.min(width, height) / 2;
                if (width > height) { // Horizontal
                    const rectWidth = width - height;
                    ctx.arc(-rectWidth / 2, 0, radius, Math.PI / 2, -Math.PI / 2, false);
                    ctx.arc(rectWidth / 2, 0, radius, -Math.PI / 2, Math.PI / 2, false);
                } else { // Vertical
                    const rectHeight = height - width;
                    ctx.arc(0, -rectHeight / 2, radius, Math.PI, 0, false);
                    ctx.arc(0, rectHeight / 2, radius, 0, Math.PI, false);
                }
                ctx.closePath();
                break;
            }
        case 'Triangle':
            {
                ctx.moveTo(0, -height / 2); // Top point
                ctx.lineTo(width / 2, height / 2); // Bottom right
                ctx.lineTo(-width / 2, height / 2); // Bottom left
                ctx.closePath();
                break;
            }
    }

    // Execute the drawing command based on the mode
    if (drawMode === 'fill') {
        ctx.fill();
    } else {
        ctx.stroke();
    }
}
