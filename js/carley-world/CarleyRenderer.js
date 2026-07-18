// CarleyRenderer.js
// Renderizador tridimensional independiente de alto rendimiento para Carley World (WebGL puro).

import { CarleyMath } from './CarleyMath.js';

export class CarleyRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!this.gl) {
            console.error('WebGL no está soportado en este navegador.');
            return;
        }

        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl.clearColor(0.1, 0.1, 0.15, 1.0);
        this.gl.enable(this.gl.DEPTH_TEST);

        this.initShaders();
        this.initBuffers();
    }

    initShaders() {
        const vsSource = `
            attribute vec4 aPosition;
            attribute vec3 aNormal;
            uniform mat4 uModelMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;
            varying vec3 vNormal;
            void main() {
                gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aPosition;
                vNormal = aNormal;
            }
        `;

        const fsSource = `
            precision mediump float;
            varying vec3 vNormal;
            uniform vec4 uColor;
            void main() {
                // Iluminación direccional estática básica
                vec3 normal = normalize(vNormal);
                vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
                float dotProduct = max(dot(normal, lightDir), 0.3);
                gl_FragColor = vec4(uColor.rgb * dotProduct, uColor.a);
            }
        `;

        const vs = this.compileShader(this.gl.VERTEX_SHADER, vsSource);
        const fs = this.compileShader(this.gl.FRAGMENT_SHADER, fsSource);

        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vs);
        this.gl.attachShader(this.program, fs);
        this.gl.linkProgram(this.program);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error('Error al enlazar el programa WebGL:', this.gl.getProgramInfoLog(this.program));
        }

        this.attribs = {
            position: this.gl.getAttribLocation(this.program, 'aPosition'),
            normal: this.gl.getAttribLocation(this.program, 'aNormal')
        };

        this.uniforms = {
            modelMatrix: this.gl.getUniformLocation(this.program, 'uModelMatrix'),
            viewMatrix: this.gl.getUniformLocation(this.program, 'uViewMatrix'),
            projectionMatrix: this.gl.getUniformLocation(this.program, 'uProjectionMatrix'),
            color: this.gl.getUniformLocation(this.program, 'uColor')
        };
    }

    compileShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Error compilando shader:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    initBuffers() {
        // Buffers para Cubo
        const cubeVertices = new Float32Array([
            // Cara Frontal
            -1, -1,  1,   1, -1,  1,   1,  1,  1,  -1,  1,  1,
            // Cara Trasera
            -1, -1, -1,  -1,  1, -1,   1,  1, -1,   1, -1, -1,
            // Cara Superior
            -1,  1, -1,  -1,  1,  1,   1,  1,  1,   1,  1, -1,
            // Cara Inferior
            -1, -1, -1,   1, -1, -1,   1, -1,  1,  -1, -1,  1,
            // Cara Derecha
             1, -1, -1,   1,  1, -1,   1,  1,  1,   1, -1,  1,
            // Cara Izquierda
            -1, -1, -1,  -1, -1,  1,  -1,  1,  1,  -1,  1, -1
        ]);

        const cubeNormals = new Float32Array([
            0, 0, 1,   0, 0, 1,   0, 0, 1,   0, 0, 1,
            0, 0,-1,   0, 0,-1,   0, 0,-1,   0, 0,-1,
            0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0,
            0,-1, 0,   0,-1, 0,   0,-1, 0,   0,-1, 0,
            1, 0, 0,   1, 0, 0,   1, 0, 0,   1, 0, 0,
           -1, 0, 0,  -1, 0, 0,  -1, 0, 0,  -1, 0, 0
        ]);

        const cubeIndices = new Uint16Array([
            0,  1,  2,      0,  2,  3,    // frontal
            4,  5,  6,      4,  6,  7,    // trasera
            8,  9,  10,     8,  10, 11,   // superior
            12, 13, 14,     12, 14, 15,   // inferior
            16, 17, 18,     16, 18, 19,   // derecha
            20, 21, 22,     20, 22, 23    // izquierda
        ]);

        this.cubeBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, cubeVertices, this.gl.STATIC_DRAW);

        this.cubeNormalBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeNormalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, cubeNormals, this.gl.STATIC_DRAW);

        this.cubeIndexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.cubeIndexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, cubeIndices, this.gl.STATIC_DRAW);
    }

    clear() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    resize() {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    renderMateria(materia, viewMatrix, projectionMatrix) {
        const transform = materia.transform;
        if (!transform) return;

        const meshRenderer = materia.meshRenderer;
        if (!meshRenderer) return;

        this.gl.useProgram(this.program);

        // Generar matriz de modelo
        const modelMatrix = CarleyMath.mat4Identity();
        const translationMat = CarleyMath.mat4Identity();
        const rotationMat = CarleyMath.mat4Identity();
        const scaleMat = CarleyMath.mat4Identity();

        CarleyMath.mat4Translation(translationMat, transform.position);
        CarleyMath.mat4RotationYXZ(rotationMat, transform.rotation.x, transform.rotation.y, transform.rotation.z);
        CarleyMath.mat4Scale(scaleMat, transform.scale);

        CarleyMath.mat4Multiply(modelMatrix, translationMat, rotationMat);
        CarleyMath.mat4Multiply(modelMatrix, modelMatrix, scaleMat);

        this.gl.uniformMatrix4fv(this.uniforms.modelMatrix, false, modelMatrix);
        this.gl.uniformMatrix4fv(this.uniforms.viewMatrix, false, viewMatrix);
        this.gl.uniformMatrix4fv(this.uniforms.projectionMatrix, false, projectionMatrix);

        // Convertir color hex a vec4 float
        const colorHex = meshRenderer.color || '#ffffff';
        const r = parseInt(colorHex.substring(1, 3), 16) / 255;
        const g = parseInt(colorHex.substring(3, 5), 16) / 255;
        const b = parseInt(colorHex.substring(5, 7), 16) / 255;
        this.gl.uniform4f(this.uniforms.color, r, g, b, 1.0);

        // Activar atributos de posición y normal
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeBuffer);
        this.gl.enableVertexAttribArray(this.attribs.position);
        this.gl.vertexAttribPointer(this.attribs.position, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeNormalBuffer);
        this.gl.enableVertexAttribArray(this.attribs.normal);
        this.gl.vertexAttribPointer(this.attribs.normal, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.cubeIndexBuffer);
        this.gl.drawElements(this.gl.TRIANGLES, 36, this.gl.UNSIGNED_SHORT, 0);
    }
}
