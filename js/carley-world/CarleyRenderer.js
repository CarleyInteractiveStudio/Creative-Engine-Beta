// CarleyRenderer.js
// Renderizador tridimensional independiente de alto rendimiento para Carley World (WebGL puro).
// Incorpora un sistema de sombreado Blinn-Phong completo, soporte para múltiples luces, mapas de sombras, materiales emisores incandescentes (materialLuz3d), rejilla/ejes 3D nativos y geometría de primitivas generadas procedimentalmente (Cubo, Esfera, Cápsula, Plano, Triángulo).

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
        this.lastProjectionMatrix = CarleyMath.mat4Identity();
        this.lastViewMatrix = CarleyMath.mat4Identity();

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

    clear() {
        if (this.gl) {
            this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        }
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
            // Sync matrices to the outer renderer instance as well to prevent identity matrix overwrite
            this.lastProjectionMatrix = window.currentCarleyWorld.renderer.lastProjectionMatrix;
            this.lastViewMatrix = window.currentCarleyWorld.renderer.lastViewMatrix;
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

        // Shader para dibujar líneas (Rejilla y Ejes) con desvanecimiento por distancia (sin swizzling de atributos para máxima compatibilidad WebGL)
        const vsLineSource = `
            attribute vec4 aPosition;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;
            varying vec3 vWorldPos;

            void main() {
                gl_Position = uProjectionMatrix * uViewMatrix * aPosition;
                vWorldPos = aPosition.xyz;
            }
        `;

        const fsLineSource = `
            precision mediump float;
            uniform vec4 uColor;
            uniform vec3 uCameraPos;
            uniform float uMaxDist;
            varying vec3 vWorldPos;

            void main() {
                float dx = vWorldPos.x - uCameraPos.x;
                float dz = vWorldPos.z - uCameraPos.z;
                float dist = sqrt(dx * dx + dz * dz);
                float fade = 1.0 - clamp(dist / uMaxDist, 0.0, 1.0);
                gl_FragColor = vec4(uColor.rgb, uColor.a * fade);
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
            color: this.gl.getUniformLocation(this.lineProgram, 'uColor'),
            cameraPos: this.gl.getUniformLocation(this.lineProgram, 'uCameraPos'),
            maxDist: this.gl.getUniformLocation(this.lineProgram, 'uMaxDist')
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
        // --- 1. BUFERES DEL CUBO ---
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

        // --- 2. BUFERES DE LA ESFERA (BOLA REDONDA) procedimental ---
        const sphereVerts = [];
        const sphereNormals = [];
        const sphereIndices = [];
        const latBands = 16;
        const longBands = 16;

        for (let lat = 0; lat <= latBands; lat++) {
            const theta = lat * Math.PI / latBands;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);

            for (let lon = 0; lon <= longBands; lon++) {
                const phi = lon * 2 * Math.PI / longBands;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);

                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;

                sphereNormals.push(x, y, z);
                sphereVerts.push(x, y, z); // radio 1
            }
        }

        for (let lat = 0; lat < latBands; lat++) {
            for (let lon = 0; lon < longBands; lon++) {
                const first = (lat * (longBands + 1)) + lon;
                const second = first + longBands + 1;
                sphereIndices.push(first, second, first + 1);
                sphereIndices.push(second, second + 1, first + 1);
            }
        }

        this.sphereCount = sphereIndices.length;
        this.sphereBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sphereBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(sphereVerts), this.gl.STATIC_DRAW);

        this.sphereNormalBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.sphereNormalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(sphereNormals), this.gl.STATIC_DRAW);

        this.sphereIndexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.sphereIndexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sphereIndices), this.gl.STATIC_DRAW);

        // --- 3. BUFERES DE LA CAPSULA procedimental ---
        const capsuleVerts = [];
        const capsuleNormals = [];
        const capsuleIndices = [];
        const capSegments = 12;
        const capRings = 12;
        const capR = 0.6;
        const capH = 1.0;

        for (let i = 0; i <= capRings; i++) {
            const lat = (i / capRings) * Math.PI;
            const sinLat = Math.sin(lat);
            const cosLat = Math.cos(lat);
            const yOffset = cosLat > 0 ? capH : -capH;

            for (let j = 0; j <= capSegments; j++) {
                const lon = (j / capSegments) * 2 * Math.PI;
                const sinLon = Math.sin(lon);
                const cosLon = Math.cos(lon);

                const x = cosLon * sinLat;
                const y = cosLat;
                const z = sinLon * sinLat;

                capsuleNormals.push(x, y, z);
                capsuleVerts.push(capR * x, capR * y + yOffset, capR * z);
            }
        }

        for (let i = 0; i < capRings; i++) {
            for (let j = 0; j < capSegments; j++) {
                const first = (i * (capSegments + 1)) + j;
                const second = first + capSegments + 1;
                capsuleIndices.push(first, second, first + 1);
                capsuleIndices.push(second, second + 1, first + 1);
            }
        }

        this.capsuleCount = capsuleIndices.length;
        this.capsuleBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.capsuleBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(capsuleVerts), this.gl.STATIC_DRAW);

        this.capsuleNormalBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.capsuleNormalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(capsuleNormals), this.gl.STATIC_DRAW);

        this.capsuleIndexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.capsuleIndexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(capsuleIndices), this.gl.STATIC_DRAW);

        // --- 4. BUFERES DEL PLANO (QUAD) ---
        const planeVertices = new Float32Array([
            -1, 0,  1,   1, 0,  1,   1, 0, -1,  -1, 0, -1
        ]);
        const planeNormals = new Float32Array([
            0, 1, 0,   0, 1, 0,   0, 1, 0,   0, 1, 0
        ]);
        const planeIndices = new Uint16Array([
            0, 1, 2,   0, 2, 3
        ]);

        this.planeBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.planeBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, planeVertices, this.gl.STATIC_DRAW);

        this.planeNormalBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.planeNormalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, planeNormals, this.gl.STATIC_DRAW);

        this.planeIndexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.planeIndexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, planeIndices, this.gl.STATIC_DRAW);

        // --- 5. BUFERES DEL TRIANGULO ---
        const triangleVertices = new Float32Array([
            0,  1, 0,  -1, -1, 0,   1, -1, 0
        ]);
        const triangleNormals = new Float32Array([
            0, 0, 1,   0, 0, 1,   0, 0, 1
        ]);
        const triangleIndices = new Uint16Array([
            0, 1, 2
        ]);

        this.triangleBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.triangleBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, triangleVertices, this.gl.STATIC_DRAW);

        this.triangleNormalBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.triangleNormalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, triangleNormals, this.gl.STATIC_DRAW);

        this.triangleIndexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.triangleIndexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, triangleIndices, this.gl.STATIC_DRAW);
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
        const gridVertices = [];
        const majorGridVertices = [];
        const size = 15000; // Large size to simulate "infinite"
        const step = 100;

        for (let i = -size; i <= size; i += step) {
            if (i % 1000 === 0) {
                majorGridVertices.push(i, 0, -size,   i, 0, size);
                majorGridVertices.push(-size, 0, i,   size, 0, i);
            } else {
                gridVertices.push(i, 0, -size,   i, 0, size);
                gridVertices.push(-size, 0, i,   size, 0, i);
            }
        }

        this.gridCount = gridVertices.length / 3;
        this.gridBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.gridBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(gridVertices), this.gl.STATIC_DRAW);

        this.majorGridCount = majorGridVertices.length / 3;
        this.majorGridBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.majorGridBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(majorGridVertices), this.gl.STATIC_DRAW);

        const axesVertices = [];
        const ranges = [
            -10000000, -1000000, -100000, -10000, -1000, -500, -200, -100, -50, -20, -10, -5, 0,
            5, 10, 20, 50, 100, 200, 500, 1000, 10000, 100000, 1000000, 10000000
        ];

        // Eje X (Rojo) - 24 segmentos (48 vértices), dibujado ligeramente por encima del grid (Y = 0.01) para evitar Z-fighting
        for (let r = 0; r < ranges.length - 1; r++) {
            axesVertices.push(ranges[r], 0.01, 0,   ranges[r+1], 0.01, 0);
        }
        // Eje Y (Verde) - 24 segmentos (48 vértices)
        for (let r = 0; r < ranges.length - 1; r++) {
            axesVertices.push(0.01, ranges[r], 0.01,   0.01, ranges[r+1], 0.01);
        }
        // Eje Z (Azul) - 24 segmentos (48 vértices), dibujado a Y = 0.01
        for (let r = 0; r < ranges.length - 1; r++) {
            axesVertices.push(0, 0.01, ranges[r],   0, 0.01, ranges[r+1]);
        }

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
        const transform = materia.transform || materia.getComponentByName?.('Transform') || materia.getComponent?.('Transform');
        if (!transform) return;
        if (materia.getLawByName?.('CarleyMaterialLuz') || materia.getComponentByName?.('MaterialLuz3D') || materia.getComponent?.('MaterialLuz3D')) return;

        const meshRenderer = materia.meshRenderer ||
                             materia.getComponentByName?.('MeshRenderer3D') ||
                             materia.getComponentByName?.('SkinnedMeshRenderer3D') ||
                             materia.getComponent?.('MeshRenderer3D') ||
                             materia.getComponent?.('SkinnedMeshRenderer3D');
        if (!meshRenderer) return;

        const modelMatrix = CarleyMath.mat4Identity();
        const translationMat = CarleyMath.mat4Identity();
        const rotationMat = CarleyMath.mat4Identity();
        const scaleMat = CarleyMath.mat4Identity();

        const pos = transform.position || { x: transform.x || 0, y: transform.y || 0, z: transform.z || 0 };

        let rot = { x: 0, y: 0, z: 0 };
        if (transform.rotation && typeof transform.rotation === 'object') {
            rot = { x: transform.rotation.x || 0, y: transform.rotation.y || 0, z: transform.rotation.z || 0 };
        } else {
            rot = {
                x: transform.rotationX !== undefined ? transform.rotationX : 0,
                y: transform.rotationY !== undefined ? transform.rotationY : 0,
                z: transform.rotationZ !== undefined ? transform.rotationZ : (transform.rotation || 0)
            };
        }

        const scl = transform.scale || { x: transform.scaleX || 1, y: transform.scaleY || 1, z: transform.scaleZ || 1 };

        CarleyMath.mat4Translation(translationMat, pos);
        CarleyMath.mat4RotationYXZ(rotationMat, rot.x, rot.y, rot.z);
        CarleyMath.mat4Scale(scaleMat, scl);

        CarleyMath.mat4Multiply(modelMatrix, translationMat, rotationMat);
        CarleyMath.mat4Multiply(modelMatrix, modelMatrix, scaleMat);

        this.gl.uniformMatrix4fv(this.shadowUniforms.modelMatrix, false, modelMatrix);

        // Seleccionar buffer según tipo de malla para la sombra
        let vBuffer = this.cubeBuffer;
        let iBuffer = this.cubeIndexBuffer;
        let count = 36;

        const meshType = meshRenderer.meshType;
        if (meshType === 'Sphere') {
            vBuffer = this.sphereBuffer;
            iBuffer = this.sphereIndexBuffer;
            count = this.sphereCount;
        } else if (meshType === 'Capsule') {
            vBuffer = this.capsuleBuffer;
            iBuffer = this.capsuleIndexBuffer;
            count = this.capsuleCount;
        } else if (meshType === 'Plane') {
            vBuffer = this.planeBuffer;
            iBuffer = this.planeIndexBuffer;
            count = 6;
        } else if (meshType === 'Triangle') {
            vBuffer = this.triangleBuffer;
            iBuffer = this.triangleIndexBuffer;
            count = 3;
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vBuffer);
        this.gl.enableVertexAttribArray(this.shadowAttribs.position);
        this.gl.vertexAttribPointer(this.shadowAttribs.position, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, iBuffer);
        this.gl.drawElements(this.gl.TRIANGLES, count, this.gl.UNSIGNED_SHORT, 0);
    }

    endShadowPass() {
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
        this.resize();
    }

    resize() {
        if (this.canvas && this.gl) {
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    drawGridAndAxes(viewMatrix, projectionMatrix) {
        // Obtener coordenadas de la cámara
        let camX = 0;
        let camY = 500;
        let camZ = 0;

        if (window.currentCarleyWorld) {
            camX = window.currentCarleyWorld.cameraPosition.x || 0;
            camY = Math.abs(window.currentCarleyWorld.cameraPosition.y || 0);
            camZ = window.currentCarleyWorld.cameraPosition.z || 0;
        }

        this.gl.useProgram(this.lineProgram);
        this.gl.uniformMatrix4fv(this.lineUniforms.viewMatrix, false, viewMatrix);
        this.gl.uniformMatrix4fv(this.lineUniforms.projectionMatrix, false, projectionMatrix);
        this.gl.uniform3f(this.lineUniforms.cameraPos, camX, camY, camZ);

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        // Rejilla adaptativa y sin fin estilo Unity (LOD Grid scaling)
        const logY = Math.log10(Math.max(10, camY / 2));
        const floorLog = Math.floor(logY);
        const fraction = logY - floorLog;

        const fineStep = Math.pow(10, floorLog);
        const coarseStep = fineStep * 10;

        // Opacidad máxima de la cuadrícula
        const maxOpacity = 0.50;

        // El grid fino se desvanece de maxOpacity a 0 según nos alejamos (fraction de 0 a 1)
        const opacityFine = maxOpacity * (1.0 - fraction);

        // El grid grueso aparece de 0 a maxOpacity según nos alejamos (fraction de 0 a 1)
        const opacityCoarse = maxOpacity * fraction;

        // Generar líneas de rejilla fina centradas en la cámara (LOD fino)
        const gridVertices = [];
        const N = 150; // Más líneas para que se extienda sin fin y cubra todo el frustum de la cámara
        const centerX = Math.round(camX / fineStep) * fineStep;
        const centerZ = Math.round(camZ / fineStep) * fineStep;

        const baseK_X = Math.round(centerX / fineStep);
        const baseK_Z = Math.round(centerZ / fineStep);

        for (let i = -N; i <= N; i++) {
            const x = centerX + i * fineStep;
            const z = centerZ + i * fineStep;

            // Evitar dibujar líneas que coinciden con el grid grueso para prevenir parpadeo (Z-fighting)
            const isXMajor = Math.abs(baseK_X + i) % 10 === 0;
            const isZMajor = Math.abs(baseK_Z + i) % 10 === 0;

            if (!isZMajor) {
                gridVertices.push(centerX - N * fineStep, 0, z,   centerX + N * fineStep, 0, z);
            }
            if (!isXMajor) {
                gridVertices.push(x, 0, centerZ - N * fineStep,   x, 0, centerZ + N * fineStep);
            }
        }

        if (!this.dynamicGridBuffer) {
            this.dynamicGridBuffer = this.gl.createBuffer();
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.dynamicGridBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(gridVertices), this.gl.DYNAMIC_DRAW);

        // Establecer la distancia máxima para el desvanecimiento del grid fino (funde a 0 antes del borde físico)
        this.gl.uniform1f(this.lineUniforms.maxDist, N * fineStep * 0.9);
        this.gl.uniform4f(this.lineUniforms.color, 0.25, 0.25, 0.28, opacityFine);
        this.gl.enableVertexAttribArray(this.lineAttribs.position);
        this.gl.vertexAttribPointer(this.lineAttribs.position, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.LINES, 0, gridVertices.length / 3);

        // Generar líneas de rejilla gruesa centradas en la cámara (LOD grueso)
        const majorGridVertices = [];
        const M = 150; // Más líneas para mayor alcance sin cortes
        const coarseCenterX = Math.round(camX / coarseStep) * coarseStep;
        const coarseCenterZ = Math.round(camZ / coarseStep) * coarseStep;

        for (let i = -M; i <= M; i++) {
            const x = coarseCenterX + i * coarseStep;
            const z = coarseCenterZ + i * coarseStep;

            // Dibujado a Y = 0.005 para evitar Z-fighting con el grid fino (Y = 0.0) y con los ejes (Y = 0.01)
            majorGridVertices.push(coarseCenterX - M * coarseStep, 0.005, z,   coarseCenterX + M * coarseStep, 0.005, z);
            majorGridVertices.push(x, 0.005, coarseCenterZ - M * coarseStep,   x, 0.005, coarseCenterZ + M * coarseStep);
        }

        if (!this.dynamicMajorGridBuffer) {
            this.dynamicMajorGridBuffer = this.gl.createBuffer();
        }
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.dynamicMajorGridBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(majorGridVertices), this.gl.DYNAMIC_DRAW);

        // Establecer la distancia máxima para el desvanecimiento del grid grueso (funde a 0 antes del borde físico)
        this.gl.uniform1f(this.lineUniforms.maxDist, M * coarseStep * 0.9);
        this.gl.uniform4f(this.lineUniforms.color, 0.28, 0.28, 0.32, opacityCoarse);
        this.gl.enableVertexAttribArray(this.lineAttribs.position);
        this.gl.vertexAttribPointer(this.lineAttribs.position, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.LINES, 0, majorGridVertices.length / 3);

        // Dibujar ejes infinitos (sin desvanecimiento prematuro)
        this.gl.uniform1f(this.lineUniforms.maxDist, 10000000.0);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.axesBuffer);
        this.gl.vertexAttribPointer(this.lineAttribs.position, 3, this.gl.FLOAT, false, 0, 0);

        // Eje X (Rojo) - 24 segmentos (48 vértices)
        this.gl.uniform4f(this.lineUniforms.color, 1.0, 0.2, 0.2, 1.0);
        this.gl.drawArrays(this.gl.LINES, 0, 48);

        // Eje Y (Verde) - 24 segmentos (48 vértices)
        this.gl.uniform4f(this.lineUniforms.color, 0.2, 1.0, 0.2, 1.0);
        this.gl.drawArrays(this.gl.LINES, 48, 48);

        // Eje Z (Azul) - 24 segmentos (48 vértices)
        this.gl.uniform4f(this.lineUniforms.color, 0.2, 0.2, 1.0, 1.0);
        this.gl.drawArrays(this.gl.LINES, 96, 48);
    }

    renderMateria(materia, viewMatrix, projectionMatrix, lightSpaceMatrix, cameraPos, light) {
        const transform = materia.transform || materia.getComponentByName?.('Transform') || materia.getComponent?.('Transform');
        if (!transform) return;

        const meshRenderer = materia.meshRenderer ||
                             materia.getComponentByName?.('MeshRenderer3D') ||
                             materia.getComponentByName?.('SkinnedMeshRenderer3D') ||
                             materia.getComponent?.('MeshRenderer3D') ||
                             materia.getComponent?.('SkinnedMeshRenderer3D');
        if (!meshRenderer) return;

        this.gl.useProgram(this.program);

        const modelMatrix = CarleyMath.mat4Identity();
        const translationMat = CarleyMath.mat4Identity();
        const rotationMat = CarleyMath.mat4Identity();
        const scaleMat = CarleyMath.mat4Identity();

        const pos = transform.position || { x: transform.x || 0, y: transform.y || 0, z: transform.z || 0 };

        let rot = { x: 0, y: 0, z: 0 };
        if (transform.rotation && typeof transform.rotation === 'object') {
            rot = { x: transform.rotation.x || 0, y: transform.rotation.y || 0, z: transform.rotation.z || 0 };
        } else {
            rot = {
                x: transform.rotationX !== undefined ? transform.rotationX : 0,
                y: transform.rotationY !== undefined ? transform.rotationY : 0,
                z: transform.rotationZ !== undefined ? transform.rotationZ : (transform.rotation || 0)
            };
        }

        const scl = transform.scale || { x: transform.scaleX || 1, y: transform.scaleY || 1, z: transform.scaleZ || 1 };

        CarleyMath.mat4Translation(translationMat, pos);
        CarleyMath.mat4RotationYXZ(rotationMat, rot.x, rot.y, rot.z);
        CarleyMath.mat4Scale(scaleMat, scl);

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

        const lightMaterial = materia.getLawByName?.('CarleyMaterialLuz') ||
                              materia.getComponentByName?.('MaterialLuz3D') ||
                              materia.getComponent?.('MaterialLuz3D');
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

        // Seleccionar buffer según tipo de malla para el dibujo final
        let vBuffer = this.cubeBuffer;
        let nBuffer = this.cubeNormalBuffer;
        let iBuffer = this.cubeIndexBuffer;
        let count = 36;

        const meshType = meshRenderer.meshType;
        if (meshType === 'Sphere') {
            vBuffer = this.sphereBuffer;
            nBuffer = this.sphereNormalBuffer;
            iBuffer = this.sphereIndexBuffer;
            count = this.sphereCount;
        } else if (meshType === 'Capsule') {
            vBuffer = this.capsuleBuffer;
            nBuffer = this.capsuleNormalBuffer;
            iBuffer = this.capsuleIndexBuffer;
            count = this.capsuleCount;
        } else if (meshType === 'Plane') {
            vBuffer = this.planeBuffer;
            nBuffer = this.planeNormalBuffer;
            iBuffer = this.planeIndexBuffer;
            count = 6;
        } else if (meshType === 'Triangle') {
            vBuffer = this.triangleBuffer;
            nBuffer = this.triangleNormalBuffer;
            iBuffer = this.triangleIndexBuffer;
            count = 3;
        }

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vBuffer);
        this.gl.enableVertexAttribArray(this.attribs.position);
        this.gl.vertexAttribPointer(this.attribs.position, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, nBuffer);
        this.gl.enableVertexAttribArray(this.attribs.normal);
        this.gl.vertexAttribPointer(this.attribs.normal, 3, this.gl.FLOAT, false, 0, 0);

        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, iBuffer);
        this.gl.drawElements(this.gl.TRIANGLES, count, this.gl.UNSIGNED_SHORT, 0);
    }
}
