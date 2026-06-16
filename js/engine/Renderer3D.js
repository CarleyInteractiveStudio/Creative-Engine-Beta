import { Transform, SpriteRenderer, Camera } from './Components.js';

// Import gl-matrix for 3D math via importmap
import * as glMatrix from 'gl-matrix';
const { mat4, vec3, quat } = glMatrix;

export class Renderer3D {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl', { antialias: true });
        if (!this.gl) {
            console.error('WebGL not supported');
            return;
        }

        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.initShaders();
        this.initBuffers();
    }

    initShaders() {
        const gl = this.gl;

        // --- Standard Shader ---
        const vsSource = `
            attribute vec4 aVertexPosition;
            attribute vec3 aVertexNormal;
            attribute vec2 aTextureCoord;

            uniform mat4 uModelMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;
            uniform mat4 uNormalMatrix;

            varying vec3 vNormal;
            varying vec3 vPosition;
            varying vec2 vTextureCoord;

            void main() {
                vec4 worldPosition = uModelMatrix * aVertexPosition;
                vPosition = worldPosition.xyz;
                vNormal = mat3(uNormalMatrix) * aVertexNormal;
                vTextureCoord = aTextureCoord;
                gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;
            }
        `;

        const fsSource = `
            precision mediump float;

            varying vec3 vNormal;
            varying vec3 vPosition;
            varying vec2 vTextureCoord;

            uniform vec3 uViewPosition;
            uniform vec4 uColor;
            uniform bool uUseToon;
            uniform bool uUseTexture;
            uniform sampler2D uSampler;

            // Lights
            uniform vec3 uAmbientLight;
            uniform vec3 uDirLightDir;
            uniform vec3 uDirLightColor;

            #define MAX_POINT_LIGHTS 4
            uniform vec3 uPointLightPos[MAX_POINT_LIGHTS];
            uniform vec3 uPointLightColor[MAX_POINT_LIGHTS];
            uniform float uPointLightRange[MAX_POINT_LIGHTS];
            uniform int uPointLightCount;

            void main() {
                vec3 normal = normalize(vNormal);
                vec4 baseColor = uColor;
                if (uUseTexture) {
                    baseColor *= texture2D(uSampler, vTextureCoord);
                }

                if (baseColor.a < 0.1) discard;

                // Directional Light
                vec3 dirLightDir = normalize(-uDirLightDir);
                float diff = max(dot(normal, dirLightDir), 0.0);

                // Point Lights
                vec3 pointDiffuse = vec3(0.0);
                for(int i = 0; i < MAX_POINT_LIGHTS; i++) {
                    if (i >= uPointLightCount) break;
                    vec3 lightDir = normalize(uPointLightPos[i] - vPosition);
                    float dist = length(uPointLightPos[i] - vPosition);
                    float atten = max(0.0, 1.0 - (dist / uPointLightRange[i]));
                    float pDiff = max(dot(normal, lightDir), 0.0);
                    pointDiffuse += uPointLightColor[i] * pDiff * atten;
                }

                if (uUseToon) {
                    if (diff > 0.95) diff = 1.0;
                    else if (diff > 0.5) diff = 0.7;
                    else if (diff > 0.25) diff = 0.4;
                    else diff = 0.2;

                    // Simplify point light for toon
                    pointDiffuse = step(0.1, pointDiffuse) * 0.8;
                }

                vec3 diffuse = (diff * uDirLightColor) + pointDiffuse;
                vec3 finalColor = (uAmbientLight + diffuse) * baseColor.rgb;

                gl_FragColor = vec4(finalColor, baseColor.a);
            }
        `;

        this.shaderProgram = this.initShaderProgram(gl, vsSource, fsSource);
        this.programInfo = {
            program: this.shaderProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(this.shaderProgram, 'aVertexPosition'),
                vertexNormal: gl.getAttribLocation(this.shaderProgram, 'aVertexNormal'),
                textureCoord: gl.getAttribLocation(this.shaderProgram, 'aTextureCoord'),
            },
            uniformLocations: {
                projectionMatrix: gl.getUniformLocation(this.shaderProgram, 'uProjectionMatrix'),
                viewMatrix: gl.getUniformLocation(this.shaderProgram, 'uViewMatrix'),
                modelMatrix: gl.getUniformLocation(this.shaderProgram, 'uModelMatrix'),
                normalMatrix: gl.getUniformLocation(this.shaderProgram, 'uNormalMatrix'),
                viewPosition: gl.getUniformLocation(this.shaderProgram, 'uViewPosition'),
                uColor: gl.getUniformLocation(this.shaderProgram, 'uColor'),
                uUseToon: gl.getUniformLocation(this.shaderProgram, 'uUseToon'),
                uUseTexture: gl.getUniformLocation(this.shaderProgram, 'uUseTexture'),
                uSampler: gl.getUniformLocation(this.shaderProgram, 'uSampler'),
                uAmbientLight: gl.getUniformLocation(this.shaderProgram, 'uAmbientLight'),
                uDirLightDir: gl.getUniformLocation(this.shaderProgram, 'uDirLightDir'),
                uDirLightColor: gl.getUniformLocation(this.shaderProgram, 'uDirLightColor'),
                uPointLightPos: gl.getUniformLocation(this.shaderProgram, 'uPointLightPos'),
                uPointLightColor: gl.getUniformLocation(this.shaderProgram, 'uPointLightColor'),
                uPointLightRange: gl.getUniformLocation(this.shaderProgram, 'uPointLightRange'),
                uPointLightCount: gl.getUniformLocation(this.shaderProgram, 'uPointLightCount'),
            },
        };

        this.textureCache = new Map();

        // --- Picking Shader ---
        const pickingVsSource = `
            attribute vec4 aVertexPosition;
            uniform mat4 uModelMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;
            void main() {
                gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;
            }
        `;
        const pickingFsSource = `
            precision mediump float;
            uniform vec4 uPickingColor;
            void main() {
                gl_FragColor = uPickingColor;
            }
        `;
        this.pickingProgram = this.initShaderProgram(gl, pickingVsSource, pickingFsSource);
        this.pickingProgramInfo = {
            program: this.pickingProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(this.pickingProgram, 'aVertexPosition'),
            },
            uniformLocations: {
                projectionMatrix: gl.getUniformLocation(this.pickingProgram, 'uProjectionMatrix'),
                viewMatrix: gl.getUniformLocation(this.pickingProgram, 'uViewMatrix'),
                modelMatrix: gl.getUniformLocation(this.pickingProgram, 'uModelMatrix'),
                uPickingColor: gl.getUniformLocation(this.pickingProgram, 'uPickingColor'),
            },
        };
    }

    initBuffers() {
        const gl = this.gl;

        // Basic Plane (for 2D sprites in 3D)
        const planePositions = [
            -0.5, -0.5,  0.0,
             0.5, -0.5,  0.0,
             0.5,  0.5,  0.0,
            -0.5,  0.5,  0.0,
        ];
        this.planeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.planeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(planePositions), gl.STATIC_DRAW);

        const planeTexCoords = [
            0.0,  1.0,
            1.0,  1.0,
            1.0,  0.0,
            0.0,  0.0,
        ];
        this.planeTexCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.planeTexCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(planeTexCoords), gl.STATIC_DRAW);

        const planeIndices = [0, 1, 2, 0, 2, 3];
        this.planeIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.planeIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(planeIndices), gl.STATIC_DRAW);

        const planeNormals = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
        this.planeNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.planeNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(planeNormals), gl.STATIC_DRAW);

        // Basic Cube
        const positions = [
            // Front face
            -1.0, -1.0,  1.0,  1.0, -1.0,  1.0,  1.0,  1.0,  1.0, -1.0,  1.0,  1.0,
            // Back face
            -1.0, -1.0, -1.0, -1.0,  1.0, -1.0,  1.0,  1.0, -1.0,  1.0, -1.0, -1.0,
            // Top face
            -1.0,  1.0, -1.0, -1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0, -1.0,
            // Bottom face
            -1.0, -1.0, -1.0,  1.0, -1.0, -1.0,  1.0, -1.0,  1.0, -1.0, -1.0,  1.0,
            // Right face
             1.0, -1.0, -1.0,  1.0,  1.0, -1.0,  1.0,  1.0,  1.0,  1.0, -1.0,  1.0,
            // Left face
            -1.0, -1.0, -1.0, -1.0, -1.0,  1.0, -1.0,  1.0,  1.0, -1.0,  1.0, -1.0,
        ];
        this.cubeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

        const indices = [
            0,  1,  2,      0,  2,  3,    // front
            4,  5,  6,      4,  6,  7,    // back
            8,  9,  10,     8,  10, 11,   // top
            12, 13, 14,     12, 14, 15,   // bottom
            16, 17, 18,     16, 18, 19,   // right
            20, 21, 22,     20, 22, 23,   // left
        ];
        this.cubeIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cubeIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        const normals = [
            0,0,1, 0,0,1, 0,0,1, 0,0,1,
            0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
            0,1,0, 0,1,0, 0,1,0, 0,1,0,
            0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
            1,0,0, 1,0,0, 1,0,0, 1,0,0,
            -1,0,0, -1,0,0, -1,0,0, -1,0,0
        ];
        this.cubeNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    }

    resize() {
        const clientWidth = this.canvas.clientWidth || 800;
        const clientHeight = this.canvas.clientHeight || 600;
        this.canvas.width = clientWidth;
        this.canvas.height = clientHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    getGLTexture(image) {
        if (!image || !image.complete) return null;
        if (this.textureCache.has(image.src)) return this.textureCache.get(image.src);

        const gl = this.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        // Check if image is power of 2
        if ((image.width & (image.width - 1)) === 0 && (image.height & (image.height - 1)) === 0) {
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        }

        this.textureCache.set(image.src, texture);
        return texture;
    }

    render(scene, cameraMateria, options = {}) {
        if (!this.gl) return;
        const gl = this.gl;
        const ambiente = scene.ambiente || {};
        const bgColor = this.hexToRgb(ambiente.nocheDiaColor || '#1a1a2a');

        // Allow transparency for hybrid modes
        let alpha = (options.clearAlpha !== undefined) ? options.clearAlpha : 1.0;

        // In editor mode without specific camera, be transparent to show CSS grey background
        if (!cameraMateria && !options.isGameView) {
            alpha = 0.0;
        }

        gl.clearColor(bgColor[0], bgColor[1], bgColor[2], alpha);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const projectionMatrix = mat4.create();
        const viewMatrix = mat4.create();

        this.lastProjectionMatrix = projectionMatrix;
        this.lastViewMatrix = viewMatrix;

        let is3DView = true;
        let activeViewPosition = [0, 0, 0];

        if (cameraMateria) {
            const camComp = cameraMateria.getComponent(Camera);
            const camTrans = cameraMateria.getComponent(Transform);
            const aspect = gl.canvas.width / gl.canvas.height;

            if (camComp.projection === 'Orthographic') {
                is3DView = false;
                const size = camComp.orthographicSize;
                mat4.ortho(projectionMatrix, -size * aspect, size * aspect, -size, size, 0.1, 1000);
            } else {
                mat4.perspective(projectionMatrix, camComp.fov * Math.PI / 180, aspect, 0.1, 1000);
            }

            const q = quat.create();
            quat.fromEuler(q, camTrans.localRotation.x, camTrans.localRotation.y, camTrans.localRotation.z);
            activeViewPosition = [camTrans.x, camTrans.y, camTrans.z];
            mat4.fromRotationTranslation(viewMatrix, q, activeViewPosition);
            mat4.invert(viewMatrix, viewMatrix);
        } else {
            // Editor default camera
            const aspect = gl.canvas.width / gl.canvas.height;
            mat4.perspective(projectionMatrix, 45 * Math.PI / 180, aspect, 1, 50000);

            // In Renderer.js, this.camera in editor has {x, y, z, rotation: {x, y, z}, zoom}
            // Use a default Z that allows seeing 2D objects at Z=0
            const editorCam = options.editorCamera || { x: 0, y: 0, z: 500, rotation: { x: 0, y: 0, z: 0 } };
            const q = quat.create();
            quat.fromEuler(q, editorCam.rotation.x, editorCam.rotation.y, editorCam.rotation.z);

            // Adjust camera position to be compatible with 2D world coordinates (which are often large)
            activeViewPosition = [editorCam.x, editorCam.y, editorCam.z];
            mat4.fromRotationTranslation(viewMatrix, q, activeViewPosition);
            mat4.invert(viewMatrix, viewMatrix);
        }

        gl.useProgram(this.programInfo.program);
        gl.uniform3fv(this.programInfo.uniformLocations.viewPosition, activeViewPosition);

        // Global Lights Setup
        const dirLight = scene.getAllMaterias().find(m => m.isActive && m.getComponent(Components.DirectionalLight3D));
        if (dirLight) {
            const dlComp = dirLight.getComponent(Components.DirectionalLight3D);
            gl.uniform3fv(this.programInfo.uniformLocations.uDirLightDir, [dlComp.direction.x, dlComp.direction.y, dlComp.direction.z]);
            gl.uniform3fv(this.programInfo.uniformLocations.uDirLightColor, this.hexToRgb(dlComp.color).map(c => c * dlComp.intensity));
        } else {
            gl.uniform3fv(this.programInfo.uniformLocations.uDirLightDir, [0, -1, 0]);
            gl.uniform3fv(this.programInfo.uniformLocations.uDirLightColor, [1, 1, 1]);
        }
        gl.uniform3fv(this.programInfo.uniformLocations.uAmbientLight, [0.3, 0.3, 0.3]);

        // Point Lights Setup
        const pointLights = scene.getAllMaterias().filter(m => m.isActive && m.getComponent(Components.PointLight3D)).slice(0, 4);
        const plPos = [], plColor = [], plRange = [];
        pointLights.forEach(pl => {
            const comp = pl.getComponent(Components.PointLight3D);
            const trans = pl.getComponent(Transform);
            plPos.push(trans.x, trans.y, trans.z);
            const rgb = this.hexToRgb(comp.color);
            plColor.push(rgb[0] * comp.intensity, rgb[1] * comp.intensity, rgb[2] * comp.intensity);
            plRange.push(comp.range);
        });

        if (pointLights.length > 0) {
            gl.uniform3fv(this.programInfo.uniformLocations.uPointLightPos, new Float32Array(plPos));
            gl.uniform3fv(this.programInfo.uniformLocations.uPointLightColor, new Float32Array(plColor));
            gl.uniform1fv(this.programInfo.uniformLocations.uPointLightRange, new Float32Array(plRange));
        }
        gl.uniform1i(this.programInfo.uniformLocations.uPointLightCount, pointLights.length);

        scene.getAllMaterias().forEach(materia => {
            this.renderMateria(materia, projectionMatrix, viewMatrix, options);
        });
    }

    renderMateria(materia, projectionMatrix, viewMatrix, options) {
        const meshRenderer = materia.getComponent(Components.MeshRenderer3D);
        const spriteRenderer = materia.getComponent(Components.SpriteRenderer);
        const textureRender = materia.getComponent(Components.TextureRender);

        if (options.picking && !meshRenderer && !spriteRenderer && !textureRender) return;

        const gl = this.gl;
        const programInfo = options.picking ? this.pickingProgramInfo : this.programInfo;
        const transform = materia.getComponent(Transform);
        if (!transform || !materia.isActive) return;

        if (!meshRenderer && !spriteRenderer && !textureRender) return;

        const modelMatrix = mat4.create();
        const pos = [transform.x, transform.y, transform.z || 0];
        const scale = [transform.localScale.x, transform.localScale.y, transform.localScale.z || 1];
        const q = quat.create();
        const rot = transform.localRotation;
        quat.fromEuler(q, rot.x, rot.y, rot.z);

        mat4.fromRotationTranslationScale(modelMatrix, q, pos, scale);

        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.viewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelMatrix, false, modelMatrix);

        if (options.picking) {
            // No-op here, specialized below
        } else {
            const normalMatrix = mat4.create();
            mat4.invert(normalMatrix, modelMatrix);
            mat4.transpose(normalMatrix, normalMatrix);
            gl.uniformMatrix4fv(this.programInfo.uniformLocations.normalMatrix, false, normalMatrix);
        }

        let color = [1, 1, 1, 1];
        if (meshRenderer) {
            const rgb = this.hexToRgb(meshRenderer.color);
            color = [rgb[0], rgb[1], rgb[2], 1.0];
        } else if (spriteRenderer) {
            const rgb = this.hexToRgb(spriteRenderer.color);
            color = [rgb[0], rgb[1], rgb[2], spriteRenderer.opacity !== undefined ? spriteRenderer.opacity : 1.0];
        } else if (textureRender) {
            const rgb = this.hexToRgb(textureRender.color);
            color = [rgb[0], rgb[1], rgb[2], 1.0];
        }

        gl.uniform4fv(this.programInfo.uniformLocations.uColor, color);
        gl.uniform1i(this.programInfo.uniformLocations.uUseToon, (options.isToon || meshRenderer?.isToon) ? 1 : 0);

        if (meshRenderer) {
            if (options.picking) {
                const id = options.idMap.get(materia.id);
                const pickingColor = [
                    ((id >>  0) & 0xFF) / 255,
                    ((id >>  8) & 0xFF) / 255,
                    ((id >> 16) & 0xFF) / 255,
                    1.0
                ];
                gl.uniform4fv(programInfo.uniformLocations.uPickingColor, pickingColor);
            } else {
                gl.uniform1i(this.programInfo.uniformLocations.uUseTexture, 0);
            }
            // TODO: Support Sphere/Plane
            gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeBuffer);
            gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeNormalBuffer);
            gl.vertexAttribPointer(this.programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexNormal);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.cubeIndexBuffer);
            gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
        } else if (spriteRenderer) {
            if (options.picking) {
                const id = options.idMap.get(materia.id);
                const pickingColor = [
                    ((id >>  0) & 0xFF) / 255,
                    ((id >>  8) & 0xFF) / 255,
                    ((id >> 16) & 0xFF) / 255,
                    1.0
                ];
                gl.uniform4fv(programInfo.uniformLocations.uPickingColor, pickingColor);
            }
            // Draw sprite as plane
            if (!options.picking) {
                const tex = this.getGLTexture(spriteRenderer.sprite);
                if (tex) {
                    gl.uniform1i(this.programInfo.uniformLocations.uUseTexture, 1);
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, tex);
                    gl.uniform1i(this.programInfo.uniformLocations.uSampler, 0);
                } else {
                    gl.uniform1i(this.programInfo.uniformLocations.uUseTexture, 0);
                }
            }

            // Adjust model matrix for sprite dimensions (2D to 3D mapping)
            const sprite = spriteRenderer.sprite;
            let spriteScaleX = 1;
            let spriteScaleY = 1;
            if (sprite && sprite.complete && sprite.naturalWidth > 0) {
                spriteScaleX = sprite.naturalWidth; // Dividing by 200 because plane is 2x2 units
                spriteScaleY = sprite.naturalHeight;
            }

            const spriteModelMatrix = mat4.create();
            const spriteScale = [scale[0] * spriteScaleX, scale[1] * spriteScaleY, 1];

            let finalRotation = q;
            if (spriteRenderer.billboard && !options.picking) {
                // To billboard, we take the view matrix and invert its rotation
                const viewRot = quat.create();
                mat4.getRotation(viewRot, viewMatrix);
                quat.invert(viewRot, viewRot);
                finalRotation = viewRot;
            }

            mat4.fromRotationTranslationScale(spriteModelMatrix, finalRotation, pos, spriteScale);
            gl.uniformMatrix4fv(programInfo.uniformLocations.modelMatrix, false, spriteModelMatrix);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.planeBuffer);
            gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.planeTexCoordBuffer);
            gl.vertexAttribPointer(this.programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(this.programInfo.attribLocations.textureCoord);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.planeNormalBuffer);
            gl.vertexAttribPointer(this.programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexNormal);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.planeIndexBuffer);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        } else if (textureRender) {
            if (options.picking) {
                const id = options.idMap.get(materia.id);
                const pickingColor = [
                    ((id >>  0) & 0xFF) / 255,
                    ((id >>  8) & 0xFF) / 255,
                    ((id >> 16) & 0xFF) / 255,
                    1.0
                ];
                gl.uniform4fv(programInfo.uniformLocations.uPickingColor, pickingColor);
            }

            if (!options.picking) {
                const tex = this.getGLTexture(textureRender.texture);
                if (tex) {
                    gl.uniform1i(this.programInfo.uniformLocations.uUseTexture, 1);
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, tex);
                    gl.uniform1i(this.programInfo.uniformLocations.uSampler, 0);
                } else {
                    gl.uniform1i(this.programInfo.uniformLocations.uUseTexture, 0);
                }
            }

            const modelMatrixTex = mat4.create();
            const texScale = [scale[0] * textureRender.width, scale[1] * textureRender.height, 1];

            let finalRotationTex = q;
            if (textureRender.billboard && !options.picking) {
                const viewRot = quat.create();
                mat4.getRotation(viewRot, viewMatrix);
                quat.invert(viewRot, viewRot);
                finalRotationTex = viewRot;
            }

            mat4.fromRotationTranslationScale(modelMatrixTex, finalRotationTex, pos, texScale);
            gl.uniformMatrix4fv(programInfo.uniformLocations.modelMatrix, false, modelMatrixTex);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.planeBuffer);
            gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.planeTexCoordBuffer);
            gl.vertexAttribPointer(this.programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(this.programInfo.attribLocations.textureCoord);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.planeNormalBuffer);
            gl.vertexAttribPointer(this.programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexNormal);

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.planeIndexBuffer);
            gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
        }
    }

    hexToRgb(hex) {
        if (!hex || hex[0] !== '#') return [1, 1, 1];
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return [r, g, b];
    }

    pick(scene, cameraMateria, x, y, options = {}) {
        if (!this.gl) return null;
        const gl = this.gl;

        // Setup picking texture
        if (!this.pickingFramebuffer) {
            this.pickingTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.pickingTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1024, 1024, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            this.pickingFramebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickingFramebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pickingTexture, 0);

            this.pickingDepthBuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, this.pickingDepthBuffer);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 1024, 1024);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.pickingDepthBuffer);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickingFramebuffer);
        gl.viewport(0, 0, 1024, 1024);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const idMap = new Map();
        const reverseIdMap = new Map();
        scene.getAllMaterias().forEach((m, i) => {
            idMap.set(m.id, i + 1);
            reverseIdMap.set(i + 1, m.id);
        });

        this.render(scene, cameraMateria, { ...options, picking: true, idMap });

        const pixels = new Uint8Array(4);
        // Map x,y to 1024 viewport
        const px = Math.floor((x / gl.canvas.width) * 1024);
        const py = Math.floor((1 - y / gl.canvas.height) * 1024);

        gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.resize(); // Restore viewport

        const pickedId = pixels[0] + (pixels[1] << 8) + (pixels[2] << 16);
        return reverseIdMap.get(pickedId) || null;
    }

    initShaderProgram(gl, vsSource, fsSource) {
        const vertexShader = this.loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error('Link error: ' + gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        return shaderProgram;
    }

    loadShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Compile error: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }
}
