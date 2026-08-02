// CarleyMath.js
// Funciones y utilidades matemáticas 3D independientes para matrices, vectores y quateriones.

export const CarleyMath = {
    // Generar matriz identidad 4x4
    mat4Identity() {
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ]);
    },

    // Multiplicar dos matrices 4x4
    mat4Multiply(out, a, b) {
        // Envolver glMatrix de forma segura si está disponible
        if (window.glMatrix) {
            window.glMatrix.mat4.multiply(out, a, b);
            return out;
        }

        // JS fallback multiplication
        for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
                let sum = 0;
                for (let k = 0; k < 4; k++) {
                    sum += a[i * 4 + k] * b[k * 4 + j];
                }
                out[i * 4 + j] = sum;
            }
        }
        return out;
    },

    // Crear matriz de traslación
    mat4Translation(out, v) {
        out.set(CarleyMath.mat4Identity());
        out[12] = v.x || v[0] || 0;
        out[13] = v.y || v[1] || 0;
        out[14] = v.z || v[2] || 0;
        return out;
    },

    // Crear matriz de escala
    mat4Scale(out, v) {
        out.set(CarleyMath.mat4Identity());
        out[0] = v.x !== undefined ? v.x : (v[0] !== undefined ? v[0] : 1);
        out[5] = v.y !== undefined ? v.y : (v[1] !== undefined ? v[1] : 1);
        out[10] = v.z !== undefined ? v.z : (v[2] !== undefined ? v[2] : 1);
        return out;
    },

    // Crear matriz de rotación Euler (Y, X, Z)
    mat4RotationYXZ(out, degX, degY, degZ) {
        const radX = degX * Math.PI / 180;
        const radY = degY * Math.PI / 180;
        const radZ = degZ * Math.PI / 180;

        const cx = Math.cos(radX), sx = Math.sin(radX);
        const cy = Math.cos(radY), sy = Math.sin(radY);
        const cz = Math.cos(radZ), sz = Math.sin(radZ);

        out.set(CarleyMath.mat4Identity());

        // Multiplied rotation matrices: R_y * R_x * R_z
        out[0] = cy * cz + sy * sx * sz;
        out[1] = cz * sy * sx - cy * sz;
        out[2] = cx * sy;

        out[4] = cx * sz;
        out[5] = cx * cz;
        out[6] = -sx;

        out[8] = cy * sx * sz - cz * sy;
        out[9] = cy * cz * sx + sy * sz;
        out[10] = cy * cx;

        return out;
    },

    // Crear matriz de rotación alrededor de X (Pitch)
    mat4RotationX(out, deg) {
        const rad = deg * Math.PI / 180;
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        out.set(CarleyMath.mat4Identity());
        out[5] = c;
        out[6] = s;
        out[9] = -s;
        out[10] = c;
        return out;
    },

    // Crear matriz de rotación alrededor de Y (Yaw)
    mat4RotationY(out, deg) {
        const rad = deg * Math.PI / 180;
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        out.set(CarleyMath.mat4Identity());
        out[0] = c;
        out[2] = -s;
        out[8] = s;
        out[10] = c;
        return out;
    },

    // Crear matriz de rotación para cámara sin roll/tilt (pitch, yaw) usando multiplicación robusta
    mat4RotationPitchYaw(out, degX, degY) {
        const rotX = CarleyMath.mat4Identity();
        const rotY = CarleyMath.mat4Identity();
        CarleyMath.mat4RotationX(rotX, degX);
        CarleyMath.mat4RotationY(rotY, degY);
        CarleyMath.mat4Multiply(out, rotX, rotY);
        return out;
    },

    // Crear matriz de perspectiva
    mat4Perspective(out, fov, aspect, near, far) {
        const f = 1.0 / Math.tan(fov * Math.PI / 360);
        const nf = 1 / (near - far);
        out.fill(0);
        out[0] = f / aspect;
        out[5] = f;
        out[10] = (far + near) * nf;
        out[11] = -1;
        out[14] = (2 * far * near) * nf;
        return out;
    }
};
