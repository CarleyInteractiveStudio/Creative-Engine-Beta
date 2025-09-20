import * as SceneManager from './SceneManager.js';
import { Camera, Transform, SpriteRenderer, Light } from './Components.js';
import { createMat4, ortho, translateMat4, rotateMat4, scaleMat4 } from './MathUtils.js';

export class WebGLRenderer {
    constructor(canvas, isEditor = false) {
        this.canvas = canvas;
        this.gl = this.canvas.getContext('webgl');
        this.isEditor = isEditor;

        if (!this.gl) {
            console.error("WebGL no es soportado.");
            return;
        }

        const gl = this.gl;
        gl.clearColor(0.1, 0.15, 0.2, 1.0);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.DEPTH_TEST);

        // --- Lighting Shader ---
        const lightingVsSource = `
            attribute vec4 aVertexPosition;
            attribute vec2 aTextureCoord;
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            varying highp vec2 vTextureCoord;
            varying highp vec3 vWorldPosition; // Pass world position to fragment shader
            void main(void) {
                // Calculate world position
                vec4 worldPos = uModelViewMatrix * aVertexPosition;
                vWorldPosition = worldPos.xyz;

                gl_Position = uProjectionMatrix * worldPos;
                vTextureCoord = aTextureCoord;
            }
        `;
        const lightingFsSource = `
            precision mediump float;
            varying highp vec2 vTextureCoord;
            varying highp vec3 vWorldPosition;

            uniform sampler2D uDiffuseSampler;
            uniform sampler2D uNormalSampler;

            uniform vec3 uLightPos;
            uniform vec4 uLightColor; // w component is intensity
            uniform vec4 uAmbientColor;
            uniform bool uHasNormalMap;

            void main(void) {
                vec4 diffuseColor = texture2D(uDiffuseSampler, vTextureCoord);

                vec3 normal = uHasNormalMap
                    ? normalize(texture2D(uNormalSampler, vTextureCoord).rgb * 2.0 - 1.0)
                    : vec3(0.0, 0.0, 1.0);

                // Calculate lighting
                vec3 lightDir = normalize(uLightPos - vWorldPosition);
                float diff = max(dot(normal, lightDir), 0.0);
                vec3 lighting = uAmbientColor.rgb * uAmbientColor.a + (uLightColor.rgb * uLightColor.a * diff);

                gl_FragColor = vec4(diffuseColor.rgb * lighting, diffuseColor.a);
            }
        `;
        this.lightingProgramInfo = this._createProgramInfo(lightingVsSource, lightingFsSource,
            ['aVertexPosition', 'aTextureCoord'],
            ['uProjectionMatrix', 'uModelViewMatrix', 'uDiffuseSampler', 'uNormalSampler', 'uLightPos', 'uLightColor', 'uAmbientColor', 'uHasNormalMap']
        );

        // --- Gizmo/Line Shader ---
        const gizmoVsSource = `
            attribute vec4 aVertexPosition;
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            void main() {
                gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
            }
        `;
        const gizmoFsSource = `
            precision mediump float;
            uniform vec4 uColor;
            void main() {
                gl_FragColor = uColor;
            }
        `;
        this.gizmoProgramInfo = this._createProgramInfo(gizmoVsSource, gizmoFsSource,
            ['aVertexPosition'],
            ['uProjectionMatrix', 'uModelViewMatrix', 'uColor']
        );


        this.spriteBuffer = this._initSpriteBuffers();

        if (this.isEditor) {
            this.camera = { x: 0, y: 0, zoom: 1.0, effectiveZoom: 1.0 };
        } else {
            this.camera = null; // In game mode, camera is provided by the scene.
        }

