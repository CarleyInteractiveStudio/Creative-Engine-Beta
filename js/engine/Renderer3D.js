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
        gl.frontFace(gl.CCW);

        this.initShaders();
        this.initBasicGeometry();

        this.initialized = true;
        return true;
    }

    initShaders() {
        const gl = this.gl;

        // 1. Infinite Grid & Axes Shader
        // Optimized to use ray-plane intersection on a single quad covering the screen
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
                // We use a full-screen quad but pass near/far world positions to the fragment shader
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

                vec4 color = vec4(0.2, 0.2, 0.2, 1.0 - min(line, 1.0));

                if (drawAxes) {
                    // X Axis (Red)
                    if (fragPos3D.z > -0.1 * minimumz && fragPos3D.z < 0.1 * minimumz)
                        color = vec4(1.0, 0.2, 0.2, 1.0);
                    // Z Axis (Blue)
                    if (fragPos3D.x > -0.1 * minimumx && fragPos3D.x < 0.1 * minimumx)
                        color = vec4(0.2, 0.4, 1.0, 1.0);
                }

                return color;
            }

            float computeDepth(vec3 pos) {
                vec4 clipSpacePos = uProj * uView * vec4(pos.xyz, 1.0);
                return (clipSpacePos.z / clipSpacePos.w) * 0.5 + 0.5;
            }

            void main() {
                float t = -vNearPoint.y / (vFarPoint.y - vNearPoint.y);
                if (t < 0.0) discard;

                vec3 fragPos3D = vNearPoint + t * (vFarPoint - vNearPoint);

                gl_FragDepthEXT = computeDepth(fragPos3D);

                float linearDepth = (2.0 * uNear * uFar) / (uFar + uNear - (gl_FragDepthEXT * 2.0 - 1.0) * (uFar - uNear));
                float fading = max(0.0, (0.5 - linearDepth / uFar));

                // Combine major and minor grids
                vec4 color = (grid(fragPos3D, 0.1, true) + grid(fragPos3D, 0.01, false) * 0.5);
                color.a *= fading;

                if (color.a < 0.05) discard;
                gl_FragColor = color;
            }
        `;

        this.programs.grid = this.createProgram(gridVs, gridFs);

        // 2. Simple Standard Shader (Unlit/Vertex Color for now, expandable)
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
                float diff = max(dot(normalize(vNormal), lightDir), 0.3);
                gl_FragColor = vec4(uColor.rgb * diff, uColor.a);
            }
        `;
        this.programs.standard = this.createProgram(stdVs, stdFs);
    }

    initBasicGeometry() {
        const gl = this.gl;

        // Screen-space quad for Grid
        const quadPos = new Float32Array([-1,1,0, 1,1,0, -1,-1,0, 1,-1,0]);
        this.buffers.quad = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.quad);
        gl.bufferData(gl.ARRAY_BUFFER, quadPos, gl.STATIC_DRAW);

        // Basic Cube
        const cubePos = new Float32Array([
            -0.5,-0.5,0.5, 0.5,-0.5,0.5, 0.5,0.5,0.5, -0.5,0.5,0.5, -0.5,-0.5,-0.5, -0.5,0.5,-0.5, 0.5,0.5,-0.5, 0.5,-0.5,-0.5,
            -0.5,0.5,-0.5, -0.5,0.5,0.5, 0.5,0.5,0.5, 0.5,0.5,-0.5, -0.5,-0.5,-0.5, 0.5,-0.5,-0.5, 0.5,-0.5,0.5, -0.5,-0.5,0.5,
            0.5,-0.5,-0.5, 0.5,0.5,-0.5, 0.5,0.5,0.5, 0.5,-0.5,0.5, -0.5,-0.5,-0.5, -0.5,-0.5,0.5, -0.5,0.5,0.5, -0.5,0.5,-0.5
        ]);
        this.buffers.cube = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.cube);
        gl.bufferData(gl.ARRAY_BUFFER, cubePos, gl.STATIC_DRAW);

        const cubeIndices = new Uint16Array([0,1,2, 0,2,3, 4,5,6, 4,6,7, 8,9,10, 8,10,11, 12,13,14, 12,14,15, 16,17,18, 16,18,19, 20,21,22, 20,22,23]);
        this.buffers.cubeIdx = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.cubeIdx);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, cubeIndices, gl.STATIC_DRAW);
    }

    render(scene, cameraMateria, options = {}) {
        if (!this.initialized && !this.init()) return;
        const gl = this.gl;

        // Setup Viewport
        this.resize();
        gl.clearColor(0.1, 0.1, 0.12, options.clearAlpha !== undefined ? options.clearAlpha : 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const aspect = gl.canvas.width / gl.canvas.height;
        const near = 0.1;
        const far = 10000.0;

        // Setup Projection & View
        mat4.perspective(this.projectionMatrix, 45 * Math.PI / 180, aspect, near, far);

        if (cameraMateria) {
            const transform = cameraMateria.getComponent(Components.Transform);
            mat4.copy(this.viewMatrix, transform.worldMatrix);
            mat4.invert(this.viewMatrix, this.viewMatrix);
        } else {
            const cam = options.editorCamera || { x: 0, y: 150, z: 500, rotation: { x: -20, y: 0, z: 0 } };
            const q = quat.create();
            quat.fromEuler(q, cam.rotation.x, cam.rotation.y, cam.rotation.z);
            mat4.fromRotationTranslation(this.viewMatrix, q, [cam.x, cam.y, cam.z]);
            mat4.invert(this.viewMatrix, this.viewMatrix);
        }

        // Global Y-Flip for 2D consistency (+Y is down in CE 2D)
        mat4.scale(this.projectionMatrix, this.projectionMatrix, [1, -1, 1]);

        mat4.copy(this.lastProjectionMatrix, this.projectionMatrix);
        mat4.copy(this.lastViewMatrix, this.viewMatrix);

        // 1. Draw Infinite Grid
        if (options.showGrid !== false) {
            this.drawGrid(near, far);
        }

        // 2. Draw Scene Objects
        this.drawScene(scene);

        // 3. Draw Origin Axis Lines (Y-axis vertical line)
        this.drawOriginAxes();
    }

    drawGrid(near, far) {
        const gl = this.gl;
        const program = this.programs.grid;
        gl.useProgram(program);

        const invView = mat4.create();
        mat4.invert(invView, this.viewMatrix);
        const invProj = mat4.create();
        mat4.invert(invProj, this.projectionMatrix);

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
        const program = this.programs.standard;
        gl.useProgram(program);

        const posLoc = gl.getAttribLocation(program, 'aVertexPosition');
        const colorLoc = gl.getUniformLocation(program, 'uColor');
        const modelLoc = gl.getUniformLocation(program, 'uModelMatrix');

        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uViewMatrix'), false, this.viewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProjectionMatrix'), false, this.projectionMatrix);

        // Y-Axis Line (Green) - Using a very thin long cube as a "line"
        const yModel = mat4.create();
        mat4.fromScaling(yModel, [0.05, 10000, 0.05]);
        gl.uniformMatrix4fv(modelLoc, false, yModel);
        gl.uniform4f(colorLoc, 0.2, 1.0, 0.2, 1.0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.cube);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(posLoc);
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
        const colorLoc = gl.getUniformLocation(program, 'uColor');
        const modelLoc = gl.getUniformLocation(program, 'uModelMatrix');

        scene.getAllMaterias().forEach(materia => {
            if (!materia.isActive) return;
            const mesh = materia.getComponent(Components3D.MeshRenderer3D);
            if (!mesh) return;

            const transform = materia.getComponent(Components.Transform);

            gl.uniformMatrix4fv(modelLoc, false, transform.worldMatrix);
            const color = this.hexToRgb(mesh.color);
            gl.uniform4f(colorLoc, color[0], color[1], color[2], 1.0);

            // For now, everything is a cube in this simple optimized version
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.cube);
            gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(posLoc);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.cubeIdx);
            gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
        });
    }

    resize() {
        if (!this.canvas) return;
        const displayWidth  = this.canvas.clientWidth;
        const displayHeight = this.canvas.clientHeight;

        if (this.canvas.width !== displayWidth || this.canvas.height !== displayHeight) {
            this.canvas.width  = displayWidth;
            this.canvas.height = displayHeight;
            this.gl.viewport(0, 0, displayWidth, displayHeight);
        }
    }

    // Utilities
    createProgram(vsSource, fsSource) {
        const gl = this.gl;
        const vs = this.loadShader(gl.VERTEX_SHADER, vsSource);
        const fs = this.loadShader(gl.FRAGMENT_SHADER, fsSource);
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Shader link error:', gl.getProgramInfoLog(program));
        }
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

    hexToRgb(hex) {
        if (!hex || hex[0] !== '#') return [1, 1, 1];
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return [r, g, b];
    }
}
