const canvasEl = document.querySelector("#eggs");
const devicePixelRatio = Math.min(window.devicePixelRatio, 2);

const textureEl = document.createElement("canvas");
const textureCtx = textureEl.getContext("2d");

let uniforms, clicksDataTexture, activeClickIdx = 0;
const clicksDataTextureSize = [10, 2], clicksNumber = 15; // to match the shader
const scaledData = new Uint8Array(clicksDataTextureSize[0] * clicksDataTextureSize[1] * 4).fill(0);
const gl = initShader();

const clicks = Array.from({length: clicksNumber}, () => ({
    coordinate: {x: 0, y: 0},
    radius: 0,
    clickDistance: 0
}));

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
updateClickDataTexture();
gsap.ticker.add(render);


window.addEventListener("click", e => {
    clicks[activeClickIdx].coordinate.x = e.pageX / window.innerWidth + .03 * Math.random();
    clicks[activeClickIdx].coordinate.y = 1. - e.pageY / window.innerHeight;
    gsap.timeline({})
        .fromTo(clicks[activeClickIdx], {
            clickDistance: 0
        }, {
            duration: 2,
            clickDistance: 1,
        }, 0)
        .to(clicks[activeClickIdx], {
            duration: .7,
            radius: 1,
            ease: "none"
        }, 0)

    const nextIdx = (activeClickIdx + 1) % clicksNumber;
    gsap.to(clicks[nextIdx], {
        duration: 1,
        radius: 0,
    })

    activeClickIdx = (activeClickIdx + 1) % clicksNumber;
});

function initShader() {
    const vsSource = document.getElementById("vertShader").innerHTML;
    const fsSource = document.getElementById("fragShader").innerHTML;

    const gl = canvasEl.getContext("webgl") || canvasEl.getContext("experimental-webgl");

    if (!gl) {
        alert("WebGL is not supported by your browser.");
    }

    function createShader(gl, sourceCode, type) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, sourceCode);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    const vertexShader = createShader(gl, vsSource, gl.VERTEX_SHADER);
    const fragmentShader = createShader(gl, fsSource, gl.FRAGMENT_SHADER);

    function createShaderProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error("Unable to initialize the shader program: " + gl.getProgramInfoLog(program));
            return null;
        }

        return program;
    }

    const shaderProgram = createShaderProgram(gl, vertexShader, fragmentShader);
    uniforms = getUniforms(shaderProgram);

    function getUniforms(program) {
        let uniforms = [];
        let uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < uniformCount; i++) {
            let uniformName = gl.getActiveUniform(program, i).name;
            uniforms[uniformName] = gl.getUniformLocation(program, uniformName);
        }
        return uniforms;
    }

    const vertices = new Float32Array([-1., -1., 1., -1., -1., 1., 1., 1.]);

    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.useProgram(shaderProgram);

    const positionLocation = gl.getAttribLocation(shaderProgram, "a_position");
    gl.enableVertexAttribArray(positionLocation);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    clicksDataTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, clicksDataTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);


    return gl;
}

function updateClickDataTexture() {

    clicks.forEach((click, i) => {
        scaledData[i * 4] = click.coordinate.x * 255;
        scaledData[i * 4 + 1] = click.coordinate.y * 255;
        scaledData[i * 4 + 2] = click.clickDistance * 255;
        scaledData[i * 4 + 3] = click.radius * 255;
    });

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, clicksDataTextureSize[0], clicksDataTextureSize[1], 0, gl.RGBA, gl.UNSIGNED_BYTE, scaledData);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, clicksDataTexture);
    gl.uniform1i(uniforms.u_click_data_texture, 0);
}

function render() {
    gl.uniform1f(uniforms.u_time, 10 + gsap.globalTimeline.time());
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    updateClickDataTexture();
}

function resizeCanvas() {
    canvasEl.width = textureEl.width = window.innerWidth * devicePixelRatio;
    canvasEl.height = textureEl.height = window.innerHeight * devicePixelRatio;
    gl.viewport(0, 0, canvasEl.width, canvasEl.height);
    gl.uniform1f(uniforms.u_ratio, canvasEl.width / canvasEl.height);
	 gl.uniform1f(uniforms.u_resolution_scale, canvasEl.width > canvasEl.height ? 1 : (canvasEl.height / canvasEl.width));
}