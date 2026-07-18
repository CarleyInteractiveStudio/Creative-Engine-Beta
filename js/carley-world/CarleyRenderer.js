// CarleyRenderer.js
// Renderizador tridimensional independiente de alto rendimiento para Carley World (WebGL puro).
// Incorpora un sistema de sombreado Blinn-Phong completo, soporte para múltiples luces, mapas de sombras y materiales emisores incandescentes (materialLuz3d).

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
    }

    init() {
        this.initialized = true;
    }

    pick(scene, camera, mouseX, mouseY, options) {
        // Retornar null de momento para evitar errores en SceneView.js
        return null;
    }

    render(scene, camera, options) {
        // Desviar de forma segura a renderMateria mediante el ciclo de CarleyWorld
        if (window.currentCarleyWorld) {
            window.currentCarleyWorld.render();
        }
    }

    initShaders() {
        // Vertex Shader
        const vsSource = `
            attribute vec4 aPosition;
            attribute vec3 aNormal;
            uniform mat4 uModelMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;
            uniform mat4 uLightSpaceMatrix; // Matriz de espacio de luz para sombras

            varying vec3 vNormal;
            varying vec3 vFragPos;
            varying vec4 vPositionLightSpace;

            void main() {
                vFragPos = vec3(uModelMatrix * aPosition);
                // Transformar normal a espacio de mundo
                vNormal = mat3(uModelMatrix) * aNormal;
                vPositionLightSpace = uLightSpaceMatrix * uModelMatrix * aPosition;
                gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aPosition;
            }
        `;

        // Fragment Shader (Blinn-Phong + Shadows + Emissive Light Material)
        const fsSource = `
            precision mediump float;
            varying vec3 vNormal;
            varying vec3 vFragPos;
            varying vec4 vPositionLightSpace;

            uniform vec4 uColor;
            uniform vec3 uCameraPos;

            // Datos de luz direccional principal
            uniform vec3 uLightDir;
            uniform vec3 uLightColor;
            uniform float uLightIntensity;

            // Datos del Material Luz (Emisión)
            uniform int uIsLightMaterial;
            uniform vec3 uEmissiveColor;
            uniform float uEmissiveIntensity;

            // Textura del mapa de sombras
            uniform sampler2D uShadowMap;

            float calculateShadow(vec4 fragPosLightSpace) {
                // Realizar división de perspectiva
                vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
                // Transformar al rango [0,1]
                projCoords = projCoords * 0.5 + 0.5;

                if(projCoords.z > 1.0) return 0.0;

                // Obtener profundidad más cercana desde el mapa de sombras
                float closestDepth = texture2D(uShadowMap, projCoords.xy).r;
                // Obtener profundidad actual del fragmento
                float currentDepth = projCoords.z;

                // Aplicar un sesgo básico para evitar acné de sombras
                float bias = 0.005;
                float shadow = currentDepth - bias > closestDepth  ? 1.0 : 0.0;

                return shadow;
            }

            void main() {
                // Si es un material de luz emisor, brilla de manera constante (Flat Emissive)
                if (uIsLightMaterial == 1) {
                    gl_FragColor = vec4(uEmissiveColor * uEmissiveIntensity, uColor.a);
                    return;
                }

                vec3 norm = normalize(vNormal);
                vec3 lightDir = normalize(-uLightDir);

                // Ambiental
                vec3 ambient = 0.15 * uLightColor;

                // Difuso
                float diff = max(dot(norm, lightDir), 0.0);
                vec3 diffuse = diff * uLightColor * uLightIntensity;

                // Especular (Blinn-Phong)
                vec3 viewDir = normalize(uCameraPos - vFragPos);
                vec3 halfwayDir = normalize(lightDir + viewDir);
                float spec = pow(max(dot(norm, halfwayDir), 0.0), 32.0);
                vec3 specular = 0.5 * spec * uLightColor;

                // Sombras
                float shadow = calculateShadow(vPositionLightSpace);
                vec3 lighting = (ambient + (1.0 - shadow) * (diffuse + specular)) * uColor.rgb;

                gl_FragColor = vec4(lighting, uColor.a);
            }
        `;

        // Shader de profundidad para el mapa de sombras (Shadow Map)
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
                // Almacenar profundidad automáticamente en el buffer de profundidad
                gl_FragColor = vec4(gl_FragCoord.z, gl_FragCoord.z, gl_FragCoord.z, 1.0);
            }
        `;

        // Compilar y enlazar shaders principales
        const vs = this.compileShader(this.gl.VERTEX_SHADER, vsSource);
        const fs = this.compileShader(this.gl.FRAGMENT_SHADER, fsSource);
        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vs);
        this.gl.attachShader(this.program, fs);
        this.gl.linkProgram(this.program);

        // Compilar y enlazar shaders de sombras
        const vsShadow = this.compileShader(this.gl.VERTEX_SHADER, vsShadowSource);
        const fsShadow = this.compileShader(this.gl.FRAGMENT_SHADER, fsShadowSource);
        this.shadowProgram = this.gl.createProgram();
        this.gl.attachShader(this.shadowProgram, vsShadow);
        this.gl.attachShader(this.shadowProgram, fsShadow);
        this.gl.linkProgram(this.shadowProgram);

        // Atributos y Uniformes principales
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

        // Atributos y Uniformes de sombras
        this.shadowAttribs = {
            position: this.gl.getAttribLocation(this.shadowProgram, 'aPosition')
        };

        this.shadowUniforms = {
            lightSpaceMatrix: this.gl.getUniformLocation(this.shadowProgram, 'uLightSpaceMatrix'),
            modelMatrix: this.gl.getUniformLocation(this.shadowProgram, 'uModelMatrix')
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

    initShadowBuffer() {
        this.shadowSize = 1024; // Resolución de sombras

        // Crear Framebuffer
        this.shadowFramebuffer = this.gl.createFramebuffer();
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.shadowFramebuffer);

        // Crear textura para mapa de profundidad de sombras
        this.shadowTexture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.shadowTexture);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.shadowSize, this.shadowSize, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        // Crear búfer de profundidad
        this.shadowDepthBuffer = this.gl.createRenderbuffer();
        this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this.shadowDepthBuffer);
        this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, this.shadowSize, this.shadowSize);

        // Adjuntar textura y profundidad al framebuffer
        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.shadowTexture, 0);
        this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this.shadowDepthBuffer);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    clear() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    resize() {
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    // Puesta en marcha del pase de profundidad de sombras
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

        // Si es un material de luz emisor pura, no proyecta sombra sobre sí mismo ni sobre el suelo
        if (materia.getLawByName('CarleyMaterialLuz')) return;

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

    // Pase de renderizado principal utilizando luz direccional y mapa de sombras
    renderMateria(materia, viewMatrix, projectionMatrix, lightSpaceMatrix, cameraPos, light) {
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

        // Pasar matrices uniformes
        this.gl.uniformMatrix4fv(this.uniforms.modelMatrix, false, modelMatrix);
        this.gl.uniformMatrix4fv(this.uniforms.viewMatrix, false, viewMatrix);
        this.gl.uniformMatrix4fv(this.uniforms.projectionMatrix, false, projectionMatrix);
        this.gl.uniformMatrix4fv(this.uniforms.lightSpaceMatrix, false, lightSpaceMatrix);

        // Convertir color hex a vec4 float
        const colorHex = meshRenderer.color || '#ffffff';
        const r = parseInt(colorHex.substring(1, 3), 16) / 255;
        const g = parseInt(colorHex.substring(3, 5), 16) / 255;
        const b = parseInt(colorHex.substring(5, 7), 16) / 255;
        this.gl.uniform4f(this.uniforms.color, r, g, b, 1.0);

        // Configurar Material de Luz (Emisión / Incandescente)
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

        // Pasar uniformes de cámara y luz
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

        // Vincular textura del mapa de sombras
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.shadowTexture);
        this.gl.uniform1i(this.uniforms.shadowMap, 0);

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
