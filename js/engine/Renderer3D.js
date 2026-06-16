/**
 * Creative 3D Render - Core Engine
 * Highly optimized WebGL 3D Renderer for low-end devices.
 * (c) 2024 Carley Interactive Studio
 */

import * as Components from './Components.js';
import * as Components3D from './Components3D.js';

// Import gl-matrix for 3D math
import * as glMatrix from 'gl-matrix';
const { mat4, vec3, quat, vec4 } = glMatrix;
window.glMatrix = glMatrix; // Essential for other 3D modules

export class Renderer3D {
    constructor(canvas) {
        this.canvas = canvas;
        window._Renderer3D = this; // Essential for SceneView integration
        this.gl = null;
        this.initialized = false;

        // Matrices
        this.projectionMatrix = mat4.create();
        this.viewMatrix = mat4.create();
        this.lastProjectionMatrix = mat4.create();
        this.lastViewMatrix = mat4.create();

        // Cache and resource management
        this.programs = {};
        this.buffers = {};
        this.textureCache = new Map();
    }

    init() {
        if (this.initialized) return true;
        if (!this.canvas) return false;

        console.log('[Creative 3D Render] Initializing optimized WebGL context...');

        const glOptions = {
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: false,
            powerPreference: "high-performance"
        };

        this.gl = this.canvas.getContext('webgl', glOptions) || this.canvas.getContext('experimental-webgl', glOptions);

        if (!this.gl) {
            console.error('WebGL not supported on this device.');
            return false;
        }

        const gl = this.gl;

        // Essential extensions
        gl.getExtension('OES_standard_derivatives');
        gl.getExtension('EXT_frag_depth');

        // Global State
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.enable(gl.CULL_FACE);
        // CW is required because the Y-flip in projection matrix inverts triangle winding
        gl.frontFace(gl.CW);

        this.initShaders();
        this.initBasicGeometry();

        this.initialized = true;
        return true;
    }

