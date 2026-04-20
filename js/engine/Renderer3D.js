import * as Components from './Components.js';
import * as Components3D from './Components3D.js';
window.Components3D = Components3D; // Ensure global access for Inspector and Editor
const { Transform, SpriteRenderer, Camera } = Components;
const { MeshRenderer3D, DirectionalLight3D, PointLight3D, SpotLight3D } = Components3D;

// Import gl-matrix for 3D math via importmap
import * as glMatrix from 'gl-matrix';
const { mat4, vec3, quat } = glMatrix;
window.glMatrix = glMatrix; // Expose to global scope for other 3D modules

export class Renderer3D {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = null;
        this.initialized = false;
        this.textureCache = new Map();
    }

    clearCache() {
        if (!this.gl) return;
        this.textureCache.forEach(tex => {
            this.gl.deleteTexture(tex);
        });
        this.textureCache.clear();
        console.log(`[Renderer3D] Texture cache cleared for ${this.canvas.id}`);
    }

    init() {
        if (this.initialized) return true;
        if (!this.canvas) return false;

        console.log(`[Renderer3D] Initializing WebGL context for canvas: ${this.canvas.id}`);
        this.gl = this.canvas.getContext('webgl', { antialias: true, alpha: true, preserveDrawingBuffer: false });
        if (!this.gl) {
            console.error('WebGL not supported');
            return false;
        }

        // Enable extensions for high-quality grid
        this.gl.getExtension('OES_standard_derivatives');
        this.gl.getExtension('EXT_frag_depth');

        // RAM OPTIMIZATION: Clear any existing texture cache before init
        if (this.textureCache) this.textureCache.clear();

        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.initShaders();
        this.initBuffers();
        this.initialized = true;
        return true;
    }

    initShaders() {
        const gl = this.gl;

        // --- Sky Shader ---
        const skyVsSource = `
            attribute vec4 aVertexPosition;
            varying vec3 vWorldPos;
            void main() {
                vWorldPos = aVertexPosition.xyz;
                gl_Position = aVertexPosition;
                gl_Position.z = 1.0; // Stay at far plane
            }
        `;
        const skyFsSource = `
            precision mediump float;
            varying vec3 vWorldPos;
            uniform vec3 uSkyColor;
            uniform vec3 uHorizonColor;
            uniform vec3 uGroundColor;
            uniform mat4 uInvViewProj;

            void main() {
                // Reconstruct world direction from screen position
                vec4 clipPos = vec4(vWorldPos.xy, 1.0, 1.0);
                vec4 worldPos = uInvViewProj * clipPos;
                vec3 dir = normalize(worldPos.xyz / worldPos.w);

                float height = dir.y;
                vec3 color;
                if (height > 0.0) {
                    color = mix(uHorizonColor, uSkyColor, pow(height, 0.5));
                } else {
                    color = mix(uHorizonColor, uGroundColor, pow(-height, 0.5));
                }
                gl_FragColor = vec4(color, 1.0);
            }
        `;
        this.skyProgram = this.initShaderProgram(gl, skyVsSource, skyFsSource);
        this.skyProgramInfo = {
            program: this.skyProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(this.skyProgram, 'aVertexPosition'),
            },
            uniformLocations: {
                uSkyColor: gl.getUniformLocation(this.skyProgram, 'uSkyColor'),
                uHorizonColor: gl.getUniformLocation(this.skyProgram, 'uHorizonColor'),
                uGroundColor: gl.getUniformLocation(this.skyProgram, 'uGroundColor'),
                uInvViewProj: gl.getUniformLocation(this.skyProgram, 'uInvViewProj'),
            },
        };

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
            uniform float uRealismLevel; // 0 to 1
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
                vec3 viewDir = normalize(uViewPosition - vPosition);
                vec4 baseColor = uColor;
                if (uUseTexture) {
                    baseColor *= texture2D(uSampler, vTextureCoord);
                }

                if (baseColor.a < 0.1) discard;

                // Directional Light
                vec3 dirLightDir = normalize(-uDirLightDir);
                float diff = max(dot(normal, dirLightDir), 0.0);

                // Specular (PBR-lite for realism)
                vec3 reflectDir = reflect(-dirLightDir, normal);
                float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
                vec3 specular = uDirLightColor * spec * uRealismLevel;

                // Point Lights
                vec3 pointDiffuse = vec3(0.0);
                vec3 pointSpecular = vec3(0.0);
                for(int i = 0; i < MAX_POINT_LIGHTS; i++) {
                    if (i >= uPointLightCount) break;
                    vec3 lightDir = normalize(uPointLightPos[i] - vPosition);
                    float dist = length(uPointLightPos[i] - vPosition);
                    float atten = max(0.0, 1.0 - (dist / uPointLightRange[i]));

                    float pDiff = max(dot(normal, lightDir), 0.0);
                    pointDiffuse += uPointLightColor[i] * pDiff * atten;

                    vec3 pReflectDir = reflect(-lightDir, normal);
                    float pSpec = pow(max(dot(viewDir, pReflectDir), 0.0), 16.0);
                    pointSpecular += uPointLightColor[i] * pSpec * atten * uRealismLevel;
                }

                if (uUseToon) {
                    if (diff > 0.95) diff = 1.0;
                    else if (diff > 0.5) diff = 0.7;
                    else if (diff > 0.25) diff = 0.4;
                    else diff = 0.2;

                    pointDiffuse = step(0.1, pointDiffuse) * 0.8;
                    specular = vec3(0.0);
                    pointSpecular = vec3(0.0);
                }

                vec3 diffuse = (diff * uDirLightColor) + pointDiffuse;
                vec3 finalColor = (uAmbientLight + diffuse) * baseColor.rgb + specular + pointSpecular;

                // Fresnel edge lighting for realism
                float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0) * 0.5 * uRealismLevel;
                finalColor += uDirLightColor * fresnel;

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
                uRealismLevel: gl.getUniformLocation(this.shaderProgram, 'uRealismLevel'),
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

        // --- Post-Processing Shader (Realism Filter) ---
        const postVsSource = `
            attribute vec4 aVertexPosition;
            varying vec2 vTexCoord;
            void main() {
                vTexCoord = aVertexPosition.xy * 0.5 + 0.5;
                gl_Position = aVertexPosition;
            }
        `;
        const postFsSource = `
            precision mediump float;
            varying vec2 vTexCoord;
            uniform sampler2D uSampler;
            uniform bool uEnableFilter;
            uniform float uRealismLevel;

            void main() {
                vec4 color = texture2D(uSampler, vTexCoord);
                if (!uEnableFilter) {
                    gl_FragColor = color;
                    return;
                }

                // Cinematic adjustments
                vec3 finalColor = color.rgb;

                // Contrast
                finalColor = (finalColor - 0.5) * (1.1 + uRealismLevel * 0.2) + 0.5;

                // Saturation
                float gray = dot(finalColor, vec3(0.299, 0.587, 0.114));
                finalColor = mix(vec3(gray), finalColor, 1.1 + uRealismLevel * 0.1);

                // Vignette
                float dist = distance(vTexCoord, vec2(0.5, 0.5));
                finalColor *= smoothstep(0.8, 0.45, dist * (0.9 + uRealismLevel * 0.1));

                gl_FragColor = vec4(finalColor, color.a);
            }
        `;
        this.postProgram = this.initShaderProgram(gl, postVsSource, postFsSource);
        this.postProgramInfo = {
            program: this.postProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(this.postProgram, 'aVertexPosition'),
            },
            uniformLocations: {
                uSampler: gl.getUniformLocation(this.postProgram, 'uSampler'),
                uEnableFilter: gl.getUniformLocation(this.postProgram, 'uEnableFilter'),
                uRealismLevel: gl.getUniformLocation(this.postProgram, 'uRealismLevel'),
            },
        };

        this.textureCache = new Map();

        // --- Post-Processing Buffers ---
        this.postBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.postBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1, 1,1, -1,-1, 1,-1]), gl.STATIC_DRAW);

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

        // --- Infinite Grid Shader ---
        const gridVsSource = `
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

        const gridFsSource = `
            #extension GL_OES_standard_derivatives : enable
            #extension GL_EXT_frag_depth : enable
            precision mediump float;
            varying vec3 vNearPoint;
            varying vec3 vFarPoint;
            uniform mat4 uView;
            uniform mat4 uProj;
            uniform float uNear;
            uniform float uFar;

            vec4 grid(vec3 fragPos3D, float scale) {
                vec2 coord = fragPos3D.xz * scale;
                vec2 derivative = fwidth(coord);
                vec2 grid = abs(fract(coord - 0.5) - 0.5) / derivative;
                float line = min(grid.x, grid.y);
                float minimumz = min(derivative.y, 1.0);
                float minimumx = min(derivative.x, 1.0);
                vec4 color = vec4(0.2, 0.2, 0.2, 1.0 - min(line, 1.0));

                // Z-Axis (Blue)
                if (fragPos3D.x > -0.1 * minimumx && fragPos3D.x < 0.1 * minimumx)
                    color.rgb = vec3(0.0, 0.0, 1.0);
                // X-Axis (Red)
                if (fragPos3D.z > -0.1 * minimumz && fragPos3D.z < 0.1 * minimumz)
                    color.rgb = vec3(1.0, 0.0, 0.0);

                return color;
            }

            float computeDepth(vec3 pos) {
                vec4 clipSpacePos = uProj * uView * vec4(pos.xyz, 1.0);
                return (clipSpacePos.z / clipSpacePos.w);
            }

            float computeLinearDepth(vec3 pos) {
                vec4 clipSpacePos = uProj * uView * vec4(pos.xyz, 1.0);
                float clipDepth = (clipSpacePos.z / clipSpacePos.w) * 2.0 - 1.0;
                float linearDepth = (2.0 * uNear * uFar) / (uFar + uNear - clipDepth * (uFar - uNear));
                return linearDepth / uFar;
            }

            void main() {
                float t = -vNearPoint.y / (vFarPoint.y - vNearPoint.y);
                if (t < 0.0) discard;

                vec3 fragPos3D = vNearPoint + t * (vFarPoint - vNearPoint);
                gl_FragDepthEXT = computeDepth(fragPos3D);

                float linearDepth = computeLinearDepth(fragPos3D);
                float fading = max(0.0, (0.5 - linearDepth));

                gl_FragColor = (grid(fragPos3D, 0.01) + grid(fragPos3D, 0.001));
                gl_FragColor.a *= fading;
                if (gl_FragColor.a < 0.1) discard;
            }
        `;

        this.gridProgram = this.initShaderProgram(gl, gridVsSource, gridFsSource);
        this.gridProgramInfo = {
            program: this.gridProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(this.gridProgram, 'aVertexPosition'),
            },
            uniformLocations: {
                uView: gl.getUniformLocation(this.gridProgram, 'uView'),
                uProj: gl.getUniformLocation(this.gridProgram, 'uProj'),
                uInvView: gl.getUniformLocation(this.gridProgram, 'uInvView'),
                uInvProj: gl.getUniformLocation(this.gridProgram, 'uInvProj'),
                uNear: gl.getUniformLocation(this.gridProgram, 'uNear'),
                uFar: gl.getUniformLocation(this.gridProgram, 'uFar'),
            },
        };
    }

    initBuffers() {
        const gl = this.gl;

        const createMesh = (pos, norm, idx, uv) => {
            const mesh = {
                pos: gl.createBuffer(),
                norm: gl.createBuffer(),
                idx: gl.createBuffer(),
                uv: uv ? gl.createBuffer() : null,
                count: idx.length
            };
            gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pos);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, mesh.norm);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(norm), gl.STATIC_DRAW);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.idx);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
            if (uv) {
                gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uv);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
            }
            return mesh;
        };

        // Fullscreen Quad for Sky and Grid
        const quadPositions = [-1,1,0, 1,1,0, -1,-1,0, 1,-1,0];
        this.skyBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.skyBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quadPositions), gl.STATIC_DRAW);

        // Cube Mesh (2x2x2)
        this.meshCube = createMesh(
            [
                -1,-1,1, 1,-1,1, 1,1,1, -1,1,1, -1,-1,-1, -1,1,-1, 1,1,-1, 1,-1,-1,
                -1,1,-1, -1,1,1, 1,1,1, 1,1,-1, -1,-1,-1, 1,-1,-1, 1,-1,1, -1,-1,1,
                1,-1,-1, 1,1,-1, 1,1,1, 1,-1,1, -1,-1,-1, -1,-1,1, -1,1,1, -1,1,-1
            ],
            [
                0,0,1, 0,0,1, 0,0,1, 0,0,1, 0,0,-1, 0,0,-1, 0,0,-1, 0,0,-1,
                0,1,0, 0,1,0, 0,1,0, 0,1,0, 0,-1,0, 0,-1,0, 0,-1,0, 0,-1,0,
                1,0,0, 1,0,0, 1,0,0, 1,0,0, -1,0,0, -1,0,0, -1,0,0, -1,0,0
            ],
            [0,1,2, 0,2,3, 4,5,6, 4,6,7, 8,9,10, 8,10,11, 12,13,14, 12,14,15, 16,17,18, 16,18,19, 20,21,22, 20,22,23]
        );

        // Sphere Mesh (UV Sphere)
        const spPos = [], spNorm = [], spIdx = [];
        const lat = 16, lon = 16;
        for(let j=0; j<=lat; j++) {
            let theta = j * Math.PI / lat;
            let sinTheta = Math.sin(theta);
            let cosTheta = Math.cos(theta);
            for(let i=0; i<=lon; i++) {
                let phi = i * 2 * Math.PI / lon;
                let x = Math.cos(phi) * sinTheta;
                let y = cosTheta;
                let z = Math.sin(phi) * sinTheta;
                spPos.push(x, y, z);
                spNorm.push(x, y, z);
            }
        }
        for(let j=0; j<lat; j++) {
            for(let i=0; i<lon; i++) {
                let first = (j * (lon + 1)) + i;
                let second = first + lon + 1;
                spIdx.push(first, second, first + 1, second, second + 1, first + 1);
            }
        }
        this.meshSphere = createMesh(spPos, spNorm, spIdx);

        // Plane Mesh (Horizontal XZ)
        this.meshPlane = createMesh(
            [-1,0,-1, 1,0,-1, 1,0,1, -1,0,1],
            [0,1,0, 0,1,0, 0,1,0, 0,1,0],
            [0,1,2, 0,2,3]
        );

        // Triangle Mesh (Facing Z+)
        this.meshTriangle = createMesh(
            [0,1,0, -1,-1,0, 1,-1,0],
            [0,0,1, 0,0,1, 0,0,1],
            [0,1,2]
        );

        // Capsule Mesh (Total height 2, Radius 0.5)
        const capPos = [], capNorm = [], capIdx = [];
        for(let j=0; j<=lat/2; j++) {
            let theta = j * Math.PI / lat;
            let sinTheta = Math.sin(theta), cosTheta = Math.cos(theta);
            for(let i=0; i<=lon; i++) {
                let phi = i * 2 * Math.PI / lon;
                let x = Math.cos(phi) * sinTheta * 0.5, y = cosTheta * 0.5 + 0.5, z = Math.sin(phi) * sinTheta * 0.5;
                capPos.push(x, y, z); capNorm.push(x, cosTheta, z);
            }
        }
        for(let j=lat/2; j<=lat; j++) {
            let theta = j * Math.PI / lat;
            let sinTheta = Math.sin(theta), cosTheta = Math.cos(theta);
            for(let i=0; i<=lon; i++) {
                let phi = i * 2 * Math.PI / lon;
                let x = Math.cos(phi) * sinTheta * 0.5, y = cosTheta * 0.5 - 0.5, z = Math.sin(phi) * sinTheta * 0.5;
                capPos.push(x, y, z); capNorm.push(x, cosTheta, z);
            }
        }
        for(let j=0; j<lat; j++) {
            for(let i=0; i<lon; i++) {
                let first = (j * (lon + 1)) + i, second = first + lon + 1;
                capIdx.push(first, second, first + 1, second, second + 1, first + 1);
            }
        }
        this.meshCapsule = createMesh(capPos, capNorm, capIdx);

        // Sprite Plane
        this.meshSpritePlane = createMesh(
            [-0.5,-0.5,0, 0.5,-0.5,0, 0.5,0.5,0, -0.5,0.5,0],
            [0,0,1, 0,0,1, 0,0,1, 0,0,1],
            [0,1,2, 0,2,3],
            [0,1, 1,1, 1,0, 0,0]
        );
    }

    resize() {
        if (!this.canvas || !this.gl) return;
        const clientWidth = this.canvas.clientWidth || 800;
        const clientHeight = this.canvas.clientHeight || 600;
        this.canvas.width = clientWidth;
        this.canvas.height = clientHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    /**
     * RAM OPTIMIZATION: Releases WebGL resources and stops rendering.
     * This is crucial for "separating" the engine and saving RAM when in strict 2D mode.
     */
    dispose() {
        if (!this.initialized || !this.gl) return;

        console.log(`[Renderer3D] Disposing WebGL resources for ${this.canvas.id}`);

        this.clearCache();

        // Delete buffers
        const deleteMesh = (m) => {
            if (!m) return;
            if (m.pos) this.gl.deleteBuffer(m.pos);
            if (m.norm) this.gl.deleteBuffer(m.norm);
            if (m.idx) this.gl.deleteBuffer(m.idx);
            if (m.uv) this.gl.deleteBuffer(m.uv);
        };

        if (this.skyBuffer) this.gl.deleteBuffer(this.skyBuffer);
        deleteMesh(this.meshCube);
        deleteMesh(this.meshSphere);
        deleteMesh(this.meshPlane);
        deleteMesh(this.meshTriangle);
        deleteMesh(this.meshCapsule);
        deleteMesh(this.meshSpritePlane);

        // Delete programs
        if (this.skyProgram) this.gl.deleteProgram(this.skyProgram);
        if (this.shaderProgram) this.gl.deleteProgram(this.shaderProgram);
        if (this.pickingProgram) this.gl.deleteProgram(this.pickingProgram);

        // Delete framebuffers
        if (this.pickingFramebuffer) this.gl.deleteFramebuffer(this.pickingFramebuffer);
        if (this.pickingTexture) this.gl.deleteTexture(this.pickingTexture);
        if (this.pickingDepthBuffer) this.gl.deleteRenderbuffer(this.pickingDepthBuffer);

        // Extension to lose context if possible
        const ext = this.gl.getExtension('WEBGL_lose_context');
        if (ext) ext.loseContext();

        this.gl = null;
        this.initialized = false;

        // Hide canvas to ensure it doesn't take up any layout space or composite time
        if (this.canvas) {
            this.canvas.style.display = 'none';
            // Clear dimensions to free up backbuffer RAM
            this.canvas.width = 1;
            this.canvas.height = 1;
        }
    }

    getGLTexture(image, forceUpdate = false) {
        if (!image) return null;
        if (image instanceof HTMLImageElement && !image.complete) return null;

        const cacheKey = image.src || image;
        const gl = this.gl;

        // RAM OPTIMIZATION: Limit texture cache size
        if (this.textureCache.size > 50 && !this.textureCache.has(cacheKey)) {
            const firstKey = this.textureCache.keys().next().value;
            const tex = this.textureCache.get(firstKey);
            gl.deleteTexture(tex);
            this.textureCache.delete(firstKey);
        }

        if (this.textureCache.has(cacheKey) && !forceUpdate) {
            return this.textureCache.get(cacheKey);
        }

        let texture;
        if (this.textureCache.has(cacheKey)) {
            texture = this.textureCache.get(cacheKey);
        } else {
            texture = gl.createTexture();
        }

        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        // Check if image is power of 2
        if ((image.width & (image.width - 1)) === 0 && (image.height & (image.height - 1)) === 0) {
            gl.generateMipmap(gl.TEXTURE_2D);
        } else {
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        }

        this.textureCache.set(cacheKey, texture);
        return texture;
    }

    renderSky(ambiente, projectionMatrix, viewMatrix) {
        const gl = this.gl;
        gl.useProgram(this.skyProgramInfo.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.skyBuffer);
        gl.vertexAttribPointer(this.skyProgramInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.skyProgramInfo.attribLocations.vertexPosition);

        const skyColor = this.hexToRgb(ambiente.skyColor || '#87ceeb');
        const horizonColor = this.hexToRgb(ambiente.horizonColor || '#ffffff');
        const groundColor = this.hexToRgb(ambiente.groundColor || '#222222');

        gl.uniform3fv(this.skyProgramInfo.uniformLocations.uSkyColor, skyColor);
        gl.uniform3fv(this.skyProgramInfo.uniformLocations.uHorizonColor, horizonColor);
        gl.uniform3fv(this.skyProgramInfo.uniformLocations.uGroundColor, groundColor);

        const invViewProj = mat4.create();
        const viewNoPos = mat4.clone(viewMatrix);
        viewNoPos[12] = 0; viewNoPos[13] = 0; viewNoPos[14] = 0; // Remove translation
        mat4.multiply(invViewProj, projectionMatrix, viewNoPos);
        mat4.invert(invViewProj, invViewProj);
        gl.uniformMatrix4fv(this.skyProgramInfo.uniformLocations.uInvViewProj, false, invViewProj);

        gl.disable(gl.DEPTH_TEST);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.enable(gl.DEPTH_TEST);
    }

    renderGrid(projectionMatrix, viewMatrix) {
        const gl = this.gl;
        const ext = gl.getExtension('EXT_frag_depth');
        if (!ext) return; // Grid requires depth adjustment for realism

        gl.useProgram(this.gridProgramInfo.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.skyBuffer); // Re-use fullscreen quad
        gl.vertexAttribPointer(this.gridProgramInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.gridProgramInfo.attribLocations.vertexPosition);

        const invView = mat4.create();
        mat4.invert(invView, viewMatrix);
        const invProj = mat4.create();
        mat4.invert(invProj, projectionMatrix);

        gl.uniformMatrix4fv(this.gridProgramInfo.uniformLocations.uView, false, viewMatrix);
        gl.uniformMatrix4fv(this.gridProgramInfo.uniformLocations.uProj, false, projectionMatrix);
        gl.uniformMatrix4fv(this.gridProgramInfo.uniformLocations.uInvView, false, invView);
        gl.uniformMatrix4fv(this.gridProgramInfo.uniformLocations.uInvProj, false, invProj);
        gl.uniform1f(this.gridProgramInfo.uniformLocations.uNear, 0.1);
        gl.uniform1f(this.gridProgramInfo.uniformLocations.uFar, 100000);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    render(scene, cameraMateria, options = {}) {
        if (!this.initialized) {
            if (!this.init()) return;
        }
        if (!this.gl) return;
        window._Renderer3D = this; // Ensure global reference for SceneView
        const gl = this.gl;
        const ambiente = scene.ambiente || {};
        const realismLevel = (ambiente.realismLevel !== undefined ? ambiente.realismLevel : 50) / 100;
        const usePostProcess = !!ambiente.realismFilter && !options.picking;

        // --- Setup Post-Processing Framebuffer if needed ---
        if (usePostProcess) {
            this.ensurePostFB(gl.canvas.width, gl.canvas.height);
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.postFB);
        } else if (!options.picking) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }

        const bgColor = this.hexToRgb(ambiente.nocheDiaColor || '#1a1a2a');

        // Allow transparency for hybrid modes
        let alpha = (options.clearAlpha !== undefined) ? options.clearAlpha : 1.0;

        // In editor mode without specific camera, be transparent to show CSS grey background
        if (!cameraMateria && !options.isGameView) {
            alpha = 0.0;
        }

        // If alpha is 0, ensure we clear with a fully transparent color
        if (alpha === 0) {
            gl.clearColor(0, 0, 0, 0);
        } else {
            gl.clearColor(bgColor[0], bgColor[1], bgColor[2], alpha);
        }
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const projectionMatrix = mat4.create();
        const viewMatrix = mat4.create();

        this.lastProjectionMatrix = projectionMatrix;
        this.lastViewMatrix = viewMatrix;

        let activeViewPosition = [0, 0, 0];
        let aspect = gl.canvas.width / gl.canvas.height;
        if (options.picking) {
            // Match the aspect ratio of the picking viewport (square 512x512)
            // or better, keep the canvas aspect to match what user sees
            // aspect = 1.0;
        }

        if (cameraMateria) {
            const camComp = cameraMateria.getComponent(Camera);
            const camTrans = cameraMateria.getComponent(Transform);

            if (camComp.projection === 'Orthographic') {
                const size = camComp.orthographicSize;
                const orthoH = size;
                const orthoW = size * aspect;
                // Reverse Y for orthographic to match 2D Canvas coordinate system (Y-down)
                mat4.ortho(projectionMatrix, -orthoW, orthoW, orthoH, -orthoH, 0.1, 10000);
            } else {
                mat4.perspective(projectionMatrix, camComp.fov * Math.PI / 180, aspect, 0.1, 50000);
            }

            const q = quat.create();
            // Important: Camera in CE uses standard Euler for 3D
            quat.fromEuler(q, camTrans.localRotation.x, camTrans.localRotation.y, camTrans.localRotation.z);
            activeViewPosition = [camTrans.x, camTrans.y, camTrans.z];
            mat4.fromRotationTranslation(viewMatrix, q, activeViewPosition);
            mat4.invert(viewMatrix, viewMatrix);
        } else {
            // Editor default camera (Scene View)
            const editorCam = options.editorCamera || { x: 0, y: 0, z: 500, rotation: { x: 0, y: 0, z: 0 } };
            const q = quat.create();
            quat.fromEuler(q, editorCam.rotation.x, editorCam.rotation.y, editorCam.rotation.z);

            // Use Perspective for 3D Scene View
            mat4.perspective(projectionMatrix, 45 * Math.PI / 180, aspect, 1, 100000);

            activeViewPosition = [editorCam.x, editorCam.y, editorCam.z];
            mat4.fromRotationTranslation(viewMatrix, q, activeViewPosition);
            mat4.invert(viewMatrix, viewMatrix);
        }

        // --- Render Sky ---
        if (ambiente.skyMode && ambiente.skyMode !== 'None' && !options.picking) {
            this.renderSky(ambiente, projectionMatrix, viewMatrix);
        }

        // --- Render 3D Grid (Editor only) ---
        if (options.showGrid && !options.picking) {
            this.renderGrid(projectionMatrix, viewMatrix);
        }

        if (options.picking) {
            gl.useProgram(this.pickingProgramInfo.program);
        } else {
            gl.useProgram(this.programInfo.program);
            // Apply projection/view once for the main pass
            gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
            gl.uniformMatrix4fv(this.programInfo.uniformLocations.viewMatrix, false, viewMatrix);

            gl.uniform3fv(this.programInfo.uniformLocations.viewPosition, activeViewPosition);
            gl.uniform1f(this.programInfo.uniformLocations.uRealismLevel, realismLevel);

            // Global Lights Setup
            const dirLight = scene.getAllMaterias().find(m => m.isActive && m.getComponent(Components3D.DirectionalLight3D));
            if (dirLight) {
                const dlComp = dirLight.getComponent(Components3D.DirectionalLight3D);
                gl.uniform3fv(this.programInfo.uniformLocations.uDirLightDir, [dlComp.direction.x, dlComp.direction.y, dlComp.direction.z]);
                gl.uniform3fv(this.programInfo.uniformLocations.uDirLightColor, this.hexToRgb(dlComp.color).map(c => c * dlComp.intensity));
            } else {
                gl.uniform3fv(this.programInfo.uniformLocations.uDirLightDir, [0, -1, 0]);
                gl.uniform3fv(this.programInfo.uniformLocations.uDirLightColor, [1, 1, 1]);
            }
            gl.uniform3fv(this.programInfo.uniformLocations.uAmbientLight, [0.3, 0.3, 0.3]);

            // Point Lights Setup
            const pointLights = scene.getAllMaterias().filter(m => m.isActive && m.getComponent(Components3D.PointLight3D)).slice(0, 4);
            const plPos = [], plColor = [], plRange = [];
            pointLights.forEach(pl => {
                const comp = pl.getComponent(Components3D.PointLight3D);
                const trans = pl.getComponent(Transform);
                plPos.push(trans.x, trans.y, trans.z || 0);
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
        }

        // Optimization: Filter out non-renderable materias once per frame
        const renderableMaterias = scene.getAllMaterias().filter(m => {
            if (!m.isActive) return false;
            return m.getComponent(Components3D.MeshRenderer3D) ||
                   m.getComponent(Components.SpriteRenderer) ||
                   m.getComponent(Components.TextureRender) ||
                   m.getComponent(Components.TilemapRenderer) ||
                   m.getComponent(Components.Terreno2D) ||
                   m.getComponent(Components.Water);
        });

        // Depth sorting for transparent objects (Sprites) in 3D
        renderableMaterias.sort((a, b) => {
                const transA = a.getComponent(Transform);
                const transB = b.getComponent(Transform);
                if (!transA || !transB) return 0;

                // Sort by distance to camera (Back to Front)
                // Using world position for correct sorting
                const posA = transA.position;
                const posB = transB.position;
                const distA = vec3.sqrDist([posA.x, posA.y, posA.z || 0], activeViewPosition);
                const distB = vec3.sqrDist([posB.x, posB.y, posB.z || 0], activeViewPosition);
                return distB - distA;
            });

        renderableMaterias.forEach(materia => {
            // Optimization: Frustum/Distance Culling
            if (ambiente.optiCameraCulling && activeViewPosition) {
                const trans = materia.getComponent(Transform);
                if (trans) {
                    const pos = [trans.x, trans.y, trans.z || 0];
                    const dist = vec3.distance(pos, activeViewPosition);
                    // Basic distance culling
                    if (dist > (ambiente.optiLODDistance || 10000)) return;
                }
            }
            this.renderMateria(materia, projectionMatrix, viewMatrix, options);
        });

        // --- Execute Post-Processing ---
        if (usePostProcess) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
            gl.useProgram(this.postProgramInfo.program);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.postTex);
            gl.uniform1i(this.postProgramInfo.uniformLocations.uSampler, 0);
            gl.uniform1i(this.postProgramInfo.uniformLocations.uEnableFilter, 1);
            gl.uniform1f(this.postProgramInfo.uniformLocations.uRealismLevel, realismLevel);

            gl.bindBuffer(gl.ARRAY_BUFFER, this.postBuffer);
            gl.vertexAttribPointer(this.postProgramInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(this.postProgramInfo.attribLocations.vertexPosition);

            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }
    }

    ensurePostFB(w, h) {
        const gl = this.gl;
        if (this.postFB && this._postW === w && this._postH === h) return;

        if (this.postFB) gl.deleteFramebuffer(this.postFB);
        if (this.postTex) gl.deleteTexture(this.postTex);
        if (this.postDepth) gl.deleteRenderbuffer(this.postDepth);

        this.postFB = gl.createFramebuffer();
        this.postTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.postTex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

        this.postDepth = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.postDepth);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.postFB);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.postTex, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.postDepth);

        this._postW = w;
        this._postH = h;
    }

    renderMateria(materia, projectionMatrix, viewMatrix, options) {
        const meshRenderer = materia.getComponent(Components3D.MeshRenderer3D);
        const spriteRenderer = materia.getComponent(Components.SpriteRenderer);
        const textureRender = materia.getComponent(Components.TextureRender);
        const tilemapRenderer = materia.getComponent(Components.TilemapRenderer);
        const terreno2D = materia.getComponent(Components.Terreno2D);
        const water = materia.getComponent(Components.Water);

        if (options.picking && !meshRenderer && !spriteRenderer && !textureRender) return;

        const transform = materia.getComponent(Transform);
        if (!transform || !materia.isActive) return;

        if (!meshRenderer && !spriteRenderer && !textureRender && !tilemapRenderer && !terreno2D && !water) return;

        // Specialized Renderers (Always non-picking for these complex ones for now)
        if (tilemapRenderer) {
            this.renderTilemap(materia, projectionMatrix, viewMatrix, options);
            return;
        }
        if (terreno2D) {
            this.renderTerreno2D(materia, projectionMatrix, viewMatrix, options);
            return;
        }
        if (water) {
            this.renderWater(materia, projectionMatrix, viewMatrix, options);
            return;
        }

        const gl = this.gl;
        // Ensure the correct program is active for this materia
        const programInfo = options.picking ? this.pickingProgramInfo : this.programInfo;
        gl.useProgram(programInfo.program);

        const modelMatrix = mat4.create();
        const worldPos = transform.position;
        const worldScale = transform.scale;
        const pos = [worldPos.x, worldPos.y, worldPos.z || 0];
        const scale = [Math.abs(worldScale.x), Math.abs(worldScale.y), Math.abs(worldScale.z || 1)];

        const q = quat.create();
        // Use global rotation
        const rot = {
            x: transform.rotationX || 0,
            y: transform.rotationY || 0,
            z: transform.rotationZ || 0
        };
        quat.fromEuler(q, rot.x, rot.y, rot.z);

        mat4.fromRotationTranslationScale(modelMatrix, q, pos, scale);

        // ALWAYS set these because the program might have changed
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

        if (!options.picking && this.programInfo.uniformLocations.uColor) {
            const isToon = options.isToon || meshRenderer?.isToon || (window.SceneManager.currentScene.ambiente.graphicMode === 'Anime');
            gl.uniform4fv(this.programInfo.uniformLocations.uColor, color);
            gl.uniform1i(this.programInfo.uniformLocations.uUseToon, isToon ? 1 : 0);
        }

        if (meshRenderer) {
            if (options.picking) {
                const id = options.idMap.get(materia.id);
                const pickingColor = [((id >> 0) & 0xFF) / 255, ((id >> 8) & 0xFF) / 255, ((id >> 16) & 0xFF) / 255, 1.0];
                gl.uniform4fv(programInfo.uniformLocations.uPickingColor, pickingColor);
            } else {
                gl.uniform1i(this.programInfo.uniformLocations.uUseTexture, 0);
            }

            let mesh = this.meshCube;
            if (meshRenderer.meshType === 'Sphere') mesh = this.meshSphere;
            else if (meshRenderer.meshType === 'Plane') mesh = this.meshPlane;
            else if (meshRenderer.meshType === 'Triangle') mesh = this.meshTriangle;
            else if (meshRenderer.meshType === 'Capsule') mesh = this.meshCapsule;

            gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pos);
            gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

            if (!options.picking) {
                gl.bindBuffer(gl.ARRAY_BUFFER, mesh.norm);
                gl.vertexAttribPointer(this.programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexNormal);
            }

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.idx);
            gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
        } else if (spriteRenderer) {
            if (options.picking) {
                const id = options.idMap.get(materia.id);
                const pickingColor = [((id >> 0) & 0xFF) / 255, ((id >> 8) & 0xFF) / 255, ((id >> 16) & 0xFF) / 255, 1.0];
                gl.uniform4fv(programInfo.uniformLocations.uPickingColor, pickingColor);
            }
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

            const sprite = spriteRenderer.sprite;
            let spriteScaleX = 1, spriteScaleY = 1;
            if (sprite && sprite.complete && sprite.naturalWidth > 0) {
                spriteScaleX = sprite.naturalWidth;
                spriteScaleY = sprite.naturalHeight;
            }

            const spriteModelMatrix = mat4.create();
            const spriteScale = [scale[0] * spriteScaleX, scale[1] * spriteScaleY, 1];
            let finalRotation = q;
            if (spriteRenderer.billboard && !options.picking) {
                const viewRot = quat.create();
                mat4.getRotation(viewRot, viewMatrix);
                quat.invert(viewRot, viewRot);
                quat.multiply(finalRotation, viewRot, q);
            }
            mat4.fromRotationTranslationScale(spriteModelMatrix, finalRotation, pos, spriteScale);
            gl.uniformMatrix4fv(programInfo.uniformLocations.modelMatrix, false, spriteModelMatrix);

            const mesh = this.meshSpritePlane;
            gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pos);
            gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

            if (!options.picking) {
                gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uv);
                gl.vertexAttribPointer(this.programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(this.programInfo.attribLocations.textureCoord);
                gl.bindBuffer(gl.ARRAY_BUFFER, mesh.norm);
                gl.vertexAttribPointer(this.programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexNormal);
            }
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.idx);
            gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
        } else if (textureRender) {
            if (options.picking) {
                const id = options.idMap.get(materia.id);
                const pickingColor = [((id >> 0) & 0xFF) / 255, ((id >> 8) & 0xFF) / 255, ((id >> 16) & 0xFF) / 255, 1.0];
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
                quat.multiply(finalRotationTex, viewRot, q);
            }
            mat4.fromRotationTranslationScale(modelMatrixTex, finalRotationTex, pos, texScale);
            gl.uniformMatrix4fv(programInfo.uniformLocations.modelMatrix, false, modelMatrixTex);

            const mesh = this.meshSpritePlane;
            gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pos);
            gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

            if (!options.picking) {
                gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uv);
                gl.vertexAttribPointer(this.programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(this.programInfo.attribLocations.textureCoord);
                gl.bindBuffer(gl.ARRAY_BUFFER, mesh.norm);
                gl.vertexAttribPointer(this.programInfo.attribLocations.vertexNormal, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexNormal);
            }
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.idx);
            gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
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
        if (!this.initialized) return null;
        if (!this.gl) return null;
        const gl = this.gl;

        // Setup picking texture at canvas resolution for exact match
        const w = gl.canvas.width;
        const h = gl.canvas.height;

        if (!this.pickingFramebuffer || this._pickW !== w || this._pickH !== h) {
            if (this.pickingFramebuffer) {
                gl.deleteFramebuffer(this.pickingFramebuffer);
                gl.deleteTexture(this.pickingTexture);
                gl.deleteRenderbuffer(this.pickingDepthBuffer);
            }

            this.pickingTexture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.pickingTexture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

            this.pickingFramebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickingFramebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.pickingTexture, 0);

            this.pickingDepthBuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, this.pickingDepthBuffer);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.pickingDepthBuffer);

            this._pickW = w;
            this._pickH = h;
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.pickingFramebuffer);
        gl.viewport(0, 0, w, h);
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
        // Correct Y for WebGL (bottom-up)
        gl.readPixels(x, h - y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        const pickedId = pixels[0] + (pixels[1] << 8) + (pixels[2] << 16);
        return reverseIdMap.get(pickedId) || null;
    }

    /**
     * Renders a Tilemap as a textured plane in 3D.
     * This avoids the "flat background" look by placing it correctly in 3D space.
     */
    renderTilemap(materia, projectionMatrix, viewMatrix, options) {
        if (options.picking) return;

        const tilemap = materia.getComponent(Components.Tilemap);
        const tilemapRenderer = materia.getComponent(Components.TilemapRenderer);
        const transform = materia.getComponent(Transform);

        if (!tilemapRenderer._bakedTexture || tilemapRenderer.isDirty) {
            this.bakeTilemap(materia);
        }

        const tex = this.getGLTexture(tilemapRenderer._bakedTexture);
        if (!tex) return;

        const gl = this.gl;
        const worldPos = transform.position;
        const worldScale = transform.scale;
        const pos = [worldPos.x, worldPos.y, worldPos.z || 0];
        const scale = [Math.abs(worldScale.x), Math.abs(worldScale.y), 1];

        const q = quat.create();
        quat.fromEuler(q, transform.rotationX || 0, transform.rotationY || 0, transform.rotationZ || 0);

        const modelMatrix = mat4.create();
        const mapScale = [tilemapRenderer._bakedTexture.width, tilemapRenderer._bakedTexture.height, 1];
        const finalScale = [scale[0] * mapScale[0], scale[1] * mapScale[1], 1];
        mat4.fromRotationTranslationScale(modelMatrix, q, pos, finalScale);

        gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.viewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.modelMatrix, false, modelMatrix);
        gl.uniform1i(this.programInfo.uniformLocations.uUseTexture, 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);

        const mesh = this.meshSpritePlane;
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pos);
        gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uv);
        gl.vertexAttribPointer(this.programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.textureCoord);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.idx);
        gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
    }

    bakeTilemap(materia) {
        const tilemap = materia.getComponent(Components.Tilemap);
        const tilemapRenderer = materia.getComponent(Components.TilemapRenderer);

        let gridMateria = null;
        const parent = materia.parent;
        if (parent) {
            if (typeof parent === 'object' && typeof parent.getComponent === 'function') {
                gridMateria = parent;
            } else if (typeof parent === 'number') {
                gridMateria = (materia.scene || window.SceneManager?.currentScene)?.findMateriaById(parent);
            }
        }
        const grid = gridMateria ? gridMateria.getComponent(Components.Grid) : null;

        if (!tilemap || !tilemapRenderer || !grid) return;

        const canvas = document.createElement('canvas');
        canvas.width = tilemap.width * grid.cellSize.x;
        canvas.height = tilemap.height * grid.cellSize.y;
        const ctx = canvas.getContext('2d');

        // Draw the tilemap using the existing 2D logic but into our canvas
        // This is a bit recursive, but effective
        const tempRenderer = { ctx: ctx, canvas: canvas, drawImage: (img, x, y, w, h) => ctx.drawImage(img, x, y, w, h) };

        // Mocking the Renderer.drawTilemap logic
        const mapTotalWidth = canvas.width;
        const mapTotalHeight = canvas.height;

        for (const layer of tilemap.layers) {
            const layerOffsetX = layer.position.x * mapTotalWidth;
            const layerOffsetY = layer.position.y * mapTotalHeight;
            for (const [coord, tileData] of layer.tileData.entries()) {
                const image = tilemapRenderer.getImageForTile(tileData);
                if (image && image.complete && image.naturalWidth > 0) {
                    const [x, y] = coord.split(',').map(Number);
                    if (x < 0 || x >= tilemap.width || y < 0 || y >= tilemap.height) continue;
                    const dx = layerOffsetX + (x * grid.cellSize.x);
                    const dy = layerOffsetY + (y * grid.cellSize.y);
                    ctx.drawImage(image, dx, dy, grid.cellSize.x + 0.5, grid.cellSize.y + 0.5);
                }
            }
        }

        tilemapRenderer._bakedTexture = canvas;
        tilemapRenderer.isDirty = false;
    }

    renderTerreno2D(materia, projectionMatrix, viewMatrix, options) {
        const terreno = materia.getComponent(Components.Terreno2D);
        if (!terreno || options.picking) return;

        if (!terreno._bakedTexture || terreno.isDirty) {
            this.bakeTerreno2D(materia);
        }

        const tex = this.getGLTexture(terreno._bakedTexture);
        if (!tex) return;

        const gl = this.gl;
        const transform = materia.getComponent(Transform);
        const worldPos = transform.position;
        const worldScale = transform.scale;
        const pos = [worldPos.x, worldPos.y, worldPos.z || 0];

        const q = quat.create();
        quat.fromEuler(q, transform.rotationX || 0, transform.rotationY || 0, transform.rotationZ || 0);

        const modelMatrix = mat4.create();
        const finalScale = [worldScale.x * terreno.width, worldScale.y * terreno.height, 1];
        mat4.fromRotationTranslationScale(modelMatrix, q, pos, finalScale);

        gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.viewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.modelMatrix, false, modelMatrix);
        gl.uniform4fv(this.programInfo.uniformLocations.uColor, [1, 1, 1, 1]);
        gl.uniform1i(this.programInfo.uniformLocations.uUseTexture, 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);

        const mesh = this.meshSpritePlane;
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pos);
        gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uv);
        gl.vertexAttribPointer(this.programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.textureCoord);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.idx);
        gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
    }

    bakeTerreno2D(materia) {
        const terreno = materia.getComponent(Components.Terreno2D);
        const canvas = document.createElement('canvas');
        canvas.width = terreno.width;
        canvas.height = terreno.height;
        const ctx = canvas.getContext('2d');

        // Reuse Renderer.drawTerreno2D logic but simplified for baking
        for (let l = 0; l < terreno.layers.length; l++) {
            const layer = terreno.layers[l];
            if (!layer.maskCanvas) continue;
            const img = terreno.getImageForLayer(l);
            if (img && img.complete) {
                const pattern = ctx.createPattern(img, 'repeat');
                ctx.save();
                ctx.fillStyle = pattern;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.globalCompositeOperation = 'destination-in';
                ctx.drawImage(layer.maskCanvas, 0, 0);
                ctx.restore();
            }
        }
        terreno._bakedTexture = canvas;
        terreno.isDirty = false;
    }

    renderWater(materia, projectionMatrix, viewMatrix, options) {
        const water = materia.getComponent(Components.Water);
        if (!water || options.picking) return;

        const now = performance.now();
        const shouldUpdate = !water._bakedTexture || (now - (water._lastBakeTime || 0) > 33);

        if (shouldUpdate) {
            this.bakeWater(materia);
            water._lastBakeTime = now;
        }

        const tex = this.getGLTexture(water._bakedTexture, shouldUpdate);
        if (!tex) return;

        const gl = this.gl;
        const transform = materia.getComponent(Transform);
        const bounds = water.bounds;
        const w = bounds.maxX - bounds.minX;
        const h = bounds.maxY - bounds.minY;
        if (w <= 0 || h <= 0) return;

        const pos = [bounds.minX + w/2, bounds.minY + h/2, transform.z || 0];
        const modelMatrix = mat4.create();
        mat4.fromRotationTranslationScale(modelMatrix, quat.create(), pos, [w, h, 1]);

        gl.uniformMatrix4fv(this.programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.viewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(this.programInfo.uniformLocations.modelMatrix, false, modelMatrix);
        gl.uniform4fv(this.programInfo.uniformLocations.uColor, [1, 1, 1, 1]);
        gl.uniform1i(this.programInfo.uniformLocations.uUseTexture, 1);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);

        const mesh = this.meshSpritePlane;
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pos);
        gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);
        gl.bindBuffer(gl.ARRAY_BUFFER, mesh.uv);
        gl.vertexAttribPointer(this.programInfo.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(this.programInfo.attribLocations.textureCoord);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.idx);
        gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0);
    }

    bakeWater(materia) {
        const water = materia.getComponent(Components.Water);
        const bounds = water.bounds;
        const w = Math.ceil(bounds.maxX - bounds.minX);
        const h = Math.ceil(bounds.maxY - bounds.minY);
        if (w <= 0 || h <= 0) return;

        const canvas = document.createElement('canvas');
        canvas.width = Math.min(2048, w);
        canvas.height = Math.min(2048, h);
        const ctx = canvas.getContext('2d');

        // We use a simplified metaball draw for baking
        ctx.fillStyle = water.color || 'rgba(52, 152, 219, 0.8)';
        for (const p of water.particles) {
            ctx.beginPath();
            ctx.arc(p.x - bounds.minX, p.y - bounds.minY, water._particleRadius || 14, 0, Math.PI * 2);
            ctx.fill();
        }
        water._bakedTexture = canvas;
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
