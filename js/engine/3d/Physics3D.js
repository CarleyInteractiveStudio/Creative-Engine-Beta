// js/engine/3d/Physics3D.js
// Independent Physics system for the 3D Engine.

export class Physics3D {
    constructor(scene) {
        this.scene = scene;
    }

    update(deltaTime, subSteps = 4) {}

    raycast3D(origin, direction, maxDistance = Infinity) {
        const glm = window.glMatrix;
        if (!glm) return null;

        let closestHit = null;
        const materias = this.scene.getAllMaterias();

        for (const materia of materias) {
            if (!materia.isActive) continue;

            const box = materia.getComponent('BoxCollider3D');
            const sphere = materia.getComponent('SphereCollider3D');
            const capsule = materia.getComponent('CapsuleCollider3D');
            const plane = materia.getComponent('PlaneCollider3D');
            const terrain = materia.getComponent('Terreno3D');

            if (!box && !sphere && !capsule && !plane && !terrain) continue;

            let hit = null;
            if (box) hit = this._rayVsBox3D(origin, direction, materia, box);
            else if (sphere) hit = this._rayVsSphere3D(origin, direction, materia, sphere);
            else if (capsule) hit = this._rayVsCapsule3D(origin, direction, materia, capsule);
            else if (plane) hit = this._rayVsPlane3D(origin, direction, materia, plane);
            else if (terrain) hit = this._rayVsTerrain3D(origin, direction, materia, terrain);

            if (hit && hit.distance <= maxDistance) {
                if (!closestHit || hit.distance < closestHit.distance) {
                    closestHit = { ...hit, materia: materia };
                }
            }
        }
        return closestHit;
    }

    _rayVsSphere3D(origin, direction, materia, collider) {
        const glm = window.glMatrix;
        const transform = materia.getComponent('Transform3D');
        if (!transform) return null;
        const center = [transform.position.x + collider.offset.x, transform.position.y + collider.offset.y, transform.position.z + collider.offset.z];
        const radius = collider.radius * Math.max(transform.scale.x, transform.scale.y, transform.scale.z);
        const oc = glm.vec3.subtract(glm.vec3.create(), [origin.x, origin.y, origin.z], center);
        const a = glm.vec3.dot([direction.x, direction.y, direction.z], [direction.x, direction.y, direction.z]);
        const b = 2.0 * glm.vec3.dot(oc, [direction.x, direction.y, direction.z]);
        const c = glm.vec3.dot(oc, oc) - radius * radius;
        const disc = b * b - 4 * a * c;
        if (disc < 0) return null;
        const t = (-b - Math.sqrt(disc)) / (2.0 * a);
        if (t < 0) return null;
        const hitPoint = { x: origin.x + direction.x * t, y: origin.y + direction.y * t, z: origin.z + direction.z * t };
        const normal = glm.vec3.normalize(glm.vec3.create(), glm.vec3.subtract(glm.vec3.create(), [hitPoint.x, hitPoint.y, hitPoint.z], center));
        return { distance: t, point: hitPoint, normal: { x: normal[0], y: normal[1], z: normal[2] } };
    }

    _rayVsBox3D(origin, direction, materia, collider) {
        const glm = window.glMatrix;
        const transform = materia.getComponent('Transform3D');
        if (!transform) return null;
        const invWorld = glm.mat4.invert(glm.mat4.create(), transform.worldMatrix);
        const localOrigin = glm.vec3.transformMat4(glm.vec3.create(), [origin.x, origin.y, origin.z], invWorld);
        glm.vec3.subtract(localOrigin, localOrigin, [collider.offset.x, collider.offset.y, collider.offset.z]);
        const localDir = glm.vec3.transformMat3(glm.vec3.create(), [direction.x, direction.y, direction.z], glm.mat3.fromMat4(glm.mat3.create(), invWorld));
        glm.vec3.normalize(localDir, localDir);
        const half = [collider.size.x / 2, collider.size.y / 2, collider.size.z / 2];
        let tmin = -Infinity, tmax = Infinity, normalIdx = -1;
        for (let i = 0; i < 3; i++) {
            if (Math.abs(localDir[i]) > 1e-6) {
                let t1 = (-half[i] - localOrigin[i]) / localDir[i];
                let t2 = (half[i] - localOrigin[i]) / localDir[i];
                if (t1 > t2) [t1, t2] = [t2, t1];
                if (t1 > tmin) { tmin = t1; normalIdx = i; }
                tmax = Math.min(tmax, t2);
            } else if (localOrigin[i] < -half[i] || localOrigin[i] > half[i]) return null;
        }
        if (tmax >= tmin && tmax >= 0) {
            const t = tmin > 0 ? tmin : 0;
            const hitPoint = { x: origin.x + direction.x * t, y: origin.y + direction.y * t, z: origin.z + direction.z * t };
            const localNormal = [0, 0, 0];
            localNormal[normalIdx] = localOrigin[normalIdx] < 0 ? -1 : 1;
            const worldNormal = glm.vec3.transformMat3(glm.vec3.create(), localNormal, glm.mat3.fromMat4(glm.mat3.create(), transform.worldMatrix));
            glm.vec3.normalize(worldNormal, worldNormal);
            return { distance: t, point: hitPoint, normal: { x: worldNormal[0], y: worldNormal[1], z: worldNormal[2] } };
        }
        return null;
    }

