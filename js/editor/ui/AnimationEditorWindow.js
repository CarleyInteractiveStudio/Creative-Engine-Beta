import { getURLForAssetPath, clearAssetCache } from '../../engine/AssetUtils.js';

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
let currentKeyframeIndex = -1;
let currentAnimationTime = 0;
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
    const L = window.Localization;
    if (!currentAnimationAsset) {
        window.Dialogs.showNotification(L.get('ERROR', 'Error'), L.get('ERROR_SIN_ANIM_CARGADA', 'No hay ningún asset de animación cargado.'));
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

    const anim = (currentAnimationAsset.animations && currentAnimationAsset.animations.length > 0)
        ? currentAnimationAsset.animations[0]
        : null;

    if (anim) {
        anim.frames.push(dataUrl);
        currentFrameIndex = anim.frames.length - 1;
        populateTimeline();
    } else {
        window.Dialogs.showNotification(L.get('ERROR', 'Error'), L.get('ERROR_ANIM_ESTADO_INVALIDO', 'El asset de animación no tiene un estado de animación válido.'));
        return;
    }
    drawOnionSkin();
}

export function populateTimeline() {
    dom.animationTimeline.innerHTML = '';
    if (!currentAnimationAsset) return;

    // Handle both formats: { animations: [...] } or { frames: [...] }
    const animation = (currentAnimationAsset.animations && currentAnimationAsset.animations.length > 0)
        ? currentAnimationAsset.animations[0]
        : currentAnimationAsset;

    if (!animation || !animation.frames) return;
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
    const L = window.Localization;
    if (!currentAnimationAsset || !currentAnimationFileHandle) {
        window.Dialogs.showNotification(L.get('ERROR', 'Error'), L.get('ERROR_SIN_ANIM_GUARDAR', 'No hay asset de animación cargado para guardar.'));
        return;
    }
    try {
        const writable = await currentAnimationFileHandle.createWritable();
        const content = JSON.stringify(currentAnimationAsset, null, 2);
        await writable.write(content);
        await writable.close();

        // Invalidate cache
        const assetPath = `Assets/${currentAnimationFileHandle.name}`;
        clearAssetCache(assetPath);

        // Notify components in the scene
        if (window.SceneManager && window.SceneManager.currentScene) {
            const allMaterias = window.SceneManager.currentScene.getAllMaterias();
            allMaterias.forEach(m => {
                const animator = m.getComponentByName('Animator');
                if (animator && animator.animationClipPath &&
                   (animator.animationClipPath.includes(currentAnimationFileHandle.name))) {
                    animator.loadAnimationClip(window.projectsDirHandle);
                }
                const controller = m.getComponentByName('AnimatorController');
                if (controller) {
                    controller.refresh();
                }
            });
        }

        window.Dialogs.showNotification(L.get('EXITO', 'Éxito'), `${L.get('EXITO_ANIM_GUARDADA', 'Asset guardado correctamente')}: ${currentAnimationFileHandle.name}`);
    } catch (error) {
        console.error("Error al guardar el asset de animación:", error);
        window.Dialogs.showNotification(L.get('ERROR', 'Error'), L.get('ERROR_GUARDAR_ARCHIVO', 'No se pudo guardar el archivo.'));
    }
}

export async function openAnimationAsset(fileHandle, dirHandle) {
    try {
        // FIX: The file handle is now passed directly, no need to look it up again.
        currentAnimationFileHandle = fileHandle;
        const file = await currentAnimationFileHandle.getFile();
        const content = await file.text();
        let data = JSON.parse(content);

        // Normalize structure if it's missing the animations array but has frames
        if (!data.animations && data.frames) {
            data = {
                name: data.name || fileHandle.name.replace('.cea', ''),
                animations: [
                    {
                        name: "default",
                        speed: data.speed || 10,
                        loop: data.loop !== undefined ? data.loop : true,
                        frames: data.frames
                    }
                ]
            };
        }

        currentAnimationAsset = data;

        if (dom.animationTypeSelector) {
            dom.animationTypeSelector.value = data.type || 'frame';
            updateUIForAnimationType();
        }

        dom.animationPanel.classList.remove('hidden');
        dom.animationPanelOverlay.classList.add('hidden');
        console.log(`Abierto ${currentAnimationFileHandle.name}:`, currentAnimationAsset);

        populateTimeline();

        // Select first frame by default if available
        const anim = data.animations[0];
        if (anim && anim.frames && anim.frames.length > 0) {
            currentFrameIndex = 0;
            const img = new Image();
            img.onload = () => {
                const w = img.naturalWidth || img.width;
                const h = img.naturalHeight || img.height;
                [dom.drawingCanvas, dom.animOnionSkinCanvas, dom.animGridCanvas].forEach(canvas => {
                    canvas.width = w;
                    canvas.height = h;
                });
                const ctx = dom.drawingCanvas.getContext('2d');
                ctx.clearRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0);
                drawOnionSkin();
                drawAnimEditorGrid();
                populateTimeline(); // Refresh active class
            };
            img.src = anim.frames[0];
        } else {
            drawOnionSkin();
            drawAnimEditorGrid();
        }
    } catch(error) {
        console.error(`Error al abrir el asset de animación '${fileHandle.name}':`, error);
    }
};

