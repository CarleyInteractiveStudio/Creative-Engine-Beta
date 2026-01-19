// --- Animation Editor Module ---

// State variables will be encapsulated here
let dom = {};
let projectsDirHandle = null;
let currentDirectoryHandle = null;

let isDrawing = false;
let drawingTool = 'pencil';
let drawingMode = 'free'; // 'free' or 'pixel'
let drawingColor = '#ffffff';
let lastDrawPos = { x: 0, y: 0 };

let currentAnimationAsset = null; // Holds the parsed .cea file content
let currentAnimationFileHandle = null; // Holds the file handle for saving
let currentFrameIndex = -1;
let isAnimationPlaying = false;
let animationPlaybackId = null;

let animEditorSettings = {
    bg: 'transparent', // 'transparent' or 'white'
    grid: true,
    onionSkin: true
};

/**
 * Finds the bounding box of the non-transparent pixels on a canvas.
 * @param {HTMLCanvasElement} canvas The canvas to scan.
 * @returns {{x: number, y: number, width: number, height: number}|null} The bounding box or null if empty.
 */
function getDrawingBounds(canvas) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    let minX = width, minY = height, maxX = -1, maxY = -1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const alpha = data[(y * width + x) * 4 + 3];
            if (alpha > 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (maxX < minX || maxY < minY) {
        return null; // Canvas is empty
    }

    minX = Math.max(0, minX - 1);
    minY = Math.max(0, minY - 1);
    maxX = Math.min(width, maxX + 1);
    maxY = Math.min(height, maxY + 1);

    return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export function addFrameFromCanvas() {
    if (!currentAnimationAsset) {
        alert("No hay ningún asset de animación cargado.");
        return;
    }

    const sourceCanvas = dom.drawingCanvas;
    const bounds = getDrawingBounds(sourceCanvas);
    let dataUrl;

    if (bounds) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = bounds.width;
        tempCanvas.height = bounds.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(
            sourceCanvas,
            bounds.x, bounds.y, bounds.width, bounds.height,
            0, 0, bounds.width, bounds.height
        );
        dataUrl = tempCanvas.toDataURL();
    } else {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = 1;
        tempCanvas.height = 1;
        dataUrl = tempCanvas.toDataURL();
    }

    if (currentAnimationAsset.animations && currentAnimationAsset.animations.length > 0) {
        currentAnimationAsset.animations[0].frames.push(dataUrl);
        currentFrameIndex = currentAnimationAsset.animations[0].frames.length - 1;
        populateTimeline();
    } else {
        alert("El asset de animación no tiene un estado de animación válido.");
        return;
    }
    drawOnionSkin();
}

export function populateTimeline() {
    dom.animationTimeline.innerHTML = '';
    if (!currentAnimationAsset || !currentAnimationAsset.animations.length) return;

    const animation = currentAnimationAsset.animations[0];
    if (!animation) return;

    animation.frames.forEach((frameData, index) => {
        const frameImg = document.createElement('img');
        frameImg.className = 'timeline-frame';
        if (index === currentFrameIndex) {
            frameImg.classList.add('active');
        }
        frameImg.src = frameData;
        frameImg.dataset.index = index;
        dom.animationTimeline.appendChild(frameImg);
    });
}

export async function saveAnimationAsset() {
    if (!currentAnimationAsset || !currentAnimationFileHandle) {
        alert("No hay asset de animación cargado para guardar.");
        return;
    }
    try {
        const writable = await currentAnimationFileHandle.createWritable();
        const content = JSON.stringify(currentAnimationAsset, null, 2);
        await writable.write(content);
        await writable.close();
        console.log(`Asset '${currentAnimationFileHandle.name}' guardado.`);
    } catch (error) {
        console.error("Error al guardar el asset de animación:", error);
        alert("No se pudo guardar el archivo.");
    }
}

export async function openAnimationAsset(fileName, dirHandle) {
    try {
        currentAnimationFileHandle = await dirHandle.getFileHandle(fileName);
        const file = await currentAnimationFileHandle.getFile();
        const content = await file.text();
        currentAnimationAsset = JSON.parse(content);

        dom.animationPanel.classList.remove('hidden');
        dom.animationPanelOverlay.classList.add('hidden');
        console.log(`Abierto ${fileName}:`, currentAnimationAsset);

        populateTimeline();
        // drawOnionSkin();
    } catch(error) {
        console.error(`Error al abrir el asset de animación '${fileName}':`, error);
    }
};

