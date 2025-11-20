
import { getURLForAssetPath } from '../../engine/AssetUtils.js';
import { showNotification } from './DialogWindow.js';

let dom = {};
let projectsDirHandle = null;
let openAssetSelectorCallback = null;
let currentPaletteFileHandle = null;
let currentSpriteAsset = null;
let selectedSpriteName = null;
let fullSpriteSheetImage = null; // To hold the loaded spritesheet image

export function initialize(dependencies) {
    dom = {
        panel: dependencies.dom.tilePalettePanel,
        paletteFileName: dependencies.dom.paletteFileName,
        saveBtn: dependencies.dom.paletteSaveBtn,
        loadBtn: dependencies.dom.paletteLoadBtn,
        spriteAssetName: dependencies.dom.paletteSpriteAssetName,
        loadSpriteAssetBtn: dependencies.dom.paletteLoadSpriteAssetBtn,
        selectedSpriteName: dependencies.dom.paletteSelectedSpriteName,
        spriteGrid: dependencies.dom.paletteSpriteGrid,
        overlay: dependencies.dom.palettePanelOverlay,
    };
    projectsDirHandle = dependencies.projectsDirHandle;
    openAssetSelectorCallback = dependencies.openAssetSelectorCallback;

    dom.overlay.style.display = 'flex';
    dom.saveBtn.style.display = 'none';
    setupEventListeners();
}

export async function createNewPalette(name, dirHandle) {
    const content = { spriteAssetPath: "" };
    try {
        const fileHandle = await dirHandle.getFileHandle(name, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(content, null, 2));
        await writable.close();
        await openPalette(fileHandle);
    } catch (error) {
        console.error(`Error creating new palette file ${name}:`, error);
        showNotification('Error', `Failed to create palette: ${error.message}`);
    }
}

export async function openPalette(fileHandle) {
    try {
        currentPaletteFileHandle = fileHandle;
        const file = await fileHandle.getFile();
        const content = await file.text();
        const paletteData = JSON.parse(content);

        dom.panel.classList.remove('hidden');
        dom.overlay.style.display = 'none';
        dom.paletteFileName.textContent = file.name;
        dom.saveBtn.style.display = 'inline-block';

        if (paletteData.spriteAssetPath) {
            await loadSpriteAsset(paletteData.spriteAssetPath);
        } else {
            resetSpriteDisplay();
        }
    } catch (error) {
        console.error(`Error opening palette ${fileHandle.name}:`, error);
        showNotification('Error', `Could not open palette: ${error.message}`);
    }
}

async function loadSpriteAsset(assetPath) {
    try {
        const spriteAssetUrl = await getURLForAssetPath(assetPath, projectsDirHandle, true);
        if (!spriteAssetUrl) throw new Error(`Could not get URL for ${assetPath}`);

        const response = await fetch(spriteAssetUrl);
        if (!response.ok) throw new Error(`Failed to fetch sprite asset: ${response.statusText}`);

        currentSpriteAsset = await response.json();

        if (!currentSpriteAsset.sourceImagePath) {
            throw new Error("Sprite asset is missing 'sourceImagePath'.");
        }

        const imageUrl = await getURLForAssetPath(currentSpriteAsset.sourceImagePath, projectsDirHandle);
        if (!imageUrl) throw new Error("Could not load source image for sprites.");

        fullSpriteSheetImage = new Image();
        await new Promise((resolve, reject) => {
            fullSpriteSheetImage.onload = resolve;
            fullSpriteSheetImage.onerror = reject;
            fullSpriteSheetImage.src = imageUrl;
        });

        dom.spriteAssetName.textContent = assetPath.split('/').pop();
        renderSpriteGrid();

    } catch (error) {
        console.error(`Error loading sprite asset '${assetPath}':`, error);
        showNotification('Error', `Could not load sprite asset: ${error.message}`);
        resetSpriteDisplay();
    }
}

function renderSpriteGrid() {
    dom.spriteGrid.innerHTML = '';
    if (!currentSpriteAsset || !currentSpriteAsset.sprites || !fullSpriteSheetImage) return;

    for (const spriteData of currentSpriteAsset.sprites) {
        const item = document.createElement('div');
        item.className = 'grid-item sprite-item';
        item.dataset.spriteName = spriteData.name;
        item.title = spriteData.name;

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const rect = spriteData.rect;

        canvas.width = rect.w;
        canvas.height = rect.h;

        // Draw the specific sprite from the full spritesheet onto the small canvas
        ctx.drawImage(fullSpriteSheetImage, rect.x, rect.y, rect.w, rect.h, 0, 0, rect.w, rect.h);

        item.appendChild(canvas);
        dom.spriteGrid.appendChild(item);
    }
}

function resetSpriteDisplay() {
    currentSpriteAsset = null;
    fullSpriteSheetImage = null;
    selectedSpriteName = null;
    dom.spriteAssetName.textContent = 'Ninguno';
    dom.selectedSpriteName.textContent = '-';
    dom.spriteGrid.innerHTML = '<p class="empty-folder-message">Cargue un archivo .ceSprite</p>';
}

function setupEventListeners() {
    dom.loadBtn.addEventListener('click', () => {
        openAssetSelectorCallback('file', (fileHandle) => {
            if (fileHandle.name.endsWith('.cepalette')) {
                openPalette(fileHandle);
            } else {
                showNotification('Error', 'Please select a .cepalette file.');
            }
        });
    });

    dom.loadSpriteAssetBtn.addEventListener('click', () => {
        if (!currentPaletteFileHandle) {
            showNotification('Aviso', 'Por favor, carga primero un archivo de paleta.');
            return;
        }
        openAssetSelectorCallback('file', async (fileHandle) => {
             if (fileHandle.name.endsWith('.ceSprite')) {
                const assetPath = `Assets/${fileHandle.name}`; // Simplified path
                await saveCurrentPalette(assetPath);
                await loadSpriteAsset(assetPath);
            } else {
                showNotification('Error', 'Please select a .ceSprite file.');
            }
        });
    });

    dom.spriteGrid.addEventListener('click', (e) => {
        const item = e.target.closest('.sprite-item');
        if (item) {
            dom.spriteGrid.querySelectorAll('.sprite-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            selectedSpriteName = item.dataset.spriteName;
            dom.selectedSpriteName.textContent = selectedSpriteName;
        }
    });

    dom.saveBtn.addEventListener('click', () => saveCurrentPalette());
}

async function saveCurrentPalette(newSpriteAssetPath = null) {
    if (!currentPaletteFileHandle) return;

    try {
        const file = await currentPaletteFileHandle.getFile();
        let paletteData = JSON.parse(await file.text());

        if (newSpriteAssetPath) {
            paletteData.spriteAssetPath = newSpriteAssetPath;
        }

        const writable = await currentPaletteFileHandle.createWritable();
        await writable.write(JSON.stringify(paletteData, null, 2));
        await writable.close();
        console.log("Palette saved successfully.");
    } catch (error) {
        console.error("Error saving palette:", error);
        showNotification('Error', `Failed to save palette: ${error.message}`);
    }
}

export function getSelectedSpriteInfo() {
    if (!selectedSpriteName || !currentSpriteAsset) return null;

    const spriteData = currentSpriteAsset.sprites.find(s => s.name === selectedSpriteName);
    if (!spriteData) return null;

    return {
        spriteName: selectedSpriteName,
        spriteAssetPath: `Assets/${dom.spriteAssetName.textContent}`, // Simplified
        sourceImagePath: currentSpriteAsset.sourceImagePath
    };
}