export function resetAnimationPanel() {
    dom.animationPanelOverlay.classList.remove('hidden');
    currentAnimationAsset = null;
    currentFrameIndex = -1;
    dom.animationTimeline.innerHTML = '';
    stopAnimationPlayback();
}

async function imageToDataURL(url) {
    const L = window.Localization;
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => reject(new Error(L.get('ERROR_CARGAR_IMAGEN', "No se pudo cargar la imagen.")));
        img.src = url;
    });
}

async function extractFramesFromImage(imageUrl, cols, rows) {
    const L = window.Localization;
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const frames = [];
            const frameWidth = img.naturalWidth / cols;
            const frameHeight = img.naturalHeight / rows;
            const canvas = document.createElement('canvas');
            canvas.width = frameWidth;
            canvas.height = frameHeight;
            const ctx = canvas.getContext('2d');

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    ctx.clearRect(0, 0, frameWidth, frameHeight);
                    const sx = c * frameWidth;
                    const sy = r * frameHeight;
                    ctx.drawImage(img, sx, sy, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
                    frames.push(canvas.toDataURL('image/png'));
                }
            }
            resolve(frames);
        };
        img.onerror = () => reject(new Error(L.get('ERROR_EXTRAER_FRAMES', "No se pudo cargar la imagen para extraer los fotogramas.")));
        img.src = imageUrl;
    });
}

function addFramesToAnimation(newFrames) {
    if (!currentAnimationAsset || !newFrames.length) return;
    const anim = (currentAnimationAsset.animations && currentAnimationAsset.animations.length > 0)
        ? currentAnimationAsset.animations[0]
        : null;

    if (anim) {
        anim.frames.push(...newFrames);
        currentFrameIndex = anim.frames.length - 1;
        populateTimeline();

        // Select and draw the last added frame
        const lastFrameData = anim.frames[currentFrameIndex];
        const img = new Image();
        img.onload = () => {
            const w = img.naturalWidth || img.width;
            const h = img.naturalHeight || img.height;

            [dom.drawingCanvas, dom.animOnionSkinCanvas, dom.animGridCanvas].forEach(canvas => {
                canvas.width = w;
                canvas.height = h;
            });

            const ctx = dom.drawingCanvas.getContext('2d');
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0);

            drawOnionSkin();
            drawAnimEditorGrid();
        };
        img.src = lastFrameData;
    }
}

export async function importAssets() {
    const L = window.Localization;
    if (!currentAnimationAsset) {
        window.Dialogs.showNotification(L.get('ERROR', 'Error'), L.get('ERROR_SIN_ANIM_CARGADA', 'No hay ningún asset de animación cargado.'));
        return;
    }

    const pickFromAssets = () => {
        window.openAssetSelector(async (selectedItems) => {
            if (!selectedItems || selectedItems.length === 0) return;
            const items = Array.isArray(selectedItems) ? selectedItems : [selectedItems];
            processImportItems(items);
        }, { multiple: true, filter: ['image'], title: L.get('TITULO_IMPORTAR_ASSETS', "Importar Imagen(es) de Assets") });
    };

    const pickFromDisk = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;

            const items = await Promise.all(files.map(async file => {
                const dataUrl = await new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onload = (ev) => resolve(ev.target.result);
                    reader.readAsDataURL(file);
                });
                return { path: file.name, dataUrl: dataUrl };
            }));
            processImportItems(items);
        };
        input.click();
    };

    window.Dialogs.showSelection(
        L.get('TITULO_IMPORTAR_IMAGENES', "Importar Imágenes"),
        L.get('PROMPT_IMPORTAR_FOTOS', "¿De dónde quieres importar las fotos?"),
        [L.get('OPCION_DE_ASSETS', "De la Carpeta Assets (Proyecto)"), L.get('OPCION_DE_DISCO', "De mi Computadora (Disco)")],
        (value, index) => {
            if (index === 0) pickFromAssets();
            else pickFromDisk();
        }
    );
}