    _rayVsTerrain3D(origin, direction, materia, terrain, maxDistance = 10000) {
        const glm = window.glMatrix;
        const transform = materia.getComponent('Transform3D');
        if (!transform) return null;
        const invMat = glm.mat4.invert(glm.mat4.create(), transform.worldMatrix);
        const localOrigin = glm.vec3.transformMat4(glm.vec3.create(), [origin.x, origin.y, origin.z], invMat);
        const localDir = glm.vec3.transformMat3(glm.vec3.create(), [direction.x, direction.y, direction.z], glm.mat3.fromMat4(glm.mat3.create(), invMat));
        glm.vec3.normalize(localDir, localDir);
        const step = (terrain.size.x / terrain.resolution) * 0.5;
        for (let d = 0; d < maxDistance; d += step) {
            const p = [localOrigin[0] + localDir[0] * d, localOrigin[1] + localDir[1] * d, localOrigin[2] + localDir[2] * d];
            const gridX = ((p[0] + terrain.size.x / 2) / terrain.size.x) * terrain.resolution;
            const gridZ = ((p[2] + terrain.size.z / 2) / terrain.size.z) * terrain.resolution;
            if (gridX >= 0 && gridX < terrain.resolution && gridZ >= 0 && gridZ < terrain.resolution) {
                const ix = Math.floor(gridX), iz = Math.floor(gridZ), h = terrain.getHeight(ix, iz);
                if (p[1] <= h) {
                    const worldHit = glm.vec3.transformMat4(glm.vec3.create(), p, transform.worldMatrix);
                    const hl = terrain.getHeight(ix - 1, iz), hr = terrain.getHeight(ix + 1, iz), hd = terrain.getHeight(ix, iz - 1), hu = terrain.getHeight(ix, iz + 1);
                    const localNormal = glm.vec3.normalize(glm.vec3.create(), [hl - hr, 2.0, hd - hu]);
                    const worldNormal = glm.vec3.transformMat3(glm.vec3.create(), localNormal, glm.mat3.fromMat4(glm.mat3.create(), transform.worldMatrix));
                    glm.vec3.normalize(worldNormal, worldNormal);
                    return { point: { x: worldHit[0], y: worldHit[1], z: worldHit[2] }, normal: { x: worldNormal[0], y: worldNormal[1], z: worldNormal[2] }, distance: d };
                }
            }
        }
        return null;
    }

    _rayVsPlane3D(origin, direction, materia, collider) {
        const glm = window.glMatrix;
        const transform = materia.getComponent('Transform3D');
        if (!transform) return null;
        const normal = glm.vec3.fromValues(transform.worldMatrix[4], transform.worldMatrix[5], transform.worldMatrix[6]);
        glm.vec3.normalize(normal, normal);
        const center = [transform.position.x + collider.offset.x, transform.position.y + collider.offset.y, transform.position.z + collider.offset.z];
        const denom = glm.vec3.dot(normal, [direction.x, direction.y, direction.z]);
        if (Math.abs(denom) > 1e-6) {
            const t = glm.vec3.dot(glm.vec3.subtract(glm.vec3.create(), center, [origin.x, origin.y, origin.z]), normal) / denom;
            if (t >= 0) {
                const hitPoint = { x: origin.x + direction.x * t, y: origin.y + direction.y * t, z: origin.z + direction.z * t };
                return { distance: t, point: hitPoint, normal: { x: normal[0], y: normal[1], z: normal[2] } };
            }
        }
        return null;
    }

    _rayVsCapsule3D(origin, direction, materia, collider) {
        const cap = this._getCapsuleData3D(materia);
        if (!cap) return null;
        const glm = window.glMatrix;
        const ba = glm.vec3.subtract(glm.vec3.create(), cap.p2, cap.p1), oa = glm.vec3.subtract(glm.vec3.create(), [origin.x, origin.y, origin.z], cap.p1);
        const baba = glm.vec3.dot(ba, ba), bard = glm.vec3.dot(ba, [direction.x, direction.y, direction.z]), baoa = glm.vec3.dot(ba, oa);
        const k2 = baba - bard * bard, k1 = baba * glm.vec3.dot(oa, [direction.x, direction.y, direction.z]) - baoa * bard, k0 = baba * glm.vec3.dot(oa, oa) - baoa * baoa - cap.radius * cap.radius * baba;
        const h = k1 * k1 - k2 * k0;
        if (h < 0.0) return null;
        let t = (-k1 - Math.sqrt(h)) / k2;
        const y = baoa + t * bard;
        if (y > 0.0 && y < baba) {
            const hitPoint = { x: origin.x + direction.x * t, y: origin.y + direction.y * t, z: origin.z + direction.z * t };
            const n = glm.vec3.subtract(glm.vec3.create(), [hitPoint.x, hitPoint.y, hitPoint.z], cap.p1);
            glm.vec3.scaleAndAdd(n, n, ba, -y / baba);
            glm.vec3.normalize(n, n);
            return { distance: t, point: hitPoint, normal: { x: n[0], y: n[1], z: n[2] } };
        }
        return null;
    }

    _getCapsuleData3D(materia) {
        const glm = window.glMatrix;
        const transform = materia.getComponent('Transform3D'), collider = materia.getComponent('CapsuleCollider3D');
        if (!transform || !collider) return null;
        const radius = collider.radius * Math.max(transform.scale.x, transform.scale.z), halfHeight = (collider.height * transform.scale.y) / 2 - radius;
        const p1 = [0, -halfHeight, 0], p2 = [0, halfHeight, 0];
        if (collider.direction === 'X') { p1[0] = -halfHeight; p1[1] = 0; p2[0] = halfHeight; p2[1] = 0; }
        else if (collider.direction === 'Z') { p1[2] = -halfHeight; p1[1] = 0; p2[2] = halfHeight; p2[1] = 0; }
        return { p1: glm.vec3.transformMat4(glm.vec3.create(), p1, transform.worldMatrix), p2: glm.vec3.transformMat4(glm.vec3.create(), p2, transform.worldMatrix), radius };
    }
}
