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

    init(options = {}) {
        if (this.initialized) return true;
        if (!this.canvas) return false;

        console.log('[Creative 3D Render] Initializing optimized WebGL context...');

        const glOptions = {
            antialias: true,
            alpha: true,
            preserveDrawingBuffer: options.preserveDrawingBuffer || false,
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
        gl.frontFace(gl.CCW); // standard WebGL/GLTF winding

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
                vNearPoint = unprojectPoint(aVertexPosition.x, aVertexPosition.y, -1.0, uInvView, uInvProj);
                vFarPoint = unprojectPoint(aVertexPosition.x, aVertexPosition.y, 1.0, uInvView, uInvProj);
                gl_Position = vec4(aVertexPosition.xy, 0.999, 1.0);
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
                float y = dir.y;
                vec3 color;
                if (y > 0.0) {
                    color = mix(uHorizonColor, uSkyColor, pow(clamp(y, 0.0, 1.0), 0.5));
                } else {
                    color = mix(uHorizonColor, uGroundColor, pow(clamp(-y, 0.0, 1.0), 0.5));
                }
                gl_FragColor = vec4(color, 1.0);
            }
        `;
        this.programs.sky = this.createProgram(skyVs, skyFs);

        // 2. Simple Standard Shader (supports Vertex Colors and Textures)
        const stdVs = `
            attribute vec4 aVertexPosition;
            attribute vec3 aVertexNormal;
            attribute vec2 aTextureCoord;
            attribute vec4 aVertexColor;
            uniform mat4 uModelMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;
            varying vec3 vNormal;
            varying vec4 vColor;
            varying vec2 vTextureCoord;
            varying vec3 vWorldPos;

            void main() {
                vec4 worldPos = uModelMatrix * aVertexPosition;
                vWorldPos = worldPos.xyz;
                gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
                vNormal = (uModelMatrix * vec4(aVertexNormal, 0.0)).xyz;
                vColor = aVertexColor;
                vTextureCoord = aTextureCoord;
            }
        `;
        const stdFs = `
            #extension GL_OES_standard_derivatives : enable
            precision mediump float;
            varying vec3 vNormal;
            varying vec4 vColor;
            varying vec2 vTextureCoord;
            varying vec3 vWorldPos;

            uniform vec4 uColor;
            uniform vec3 uLightDir;
            uniform sampler2D uMainTex;
            uniform sampler2D uNormalMap;
            uniform bool uUseMainTex;
            uniform bool uUseNormalMap;

            vec3 perturbNormal(vec3 surf_norm, vec3 view_pos, vec2 uv) {
                vec3 q1 = dFdx(view_pos);
                vec3 q2 = dFdy(view_pos);
                vec2 st1 = dFdx(uv);
                vec2 st2 = dFdy(uv);
                vec3 N = normalize(surf_norm);
                vec3 T = normalize(q1 * st2.t - q2 * st1.t);
                vec3 B = -normalize(cross(N, T));
                mat3 TBN = mat3(T, B, N);
                vec3 mapN = texture2D(uNormalMap, uv).xyz * 2.0 - 1.0;
                return normalize(TBN * mapN);
            }

            void main() {
                vec3 normal = normalize(vNormal);
                if (uUseNormalMap) {
                    normal = perturbNormal(normal, vWorldPos, vTextureCoord);
                }

                float diff = max(dot(normal, normalize(uLightDir)), 0.2);
                vec4 texColor = uUseMainTex ? texture2D(uMainTex, vTextureCoord) : vec4(1.0);
                vec4 baseColor = (vColor.a > 0.0) ? vColor : uColor;
                gl_FragColor = vec4(baseColor.rgb * texColor.rgb * diff, baseColor.a * texColor.a);
            }
        `;
        this.programs.standard = this.createProgram(stdVs, stdFs);

        // 2.1 Skinned Standard Shader
        const skinnedVs = `
            attribute vec4 aVertexPosition;
            attribute vec3 aVertexNormal;
            attribute vec2 aTextureCoord;
            attribute vec4 aJointIndices;
            attribute vec4 aJointWeights;
            attribute vec4 aVertexColor;

            uniform mat4 uModelMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;
            uniform mat4 uBoneMatrices[64];

            varying vec3 vNormal;
            varying vec4 vColor;
            varying vec2 vTextureCoord;
            varying vec3 vWorldPos;

            void main() {
                mat4 skinMatrix =
                    uBoneMatrices[int(aJointIndices.x)] * aJointWeights.x +
                    uBoneMatrices[int(aJointIndices.y)] * aJointWeights.y +
                    uBoneMatrices[int(aJointIndices.z)] * aJointWeights.z +
                    uBoneMatrices[int(aJointIndices.w)] * aJointWeights.w;

                vec4 worldPosition = uModelMatrix * skinMatrix * aVertexPosition;
                vWorldPos = worldPosition.xyz;
                gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;

                vNormal = (uModelMatrix * skinMatrix * vec4(aVertexNormal, 0.0)).xyz;
                vColor = aVertexColor;
                vTextureCoord = aTextureCoord;
            }
        `;

        const skinnedFs = `
            #extension GL_OES_standard_derivatives : enable
            precision mediump float;
            varying vec3 vNormal;
            varying vec4 vColor;
            varying vec2 vTextureCoord;
            varying vec3 vWorldPos;

            uniform vec4 uColor;
            uniform vec3 uLightDir;
            uniform sampler2D uMainTex;
            uniform sampler2D uNormalMap;
            uniform bool uUseMainTex;
            uniform bool uUseNormalMap;

            vec3 perturbNormal(vec3 surf_norm, vec3 view_pos, vec2 uv) {
                vec3 q1 = dFdx(view_pos);
                vec3 q2 = dFdy(view_pos);
                vec2 st1 = dFdx(uv);
                vec2 st2 = dFdy(uv);
                vec3 N = normalize(surf_norm);
                vec3 T = normalize(q1 * st2.t - q2 * st1.t);
                vec3 B = -normalize(cross(N, T));
                mat3 TBN = mat3(T, B, N);
                vec3 mapN = texture2D(uNormalMap, uv).xyz * 2.0 - 1.0;
                return normalize(TBN * mapN);
            }

            void main() {
                vec3 normal = normalize(vNormal);
                if (uUseNormalMap) {
                    normal = perturbNormal(normal, vWorldPos, vTextureCoord);
                }

                float diff = max(dot(normal, normalize(uLightDir)), 0.25);
                vec4 texColor = uUseMainTex ? texture2D(uMainTex, vTextureCoord) : vec4(1.0);
                vec3 baseColor = (vColor.a > 0.05) ? vColor.rgb : uColor.rgb;
                gl_FragColor = vec4(baseColor * texColor.rgb * diff, uColor.a * texColor.a);
            }
        `;

        this.programs.skinned = this.createProgram(skinnedVs, skinnedFs);

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
        // Quad for Full-screen effects / Sky (XY plane) - CCW winding: BL, BR, TR, BL, TR, TL
        const quadPos = new Float32Array([
            -1,-1,0,  1,-1,0,  1,1,0,
            -1,-1,0,  1,1,0, -1,1,0
        ]);
        this.buffers.quad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.quad);
        gl.bufferData(gl.ARRAY_BUFFER, quadPos, gl.STATIC_DRAW);

        // Plane for Floor (XZ plane) - Standard 1x1 unit - CCW: BL(-0.5,0,0.5), BR(0.5,0,0.5), TR(0.5,0,-0.5)
        const planePos = new Float32Array([
            -0.5,0,0.5, 0.5,0,0.5, 0.5,0,-0.5,
            -0.5,0,0.5, 0.5,0,-0.5, -0.5,0,-0.5
        ]);
        this.buffers.plane = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.plane);
        gl.bufferData(gl.ARRAY_BUFFER, planePos, gl.STATIC_DRAW);

        const planeUVs = new Float32Array([
            0,0, 1,0, 1,1,
            0,0, 1,1, 0,1
        ]);
        this.buffers.planeUV = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.planeUV);
        gl.bufferData(gl.ARRAY_BUFFER, planeUVs, gl.STATIC_DRAW);

        const cubePos = new Float32Array([
            -0.5,-0.5,0.5, 0.5,-0.5,0.5, 0.5,0.5,0.5, -0.5,0.5,0.5, // Front
            -0.5,-0.5,-0.5, -0.5,0.5,-0.5, 0.5,0.5,-0.5, 0.5,-0.5,-0.5, // Back
            -0.5,0.5,-0.5, -0.5,0.5,0.5, 0.5,0.5,0.5, 0.5,0.5,-0.5, // Top
            -0.5,-0.5,-0.5, 0.5,-0.5,-0.5, 0.5,-0.5,0.5, -0.5,-0.5,0.5, // Bottom
            0.5,-0.5,-0.5, 0.5,0.5,-0.5, 0.5,0.5,0.5, 0.5,-0.5,0.5, // Right
            -0.5,-0.5,-0.5, -0.5,-0.5,0.5, -0.5,0.5,0.5, -0.5,0.5,-0.5 // Left
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

        const cubeUVs = new Float32Array([
            0,0, 1,0, 1,1, 0,1, 0,0, 1,0, 1,1, 0,1,
            0,0, 1,0, 1,1, 0,1, 0,0, 1,0, 1,1, 0,1,
            0,0, 1,0, 1,1, 0,1, 0,0, 1,0, 1,1, 0,1
        ]);
        this.buffers.cubeUV = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.cubeUV);
        gl.bufferData(gl.ARRAY_BUFFER, cubeUVs, gl.STATIC_DRAW);

        const cubeIndices = new Uint16Array([
            0,1,2, 0,2,3, // Front
            4,5,6, 4,6,7, // Back
            8,9,10, 8,10,11, // Top
            12,13,14, 12,14,15, // Bottom
            16,17,18, 16,18,19, // Right
            20,21,22, 20,22,23  // Left
        ]);
        this.buffers.cubeIdx = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.cubeIdx);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cubeIndices, gl.STATIC_DRAW);

        // --- Sphere Geometry (UV Sphere) ---
        const latitudeBands = 20;
        const longitudeBands = 20;
        const radius = 0.5;
        const spherePositions = [];
        const sphereNormals = [];
        const sphereUVs = [];
        for (let latNumber = 0; latNumber <= latitudeBands; latNumber++) {
            const theta = latNumber * Math.PI / latitudeBands;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
            for (let longNumber = 0; longNumber <= longitudeBands; longNumber++) {
                const phi = longNumber * 2 * Math.PI / longitudeBands;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);
                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;
                sphereNormals.push(x, y, z);
                sphereUVs.push(1 - (longNumber / longitudeBands), 1 - (latNumber / latitudeBands));
                spherePositions.push(radius * x, radius * y, radius * z);
            }
        }
        const sphereIndices = [];
        for (let latNumber = 0; latNumber < latitudeBands; latNumber++) {
            for (let longNumber = 0; longNumber < longitudeBands; longNumber++) {
                const first = (latNumber * (longitudeBands + 1)) + longNumber;
                const second = first + longitudeBands + 1;
                sphereIndices.push(first, second, first + 1);
                sphereIndices.push(second, second + 1, first + 1);
            }
        }
        this.buffers.sphere = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.sphere);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spherePositions), gl.STATIC_DRAW);
        this.buffers.sphereNorm = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.sphereNorm);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereNormals), gl.STATIC_DRAW);
        this.buffers.sphereUV = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.sphereUV);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereUVs), gl.STATIC_DRAW);
        this.buffers.sphereIdx = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.sphereIdx);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sphereIndices), gl.STATIC_DRAW);
        this.sphereIndexCount = sphereIndices.length;

        // --- Triangle Geometry ---
        const triPos = new Float32Array([0, 0.5, 0, 0.5, -0.5, 0, -0.5, -0.5, 0]);
        this.buffers.triangle = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.triangle);
        gl.bufferData(gl.ARRAY_BUFFER, triPos, gl.STATIC_DRAW);
        this.buffers.triangleNorm = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.triangleNorm);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0,1, 0,0,1, 0,0,1]), gl.STATIC_DRAW);
        this.buffers.triangleUV = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.triangleUV);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.5,0, 0,1, 1,1]), gl.STATIC_DRAW);
    }

    render(scene, cameraMateria, options = {}) {
        if (!this.initialized && !this.init()) return;
        window._Renderer3D = this;
        const gl = this.gl;

        this.resize();

        let clearColor = [0.05, 0.05, 0.07];
        let clearFlags = 'SolidColor';
        if (cameraMateria) {
            const cam = cameraMateria.getComponent(Components.Camera);
            clearFlags = cam.clearFlags;
            if (cam.clearFlags === 'SolidColor') {
                const rgb = this.hexToRgb(cam.backgroundColor);
                clearColor = [rgb[0], rgb[1], rgb[2]];
            }
        }

        gl.clearColor(clearColor[0], clearColor[1], clearColor[2], options.clearAlpha !== undefined ? options.clearAlpha : 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const aspect = gl.canvas.width / gl.canvas.height;
        let near = 0.1;
        let far = 20000.0;

        if (cameraMateria) {
            const cam = cameraMateria.getComponent(Components.Camera);
            const transform = cameraMateria.getComponent(Components.Transform);
            near = cam.nearClipPlane || 0.1;
            far = cam.farClipPlane || 20000.0;

            if (cam.projection === 'Orthographic') {
                const size = cam.orthographicSize || 500;
                mat4.ortho(this.projectionMatrix, -size * aspect, size * aspect, -size, size, near, far);
            } else {
                mat4.perspective(this.projectionMatrix, (cam.fov || 60) * Math.PI / 180, aspect, near, far);
            }
            mat4.invert(this.viewMatrix, transform.worldMatrix);
        } else if (options.viewMatrix) {
            mat4.perspective(this.projectionMatrix, 45 * Math.PI / 180, aspect, near, far);
            mat4.copy(this.viewMatrix, options.viewMatrix);
        } else {
            mat4.perspective(this.projectionMatrix, 45 * Math.PI / 180, aspect, near, far);
            const cam = options.editorCamera || { x: 0, y: 200, z: 600, rotation: { x: -15, y: 0, z: 0 } };
            const q = quat.create();
            quat.fromEuler(q, cam.rotation.x, cam.rotation.y, cam.rotation.z);
            mat4.fromRotationTranslation(this.viewMatrix, q, [cam.x, cam.y, cam.z]);
            mat4.invert(this.viewMatrix, this.viewMatrix);
        }


        mat4.copy(this.lastProjectionMatrix, this.projectionMatrix);
        mat4.copy(this.lastViewMatrix, this.viewMatrix);

        const skyMode = scene?.ambiente?.skyMode || clearFlags;
        if (skyMode === 'Gradient' || skyMode === 'Skybox') {
            this.drawSky(scene?.ambiente || {});
        }

        if (options.showGrid !== false) {
            this.drawGrid(near, far);
            this.drawOriginAxes();
        }
        this.drawScene(scene, cameraMateria);
        if (options.isGameView) {
            // console.log("[Renderer3D] Rendered scene for game view");
        }
    }

    drawSky(ambiente) {
        const gl = this.gl;
        const program = this.programs.sky;
        gl.useProgram(program);

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
        gl.depthMask(false);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.depthMask(true);
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
        gl.drawArrays(gl.TRIANGLES, 0, 6);
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

        // Finite axes at origin
        const drawAxis = (scale, color) => {
            const m = mat4.create();
            mat4.scale(m, m, scale);
            gl.uniformMatrix4fv(modelLoc, false, m);
            gl.uniform4f(colorLoc, color[0], color[1], color[2], 1);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.cubeIdx);
            gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
        };

        drawAxis([0.2, 500, 0.2], [0, 1, 0]); // Y (Up/Down)
        drawAxis([500, 0.2, 0.2], [1, 0, 0]); // X
        drawAxis([0.2, 0.2, 500], [0, 0, 1]); // Z
    }

    drawScene(scene, cameraMateria = null) {
        if (!scene) return;
        const gl = this.gl;

        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.CULL_FACE);

        const cullingMask = cameraMateria ? cameraMateria.getComponent(Components.Camera).cullingMask : -1;
        const materias = scene.getAllMaterias();

        materias.forEach(materia => {
            if (!materia.isActive) return;
            if (cullingMask !== -1 && !(cullingMask & (1 << materia.layer))) return;

            const terrain = materia.getComponent(Components3D.Terreno3D);
            if (terrain) {
                this.drawTerreno3D(materia, terrain);
                return;
            }

            const skinnedMesh = materia.getComponent(Components3D.SkinnedMeshRenderer3D);
            if (skinnedMesh && skinnedMesh.isLoaded && skinnedMesh.isActive) {
                this.drawSkinnedMesh(materia, skinnedMesh);
                return;
            }

            const mesh = materia.getComponent(Components3D.MeshRenderer3D);
            if (!mesh || !mesh.isActive) return;

            const program = mesh.isUnlit ? this.programs.unlit : this.programs.standard;
            gl.useProgram(program);

            gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uViewMatrix'), false, this.viewMatrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProjectionMatrix'), false, this.projectionMatrix);
            if (!mesh.isUnlit) gl.uniform3f(gl.getUniformLocation(program, "uLightDir"), 0.5, 1.0, 0.3);
        gl.uniform1i(gl.getUniformLocation(program, "uUseMainTex"), 0);
        gl.uniform1i(gl.getUniformLocation(program, "uUseNormalMap"), 0);

            const posLoc = gl.getAttribLocation(program, 'aVertexPosition');
            const normLoc = !mesh.isUnlit ? gl.getAttribLocation(program, 'aVertexNormal') : -1;
            const uvLoc = !mesh.isUnlit ? gl.getAttribLocation(program, 'aTextureCoord') : -1;
            const colorLoc = gl.getUniformLocation(program, 'uColor');
            const modelLoc = gl.getUniformLocation(program, 'uModelMatrix');

            const transform = materia.getComponent(Components.Transform);
            gl.uniformMatrix4fv(modelLoc, false, transform.worldMatrix || mat4.create());
            const color = this.hexToRgb(mesh.color);
            gl.uniform4f(colorLoc, color[0], color[1], color[2], 1.0);

            // Textures
            if (!mesh.isUnlit) {
                const useMainTexLoc = gl.getUniformLocation(program, 'uUseMainTex');
                const useNormalMapLoc = gl.getUniformLocation(program, 'uUseNormalMap');

                if (mesh.texturePath) {
                    const tex = this.getTexture(mesh.texturePath);
                    if (tex) {
                        gl.activeTexture(gl.TEXTURE0);
                        gl.bindTexture(gl.TEXTURE_2D, tex);
                        gl.uniform1i(gl.getUniformLocation(program, 'uMainTex'), 0);
                        gl.uniform1i(useMainTexLoc, 1);
                    } else {
                        gl.uniform1i(useMainTexLoc, 0);
                    }
                } else {
                    gl.uniform1i(useMainTexLoc, 0);
                }

                if (mesh.normalMapPath) {
                    const norm = this.getTexture(mesh.normalMapPath);
                    if (norm) {
                        gl.activeTexture(gl.TEXTURE1);
                        gl.bindTexture(gl.TEXTURE_2D, norm);
                        gl.uniform1i(gl.getUniformLocation(program, 'uNormalMap'), 1);
                        gl.uniform1i(useNormalMapLoc, 1);
                    } else {
                        gl.uniform1i(useNormalMapLoc, 0);
                    }
                } else {
                    gl.uniform1i(useNormalMapLoc, 0);
                }
            }

            // Handle Primitives
            if (mesh.meshType === 'Cube' || !mesh.meshType) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.cube);
                gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(posLoc);
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.cubeNorm);
                gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(normLoc);
                if (uvLoc !== -1) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.cubeUV);
                    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
                    gl.enableVertexAttribArray(uvLoc);
                }
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.cubeIdx);
                gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
            } else if (mesh.meshType === 'Sphere' || mesh.meshType === 'Capsule') {
                // Approximate capsule with sphere for now if needed, but we used sphere for wheels
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.sphere);
                gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(posLoc);
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.sphereNorm);
                gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(normLoc);
                if (uvLoc !== -1) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.sphereUV);
                    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
                    gl.enableVertexAttribArray(uvLoc);
                }
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.sphereIdx);
                gl.drawElements(gl.TRIANGLES, this.sphereIndexCount, gl.UNSIGNED_SHORT, 0);
            } else if (mesh.meshType === 'Plane') {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.plane);
                gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(posLoc);
                // Simple normal for plane (pointing UP in world = +Y)
                if (normLoc !== -1) {
                    gl.disableVertexAttribArray(normLoc);
                    gl.vertexAttrib3f(normLoc, 0, 1, 0);
                }
                if (uvLoc !== -1) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.planeUV);
                    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
                    gl.enableVertexAttribArray(uvLoc);
                }
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            } else if (mesh.meshType === 'Triangle') {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.triangle);
                gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(posLoc);
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.triangleNorm);
                gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(normLoc);
                if (uvLoc !== -1) {
                    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.triangleUV);
                    gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
                    gl.enableVertexAttribArray(uvLoc);
                }
                gl.drawArrays(gl.TRIANGLES, 0, 3);
            }
        });
    }

    drawTerreno3D(materia, terrain) {
        const gl = this.gl;
        const program = this.programs.standard;
        gl.useProgram(program);

        const transform = materia.getComponent(Components.Transform);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProjectionMatrix'), false, this.projectionMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uViewMatrix'), false, this.viewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModelMatrix'), false, transform.worldMatrix || mat4.create());
        gl.uniform3f(gl.getUniformLocation(program, "uLightDir"), 0.5, 1.0, 0.3);
        gl.uniform1i(gl.getUniformLocation(program, "uUseMainTex"), 0);
        gl.uniform1i(gl.getUniformLocation(program, "uUseNormalMap"), 0);

        const color = this.hexToRgb(terrain.color);
        gl.uniform4f(gl.getUniformLocation(program, 'uColor'), color[0], color[1], color[2], 1.0);

        if (!terrain._glBuffers) terrain._glBuffers = new Map();
        let buffers = terrain._glBuffers.get(gl);

        if (!buffers && terrain.cpuPositions) {
            buffers = {
                positions: gl.createBuffer(),
                normals: gl.createBuffer(),
                colors: gl.createBuffer(),
                indices: gl.createBuffer()
            };
            terrain._glBuffers.set(gl, buffers);
            terrain.isBuffersDirty = true;
        }

        if (terrain.isBuffersDirty && buffers) {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positions);
            gl.bufferData(gl.ARRAY_BUFFER, terrain.cpuPositions, gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normals);
            gl.bufferData(gl.ARRAY_BUFFER, terrain.cpuNormals, gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.colors);
            gl.bufferData(gl.ARRAY_BUFFER, terrain.cpuColors, gl.STATIC_DRAW);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, terrain.cpuIndices, gl.STATIC_DRAW);
            terrain.isBuffersDirty = false;
        }

        if (buffers) {
            const posLoc = gl.getAttribLocation(program, 'aVertexPosition');
            const normLoc = gl.getAttribLocation(program, 'aVertexNormal');
            const colorLoc = gl.getAttribLocation(program, 'aVertexColor');

            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positions);
            gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(posLoc);

            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normals);
            gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(normLoc);

            if (colorLoc !== -1) {
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.colors);
                gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(colorLoc);
            }

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
            gl.drawElements(gl.TRIANGLES, terrain.indexCount, gl.UNSIGNED_SHORT, 0);
        }

        // --- Draw Foliage (Grass/Flowers) ---
        if (terrain.grass && terrain.grass.length > 0) {
            const unlitProg = this.programs.unlit;
            gl.useProgram(unlitProg);
            gl.uniformMatrix4fv(gl.getUniformLocation(unlitProg, 'uProjectionMatrix'), false, this.projectionMatrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(unlitProg, 'uViewMatrix'), false, this.viewMatrix);
            const uModelLoc = gl.getUniformLocation(unlitProg, 'uModelMatrix');
            const uColorLoc = gl.getUniformLocation(unlitProg, 'uColor');

            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.quad);
            gl.vertexAttribPointer(gl.getAttribLocation(unlitProg, 'aVertexPosition'), 3, gl.FLOAT, false, 0, 0);

            // Simple billboarded cross-quads for grass
            terrain.grass.forEach(g => {
                const m = mat4.create();
                const worldPos = vec3.transformMat4(vec3.create(), g.pos, transform.worldMatrix);
                mat4.fromRotationTranslationScale(m, quat.fromEuler(quat.create(), g.rot.x, g.rot.y, g.rot.z), worldPos, [g.scale * 20, g.scale * 20, g.scale * 20]);

                // Align to camera (Billboard)
                m[0] = this.viewMatrix[0]; m[1] = this.viewMatrix[4]; m[2] = this.viewMatrix[8];
                m[4] = this.viewMatrix[1]; m[5] = this.viewMatrix[5]; m[6] = this.viewMatrix[9];
                m[8] = this.viewMatrix[2]; m[9] = this.viewMatrix[6]; m[10] = this.viewMatrix[10];

                gl.uniformMatrix4fv(uModelLoc, false, m);
                gl.uniform4f(uColorLoc, 0.4, 0.8, 0.2, 1.0); // Grass green
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            });
        }
    }

    drawSkinnedMesh(materia, mesh) {
        const gl = this.gl;
        const program = this.programs.skinned;
        gl.useProgram(program);

        const transform = materia.getComponent(Components.Transform);
        const color = this.hexToRgb(mesh.color);

        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProjectionMatrix'), false, this.projectionMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uViewMatrix'), false, this.viewMatrix);
        gl.uniform3f(gl.getUniformLocation(program, "uLightDir"), 0.5, 1.0, 0.3);
        gl.uniform1i(gl.getUniformLocation(program, "uUseMainTex"), 0);
        gl.uniform1i(gl.getUniformLocation(program, "uUseNormalMap"), 0);

        // Identity for skinned meshes as bone matrices are in world space.
        // If it's a non-skinned primitive of a model, use the world matrix.
        const hasSkeleton = !!(mesh.skeleton && mesh.skeleton.joints && mesh.skeleton.joints.length > 0);
        const modelMatrix = hasSkeleton ? mat4.create() : (transform.worldMatrix || mat4.create());
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModelMatrix'), false, modelMatrix);
        gl.uniform4f(gl.getUniformLocation(program, 'uColor'), color[0], color[1], color[2], 1.0);

        if (mesh.boneMatrices) gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uBoneMatrices'), false, mesh.boneMatrices);

        // Textures
        const useMainTexLoc = gl.getUniformLocation(program, 'uUseMainTex');
        const useNormalMapLoc = gl.getUniformLocation(program, 'uUseNormalMap');

        if (mesh.texturePath) {
            const tex = this.getTexture(mesh.texturePath);
            if (tex) {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, tex);
                gl.uniform1i(gl.getUniformLocation(program, 'uMainTex'), 0);
                gl.uniform1i(useMainTexLoc, 1);
            } else {
                gl.uniform1i(useMainTexLoc, 0);
            }
        } else {
            gl.uniform1i(useMainTexLoc, 0);
        }

        if (mesh.normalMapPath) {
            const norm = this.getTexture(mesh.normalMapPath);
            if (norm) {
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, norm);
                gl.uniform1i(gl.getUniformLocation(program, 'uNormalMap'), 1);
                gl.uniform1i(useNormalMapLoc, 1);
            } else {
                gl.uniform1i(useNormalMapLoc, 0);
            }
        } else {
            gl.uniform1i(useNormalMapLoc, 0);
        }

        // --- Multi-context Buffer Management ---
        if (!mesh._glBuffers) mesh._glBuffers = new Map();
        let buffers = mesh._glBuffers.get(gl);

        if (!buffers && mesh.cpuPositions) {
            buffers = {
                positions: gl.createBuffer(),
                normals: mesh.cpuNormals ? gl.createBuffer() : null,
                uvs: mesh.cpuUVs ? gl.createBuffer() : null,
                colors: mesh.cpuColors ? gl.createBuffer() : null,
                indices: mesh.cpuIndices ? gl.createBuffer() : null,
                joints: mesh.cpuJoints ? gl.createBuffer() : null,
                weights: mesh.cpuWeights ? gl.createBuffer() : null
            };
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positions);
            gl.bufferData(gl.ARRAY_BUFFER, mesh.cpuPositions, gl.STATIC_DRAW);
            if (buffers.normals) { gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normals); gl.bufferData(gl.ARRAY_BUFFER, mesh.cpuNormals, gl.STATIC_DRAW); }
            if (buffers.uvs) { gl.bindBuffer(gl.ARRAY_BUFFER, buffers.uvs); gl.bufferData(gl.ARRAY_BUFFER, mesh.cpuUVs, gl.STATIC_DRAW); }
            if (buffers.colors) { gl.bindBuffer(gl.ARRAY_BUFFER, buffers.colors); gl.bufferData(gl.ARRAY_BUFFER, mesh.cpuColors, gl.STATIC_DRAW); }
            if (buffers.joints) { gl.bindBuffer(gl.ARRAY_BUFFER, buffers.joints); gl.bufferData(gl.ARRAY_BUFFER, mesh.cpuJoints, gl.STATIC_DRAW); }
            if (buffers.weights) { gl.bindBuffer(gl.ARRAY_BUFFER, buffers.weights); gl.bufferData(gl.ARRAY_BUFFER, mesh.cpuWeights, gl.STATIC_DRAW); }
            if (buffers.indices) { gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.cpuIndices, gl.STATIC_DRAW); }
            mesh._glBuffers.set(gl, buffers);
        }

        if (mesh.isDirty && mesh.cpuPositions && buffers?.positions) {
            if (!mesh._glDirtyFlags) mesh._glDirtyFlags = new Map();
            if (!mesh._glDirtyFlags.get(gl)) {
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positions);
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, mesh.cpuPositions);
                mesh._glDirtyFlags.set(gl, true);

                // If all active renderers have updated, reset the main isDirty
                // This is a bit simplified, but works for Scene/Game view
                let allDone = true;
                if (window._Renderer3D && window._Renderer3D.gl !== gl) allDone = false;
                // Since we usually only have 2 renderers max, we can just check if this is the last one
                if (mesh._glDirtyFlags.size >= 2) {
                    mesh.isDirty = false;
                    mesh._glDirtyFlags.clear();
                }
            }
        }

        const posLoc = gl.getAttribLocation(program, 'aVertexPosition');
        const normLoc = gl.getAttribLocation(program, 'aVertexNormal');
        const uvLoc = gl.getAttribLocation(program, 'aTextureCoord');
        const colorLoc = gl.getAttribLocation(program, 'aVertexColor');
        const jointLoc = gl.getAttribLocation(program, 'aJointIndices');
        const weightLoc = gl.getAttribLocation(program, 'aJointWeights');

        if (buffers) {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positions);
            gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(posLoc);

            if (buffers.normals) {
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normals);
                gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(normLoc);
            }

            if (buffers.uvs) {
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.uvs);
                gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(uvLoc);
            }

            if (buffers.colors) {
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.colors);
                gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(colorLoc);
            } else if (colorLoc !== -1) {
                gl.disableVertexAttribArray(colorLoc);
                gl.vertexAttrib4f(colorLoc, 0, 0, 0, 0);
            }

            if (buffers.joints && hasSkeleton) {
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.joints);
                gl.vertexAttribPointer(jointLoc, 4, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(jointLoc);
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.weights);
                gl.vertexAttribPointer(weightLoc, 4, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(weightLoc);
            } else {
                if (jointLoc !== -1) {
                    gl.disableVertexAttribArray(jointLoc);
                    gl.vertexAttrib4f(jointLoc, 0, 0, 0, 0);
                }
                if (weightLoc !== -1) {
                    gl.disableVertexAttribArray(weightLoc);
                    gl.vertexAttrib4f(weightLoc, 1, 0, 0, 0); // Use first bone with weight 1
                }
            }

            if (buffers.indices) {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
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

    getTexture(path) {
        if (!path) return null;
        if (this.textureCache.has(path)) return this.textureCache.get(path);

        const gl = this.gl;
        const texture = gl.createTexture();
        this.textureCache.set(path, texture);

        // Fill with a 1x1 white pixel while loading
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));

        (async () => {
            const { getURLForAssetPath } = await import('./AssetUtils.js');
            const url = await getURLForAssetPath(path, window.projectsDirHandle);
            if (!url) return;

            const img = new Image();
            img.onload = () => {
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

                // Check if dimensions are power of 2
                if ((img.width & (img.width - 1)) === 0 && (img.height & (img.height - 1)) === 0) {
                    gl.generateMipmap(gl.TEXTURE_2D);
                } else {
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                }
            };
            img.src = url;
        })();

        return texture;
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

        const posLoc = gl.getAttribLocation(program, 'aVertexPosition');
        const modelLoc = gl.getUniformLocation(program, 'uModelMatrix');
        const pickColorLoc = gl.getUniformLocation(program, 'uPickColor');

        const idMap = new Map();
        scene.getAllMaterias().forEach((m, index) => {
            if (!m.isActive) return;
            const mesh = m.getComponent(Components3D.MeshRenderer3D);
            if (!mesh) return;

            const id = index + 1;
            idMap.set(id, m.id);
            gl.uniform4f(pickColorLoc, (id & 0xFF)/255, ((id >> 8) & 0xFF)/255, ((id >> 16) & 0xFF)/255, 1.0);
            gl.uniformMatrix4fv(modelLoc, false, m.getComponent(Components.Transform).worldMatrix);

            if (mesh.meshType === 'Cube' || !mesh.meshType) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.cube);
                gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(posLoc);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.cubeIdx);
                gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
            } else if (mesh.meshType === 'Sphere' || mesh.meshType === 'Capsule') {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.sphere);
                gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(posLoc);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.sphereIdx);
                gl.drawElements(gl.TRIANGLES, this.sphereIndexCount, gl.UNSIGNED_SHORT, 0);
            } else if (mesh.meshType === 'Plane') {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.plane);
                gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(posLoc);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
            } else if (mesh.meshType === 'Triangle') {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.triangle);
                gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(posLoc);
                gl.drawArrays(gl.TRIANGLES, 0, 3);
            }
        });

        const pixels = new Uint8Array(4);
        const rect = gl.canvas.getBoundingClientRect();
        gl.readPixels((x / rect.width) * w, (h - 1) - (y / rect.height) * h, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return idMap.get(pixels[0] + (pixels[1] << 8) + (pixels[2] << 16)) || null;
    }

    hexToRgb(hex) {
        if (!hex || hex[0] !== '#') return [1, 1, 1];
        if (hex.length === 4) {
            return [
                parseInt(hex[1] + hex[1], 16) / 255,
                parseInt(hex[2] + hex[2], 16) / 255,
                parseInt(hex[3] + hex[3], 16) / 255
            ];
        }
        return [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255];
    }
}
