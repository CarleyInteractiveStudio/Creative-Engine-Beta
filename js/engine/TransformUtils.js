import SceneManager from './SceneManager.js';

function getParent(materia, scene) {
    if (materia.parent === null) {
        return null;
    }
    if (typeof materia.parent === 'object' && materia.parent !== null) {
        return materia.parent;
    }
    if (typeof materia.parent === 'number') {
        return scene.findMateriaById(materia.parent);
    }
    return null;
}

export function getWorldTransform(materia, scene) {
    if (!materia) {
        return {
            position: { x: 0, y: 0 },
            rotation: 0,
            scale: { x: 1, y: 1 }
        };
    }

    let parent = getParent(materia, scene);
    if (parent) {
        const parentTransform = getWorldTransform(parent, scene);
        const localPosition = materia.transform.position;
        const localRotation = materia.transform.rotation;
        const localScale = materia.transform.scale;

        // Apply parent's scale to child's position
        const scaledPosition = {
            x: localPosition.x * parentTransform.scale.x,
            y: localPosition.y * parentTransform.scale.y
        };

        // Apply parent's rotation to child's position
        const angle = parentTransform.rotation * (Math.PI / 180);
        const rotatedPosition = {
            x: scaledPosition.x * Math.cos(angle) - scaledPosition.y * Math.sin(angle),
            y: scaledPosition.x * Math.sin(angle) + scaledPosition.y * Math.cos(angle)
        };

        return {
            position: {
                x: parentTransform.position.x + rotatedPosition.x,
                y: parentTransform.position.y + rotatedPosition.y
            },
            rotation: parentTransform.rotation + localRotation,
            scale: {
                x: parentTransform.scale.x * localScale.x,
                y: parentTransform.scale.y * localScale.y
            }
        };
    } else {
        return {
            position: { ...materia.transform.position },
            rotation: materia.transform.rotation,
            scale: { ...materia.transform.scale }
        };
    }
}

// --- Transformation Inverse ---

export function worldToLocalPosition(worldPosition, materia, scene) {
    if (!materia) {
        return { ...worldPosition };
    }

    const parent = getParent(materia, scene);

    if (!parent) {
        // No parent, world space is local space
        return { ...worldPosition };
    }

    const parentTransform = getWorldTransform(parent, scene);

    // Step 1: Translate the world position to be relative to the parent's origin
    const relativePos = {
        x: worldPosition.x - parentTransform.position.x,
        y: worldPosition.y - parentTransform.position.y
    };

    // Step 2: Apply the inverse of the parent's rotation
    const angle = -parentTransform.rotation * (Math.PI / 180);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const unrotatedPos = {
        x: relativePos.x * cos - relativePos.y * sin,
        y: relativePos.x * sin + relativePos.y * cos
    };

    // Step 3: Apply the inverse of the parent's scale
    const localPos = {
        x: unrotatedPos.x / (parentTransform.scale.x || 1),
        y: unrotatedPos.y / (parentTransform.scale.y || 1)
    };

    return localPos;
}
