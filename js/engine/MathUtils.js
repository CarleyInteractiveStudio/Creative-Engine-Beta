/**
 * @fileoverview Provides utility functions for mathematical and geometrical calculations.
 * Includes vector operations, matrix transformations, and collision detection algorithms.
 */

/**
 * Calculates the world-space vertices of an object's Oriented Bounding Box (OOB).
 */
export function getOOB(materia, explicitPosition = null) {
    const transform = materia.getComponentByName('Transform');
    if (!transform) return null;

    const spriteRenderer = materia.getComponentByName('SpriteRenderer');
    const textureRender = materia.getComponentByName('TextureRender');
    const tilemap = materia.getComponentByName('Tilemap');
    const terreno = materia.getComponentByName('Terreno2D');
    const gyzmo = materia.getComponentByName('Gyzmo');

    let w = 50, h = 50;
    let pivotX = 0.5, pivotY = 0.5;

    if (spriteRenderer && spriteRenderer.sprite && spriteRenderer.sprite.complete && spriteRenderer.sprite.naturalWidth > 0) {
        w = spriteRenderer.sprite.naturalWidth;
        h = spriteRenderer.sprite.naturalHeight;
        pivotX = spriteRenderer.pivot?.x ?? 0.5;
        pivotY = spriteRenderer.pivot?.y ?? 0.5;
        if (spriteRenderer.spriteSheet && spriteRenderer.spriteName && spriteRenderer.spriteSheet.sprites[spriteRenderer.spriteName]) {
            const rect = spriteRenderer.spriteSheet.sprites[spriteRenderer.spriteName].rect;
            if (rect) { w = rect.width; h = rect.height; }
        }
    } else if (textureRender) {
        if (textureRender.shape === 'Circle') { w = textureRender.radius * 2; h = textureRender.radius * 2; }
        else { w = textureRender.width; h = textureRender.height; }
    } else if (tilemap) {
        const grid = materia.parent ? (materia.parent.getComponentByName ? materia.parent.getComponentByName('Grid') : null) : null;
        if (grid) {
            let minCol = Infinity, minRow = Infinity, maxCol = -Infinity, maxRow = -Infinity;
            tilemap.layers.forEach(l => {
                const lw = tilemap.width * grid.cellSize.x;
                const lh = tilemap.height * grid.cellSize.y;
                const lx = l.position.x * lw - lw / 2;
                const ly = l.position.y * lh - lh / 2;
                minCol = Math.min(minCol, lx); minRow = Math.min(minRow, ly);
                maxCol = Math.max(maxCol, lx + lw); maxRow = Math.max(maxRow, ly + lh);
            });
            w = maxCol - minCol; h = maxRow - minRow;
            pivotX = -minCol / (w || 1); pivotY = -minRow / (h || 1);
        }
    } else if (terreno) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        terreno.chunks.forEach(chunk => {
            minX = Math.min(minX, chunk.x); minY = Math.min(minY, chunk.y);
            maxX = Math.max(maxX, chunk.x + terreno.chunkSize); maxY = Math.max(maxY, chunk.y + terreno.chunkSize);
        });
        w = maxX - minX; h = maxY - minY;
        pivotX = -minX / (w || 1); pivotY = -minY / (h || 1);
    } else if (gyzmo && gyzmo.layers && gyzmo.layers.length > 0) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const l of gyzmo.layers) {
            minX = Math.min(minX, l.x - l.width / 2); minY = Math.min(minY, l.y - l.height / 2);
            maxX = Math.max(maxX, l.x + l.width / 2); maxY = Math.max(maxY, l.y + l.height / 2);
        }
        w = maxX - minX; h = maxY - minY;
        pivotX = -minX / (w || 1); pivotY = -minY / (h || 1);
    } else {
        return null;
    }

    const sx = transform.scale.x;
    const sy = transform.scale.y;
    const drawX = -w * pivotX;
    const drawY = -h * pivotY;

    const localCorners = [
        { x: drawX * sx, y: drawY * sy },
        { x: (drawX + w) * sx, y: drawY * sy },
        { x: (drawX + w) * sx, y: (drawY + h) * sy },
        { x: drawX * sx, y: (drawY + h) * sy }
    ];

    const angleRad = transform.rotation * Math.PI / 180;
    const cosA = Math.cos(angleRad), sinA = Math.sin(angleRad);
    const pos = explicitPosition || transform.position;

    return localCorners.map(corner => ({
        x: (corner.x * cosA - corner.y * sinA) + pos.x,
        y: (corner.x * sinA + corner.y * cosA) + pos.y
    }));
}