export function resetAnimationPanel() {
    dom.animationPanelOverlay.classList.remove('hidden');
    currentAnimationAsset = null;
    currentFrameIndex = -1;
    dom.animationTimeline.innerHTML = '';
    stopAnimationPlayback();
}

export function startAnimationPlayback() {
    if (isAnimationPlaying || !currentAnimationAsset) return;

    const animation = currentAnimationAsset.animations[0];
    if (!animation || !animation.frames.length) return;

    isAnimationPlaying = true;
    dom.animationEditView.classList.add('hidden');
    dom.animationPlaybackView.classList.remove('hidden');

    let startTime = performance.now();
    const playbackCtx = dom.animationPlaybackCanvas.getContext('2d');
    const frameImages = animation.frames.map(src => {
        const img = new Image();
        img.src = src;
        return img;
    });

    function playbackLoop(currentTime) {
        if (!isAnimationPlaying) return;

        const elapsedTime = currentTime - startTime;
        const frameDuration = 1000 / animation.speed;
        const currentFrame = Math.floor(elapsedTime / frameDuration) % frameImages.length;

        const img = frameImages[currentFrame];
        playbackCtx.clearRect(0, 0, dom.animationPlaybackCanvas.width, dom.animationPlaybackCanvas.height);
        if (img.complete) {
            playbackCtx.drawImage(img, 0, 0);
        }

        animationPlaybackId = requestAnimationFrame(playbackLoop);
    }
    animationPlaybackId = requestAnimationFrame(playbackLoop);
}

export function stopAnimationPlayback() {
    if (!isAnimationPlaying) return;
    isAnimationPlaying = false;
    cancelAnimationFrame(animationPlaybackId);
    dom.animationEditView.classList.remove('hidden');
    dom.animationPlaybackView.classList.add('hidden');
}


export function initializeAnimationEditor(dependencies) {
    dom = dependencies.dom;
    projectsDirHandle = dependencies.projectsDirHandle;
    currentDirectoryHandle = dependencies.currentDirectoryHandle;

    console.log("Animation Editor module initialized.");

    // --- Animation Drawing Listeners ---
    const drawingCanvas = dom.drawingCanvas;
    const drawingCtx = drawingCanvas.getContext('2d');

    function getDrawPos(e) {
        const rect = drawingCanvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    drawingCanvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        lastDrawPos = getDrawPos(e);
    });

    const PIXEL_GRID_SIZE = 8;

    drawingCanvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        let currentPos = getDrawPos(e);
        if (drawingMode === 'pixel') {
            drawingCtx.globalCompositeOperation = 'source-over';
            const x = Math.floor(currentPos.x / PIXEL_GRID_SIZE) * PIXEL_GRID_SIZE;
            const y = Math.floor(currentPos.y / PIXEL_GRID_SIZE) * PIXEL_GRID_SIZE;
            drawingCtx.fillStyle = drawingTool === 'pencil' ? drawingColor : 'rgba(0,0,0,0)';
            if(drawingTool === 'eraser') drawingCtx.clearRect(x,y,PIXEL_GRID_SIZE,PIXEL_GRID_SIZE);
            else drawingCtx.fillRect(x, y, PIXEL_GRID_SIZE, PIXEL_GRID_SIZE);
        } else {
            if (drawingTool === 'eraser') {
                drawingCtx.globalCompositeOperation = 'destination-out';
            } else {
                drawingCtx.globalCompositeOperation = 'source-over';
            }
            drawingCtx.beginPath();
            drawingCtx.strokeStyle = drawingColor;
            drawingCtx.lineWidth = drawingTool === 'pencil' ? 2 : 20;
            drawingCtx.lineCap = 'round';
            drawingCtx.moveTo(lastDrawPos.x, lastDrawPos.y);
            drawingCtx.lineTo(currentPos.x, currentPos.y);
            drawingCtx.stroke();
        }
        lastDrawPos = currentPos;
    });

    drawingCanvas.addEventListener('mouseup', () => isDrawing = false);
    drawingCanvas.addEventListener('mouseout', () => isDrawing = false);

    dom.drawingTools.addEventListener('click', (e) => {
        const toolButton = e.target.closest('.tool-btn');
        if (toolButton) {
            if (toolButton.dataset.tool) {
                dom.drawingTools.querySelectorAll('[data-tool]').forEach(btn => btn.classList.remove('active'));
                toolButton.classList.add('active');
                drawingTool = toolButton.dataset.tool;
            } else if (toolButton.dataset.drawMode) {
                dom.drawingTools.querySelectorAll('[data-draw-mode]').forEach(btn => btn.classList.remove('active'));
                toolButton.classList.add('active');
                drawingMode = toolButton.dataset.drawMode;
            }
        }
    });

    dom.drawingColorPicker.addEventListener('change', (e) => {
        drawingColor = e.target.value;
    });

    // --- Panel Toggles & Buttons ---
    dom.animBgToggleBtn.addEventListener('click', () => {
        animEditorSettings.bg = (animEditorSettings.bg === 'transparent') ? 'white' : 'transparent';
        dom.drawingCanvasContainer.classList.toggle('bg-white', animEditorSettings.bg === 'white');
        dom.animBgToggleBtn.classList.toggle('active', animEditorSettings.bg === 'white');
    });

