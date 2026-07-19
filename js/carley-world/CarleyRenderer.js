// CarleyRenderer.js
// Renderizador tridimensional independiente de alto rendimiento para Carley World (WebGL puro).
// Incorpora un sistema de sombreado Blinn-Phong completo, soporte para múltiples luces, mapas de sombras, materiales emisores incandescentes (materialLuz3d) y rejilla/ejes 3D nativos.

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
        this.gl.clearColor(0.08, 0.08, 0.12, 1.0);
        this.gl.enable(this.gl.DEPTH_TEST);

        this.initialized = true;

        this.initShaders();
        this.initBuffers();
        this.initShadowBuffer();
        this.initGridAndAxes();
    }

    init() {
        this.initialized = true;
    }

    pick(scene, camera, mouseX, mouseY, options) {
        return null;
    }

    render(scene, camera, options) {
        if (window.currentCarleyWorld) {
            if (options && options.editorCamera) {
                // Sincronizar posición y rotación de la cámara del editor con el mundo Carley
                window.currentCarleyWorld.cameraPosition = {
                    x: options.editorCamera.x || 0,
                    y: options.editorCamera.y || 0,
                    z: options.editorCamera.z !== undefined ? options.editorCamera.z : 500
                };
                if (options.editorCamera.rotation) {
                    window.currentCarleyWorld.cameraRotation = {
                        x: options.editorCamera.rotation.x || 0,
                        y: options.editorCamera.rotation.y || 0,
                        z: options.editorCamera.rotation.z || 0
                    };
                }
            }
            window.currentCarleyWorld.render();
        }
    }

    initShaders() {
        // Vertex Shader principal
        const vsSource = `
            attribute vec4 aPosition;
            attribute vec3 aNormal;
            uniform mat4 uModelMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;
            uniform mat4 uLightSpaceMatrix;

            varying vec3 vNormal;
            varying vec3 vFragPos;
            varying vec4 vPositionLightSpace;

            void main() {
                vFragPos = vec3(uModelMatrix * aPosition);
                vNormal = mat3(uModelMatrix) * aNormal;
                vPositionLightSpace = uLightSpaceMatrix * uModelMatrix * aPosition;
                gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aPosition;
            }
        `;

        // Fragment Shader principal (Blinn-Phong + Shadows + Emissive Light Material)
        const fsSource = `
            precision mediump float;
            varying vec3 vNormal;
            varying vec3 vFragPos;
            varying vec4 vPositionLightSpace;

            uniform vec4 uColor;
            uniform vec3 uCameraPos;

            uniform vec3 uLightDir;
            uniform vec3 uLightColor;
            uniform float uLightIntensity;

            uniform int uIsLightMaterial;
            uniform vec3 uEmissiveColor;
            uniform float uEmissiveIntensity;

            uniform sampler2D uShadowMap;

            float calculateShadow(vec4 fragPosLightSpace) {
                vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
                projCoords = projCoords * 0.5 + 0.5;
                if(projCoords.z > 1.0) return 0.0;
                float closestDepth = texture2D(uShadowMap, projCoords.xy).r;
                float currentDepth = projCoords.z;
                float bias = 0.005;
                float shadow = currentDepth - bias > closestDepth  ? 1.0 : 0.0;
                return shadow;
            }

            void main() {
                if (uIsLightMaterial == 1) {
                    gl_FragColor = vec4(uEmissiveColor * uEmissiveIntensity, uColor.a);
                    return;
                }

                vec3 norm = normalize(vNormal);
                vec3 lightDir = normalize(-uLightDir);

                vec3 ambient = 0.15 * uLightColor;

                float diff = max(dot(norm, lightDir), 0.0);
                vec3 diffuse = diff * uLightColor * uLightIntensity;

                vec3 viewDir = normalize(uCameraPos - vFragPos);
                vec3 halfwayDir = normalize(lightDir + viewDir);
                float spec = pow(max(dot(norm, halfwayDir), 0.0), 32.0);
                vec3 specular = 0.5 * spec * uLightColor;

                float shadow = calculateShadow(vPositionLightSpace);
                vec3 lighting = (ambient + (1.0 - shadow) * (diffuse + specular)) * uColor.rgb;

                gl_FragColor = vec4(lighting, uColor.a);
            }
        `;

        // Shader de profundidad para sombras
        const vsShadowSource = `
            attribute vec4 aPosition;
            uniform mat4 uLightSpaceMatrix;
            uniform mat4 uModelMatrix;
            void main() {
                gl_Position = uLightSpaceMatrix * uModelMatrix * aPosition;
            }
        `;

        const fsShadowSource = `
            precision mediump float;
            void main() {
                gl_FragColor = vec4(gl_FragCoord.z, gl_FragCoord.z, gl_FragCoord.z, 1.0);
            }
        `;

        // Shader para dibujar líneas (Rejilla y Ejes)
        const vsLineSource = `
            attribute vec4 aPosition;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;
            void main() {
                gl_Position = uProjectionMatrix * uViewMatrix * aPosition;
            }
        `;

        const fsLineSource = `
            precision mediump float;
            uniform vec4 uColor;
            void main() {
                gl_FragColor = uColor;
            }
        `;

        // Compilar programas
        const vs = this.compileShader(this.gl.VERTEX_SHADER, vsSource);
        const fs = this.compileShader(this.gl.FRAGMENT_SHADER, fsSource);
        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vs);
        this.gl.attachShader(this.program, fs);
        this.gl.linkProgram(this.program);

        const vsShadow = this.compileShader(this.gl.VERTEX_SHADER, vsShadowSource);
        const fsShadow = this.compileShader(this.gl.FRAGMENT_SHADER, fsShadowSource);
        this.shadowProgram = this.gl.createProgram();
        this.gl.attachShader(this.shadowProgram, vsShadow);
        this.gl.attachShader(this.shadowProgram, fsShadow);
        this.gl.linkProgram(this.shadowProgram);

        const vsLine = this.compileShader(this.gl.VERTEX_SHADER, vsLineSource);
        const fsLine = this.compileShader(this.gl.FRAGMENT_SHADER, fsLineSource);
        this.lineProgram = this.gl.createProgram();
        this.gl.attachShader(this.lineProgram, vsLine);
        this.gl.attachShader(this.lineProgram, fsLine);
        this.gl.linkProgram(this.lineProgram);

        // Ubicaciones de atributos y uniformes principales
        this.attribs = {
            position: this.gl.getAttribLocation(this.program, 'aPosition'),
            normal: this.gl.getAttribLocation(this.program, 'aNormal')
        };

        this.uniforms = {
            modelMatrix: this.gl.getUniformLocation(this.program, 'uModelMatrix'),
            viewMatrix: this.gl.getUniformLocation(this.program, 'uViewMatrix'),
            projectionMatrix: this.gl.getUniformLocation(this.program, 'uProjectionMatrix'),
            lightSpaceMatrix: this.gl.getUniformLocation(this.program, 'uLightSpaceMatrix'),
            color: this.gl.getUniformLocation(this.program, 'uColor'),
            cameraPos: this.gl.getUniformLocation(this.program, 'uCameraPos'),
            lightDir: this.gl.getUniformLocation(this.program, 'uLightDir'),
            lightColor: this.gl.getUniformLocation(this.program, 'uLightColor'),
            lightIntensity: this.gl.getUniformLocation(this.program, 'uLightIntensity'),
            shadowMap: this.gl.getUniformLocation(this.program, 'uShadowMap'),
            isLightMaterial: this.gl.getUniformLocation(this.program, 'uIsLightMaterial'),
            emissiveColor: this.gl.getUniformLocation(this.program, 'uEmissiveColor'),
            emissiveIntensity: this.gl.getUniformLocation(this.program, 'uEmissiveIntensity')
        };

        // Sombras
        this.shadowAttribs = {
            position: this.gl.getAttribLocation(this.shadowProgram, 'aPosition')
        };

        this.shadowUniforms = {
            lightSpaceMatrix: this.gl.getUniformLocation(this.shadowProgram, 'uLightSpaceMatrix'),
            modelMatrix: this.gl.getUniformLocation(this.shadowProgram, 'uModelMatrix')
        };

        // Líneas
        this.lineAttribs = {
            position: this.gl.getAttribLocation(this.lineProgram, 'aPosition')
        };

        this.lineUniforms = {
            viewMatrix: this.gl.getUniformLocation(this.lineProgram, 'uViewMatrix'),
            projectionMatrix: this.gl.getUniformLocation(this.lineProgram, 'uProjectionMatrix'),
            color: this.gl.getUniformLocation(this.lineProgram, 'uColor')
        };
    }

    initBuffers() {
        const cubeVertices = new Float32Array([
            -1, -1,  1,   1, -1,  1,   1,  1,  1,  -1,  1,  1,
            -1, -1, -1,  -1,  1, -1,   1,  1, -1,   1, -1, -1,
            -1,  1, -1,  -1,  1,  1,   1,  1,  1,   1,  1, -1,
            -1, -1, -1,   1, -1, -1,   1, -1,  1,  -1, -1,  1,
             1, -1, -1,   1,  1, -1,   1,  1,  1,   1, -1,  1,
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
            0,  1,  2,      0,  2,  3,
            4,  5,  6,      4,  6,  7,
            8,  9,  10,     8,  10, 11,
            12, 13, 14,     12, 14, 15,
            16, 17, 18,     16, 18, 19,
            20, 21, 22,     20, 22, 23
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

    initShadowBuffer() {
        this.shadowSize = 1024;
        this.shadowFramebuffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.shadowFramebuffer);

        this.shadowTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.shadowTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.shadowSize, this.shadowSize, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.shadowDepthBuffer = this.gl.createRenderbuffer();
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.shadowDepthBuffer);
        this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, this.shadowSize, this.shadowSize);

        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.shadowTexture, 0);
        this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.shadowDepthBuffer);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    initGridAndAxes() {
        // Generar vértices de la rejilla (20x20 líneas en plano XZ)
        const gridVertices = [];
        const size = 1000;
        const step = 100;
        for (let i = -size; i <= size; i += step) {
            gridVertices.push(i, 0, -size,   i, 0, size);
            gridVertices.push(-size, 0, i,   size, 0, i);
        }

        this.gridCount = gridVertices.length / 3;
        this.gridBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gridBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(gridVertices), this.gl.STATIC_DRAW);

        // Generar ejes coordenados (Rojo=X, Verde=Y, Azul=Z)
        const axesVertices = [
            0, 0, 0,   300, 0, 0, // X
            0, 0, 0,   0, 300, 0, // Y
            0, 0, 0,   0, 0, 300  // Z
        ];

        this.axesBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axesBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(axesVertices), this.gl.STATIC_DRAW);
    }

    beginShadowPass(lightSpaceMatrix) {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.shadowFramebuffer);
        this.gl.viewport(0, 0, this.shadowSize, this.shadowSize);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        this.gl.useProgram(this.shadowProgram);
        this.gl.uniformMatrix4fv(this.shadowUniforms.lightSpaceMatrix, false, lightSpaceMatrix);
    }

    renderMateriaShadow(materia) {
        const transform = materia.transform;
        if (!transform) return;
        if (materia.getLawByName('CarleyMaterialLuz')) return;

        const modelMatrix = CarleyMath.mat4Identity();
        const translationMat = CarleyMath.mat4Identity();
        const rotationMat = CarleyMath.mat4Identity();
        const scaleMat = CarleyMath.mat4Identity();

        CarleyMath.mat4Translation(translationMat, transform.position);
        CarleyMath.mat4RotationYXZ(rotationMat, transform.rotation.x, transform.rotation.y, transform.rotation.z);
        CarleyMath.mat4Scale(scaleMat, transform.scale);

        CarleyMath.mat4Multiply(modelMatrix, translationMat, rotationMat);
        CarleyMath.mat4Multiply(modelMatrix, modelMatrix, scaleMat);

        this.gl.uniformMatrix4fv(this.shadowUniforms.modelMatrix, false, modelMatrix);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cubeBuffer);
        this.gl.enableVertexAttribArray(this.shadowAttribs.position);
        this.gl.vertexAttribPointer(this.shadowAttribs.position, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.cubeIndexBuffer);
        this.gl.drawElements(this.gl.TRIANGLES, 36, this.gl.UNSIGNED_SHORT, 0);
    }

    endShadowPass() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.resize();
    }

    drawGridAndAxes(viewMatrix, projectionMatrix) {
        this.gl.useProgram(this.lineProgram);
        this.gl.uniformMatrix4fv(this.lineUniforms.viewMatrix, false, viewMatrix);
        this.gl.uniformMatrix4fv(this.lineUniforms.projectionMatrix, false, projectionMatrix);

        // 1. Dibujar Rejilla (Gris tenue)
        this.gl.uniform4f(this.lineUniforms.color, 0.3, 0.3, 0.35, 1.0);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gridBuffer);
        this.gl.enableVertexAttribArray(this.lineAttribs.position);
        this.gl.vertexAttribPointer(this.lineAttribs.position, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.LINES, 0, this.gridCount);

        // 2. Dibujar Ejes de Coordenadas
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axesBuffer);
        this.gl.vertexAttribPointer(this.lineAttribs.position, 3, this.gl.FLOAT, false, 0, 0);

        // Eje X (Rojo)
        this.gl.uniform4f(this.lineUniforms.color, 1.0, 0.2, 0.2, 1.0);
        this.gl.drawArrays(this.gl.LINES, 0, 2);

        // Eje Y (Verde)
        this.gl.uniform4f(this.lineUniforms.color, 0.2, 1.0, 0.2, 1.0);
        this.gl.drawArrays(this.gl.LINES, 2, 2);

        // Eje Z (Azul)
        this.gl.uniform4f(this.lineUniforms.color, 0.2, 0.2, 1.0, 1.0);
        this.gl.drawArrays(this.gl.LINES, 4, 2);
    }

    renderMateria(materia, viewMatrix, projectionMatrix, lightSpaceMatrix, cameraPos, light) {
        const transform = materia.transform;
        if (!transform) return;

        const meshRenderer = materia.meshRenderer;
        if (!meshRenderer) return;

        this.gl.useProgram(this.program);

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
        this.gl.uniformMatrix4fv(this.uniforms.lightSpaceMatrix, false, lightSpaceMatrix);

        const colorHex = meshRenderer.color || '#ffffff';
        const r = parseInt(colorHex.substring(1, 3), 16) / 255;
        const g = parseInt(colorHex.substring(3, 5), 16) / 255;
        const b = parseInt(colorHex.substring(5, 7), 16) / 255;
        this.gl.uniform4f(this.uniforms.color, r, g, b, 1.0);

        const lightMaterial = materia.getLawByName('CarleyMaterialLuz');
        if (lightMaterial) {
            this.gl.uniform1i(this.uniforms.isLightMaterial, 1);
            const mColorHex = lightMaterial.color || '#ffaa00';
            const mr = parseInt(mColorHex.substring(1, 3), 16) / 255;
            const mg = parseInt(mColorHex.substring(3, 5), 16) / 255;
            const mb = parseInt(mColorHex.substring(5, 7), 16) / 255;
            this.gl.uniform3f(this.uniforms.emissiveColor, mr, mg, mb);
            this.gl.uniform1f(this.uniforms.emissiveIntensity, lightMaterial.intensity);
        } else {
            this.gl.uniform1i(this.uniforms.isLightMaterial, 0);
        }

        this.gl.uniform3f(this.uniforms.cameraPos, cameraPos.x, cameraPos.y, cameraPos.z);

        const lightDir = light ? light.direction : { x: -0.5, y: -1.0, z: -0.3 };
        const lightColorHex = light ? light.color : '#ffffff';
        const lr = parseInt(lightColorHex.substring(1, 3), 16) / 255;
        const lg = parseInt(lightColorHex.substring(3, 5), 16) / 255;
        const lb = parseInt(lightColorHex.substring(5, 7), 16) / 255;
        const lightIntensity = light ? light.intensity : 1.0;

        this.gl.uniform3f(this.uniforms.lightDir, lightDir.x, lightDir.y, lightDir.z);
        this.gl.uniform3f(this.uniforms.lightColor, lr, lg, lb);
        this.gl.uniform1f(this.uniforms.lightIntensity, lightIntensity);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.shadowTexture);
        this.gl.uniform1i(this.uniforms.shadowMap, 0);

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
