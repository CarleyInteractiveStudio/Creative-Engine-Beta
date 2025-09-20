// --- WebGL Renderer ---
import * as Components from './Components.js';

export class Renderer {
    constructor(canvas, isEditor = false) {
        this.canvas = canvas;
        this.gl = this.initWebGL(canvas);
        this.isEditor = isEditor;

        if (!this.gl) {
            console.error("WebGL not supported!");
            return;
        }

        const vsSource = `
            attribute vec4 aVertexPosition;
            attribute vec2 aTextureCoord;
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            varying highp vec2 vTextureCoord;
            void main(void) {
                gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
                vTextureCoord = aTextureCoord;
            }
        `;

        const fsSource = `
            precision mediump float;
            varying highp vec2 vTextureCoord;
            uniform sampler2D uSampler;
            void main(void) {
                gl_FragColor = texture2D(uSampler, vTextureCoord);
            }
        `;

        const shaderProgram = this.initShaderProgram(vsSource, fsSource);

        this.programInfo = {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: this.gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
                textureCoord: this.gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
            },
            uniformLocations: {
                uProjectionMatrix: this.gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                uModelViewMatrix: this.gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
                uSampler: this.gl.getUniformLocation(shaderProgram, 'uSampler'),
            },
        };

        this.buffers = this.initBuffers();
        this.textureCache = new Map();
        this.projectionMatrix = this.mat4.create();