function drawAnimEditorGrid() {
    if (!dom.animGridCanvas) return;
    const canvas = dom.animGridCanvas;
    const ctx = canvas.getContext('2d');
    const gridSize = 16;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!animEditorSettings.grid) {
        return; // Don't draw if the grid is turned off
    }

    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
    }

    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();
}

    dom.animGridToggleBtn.addEventListener('click', () => {
        animEditorSettings.grid = !animEditorSettings.grid;
        dom.animGridToggleBtn.classList.toggle('active', animEditorSettings.grid);
        drawAnimEditorGrid();
    });

function drawOnionSkin() {
    if (!dom.animOnionSkinCanvas) return;
    const canvas = dom.animOnionSkinCanvas;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!animEditorSettings.onionSkin || currentFrameIndex < 1) {
        return; // Don't draw if turned off or if it's the first frame
    }

    const prevFrameData = currentAnimationAsset.animations[0].frames[currentFrameIndex - 1];
    if (prevFrameData) {
        const img = new Image();
        img.onload = () => {
            ctx.globalAlpha = 0.3;
            ctx.drawImage(img, 0, 0);
            ctx.globalAlpha = 1.0; // Reset alpha
        };
        img.src = prevFrameData;
    }
}

    dom.animOnionToggleBtn.addEventListener('click', () => {
        animEditorSettings.onionSkin = !animEditorSettings.onionSkin;
        dom.animOnionToggleBtn.classList.toggle('active', animEditorSettings.onionSkin);
        drawOnionSkin();
    });

    dom.timelineToggleBtn.addEventListener('click', (e) => {
        const panel = dom.animationPanel;
        panel.classList.toggle('timeline-collapsed');
        e.target.textContent = panel.classList.contains('timeline-collapsed') ? '▼' : '▲';
    });

    dom.animationPlayBtn.addEventListener('click', startAnimationPlayback);
    dom.animationStopBtn.addEventListener('click', stopAnimationPlayback);
    dom.animationSaveBtn.addEventListener('click', saveAnimationAsset);

    dom.addFrameBtn.addEventListener('click', addFrameFromCanvas);

    dom.deleteFrameBtn.addEventListener('click', () => {
        if (currentFrameIndex === -1) {
            alert("Por favor, selecciona un fotograma para borrar.");
            return;
        }

        if (currentAnimationAsset && currentAnimationAsset.animations[0]) {
            currentAnimationAsset.animations[0].frames.splice(currentFrameIndex, 1);
            currentFrameIndex = -1; // Deselect

            const ctx = dom.drawingCanvas.getContext('2d');
            ctx.clearRect(0, 0, dom.drawingCanvas.width, dom.drawingCanvas.height);

            populateTimeline();
            drawOnionSkin();
        }
    });

    dom.animationTimeline.addEventListener('click', (e) => {
        const frame = e.target.closest('.timeline-frame');
        if (!frame) return;

        const index = parseInt(frame.dataset.index, 10);
        currentFrameIndex = index;

        const ctx = dom.drawingCanvas.getContext('2d');
        ctx.clearRect(0, 0, dom.drawingCanvas.width, dom.drawingCanvas.height);
        ctx.drawImage(frame, 0, 0);

        populateTimeline();
        drawOnionSkin();
    });

    drawAnimEditorGrid(); // Draw initial grid
}