async function processImportItems(items) {
    const L = window.Localization;
    const currentDirHandle = window.projectsDirHandle || projectsDirHandle;
    if (items.length === 1) {
        const item = items[0];
        const url = item.dataUrl || await getURLForAssetPath(item.path, currentDirHandle);
        if (!url) return;

        window.Dialogs.showSelection(
            L.get('TITULO_IMPORTAR_IMAGEN', "Importar Imagen"),
            L.get('PROMPT_COMO_IMPORTAR', "¿Cómo quieres importar esta imagen?"),
            [L.get('OPCION_SOLO_FRAME', "Como un solo fotograma"), L.get('OPCION_SPRITESHEET', "Como una hoja de sprites (Slice)")],
            async (value, index) => {
                if (index === 0) { // Single frame
                    try {
                        const dataUrl = item.dataUrl || await imageToDataURL(url);
                        addFramesToAnimation([dataUrl]);
                    } catch (e) {
                        console.error(e);
                        window.Dialogs.showNotification(L.get('ERROR', 'Error'), L.get('ERROR_IMPORTAR_IMAGEN', "No se pudo importar la imagen."));
                    }
                } else { // Spritesheet
                    window.Dialogs.showPrompt(L.get('TITULO_HOJA_SPRITES', "Hoja de Sprites"), L.get('PROMPT_COLUMNAS', "Número de Columnas:"), (cols) => {
                        if (!cols || isNaN(cols) || cols <= 0) return;
                        window.Dialogs.showPrompt(L.get('TITULO_HOJA_SPRITES', "Hoja de Sprites"), L.get('PROMPT_FILAS', "Número de Filas:"), async (rows) => {
                            if (!rows || isNaN(rows) || rows <= 0) return;
                            try {
                                const frames = await extractFramesFromImage(url, parseInt(cols), parseInt(rows));
                                addFramesToAnimation(frames);
                            } catch (e) {
                                console.error(e);
                                window.Dialogs.showNotification(L.get('ERROR', 'Error'), L.get('ERROR_EXTRAER_FOTOGRAMAS', "No se pudieron extraer los fotogramas."));
                            }
                        });
                    });
                }
            }
        );
    } else {
        // Multiple images
        const dataUrls = [];
        // Sort items by path/name to maintain order
        items.sort((a, b) => a.path.localeCompare(b.path));

        for (const item of items) {
            if (item.dataUrl) {
                dataUrls.push(item.dataUrl);
            } else {
                const url = await getURLForAssetPath(item.path, currentDirHandle);
                if (url) {
                    try {
                        const dataUrl = await imageToDataURL(url);
                        dataUrls.push(dataUrl);
                    } catch (e) {
                        console.error(`Error importando ${item.path}:`, e);
                    }
                }
            }
        }
        addFramesToAnimation(dataUrls);
    }
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
    // The currentDirectoryHandle is no longer needed here,
    // as it's passed directly to openAnimationAsset when needed.

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

    if (!animEditorSettings.onionSkin || currentFrameIndex < 1 || !currentAnimationAsset) {
        return; // Don't draw if turned off or if it's the first frame
    }

    const anim = (currentAnimationAsset.animations && currentAnimationAsset.animations.length > 0)
        ? currentAnimationAsset.animations[0]
        : null;

    if (!anim || !anim.frames) return;

    const prevFrameData = anim.frames[currentFrameIndex - 1];
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

    if (dom.animationTypeSelector) {
        dom.animationTypeSelector.addEventListener('change', (e) => {
            if (currentAnimationAsset) {
                currentAnimationAsset.type = e.target.value;
                updateUIForAnimationType();
            }
        });
    }

    if (dom.animationRecordBtn) {
        dom.animationRecordBtn.addEventListener('click', recordKeyframe);
    }

    if (dom.animationTimeSlider) {
        dom.animationTimeSlider.addEventListener('input', (e) => {
            currentAnimationTime = parseFloat(e.target.value);
            previewSkeletalAnimationAt(currentAnimationTime);
        });
    }

    dom.addFrameBtn.addEventListener('click', addFrameFromCanvas);
    if (dom.animationImportBtn) {
        dom.animationImportBtn.addEventListener('click', importAssets);
    }

    // --- Quick Create from Overlay ---
    const quickCreateBtn = document.getElementById('btn-create-animation-quick');
    const L = window.Localization;
    if (quickCreateBtn) {
        quickCreateBtn.onclick = async () => {
            if (window.Dialogs) {
                window.Dialogs.showPrompt(L.get('TITULO_NUEVA_ANIMACION', "Nueva Animación"), L.get('PROMPT_NOMBRE_CEA', "Introduce el nombre del asset (.cea):"), async (name) => {
                    if (!name) return;
                    const fileName = name.endsWith('.cea') ? name : `${name}.cea`;
                    const dirHandle = getCurrentDirectoryHandle ? getCurrentDirectoryHandle() : null;
                    if (!dirHandle) {
                        window.Dialogs.showNotification(L.get('ERROR', 'Error'), L.get('ERROR_DIR_ASSETS', "No se pudo obtener el directorio actual de assets."));
                        return;
                    }

                    const emptyAnim = {
                        name: name,
                        animations: [{ name: "default", speed: 10, loop: true, frames: [] }]
                    };

                    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(JSON.stringify(emptyAnim, null, 2));
                    await writable.close();

                    if (window.updateAssetBrowser) window.updateAssetBrowser();
                    openAnimationAsset(fileHandle, dirHandle);
                });
            }
        };
    }

    // --- Drag and Drop Listeners ---
    dom.animationPanel.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        dom.animationPanel.classList.add('drag-over');
    });

    dom.animationPanel.addEventListener('dragleave', () => {
        dom.animationPanel.classList.remove('drag-over');
    });

    dom.animationPanel.addEventListener('drop', async (e) => {
        e.preventDefault();
        dom.animationPanel.classList.remove('drag-over');

        if (!currentAnimationAsset) {
            window.Dialogs.showNotification(L.get('ERROR', 'Error'), L.get('ERROR_DROP_ANIM', 'Carga un asset de animación (.cea) antes de soltar imágenes.'));
            return;
        }

        const dataText = e.dataTransfer.getData('text/plain');
        if (dataText) {
            try {
                const data = JSON.parse(dataText);
                if (data.type === 'Asset' && (data.name.endsWith('.png') || data.name.endsWith('.jpg') || data.name.endsWith('.jpeg'))) {
                    processImportItems([{ path: data.path }]);
                }
            } catch (err) {}
        } else if (e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
            if (files.length > 0) {
                const items = await Promise.all(files.map(async file => {
                    const dataUrl = await new Promise(resolve => {
                        const reader = new FileReader();
                        reader.onload = (ev) => resolve(ev.target.result);
                        reader.readAsDataURL(file);
                    });
                    return { path: file.name, dataUrl: dataUrl };
                }));
                processImportItems(items);
            }
        }
    });

    dom.deleteFrameBtn.addEventListener('click', () => {
        if (currentFrameIndex === -1) {
            window.Dialogs.showNotification(L.get('AVISO', 'Aviso'), L.get('AVISO_SELECCION_FRAME', 'Por favor, selecciona un fotograma para borrar.'));
            return;
        }

        const anim = (currentAnimationAsset && currentAnimationAsset.animations && currentAnimationAsset.animations.length > 0)
            ? currentAnimationAsset.animations[0]
            : null;

        if (anim) {
            anim.frames.splice(currentFrameIndex, 1);
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

        // Resize all canvases to match the frame size
        const w = frame.naturalWidth || frame.width;
        const h = frame.naturalHeight || frame.height;

        [dom.drawingCanvas, dom.animOnionSkinCanvas, dom.animGridCanvas].forEach(canvas => {
            if (canvas.width !== w) canvas.width = w;
            if (canvas.height !== h) canvas.height = h;
        });

        const ctx = dom.drawingCanvas.getContext('2d');
        ctx.clearRect(0, 0, dom.drawingCanvas.width, dom.drawingCanvas.height);
        ctx.drawImage(frame, 0, 0);

        populateTimeline();
        drawOnionSkin();
        drawAnimEditorGrid();
    });

    drawAnimEditorGrid(); // Draw initial grid

    if (dom.deleteFrameBtn) {
        // Redefine delete listener to handle keyframes too
        const oldDelete = dom.deleteFrameBtn.onclick;
        dom.deleteFrameBtn.onclick = null;
        dom.deleteFrameBtn.addEventListener('click', () => {
            const type = currentAnimationAsset ? (currentAnimationAsset.type || 'frame') : 'frame';
            if (type === 'frame') {
                // Original frame delete logic
                if (currentFrameIndex === -1) {
                    window.Dialogs.showNotification(L.get('AVISO', 'Aviso'), L.get('AVISO_SELECCION_FRAME', 'Por favor, selecciona un fotograma para borrar.'));
                    return;
                }
                const anim = (currentAnimationAsset && currentAnimationAsset.animations && currentAnimationAsset.animations.length > 0)
                    ? currentAnimationAsset.animations[0]
                    : null;
                if (anim) {
                    anim.frames.splice(currentFrameIndex, 1);
                    currentFrameIndex = -1;
                    populateTimeline();
                }
            } else {
                // Skeletal keyframe delete logic
                if (currentKeyframeIndex === -1) {
                    window.Dialogs.showNotification("Aviso", "Por favor, selecciona un keyframe para borrar.");
                    return;
                }
                currentAnimationAsset.keyframes.splice(currentKeyframeIndex, 1);
                currentKeyframeIndex = -1;
                populateSkeletalTracks();
            }
        });
    }

function updateUIForAnimationType() {
    const type = currentAnimationAsset ? (currentAnimationAsset.type || 'frame') : 'frame';
    const isFrame = type === 'frame';

    dom.animationTimeline.classList.toggle('hidden', !isFrame);
    if (dom.skeletalTimeline) dom.skeletalTimeline.classList.toggle('hidden', isFrame);

    document.querySelectorAll('.frame-only').forEach(el => {
        el.style.display = isFrame ? 'inline-block' : 'none';
    });

    if (isFrame) {
        populateTimeline();
    } else {
        populateSkeletalTracks();
    }
}

function recordKeyframe() {
    if (!currentAnimationAsset || currentAnimationAsset.type !== 'skeletal') return;

    const time = currentAnimationTime;
    const scene = window.SceneManager.currentScene;
    if (!scene) return;

    // IMPROVEMENT: Only record bones belonging to the selected character/hierarchy
    const selectedMateria = window.getSelectedMateria ? window.getSelectedMateria() : null;
    if (!selectedMateria) {
        window.Dialogs.showNotification("Aviso", "Selecciona el objeto raíz (Animator/Esqueleto) para grabar sus huesos.");
        return;
    }

    const keyframeData = {};

    // Recursive function to record bones in hierarchy
    const recordHierarchy = (mtr) => {
        if (mtr.getComponentByName('Bone') || mtr.getComponentByName('SkeletonRenderer')) {
            const trans = mtr.getComponentByName('Transform');
            if (trans) {
                const key = mtr.name || mtr.id;
                keyframeData[key] = {
                    pos: { ...trans.localPosition },
                    rot: trans.localRotation,
                    scale: { ...trans.localScale }
                };
            }
        }
        for (const child of mtr.children) {
            recordHierarchy(child);
        }
    };

    recordHierarchy(selectedMateria);

    if (Object.keys(keyframeData).length === 0) {
        window.Dialogs.showNotification("Aviso", "No se encontraron huesos en la jerarquía del objeto seleccionado.");
        return;
    }

    if (!currentAnimationAsset.keyframes) currentAnimationAsset.keyframes = [];

    // Find if a keyframe already exists at this time
    const existingIdx = currentAnimationAsset.keyframes.findIndex(k => Math.abs(k.time - time) < 0.001);
    if (existingIdx >= 0) {
        currentAnimationAsset.keyframes[existingIdx].data = keyframeData;
    } else {
        currentAnimationAsset.keyframes.push({ time, data: keyframeData });
        currentAnimationAsset.keyframes.sort((a, b) => a.time - b.time);
    }

    // Update duration if needed
    currentAnimationAsset.duration = Math.max(currentAnimationAsset.duration || 1.0, time);

    populateSkeletalTracks();
}

function populateSkeletalTracks() {
    if (!dom.skeletalTracks || !currentAnimationAsset) return;
    dom.skeletalTracks.innerHTML = '';

    if (!currentAnimationAsset.keyframes) return;

    const track = document.createElement('div');
    track.className = 'skeletal-track-main';
    track.style.position = 'relative';
    track.style.height = '40px';
    track.style.background = '#222';
    track.style.width = '100%';

    currentAnimationAsset.keyframes.forEach((kf, idx) => {
        const marker = document.createElement('div');
        marker.className = 'keyframe-marker';
        const percent = (kf.time / (currentAnimationAsset.duration || 1)) * 100;
        marker.style.left = `${percent}%`;
        marker.dataset.index = idx;
        marker.title = `Keyframe at ${kf.time.toFixed(2)}s`;

        marker.onclick = () => {
            currentKeyframeIndex = idx;
            currentAnimationTime = kf.time;
            if (dom.animationTimeSlider) dom.animationTimeSlider.value = currentAnimationTime;
            previewSkeletalAnimationAt(currentAnimationTime);
            // Highlight selected marker
            track.querySelectorAll('.keyframe-marker').forEach(m => m.classList.remove('active'));
            marker.classList.add('active');
        };

        track.appendChild(marker);
    });

    dom.skeletalTracks.appendChild(track);
}

function previewSkeletalAnimationAt(time) {
    if (!currentAnimationAsset || currentAnimationAsset.type !== 'skeletal' || !currentAnimationAsset.keyframes) return;

    const scene = window.SceneManager.currentScene;
    if (!scene) return;

    const keyframes = currentAnimationAsset.keyframes;
    if (keyframes.length === 0) return;

    let k1 = keyframes[0], k2 = keyframes[keyframes.length - 1];
    for (let i = 0; i < keyframes.length - 1; i++) {
        if (time >= keyframes[i].time && time <= keyframes[i+1].time) {
            k1 = keyframes[i];
            k2 = keyframes[i+1];
            break;
        }
    }

    const t = (k1 === k2) ? 0 : (time - k1.time) / (k2.time - k1.time);
    const allKeys = new Set([...Object.keys(k1.data), ...Object.keys(k2.data)]);

    for (const key of allKeys) {
        let mtr = null;
        if (!isNaN(key)) {
            mtr = scene.findMateriaById(parseInt(key));
        } else {
            // Find in whole scene if it's a skeletal preview
            mtr = scene.getAllMaterias().find(m => m.name === key);
        }

        if (!mtr) continue;
        const trans = mtr.getComponentByName('Transform');
        if (!trans) continue;

        const d1 = k1.data[key] || k2.data[key];
        const d2 = k2.data[key] || k1.data[key];

        if (d1 && d2) {
            trans.localPosition.x = d1.pos.x + (d2.pos.x - d1.pos.x) * t;
            trans.localPosition.y = d1.pos.y + (d2.pos.y - d1.pos.y) * t;
            let r1 = d1.rot, r2 = d2.rot;
            while (r2 - r1 > 180) r2 -= 360;
            while (r2 - r1 < -180) r2 += 360;
            trans.localRotation = r1 + (r2 - r1) * t;
            trans.localScale.x = d1.scale.x + (d2.scale.x - d1.scale.x) * t;
            trans.localScale.y = d1.scale.y + (d2.scale.y - d1.scale.y) * t;
        }
    }

    if (window.updateScene) window.updateScene();
}

    // Handle showing/hiding the panel from the main menu
    const menuButton = document.getElementById('menu-window-animation');
    if (menuButton) {
        menuButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation(); // Avoid double-toggle from editor.js generic listener
            dom.animationPanel.classList.toggle('hidden');
            // We need a way to update the checkmark in the menu
            // This will require passing the updateWindowMenuUI function as a dependency
            if (dependencies.updateWindowMenuUI) {
                dependencies.updateWindowMenuUI();
            }
        });
    }
}