        if (this.isEditor) {
            this.camera = { x: 0, y: 0, zoom: 1.0 };
        } else {
            this.camera = null;
        }
        this.resize();
    }

    initWebGL(canvas) {
        let gl = null;
        try {
            gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        } catch (e) {}
        if (!gl) {
            gl = null;
        }
        return gl;
    }

    initShaderProgram(vsSource, fsSource) {
        const vertexShader = this.loadShader(this.gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.loadShader(this.gl.FRAGMENT_SHADER, fsSource);
        const shaderProgram = this.gl.createProgram();
        this.gl.attachShader(shaderProgram, vertexShader);
        this.gl.attachShader(shaderProgram, fragmentShader);
        this.gl.linkProgram(shaderProgram);
        if (!this.gl.getProgramParameter(shaderProgram, this.gl.LINK_STATUS)) {
            console.error('Unable to initialize the shader program: ' + this.gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        return shaderProgram;
    }

    loadShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders: ' + this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        return shader;
    }

    initBuffers() {
        const positionBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
        const positions = [ -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5 ];
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positions), this.gl.STATIC_DRAW);

        const textureCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, textureCoordBuffer);
        const textureCoordinates = [ 0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0 ];
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), this.gl.STATIC_DRAW);

        return { position: positionBuffer, textureCoord: textureCoordBuffer };
    }

    loadTexture(image) {
        if (!image || !image.src || image.width === 0) return null;
        if (this.textureCache.has(image.src)) {
            return this.textureCache.get(image.src);
        }

        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, image);

        if (this.isPowerOf2(image.width) && this.isPowerOf2(image.height)) {
           this.gl.generateMipmap(this.gl.TEXTURE_2D);
        } else {
           this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
           this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
           this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        }

        this.textureCache.set(image.src, texture);
        return texture;
    }

    isPowerOf2(value) { return (value & (value - 1)) === 0; }

    resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    clear(cameraComponent) {
        let color = [0.18, 0.18, 0.18, 1.0];
        if (cameraComponent && cameraComponent.clearFlags === 'SolidColor') {
            const rgb = this.hexToRgb(cameraComponent.backgroundColor);
            color = [rgb.r, rgb.g, rgb.b, 1.0];
        }
        this.gl.clearColor(...color);
        this.gl.clearDepth(1.0);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
    }

    beginWorld(cameraMateria = null) {
        this.clear(cameraMateria ? cameraMateria.getComponent(Components.Camera) : null);

        let camX = 0, camY = 0, zoom = 1;
        if (cameraMateria) {
            const camComp = cameraMateria.getComponent(Components.Camera);
            const camTrans = cameraMateria.getComponent(Components.Transform);
            camX = camTrans.x;
            camY = camTrans.y;
            zoom = this.canvas.height / (camComp.orthographicSize * 2 || 1);
        } else if (this.isEditor) {
            camX = this.camera.x;
            camY = this.camera.y;
            zoom = this.camera.zoom;
        }

        const halfHeight = this.canvas.height / 2 / zoom;
        const halfWidth = this.canvas.width / 2 / zoom;

        const projectionMatrix = this.mat4.ortho(this.mat4.create(), -halfWidth, halfWidth, halfHeight, -halfHeight, -1, 100);
        const viewMatrix = this.mat4.create();
        this.mat4.translate(viewMatrix, viewMatrix, [-camX, -camY, 0]);
        this.mat4.multiply(this.projectionMatrix, projectionMatrix, viewMatrix);
    }

    drawSprite(sprite, transform) {
        if (!sprite || !sprite.complete || sprite.naturalWidth === 0) return;

        const texture = this.loadTexture(sprite);
        if (!texture) return;

        const modelViewMatrix = this.mat4.create();
        this.mat4.translate(modelViewMatrix, modelViewMatrix, [transform.x, transform.y, 0.0]);
        this.mat4.rotate(modelViewMatrix, modelViewMatrix, transform.rotation * Math.PI / 180, [0, 0, 1]);
        this.mat4.scale(modelViewMatrix, modelViewMatrix, [sprite.naturalWidth * transform.scale.x, sprite.naturalHeight * transform.scale.y, 1.0]);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.position);
        this.gl.vertexAttribPointer(this.programInfo.attribLocations.vertexPosition, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);

        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.textureCoord);
        this.gl.vertexAttribPointer(this.programInfo.attribLocations.textureCoord, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.enableVertexAttribArray(this.programInfo.attribLocations.textureCoord);

        this.gl.useProgram(this.programInfo.program);
        this.gl.uniformMatrix4fv(this.programInfo.uniformLocations.uProjectionMatrix, false, this.projectionMatrix);
        this.gl.uniformMatrix4fv(this.programInfo.uniformLocations.uModelViewMatrix, false, modelViewMatrix);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.uniform1i(this.programInfo.uniformLocations.uSampler, 0);

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? { r: parseInt(result[1], 16) / 255, g: parseInt(result[2], 16) / 255, b: parseInt(result[3], 16) / 255 } : {r:1, g:1, b:1};
    }

    mat4 = {
        create: function() {
            let out = new Float32Array(16);
            out[0] = 1; out[5] = 1; out[10] = 1; out[15] = 1;
            return out;
        },
        identity: function (out) {
            out[0]=1; out[1]=0; out[2]=0; out[3]=0;
            out[4]=0; out[5]=1; out[6]=0; out[7]=0;
            out[8]=0; out[9]=0; out[10]=1; out[11]=0;
            out[12]=0; out[13]=0; out[14]=0; out[15]=1;
            return out;
        },
        multiply: function(out, a, b) {
            let a00=a[0],a01=a[1],a02=a[2],a03=a[3];
            let a10=a[4],a11=a[5],a12=a[6],a13=a[7];
            let a20=a[8],a21=a[9],a22=a[10],a23=a[11];
            let a30=a[12],a31=a[13],a32=a[14],a33=a[15];
            let b0=b[0],b1=b[1],b2=b[2],b3=b[3];
            out[0]=b0*a00+b1*a10+b2*a20+b3*a30;
            out[1]=b0*a01+b1*a11+b2*a21+b3*a31;
            out[2]=b0*a02+b1*a12+b2*a22+b3*a32;
            out[3]=b0*a03+b1*a13+b2*a23+b3*a33;
            b0=b[4];b1=b[5];b2=b[6];b3=b[7];
            out[4]=b0*a00+b1*a10+b2*a20+b3*a30;
            out[5]=b0*a01+b1*a11+b2*a21+b3*a31;
            out[6]=b0*a02+b1*a12+b2*a22+b3*a32;
            out[7]=b0*a03+b1*a13+b2*a23+b3*a33;
            b0=b[8];b1=b[9];b2=b[10];b3=b[11];
            out[8]=b0*a00+b1*a10+b2*a20+b3*a30;
            out[9]=b0*a01+b1*a11+b2*a21+b3*a31;
            out[10]=b0*a02+b1*a12+b2*a22+b3*a32;
            out[11]=b0*a03+b1*a13+b2*a23+b3*a33;
            b0=b[12];b1=b[13];b2=b[14];b3=b[15];
            out[12]=b0*a00+b1*a10+b2*a20+b3*a30;
            out[13]=b0*a01+b1*a11+b2*a21+b3*a31;
            out[14]=b0*a02+b1*a12+b2*a22+b3*a32;
            out[15]=b0*a03+b1*a13+b2*a23+b3*a33;
            return out;
        },
        ortho: function(out, left, right, bottom, top, near, far) {
            let lr = 1 / (left - right);
            let bt = 1 / (bottom - top);
            let nf = 1 / (near - far);
            out[0] = -2 * lr; out[1] = 0; out[2] = 0; out[3] = 0;
            out[4] = 0; out[5] = -2 * bt; out[6] = 0; out[7] = 0;
            out[8] = 0; out[9] = 0; out[10] = 2 * nf; out[11] = 0;
            out[12] = (left + right) * lr;
            out[13] = (top + bottom) * bt;
            out[14] = (far + near) * nf;
            out[15] = 1;
            return out;
        },
        translate: function(out, a, v) {
            let x=v[0],y=v[1],z=v[2];
            let a00,a01,a02,a03;
            let a10,a11,a12,a13;
            let a20,a21,a22,a23;
            if(a===out){
                out[12]=a[0]*x+a[4]*y+a[8]*z+a[12];
                out[13]=a[1]*x+a[5]*y+a[9]*z+a[13];
                out[14]=a[2]*x+a[6]*y+a[10]*z+a[14];
                out[15]=a[3]*x+a[7]*y+a[11]*z+a[15];
            }else{
                a00=a[0];a01=a[1];a02=a[2];a03=a[3];
                a10=a[4];a11=a[5];a12=a[6];a13=a[7];
                a20=a[8];a21=a[9];a22=a[10];a23=a[11];
                out[0]=a00;out[1]=a01;out[2]=a02;out[3]=a03;
                out[4]=a10;out[5]=a11;out[6]=a12;out[7]=a13;
                out[8]=a20;out[9]=a21;out[10]=a22;out[11]=a23;
                out[12]=a00*x+a10*y+a20*z+a[12];
                out[13]=a01*x+a11*y+a21*z+a[13];
                out[14]=a02*x+a12*y+a22*z+a[14];
                out[15]=a03*x+a13*y+a23*z+a[15];
            }
            return out;
        },
        rotate: function(out, a, rad, axis) {
            let x=axis[0],y=axis[1],z=axis[2];
            let len=Math.sqrt(x*x+y*y+z*z);
            let s,c,t;
            let a00,a01,a02,a03;
            let a10,a11,a12,a13;
            let a20,a21,a22,a23;
            let b00,b01,b02;
            let b10,b11,b12;
            let b20,b21,b22;
            if(len<0.000001)return null;
            len=1/len;x*=len;y*=len;z*=len;
            s=Math.sin(rad);c=Math.cos(rad);t=1-c;
            a00=a[0];a01=a[1];a02=a[2];a03=a[3];
            a10=a[4];a11=a[5];a12=a[6];a13=a[7];
            a20=a[8];a21=a[9];a22=a[10];a23=a[11];
            b00=x*x*t+c;b01=y*x*t+z*s;b02=z*x*t-y*s;
            b10=x*y*t-z*s;b11=y*y*t+c;b12=z*y*t+x*s;
            b20=x*z*t+y*s;b21=y*z*t-x*s;b22=z*z*t+c;
            out[0]=a00*b00+a10*b01+a20*b02;
            out[1]=a01*b00+a11*b01+a21*b02;
            out[2]=a02*b00+a12*b01+a22*b02;
            out[3]=a03*b00+a13*b01+a23*b02;
            out[4]=a00*b10+a10*b11+a20*b12;
            out[5]=a01*b10+a11*b11+a21*b12;
            out[6]=a02*b10+a12*b11+a22*b12;
            out[7]=a03*b10+a13*b11+a23*b12;
            out[8]=a00*b20+a10*b21+a20*b22;
            out[9]=a01*b20+a11*b21+a21*b22;
            out[10]=a02*b20+a12*b21+a22*b22;
            out[11]=a03*b20+a13*b21+a23*b22;
            if(a!==out){
                out[12]=a[12];out[13]=a[13];out[14]=a[14];out[15]=a[15];
            }
            return out;
        },
        scale: function(out, a, v) {
            let x=v[0],y=v[1],z=v[2];
            out[0]=a[0]*x;out[1]=a[1]*x;out[2]=a[2]*x;out[3]=a[3]*x;
            out[4]=a[4]*y;out[5]=a[5]*y;out[6]=a[6]*y;out[7]=a[7]*y;
            out[8]=a[8]*z;out[9]=a[9]*z;out[10]=a[10]*z;out[11]=a[11]*z;
            out[12]=a[12];out[13]=a[13];out[14]=a[14];out[15]=a[15];
            return out;
        },
    };
}