    initShaders() {
        const gl = this.gl;

        // 1. Infinite Grid & Axes Shader
        const gridVs = `
            attribute vec3 aVertexPosition;
            varying vec3 vNearPoint;
            varying vec3 vFarPoint;
            uniform mat4 uInvView;
            uniform mat4 uInvProj;

            vec3 unprojectPoint(float x, float y, float z, mat4 invView, mat4 invProj) {
                vec4 rayNDCPos = vec4(x, y, z, 1.0);
                vec4 viewPos = invProj * rayNDCPos;
                viewPos /= viewPos.w;
                vec4 worldPos = invView * viewPos;
                return worldPos.xyz;
            }

            void main() {
                vNearPoint = unprojectPoint(aVertexPosition.x, aVertexPosition.y, 0.0, uInvView, uInvProj);
                vFarPoint = unprojectPoint(aVertexPosition.x, aVertexPosition.y, 1.0, uInvView, uInvProj);
                gl_Position = vec4(aVertexPosition, 1.0);
            }
        `;

        const gridFs = `
            #extension GL_OES_standard_derivatives : enable
            #extension GL_EXT_frag_depth : enable
            precision mediump float;

            varying vec3 vNearPoint;
            varying vec3 vFarPoint;
            uniform mat4 uView;
            uniform mat4 uProj;
            uniform float uNear;
            uniform float uFar;

            vec4 grid(vec3 fragPos3D, float scale, bool drawAxes) {
                vec2 coord = fragPos3D.xz * scale;
                vec2 derivative = fwidth(coord);
                vec2 grid = abs(fract(coord - 0.5) - 0.5) / derivative;
                float line = min(grid.x, grid.y);
                float minimumz = min(derivative.y, 1.0);
                float minimumx = min(derivative.x, 1.0);

                vec4 color = vec4(0.4, 0.4, 0.45, 1.0 - min(line, 1.0));

                if (drawAxes) {
                    float axisThickness = 2.0;
                    if (abs(fragPos3D.z) < axisThickness * minimumz) color = vec4(1.0, 0.1, 0.1, 1.0);
                    if (abs(fragPos3D.x) < axisThickness * minimumx) color = vec4(0.1, 0.4, 1.0, 1.0);
                }

                return color;
            }

            float computeDepth(vec3 pos) {
                vec4 clipSpacePos = uProj * uView * vec4(pos.xyz, 1.0);
                return (clipSpacePos.z / clipSpacePos.w) * 0.5 + 0.5;
            }

            void main() {
                float t = -vNearPoint.y / (vFarPoint.y - vNearPoint.y);
                if (t <= 0.0) discard;

                vec3 fragPos3D = vNearPoint + t * (vFarPoint - vNearPoint);
                gl_FragDepthEXT = computeDepth(fragPos3D);

                float linearDepth = (2.0 * uNear * uFar) / (uFar + uNear - ((gl_FragDepthEXT * 2.0 - 1.0) * (uFar - uNear)));
                float fading = max(0.0, (1.0 - (linearDepth / 4000.0)));

                vec4 color = (grid(fragPos3D, 0.1, true) + grid(fragPos3D, 0.01, false) * 0.5);
                color.a *= fading;

                if (color.a < 0.02) discard;
                gl_FragColor = color;
            }
        `;

        this.programs.grid = this.createProgram(gridVs, gridFs);

        // 1.1 Skybox Shader
        const skyVs = `
            attribute vec3 aVertexPosition;
            varying vec3 vDir;
            uniform mat4 uInvViewProj;
            void main() {
                vDir = (uInvViewProj * vec4(aVertexPosition, 1.0)).xyz;
                gl_Position = vec4(aVertexPosition.xy, 0.999, 1.0);
            }
        `;
        const skyFs = `
            precision mediump float;
            varying vec3 vDir;
            uniform vec3 uSkyColor;
            uniform vec3 uHorizonColor;
            uniform vec3 uGroundColor;
            void main() {
                vec3 dir = normalize(vDir);
                float y = dir.y; // In CE, -Y is UP
                vec3 color;
                if (y < 0.0) {
                    color = mix(uHorizonColor, uSkyColor, pow(clamp(-y, 0.0, 1.0), 0.5));
                } else {
                    color = mix(uHorizonColor, uGroundColor, pow(clamp(y, 0.0, 1.0), 0.5));
                }
                gl_FragColor = vec4(color, 1.0);
            }
        `;
        this.programs.sky = this.createProgram(skyVs, skyFs);

        // 2. Simple Standard Shader
        const stdVs = `
            attribute vec4 aVertexPosition;
            attribute vec3 aVertexNormal;
            uniform mat4 uModelMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;
            varying vec3 vNormal;
            void main() {
                gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;
                vNormal = aVertexNormal;
            }
        `;
        const stdFs = `
            precision mediump float;
            varying vec3 vNormal;
            uniform vec4 uColor;
            void main() {
                vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
                float diff = max(dot(normalize(vNormal), lightDir), 0.4);
                gl_FragColor = vec4(uColor.rgb * diff, uColor.a);
            }
        `;
        this.programs.standard = this.createProgram(stdVs, stdFs);

        // 2.1 Skinned Standard Shader
        const skinnedVs = `
            attribute vec4 aVertexPosition;
            attribute vec3 aVertexNormal;
            attribute vec4 aJointIndices;
            attribute vec4 aJointWeights;

            uniform mat4 uModelMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;
            uniform mat4 uBoneMatrices[64];

            varying vec3 vNormal;

            void main() {
                mat4 skinMatrix =
                    uBoneMatrices[int(aJointIndices.x)] * aJointWeights.x +
                    uBoneMatrices[int(aJointIndices.y)] * aJointWeights.y +
                    uBoneMatrices[int(aJointIndices.z)] * aJointWeights.z +
                    uBoneMatrices[int(aJointIndices.w)] * aJointWeights.w;

                vec4 worldPosition = uModelMatrix * skinMatrix * aVertexPosition;
                gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;

                vNormal = (uModelMatrix * skinMatrix * vec4(aVertexNormal, 0.0)).xyz;
            }
        `;
        this.programs.skinned = this.createProgram(skinnedVs, stdFs);

        // 3. Unlit Shader
        const unlitVs = `
            attribute vec4 aVertexPosition;
            uniform mat4 uModelMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;
            void main() {
                gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aVertexPosition;
            }
        `;
        const unlitFs = `
            precision mediump float;
            uniform vec4 uColor;
            void main() {
                gl_FragColor = uColor;
            }
        `;
        this.programs.unlit = this.createProgram(unlitVs, unlitFs);

        // 4. Picking Shader
        this.programs.picking = this.createProgram(unlitVs, `
            precision mediump float;
            uniform vec4 uPickColor;
            void main() { gl_FragColor = uPickColor; }
        `);
    }