/**
 * Calculates the world-space Oriented Bounding Box for a camera's view.
 */
export function getCameraViewBox(cameraMateria, aspect) {
    const transform = cameraMateria.getComponentByName('Transform');
    const camera = cameraMateria.getComponentByName('Camera');
    if (!transform || !camera) return null;

    let halfWidth, halfHeight;
    if (camera.projection === 'Orthographic') {
        halfHeight = camera.orthographicSize;
        halfWidth = halfHeight * aspect;
    } else {
        const halfFov = camera.fov * 0.5 * Math.PI / 180;
        halfHeight = Math.tan(halfFov);
        halfWidth = halfHeight * aspect;
    }

    const localCorners = [
        { x: -halfWidth, y: -halfHeight }, { x: halfWidth, y: -halfHeight },
        { x: halfWidth, y: halfHeight }, { x: -halfWidth, y: halfHeight }
    ];

    const angleRad = transform.rotation * Math.PI / 180;
    const cosA = Math.cos(angleRad), sinA = Math.sin(angleRad);

    return localCorners.map(corner => ({
        x: (corner.x * cosA - corner.y * sinA) + transform.x,
        y: (corner.x * sinA + corner.y * cosA) + transform.y
    }));
}

function project(vertices, axis) {
    let min = Infinity, max = -Infinity;
    for (const vertex of vertices) {
        const dotProduct = vertex.x * axis.x + vertex.y * axis.y;
        min = Math.min(min, dotProduct);
        max = Math.max(max, dotProduct);
    }
    return { min, max };
}

function getAxes(vertices) {
    const axes = [];
    for (let i = 0; i < vertices.length; i++) {
        const p1 = vertices[i], p2 = vertices[i + 1] || vertices[0];
        const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
        const normal = { x: -edge.y, y: edge.x };
        const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y);
        if (length > 0) axes.push({ x: normal.x / length, y: normal.y / length });
    }
    return axes;
}

export function checkIntersection(polyA, polyB) {
    if (!polyA || !polyB) return false;
    const axes = [...getAxes(polyA), ...getAxes(polyB)];
    for (const axis of axes) {
        const pA = project(polyA, axis), pB = project(polyB, axis);
        if (pA.max < pB.min || pB.max < pA.min) return false;
    }
    return true;
}

export function getBoundsFromCorners(corners) {
    if (!corners || corners.length === 0) return null;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of corners) {
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
    return { left: minX, right: maxX, top: minY, bottom: maxY };
}

export function quatToEuler(out, q) {
    let x = q[0], y = q[1], z = q[2], w = q[3];
    let x2 = x + x, y2 = y + y, z2 = z + z;
    let xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2;
    out[0] = Math.atan2(yz + wx, 1 - (xx + yy)) * 180 / Math.PI;
    out[1] = Math.asin(Math.max(-1, Math.min(1, wy - xz))) * 180 / Math.PI;
    out[2] = Math.atan2(xy + wz, 1 - (yy + zz)) * 180 / Math.PI;
    return out;
}

export function estimateMateriaMemory(materia) {
    if (!materia) return { individual: 0, total: 0 };
    let individual = 512;
    materia.leyes.forEach(ley => {
        individual += 1024;
        const constructorName = ley.constructor.name;
        if (constructorName === 'SpriteRenderer' || constructorName === 'UIImage' || constructorName === 'TextureRender') {
            const img = ley.sprite || ley.texture;
            if (img && img.complete && img.naturalWidth > 0) individual += img.naturalWidth * img.naturalHeight * 4;
        }
        if (constructorName === 'CreativeScript' || constructorName === 'CustomComponent') {
            if (ley.scriptName && window.CE_Script_Metadata && window.CE_Script_Metadata[ley.scriptName]) {
                individual += (window.CE_Script_Metadata[ley.scriptName].codeLength || 0) * 2;
            }
            if (ley.instance) { try { individual += JSON.stringify(ley.instance).length * 2; } catch(e) {} }
        }
        if (constructorName === 'Tilemap') { ley.layers.forEach(layer => { individual += layer.tileData.size * 128; }); }
    });
    let total = individual;
    materia.children.forEach(child => { total += estimateMateriaMemory(child).total; });
    return { individual, total };
}

export function distance(x1, y1, x2, y2) { return Math.sqrt((x2 - x1)**2 + (y2 - y1)**2); }
export function sin(degrees) { return Math.sin(degrees * Math.PI / 180); }
export function cos(degrees) { return Math.cos(degrees * Math.PI / 180); }