        this.resize();
    }

    resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        if (this.gl) {
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    clear() {
        if (this.gl) {
            this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        }
    }

    /**
     * Draws the full scene with multi-pass forward lighting.
     */
    drawScene(materias, lights, camera, config) {
        const gl = this.gl;
        if (!gl || !camera) return;
        this.clear();

        // Create projection matrix from camera
        const projectionMatrix = createMat4();
        const halfW = (gl.canvas.width / 2) / camera.effectiveZoom;
        const halfH = (gl.canvas.height / 2) / camera.effectiveZoom;
        ortho(projectionMatrix, -halfW, halfH, -halfH, halfH, -1, 100);
        translateMat4(projectionMatrix, projectionMatrix, [-camera.x, -camera.y, 0]);

        const programInfo = this.lightingProgramInfo;
        gl.useProgram(programInfo.program);

        // --- 1. Ambient Pass ---
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        // Set a default ambient light. This could come from scene settings later.
        const ambientColor = config.ambientLightColor || [0.1, 0.1, 0.15, 1.0];
        gl.uniform4fv(programInfo.uniformLocations.uAmbientColor, ambientColor);
        // Turn off directional light for this pass
        gl.uniform4fv(programInfo.uniformLocations.uLightColor, [0, 0, 0, 0]);

        for (const materia of materias) {
            this.drawSprite(materia, programInfo, projectionMatrix);
        }

        // --- 2. Additive Light Passes ---
        gl.blendFunc(gl.ONE, gl.ONE); // Additive blending
        // Turn off ambient light for these passes
        gl.uniform4fv(programInfo.uniformLocations.uAmbientColor, [0, 0, 0, 0]);

        for (const lightMateria of lights) {
            const light = lightMateria.getComponent(Light);
            const lightTransform = lightMateria.getComponent(Transform);
            if (!light || !light.enabled) continue;

            // Set light uniforms
            const r = parseInt(light.color.slice(1, 3), 16) / 255;
            const g = parseInt(light.color.slice(3, 5), 16) / 255;
            const b = parseInt(light.color.slice(5, 7), 16) / 255;
            gl.uniform3fv(programInfo.uniformLocations.uLightPos, [lightTransform.x, lightTransform.y, 50]); // Give light some Z depth
            gl.uniform4fv(programInfo.uniformLocations.uLightColor, [r, g, b, light.intensity]);

            // Redraw all objects for this light
            for (const materia of materias) {
                this.drawSprite(materia, programInfo, projectionMatrix);
            }
        }

        // Reset blend mode
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    drawSprite(materia, programInfo, projectionMatrix) {
        const gl = this.gl;
        const transform = materia.getComponent(Transform);
        const spriteRenderer = materia.getComponent(SpriteRenderer);

        if (!transform || !spriteRenderer || !spriteRenderer.sprite.complete || !spriteRenderer.sprite.naturalWidth) {
            return;
        }

        const image = spriteRenderer.sprite;
        if (!image.__webglTexture) {
            image.__webglTexture = this._createAndSetupTexture(image);
        }

        // Set up Model-View matrix
        const modelViewMatrix = createMat4();
        translateMat4(modelViewMatrix, modelViewMatrix, [transform.x, transform.y, 0]);
        rotateMat4(modelViewMatrix, modelViewMatrix, transform.rotation * Math.PI / 180, [0, 0, 1]);
        scaleMat4(modelViewMatrix, modelViewMatrix, [image.naturalWidth * transform.scale.x, image.naturalHeight * transform.scale.y, 1]);

        gl.useProgram(programInfo.program);

        // Set uniforms
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

        // Bind buffers
        gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBuffer.position);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.spriteBuffer.textureCoord);
        gl.vertexAttribPointer(programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);

        // Bind diffuse texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, image.__webglTexture);
        gl.uniform1i(programInfo.uniformLocations.uDiffuseSampler, 0);

        // Bind normal map
        const normalMap = spriteRenderer.normalMap;
        const hasNormalMap = !!(normalMap && normalMap.complete && normalMap.naturalWidth > 0);
        gl.uniform1i(programInfo.uniformLocations.uHasNormalMap, hasNormalMap);

        if (hasNormalMap) {
            if (!normalMap.__webglTexture) {
                normalMap.__webglTexture = this._createAndSetupTexture(normalMap);
            }
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, normalMap.__webglTexture);
            gl.uniform1i(programInfo.uniformLocations.uNormalSampler, 1);
        }

        // Draw the quad
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    _initSpriteBuffers() {
        const gl = this.gl;
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        // Centered quad
        const positions = [ -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, ];
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        const textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
        const textureCoordinates = [ 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0, ]; // Flipped Y
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

        return { position: positionBuffer, textureCoord: textureCoordBuffer };
    }

    _createAndSetupTexture(image) {
        const gl = this.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        return texture;
    }

    _createProgramInfo(vsSource, fsSource, attributes, uniforms) {
        const gl = this.gl;
        const shaderProgram = this._initShaderProgram(vsSource, fsSource);
        const info = {
            program: shaderProgram,
            attribLocations: {},
            uniformLocations: {},
        };
        attributes.forEach(attr => {
            info.attribLocations[attr] = gl.getAttribLocation(shaderProgram, attr);
        });
        uniforms.forEach(uni => {
            info.uniformLocations[uni] = gl.getUniformLocation(shaderProgram, uni);
        });
        return info;
    }

    _initShaderProgram(vsSource, fsSource) {
        const gl = this.gl;
        const vertexShader = this._loadShader(gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this._loadShader(gl.FRAGMENT_SHADER, fsSource);
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        return shaderProgram;
    }

    _loadShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    drawLines(vertices, color, projectionMatrix, modelViewMatrix) {
        this._drawLines(vertices, color, projectionMatrix, modelViewMatrix, this.gl.LINES);
    }

    drawLineLoop(vertices, color, projectionMatrix, modelViewMatrix) {
        this._drawLines(vertices, color, projectionMatrix, modelViewMatrix, this.gl.LINE_LOOP);
    }

    _drawLines(vertices, color, projectionMatrix, modelViewMatrix, mode) {
        const gl = this.gl;
        const programInfo = this.gizmoProgramInfo;

        gl.useProgram(programInfo.program);

        // Set uniforms
        gl.uniformMatrix4fv(programInfo.uniformLocations.uProjectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.uModelViewMatrix, false, modelViewMatrix);
        gl.uniform4fv(programInfo.uniformLocations.uColor, color);

        // Create a new buffer for this draw call to not interfere with sprite buffers
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

        // Set attributes
        gl.enableVertexAttribArray(programInfo.attribLocations.aVertexPosition);
        gl.vertexAttribPointer(programInfo.attribLocations.aVertexPosition, 2, gl.FLOAT, false, 0, 0);

        // Draw
        gl.drawArrays(mode, 0, vertices.length / 2);

        // Clean up
        gl.deleteBuffer(positionBuffer);
    }
}
