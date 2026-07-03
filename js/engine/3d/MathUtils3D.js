// js/engine/3d/MathUtils3D.js
// 3D Math Utilities specialized for the 3D Engine.

export function createWorldMatrix(position, rotation, scale, glm) {
    const out = glm.mat4.create();
    glm.mat4.fromRotationTranslationScale(
        out,
        glm.quat.fromEuler(glm.quat.create(), rotation.x, rotation.y, rotation.z),
        [position.x, position.y, position.z],
        [scale.x, scale.y, scale.z]
    );
    return out;
}

export function getAABB3D(materia) {
    const glm = window.glMatrix;
    if (!glm) return null;
    let min = [Infinity, Infinity, Infinity];
    let max = [-Infinity, -Infinity, -Infinity];
    let found = false;
    materia.traverse(m => {
        const mesh = m.getComponentByName('MeshRenderer3D') || m.getComponentByName('SkinnedMeshRenderer3D') || m.getComponentByName('Terreno3D');
        if (mesh && mesh.cpuPositions) {
            const wm = m.getComponentByName('Transform3D')?.worldMatrix || glm.mat4.create();
            for (let i = 0; i < mesh.cpuPositions.length; i += 3) {
                const local = [mesh.cpuPositions[i], mesh.cpuPositions[i+1], mesh.cpuPositions[i+2]];
                const world = glm.vec3.transformMat4(glm.vec3.create(), local, wm);
                glm.vec3.min(min, min, world);
                glm.vec3.max(max, max, world);
                found = true;
            }
        }
    });
    if (!found) return null;
    return { min, max, center: glm.vec3.scale(glm.vec3.create(), glm.vec3.add(glm.vec3.create(), min, max), 0.5) };
}