    initBasicGeometry() {
        const gl = this.gl;
        const quadPos = new Float32Array([-1,1,0, 1,1,0, -1,-1,0, 1,-1,0]);
        this.buffers.quad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.quad);
        gl.bufferData(gl.ARRAY_BUFFER, quadPos, gl.STATIC_DRAW);

        const cubePos = new Float32Array([
            -0.5,-0.5,0.5, 0.5,-0.5,0.5, 0.5,0.5,0.5, -0.5,0.5,0.5, -0.5,-0.5,-0.5, -0.5,0.5,-0.5, 0.5,0.5,-0.5, 0.5,-0.5,-0.5,
            -0.5,0.5,-0.5, -0.5,0.5,0.5, 0.5,0.5,0.5, 0.5,0.5,-0.5, -0.5,-0.5,-0.5, 0.5,-0.5,-0.5, 0.5,-0.5,0.5, -0.5,-0.5,0.5,
            0.5,-0.5,-0.5, 0.5,0.5,-0.5, 0.5,0.5,0.5, 0.5,-0.5,0.5, -0.5,-0.5,-0.5, -0.5,-0.5,0.5, -0.5,0.5,0.5, -0.5,0.5,-0.5
        ]);
        this.buffers.cube = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.cube);
        gl.bufferData(gl.ARRAY_BUFFER, cubePos, gl.STATIC_DRAW);

        const cubeNormals = new Float32Array([
            0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
            0,1,0, 0,1,0, 0,1,0, 0,1,0, 0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
            1,0,0, 1,0,0, 1,0,0, 1,0,0, -1,0,0, -1,0,0, -1,0,0, -1,0,0
        ]);
        this.buffers.cubeNorm = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.cubeNorm);
        gl.bufferData(gl.ARRAY_BUFFER, cubeNormals, gl.STATIC_DRAW);

        const cubeIndices = new Uint16Array([0,1,2, 0,2,3, 4,5,6, 4,6,7, 8,9,10, 8,10,11, 12,13,14, 12,14,15, 16,17,18, 16,18,19, 20,21,22, 20,22,23]);
        this.buffers.cubeIdx = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.cubeIdx);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cubeIndices, gl.STATIC_DRAW);
    }

    render(scene, cameraMateria, options = {}) {
        if (!this.initialized && !this.init()) return;
        window._Renderer3D = this;
        const gl = this.gl;

        this.resize();
        gl.clearColor(0.05, 0.05, 0.07, options.clearAlpha !== undefined ? options.clearAlpha : 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const aspect = gl.canvas.width / gl.canvas.height;
        const near = 0.1;
        const far = 10000.0;

        if (cameraMateria) {
            const cam = cameraMateria.getComponent(Components.Camera);
            const transform = cameraMateria.getComponent(Components.Transform);
            const cNear = cam.nearClipPlane || 0.1;
            const cFar = cam.farClipPlane || 10000.0;

            if (cam.projection === 'Orthographic') {
                const size = cam.orthographicSize || 500;
                mat4.ortho(this.projectionMatrix, -size * aspect, size * aspect, -size, size, cNear, cFar);
            } else {
                mat4.perspective(this.projectionMatrix, (cam.fov || 60) * Math.PI / 180, aspect, cNear, cFar);
            }
            mat4.invert(this.viewMatrix, transform.worldMatrix);
        } else {
            mat4.perspective(this.projectionMatrix, 45 * Math.PI / 180, aspect, near, far);
            const cam = options.editorCamera || { x: 0, y: -200, z: 600, rotation: { x: 15, y: 0, z: 0 } };
            const q = quat.create();
            quat.fromEuler(q, cam.rotation.x, cam.rotation.y, cam.rotation.z);
            mat4.fromRotationTranslation(this.viewMatrix, q, [cam.x, cam.y, cam.z]);
            mat4.invert(this.viewMatrix, this.viewMatrix);
        }

        mat4.scale(this.projectionMatrix, this.projectionMatrix, [1, -1, 1]);
        mat4.copy(this.lastProjectionMatrix, this.projectionMatrix);
        mat4.copy(this.lastViewMatrix, this.viewMatrix);

        if (scene && scene.ambiente && scene.ambiente.skyMode === 'Gradient') {
            this.drawSky(scene.ambiente);
        }

        if (options.showGrid !== false) this.drawGrid(near, far);
        this.drawScene(scene);
        this.drawOriginAxes();
    }

    drawSky(ambiente) {
        const gl = this.gl;
        const program = this.programs.sky;
        gl.useProgram(program);

        // Remove translation from view matrix for skybox (infinite distance effect)
        const viewNoPos = mat4.copy(mat4.create(), this.viewMatrix);
        viewNoPos[12] = 0; viewNoPos[13] = 0; viewNoPos[14] = 0;

        const viewProj = mat4.create();
        mat4.multiply(viewProj, this.projectionMatrix, viewNoPos);
        const invViewProj = mat4.create();
        mat4.invert(invViewProj, viewProj);

        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uInvViewProj'), false, invViewProj);

        const sky = this.hexToRgb(ambiente.skyColor || '#87ceeb');
        const horizon = this.hexToRgb(ambiente.horizonColor || '#ffffff');
        const ground = this.hexToRgb(ambiente.groundColor || '#222222');

        gl.uniform3f(gl.getUniformLocation(program, 'uSkyColor'), sky[0], sky[1], sky[2]);
        gl.uniform3f(gl.getUniformLocation(program, 'uHorizonColor'), horizon[0], horizon[1], horizon[2]);
        gl.uniform3f(gl.getUniformLocation(program, 'uGroundColor'), ground[0], ground[1], ground[2]);

        const posLoc = gl.getAttribLocation(program, 'aVertexPosition');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.quad);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(posLoc);

        gl.disable(gl.DEPTH_TEST);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.enable(gl.DEPTH_TEST);
    }

    drawGrid(near, far) {
        const gl = this.gl;
        const program = this.programs.grid;
        gl.useProgram(program);

        const invView = mat4.create(); mat4.invert(invView, this.viewMatrix);
        const invProj = mat4.create(); mat4.invert(invProj, this.projectionMatrix);

        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uView'), false, this.viewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProj'), false, this.projectionMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uInvView'), false, invView);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uInvProj'), false, invProj);
        gl.uniform1f(gl.getUniformLocation(program, 'uNear'), near);
        gl.uniform1f(gl.getUniformLocation(program, 'uFar'), far);

        const posLoc = gl.getAttribLocation(program, 'aVertexPosition');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.quad);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(posLoc);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    drawOriginAxes() {
        const gl = this.gl;
        const program = this.programs.unlit;
        gl.useProgram(program);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uViewMatrix'), false, this.viewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProjectionMatrix'), false, this.projectionMatrix);

        const modelLoc = gl.getUniformLocation(program, 'uModelMatrix');
        const colorLoc = gl.getUniformLocation(program, 'uColor');
        const posLoc = gl.getAttribLocation(program, 'aVertexPosition');

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.cube);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(posLoc);

        const yModel = mat4.create();
        mat4.scale(yModel, yModel, [0.4, 100000, 0.4]);
        gl.uniformMatrix4fv(modelLoc, false, yModel);
        gl.uniform4f(colorLoc, 0, 1, 0, 1);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.cubeIdx);
        gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
    }

    drawScene(scene) {
        if (!scene) return;
        const gl = this.gl;
        const program = this.programs.standard;
        gl.useProgram(program);

        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uViewMatrix'), false, this.viewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProjectionMatrix'), false, this.projectionMatrix);

        const posLoc = gl.getAttribLocation(program, 'aVertexPosition');
        const normLoc = gl.getAttribLocation(program, 'aVertexNormal');
        const colorLoc = gl.getUniformLocation(program, 'uColor');
        const modelLoc = gl.getUniformLocation(program, 'uModelMatrix');

        scene.getAllMaterias().forEach(materia => {
            if (!materia.isActive) return;

            const skinnedMesh = materia.getComponent(Components3D.SkinnedMeshRenderer3D);
            if (skinnedMesh && skinnedMesh.isLoaded) {
                this.drawSkinnedMesh(materia, skinnedMesh);
                return;
            }

            const mesh = materia.getComponent(Components3D.MeshRenderer3D);
            if (!mesh) return;

            const transform = materia.getComponent(Components.Transform);
            gl.uniformMatrix4fv(modelLoc, false, transform.worldMatrix);
            const color = this.hexToRgb(mesh.color);
            gl.uniform4f(colorLoc, color[0], color[1], color[2], 1.0);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.cube);
            gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(posLoc);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.cubeNorm);
            gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(normLoc);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.cubeIdx);
            gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
        });
    }

    drawSkinnedMesh(materia, mesh) {
        const gl = this.gl;
        const program = this.programs.skinned;
        gl.useProgram(program);

        const transform = materia.getComponent(Components.Transform);
        const color = this.hexToRgb(mesh.color);

        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProjectionMatrix'), false, this.projectionMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uViewMatrix'), false, this.viewMatrix);

        // Identity for skinned meshes as bone matrices are in world space
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModelMatrix'), false, mat4.create());
        gl.uniform4f(gl.getUniformLocation(program, 'uColor'), color[0], color[1], color[2], 1.0);

        if (mesh.boneMatrices) gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uBoneMatrices'), false, mesh.boneMatrices);

        if (mesh.isDirty && mesh.cpuPositions && mesh.buffers?.positions) {
            gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffers.positions);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, mesh.cpuPositions);
            mesh.isDirty = false;
        }

        const posLoc = gl.getAttribLocation(program, 'aVertexPosition');
        const normLoc = gl.getAttribLocation(program, 'aVertexNormal');
        const jointLoc = gl.getAttribLocation(program, 'aJointIndices');
        const weightLoc = gl.getAttribLocation(program, 'aJointWeights');

        if (mesh.buffers) {
            gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffers.positions);
            gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(posLoc);

            if (mesh.buffers.normals) {
                gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffers.normals);
                gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(normLoc);
            }

            if (mesh.buffers.joints) {
                gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffers.joints);
                gl.vertexAttribPointer(jointLoc, 4, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(jointLoc);
                gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffers.weights);
                gl.vertexAttribPointer(weightLoc, 4, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(weightLoc);
            }

            if (mesh.buffers.indices) {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.buffers.indices);
                gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
            } else {
                gl.drawArrays(gl.TRIANGLES, 0, mesh.indexCount);
            }
        }
    }

    resize() {
        if (!this.canvas || !this.gl) return;
        const displayWidth  = this.canvas.clientWidth;
        const displayHeight = this.canvas.clientHeight;
        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width  = displayWidth;
            this.canvas.height = displayHeight;
            this.gl.viewport(0, 0, displayWidth, displayHeight);
        }
    }

    createProgram(vsSource, fsSource) {
        const gl = this.gl;
        const vs = this.loadShader(gl.VERTEX_SHADER, vsSource);
        const fs = this.loadShader(gl.FRAGMENT_SHADER, fsSource);
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) console.error('Shader link error:', gl.getProgramInfoLog(program));
        return program;
    }

    loadShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    pick(scene, cameraMateria, x, y, options = {}) {
        if (!this.initialized || !this.gl) return null;
        const gl = this.gl;
        const w = gl.canvas.width, h = gl.canvas.height;

        if (!this.pickFB || this._pickW !== w || this._pickH !== h) {
            if (this.pickFB) { gl.deleteFramebuffer(this.pickFB); gl.deleteTexture(this.pickTex); gl.deleteRenderbuffer(this.pickDepth); }
            this.pickFB = gl.createFramebuffer();
            this.pickTex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.pickTex);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            this.pickDepth = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, this.pickDepth);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickFB);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pickTex, 0);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.pickDepth);
            this._pickW = w; this._pickH = h;
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickFB);
        gl.viewport(0, 0, w, h);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const program = this.programs.picking;
        gl.useProgram(program);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uViewMatrix'), false, this.lastViewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProjectionMatrix'), false, this.lastProjectionMatrix);

        const idMap = new Map();
        scene.getAllMaterias().forEach((m, index) => {
            if (!m.isActive || !m.getComponent(Components3D.MeshRenderer3D)) return;
            const id = index + 1;
            idMap.set(id, m.id);
            gl.uniform4f(gl.getUniformLocation(program, 'uPickColor'), (id & 0xFF)/255, ((id >> 8) & 0xFF)/255, ((id >> 16) & 0xFF)/255, 1.0);
            gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModelMatrix'), false, m.getComponent(Components.Transform).worldMatrix);
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.cube);
            gl.vertexAttribPointer(gl.getAttribLocation(program, 'aVertexPosition'), 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(gl.getAttribLocation(program, 'aVertexPosition'));
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.cubeIdx);
            gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
        });

        const pixels = new Uint8Array(4);
        const rect = gl.canvas.getBoundingClientRect();
        gl.readPixels((x / rect.width) * w, (h - 1) - (y / rect.height) * h, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return idMap.get(pixels[0] + (pixels[1] << 8) + (pixels[2] << 16)) || null;
    }

    hexToRgb(hex) {
        if (!hex || hex[0] !== '#') return [1, 1, 1];
        return [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255];
    }
}
