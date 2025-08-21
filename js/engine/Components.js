// Components.js
// This file contains all the component classes.

import { Leyes } from './Leyes.js';
import { registerComponent } from './ComponentRegistry.js';
import { getURLForAssetPath } from './SceneManager.js';

export class Transform extends Leyes { constructor(materia) { super(materia); this.x = 0; this.y = 0; this.rotation = 0; this.scale = { x: 1, y: 1 }; } }
export class Camera extends Leyes {
    constructor(materia) {
        super(materia);
        this.orthographicSize = 500; // Represents half of the vertical viewing volume height.
        this.zoom = 1.0; // Editor-only zoom, not part of the component's data.
    }
}

export class CreativeScript extends Leyes { constructor(materia, scriptName) { super(materia); this.scriptName = scriptName; this.instance = null; this.publicVars = []; this.publicVarReferences = {}; } parsePublicVars(code) { this.publicVars = []; const regex = /public\s+(\w+)\s+(\w+);/g; let match; while ((match = regex.exec(code)) !== null) { this.publicVars.push({ type: match[1], name: match[2] }); } } async load(projectsDirHandle) { if (!this.scriptName) return; try { const projectName = new URLSearchParams(window.location.search).get('project'); const projectHandle = await projectsDirHandle.getDirectoryHandle(projectName); let currentHandle = projectHandle; const parts = this.scriptName.split('/').filter(p => p); const fileName = parts.pop(); for (const part of parts) { currentHandle = await currentHandle.getDirectoryHandle(part); } const fileHandle = await currentHandle.getFileHandle(fileName); const file = await fileHandle.getFile(); const code = await file.text(); this.parsePublicVars(code); const scriptModule = new Function('materia', `${code}\nreturn { start, update };`)(this.materia); this.instance = { start: scriptModule.start || (() => {}), update: scriptModule.update || (() => {}), }; for (const key in this.publicVarReferences) { this.instance[key] = this.publicVarReferences[key]; } } catch (error) { console.error(`Error loading script '${this.scriptName}':`, error); } } }
export class RectTransform extends Transform {
    constructor(materia) {
        super(materia);
        this.width = 100;
        this.height = 100;
        // Placeholders for future implementation
        this.anchors = { min: { x: 0.5, y: 0.5 }, max: { x: 0.5, y: 0.5 } };
        this.pivot = { x: 0.5, y: 0.5 };
    }
}

export class UICanvas extends Leyes {
    constructor(materia) {
        super(materia);
        this.renderMode = 'ScreenSpaceOverlay'; // ScreenSpaceOverlay, ScreenSpaceCamera, WorldSpace
        this.sortingLayer = 'Default';
    }
}

export class UIImage extends Leyes {
    constructor(materia) {
        super(materia);
        this.sprite = new Image();
        this.source = ''; // Path to the image
        this.color = '#ffffff';
    }

    async loadSprite(projectsDirHandle) {
        if (this.source) {
            const url = await getURLForAssetPath(this.source, projectsDirHandle);
            if (url) this.sprite.src = url;
        } else {
            this.sprite.src = '';
        }
    }
}

export class UIText extends Leyes { constructor(materia, text = 'Hola Mundo') { super(materia); this.text = text; this.fontSize = 16; this.color = '#ffffff'; this.textTransform = 'none'; } }
export class UIPanel extends Leyes {
    constructor(materia) {
        super(materia);
        this.backgroundImage = materia.getComponent(UIImage) || materia.addComponent(new UIImage(materia));
    }
}

export class UIMask extends Leyes {
    constructor(materia) {
        super(materia);
        this.showMaskGraphic = true;
    }
}

export class UIButton extends Leyes {
    constructor(materia) {
        super(materia);
        this.targetGraphic = materia.getComponent(UIImage) || materia.addComponent(new UIImage(materia));
        this.label = materia.getComponent(UIText) || materia.addComponent(new UIText(materia, 'Button'));

        this.normalColor = '#FFFFFF';
        this.hoverColor = '#F0F0F0';
        this.pressedColor = '#C8C8C8';
        this.disabledColor = '#A0A0A0';

        this.onClick = []; // Array of functions to call
        this.currentState = 'normal'; // normal, hover, pressed, disabled
    }

    update() {
        if (!this.targetGraphic) return;

        switch (this.currentState) {
            case 'hover':
                this.targetGraphic.color = this.hoverColor;
                break;
            case 'pressed':
                this.targetGraphic.color = this.pressedColor;
                break;
            case 'disabled':
                this.targetGraphic.color = this.disabledColor;
                break;
            case 'normal':
            default:
                this.targetGraphic.color = this.normalColor;
                break;
        }
    }
}

export class Rigidbody extends Leyes {
    constructor(materia) {
        super(materia);
        this.bodyType = 'dynamic'; // 'dynamic', 'static', 'kinematic'
        this.mass = 1.0;
        this.velocity = { x: 0, y: 0 };
    }
}

export class BoxCollider extends Leyes {
    constructor(materia) {
        super(materia);
        this.width = 1.0;
        this.height = 1.0;
    }
}

export class SpriteRenderer extends Leyes {
    constructor(materia) {
        super(materia);
        this.sprite = new Image();
        this.source = ''; // Path to the image, relative to project root
        this.color = '#ffffff'; // Tint color
    }

    setSourcePath(path) {
        this.source = path;
    }

    async loadSprite(projectsDirHandle) {
        if (this.source) {
            const url = await getURLForAssetPath(this.source, projectsDirHandle);
            if (url) {
                this.sprite.src = url;
            }
        } else {
            this.sprite.src = ''; // Clear the image if source is empty
        }
    }
}

export class Animation {
    constructor(name = 'New Animation') {
        this.name = name;
        this.frames = []; // Array of image source paths
        this.speed = 10; // Frames per second
        this.loop = true;
    }
}

export class Animator extends Leyes {
    constructor(materia) {
        super(materia);
        this.controllerPath = ''; // Path to the .ceanim asset
        this.controller = null; // The loaded controller data
        this.states = new Map(); // Holds the runtime animation data, keyed by state name
        this.parameters = new Map(); // Holds runtime parameter values

        this.currentState = null;
        this.currentFrame = 0;
        this.frameTimer = 0;
        this.spriteRenderer = this.materia.getComponent(SpriteRenderer);
    }

    async loadController(projectsDirHandle) {
        if (!this.controllerPath) return;
        this.spriteRenderer = this.materia.getComponent(SpriteRenderer); // Ensure we have the renderer

        try {
            const url = await getURLForAssetPath(this.controllerPath, projectsDirHandle);
            if (!url) throw new Error(`Could not get URL for controller: ${this.controllerPath}`);

            const response = await fetch(url);
            this.controller = await response.json();

            // Load all animations defined in the states
            for (const state of this.controller.states) {
                const animUrl = await getURLForAssetPath(state.animationAsset, projectsDirHandle);
                if (animUrl) {
                    const animResponse = await fetch(animUrl);
                    const animData = await animResponse.json();
                    // We assume the .cea file has an array of animations, we take the first one
                    this.states.set(state.name, { ...state, ...animData.animations[0] });
                }
            }

            // Set initial state
            if (this.controller.entryState) {
                this.play(this.controller.entryState);
            }

        } catch (error) {
            console.error(`Failed to load Animator Controller at '${this.controllerPath}':`, error);
        }
    }

    play(stateName) {
        if (this.currentState?.name !== stateName && this.states.has(stateName)) {
            this.currentState = this.states.get(stateName);
            this.currentFrame = 0;
            this.frameTimer = 0;
            console.log(`Animator state changed to: ${stateName}`);
        }
    }

    update(deltaTime) {
        if (!this.currentState || !this.spriteRenderer) {
            return;
        }

        const animation = this.currentState;
        if (!animation.frames || animation.frames.length === 0) return;

        this.frameTimer += deltaTime;
        const frameDuration = 1 / (animation.speed || 10);

        if (this.frameTimer >= frameDuration) {
            this.frameTimer = 0; // Reset timer
            this.currentFrame++;

            if (this.currentFrame >= animation.frames.length) {
                if (animation.loop) {
                    this.currentFrame = 0;
                } else {
                    this.currentFrame = animation.frames.length - 1; // Stay on last frame
                    // Here we would check for transitions in the future
                }
            }
            // The animation frames are pre-loaded data URLs from the .cea file
            this.spriteRenderer.sprite.src = animation.frames[this.currentFrame];
        }
    }
}

registerComponent('CreativeScript', CreativeScript);
registerComponent('RectTransform', RectTransform);
registerComponent('UICanvas', UICanvas);
registerComponent('UIImage', UIImage);
registerComponent('UIPanel', UIPanel);
registerComponent('UIMask', UIMask);
registerComponent('UIText', UIText);
registerComponent('UIButton', UIButton);
registerComponent('Rigidbody', Rigidbody);
registerComponent('BoxCollider', BoxCollider);
registerComponent('Transform', Transform);
registerComponent('Camera', Camera);
registerComponent('SpriteRenderer', SpriteRenderer);
registerComponent('Animator', Animator);

export class LayoutGroup extends Leyes {
    constructor(materia) {
        super(materia);
        this.padding = { top: 0, left: 0, bottom: 0, right: 0 };
        this.spacing = 0;
    }
}

export class HorizontalLayoutGroup extends LayoutGroup {
    constructor(materia) {
        super(materia);
        // Future properties can go here
    }

    update() {
        const parentRect = this.materia.getComponent(RectTransform);
        if (!parentRect) return;

        let currentX = this.padding.left;

        this.materia.children.forEach(child => {
            const layoutElement = child.getComponent(LayoutElement);
            if (layoutElement && layoutElement.ignoreLayout) {
                return; // Skip this child
            }

            const childRect = child.getComponent(RectTransform);
            if (childRect) {
                const width = (layoutElement && layoutElement.preferredWidth > -1) ? layoutElement.preferredWidth : childRect.width;

                // For now, align to top. More alignment options can be added later.
                childRect.x = currentX + (width * childRect.pivot.x);
                childRect.y = this.padding.top + (childRect.height * childRect.pivot.y);
                currentX += width + this.spacing;
            }
        });
    }
}

export class VerticalLayoutGroup extends LayoutGroup {
    constructor(materia) {
        super(materia);
        // Future properties can go here
    }

    update() {
        const parentRect = this.materia.getComponent(RectTransform);
        if (!parentRect) return;

        let currentY = this.padding.top;

        this.materia.children.forEach(child => {
            const layoutElement = child.getComponent(LayoutElement);
            if (layoutElement && layoutElement.ignoreLayout) {
                return; // Skip this child
            }

            const childRect = child.getComponent(RectTransform);
            if (childRect) {
                const height = (layoutElement && layoutElement.preferredHeight > -1) ? layoutElement.preferredHeight : childRect.height;

                // For now, align to left. More alignment options can be added later.
                childRect.x = this.padding.left + (childRect.width * childRect.pivot.x);
                childRect.y = currentY + (height * childRect.pivot.y);
                currentY += height + this.spacing;
            }
        });
    }
}

export class GridLayoutGroup extends LayoutGroup {
    constructor(materia) {
        super(materia);
        this.cellSize = { x: 100, y: 100 };
        this.constraint = 'flexible'; // or 'fixedColumnCount', 'fixedRowCount'
        this.constraintCount = 2;
    }

    update() {
        const parentRect = this.materia.getComponent(RectTransform);
        if (!parentRect) return;

        const children = this.materia.children.filter(c => {
            const rect = c.getComponent(RectTransform);
            if (!rect) return false;
            const layoutElement = c.getComponent(LayoutElement);
            return !(layoutElement && layoutElement.ignoreLayout);
        });

        if (children.length === 0) return;

        let cols = 0;

        if (this.constraint === 'fixedColumnCount') {
            cols = this.constraintCount;
        } else if (this.constraint === 'fixedRowCount') {
            cols = Math.ceil(children.length / this.constraintCount);
        } else { // flexible
            cols = Math.floor((parentRect.width - this.padding.left - this.padding.right + this.spacing) / (this.cellSize.x + this.spacing));
            cols = Math.max(1, cols);
        }

        let currentX = this.padding.left;
        let currentY = this.padding.top;
        let colCount = 0;

        children.forEach(child => {
            const childRect = child.getComponent(RectTransform);

            childRect.x = currentX + (this.cellSize.x * childRect.pivot.x);
            childRect.y = currentY + (this.cellSize.y * childRect.pivot.y);
            // Optionally, force child size to cell size
            // childRect.width = this.cellSize.x;
            // childRect.height = this.cellSize.y;

            currentX += this.cellSize.x + this.spacing;
            colCount++;

            if (colCount >= cols) {
                colCount = 0;
                currentX = this.padding.left;
                currentY += this.cellSize.y + this.spacing;
            }
        });
    }
}

registerComponent('HorizontalLayoutGroup', HorizontalLayoutGroup);
registerComponent('VerticalLayoutGroup', VerticalLayoutGroup);
registerComponent('GridLayoutGroup', GridLayoutGroup);

export class ContentSizeFitter extends Leyes {
    constructor(materia) {
        super(materia);
        this.horizontalFit = 'unconstrained'; // unconstrained, minSize, preferredSize
        this.verticalFit = 'unconstrained'; // unconstrained, minSize, preferredSize
    }

    update() {
        if (this.horizontalFit === 'unconstrained' && this.verticalFit === 'unconstrained') {
            return;
        }

        const rectTransform = this.materia.getComponent(RectTransform);
        if (!rectTransform) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let hasChildren = false;

        this.materia.children.forEach(child => {
            const childRect = child.getComponent(RectTransform);
            if (childRect) {
                hasChildren = true;
                const childMinX = childRect.x - (childRect.width * childRect.pivot.x);
                const childMinY = childRect.y - (childRect.height * childRect.pivot.y);
                const childMaxX = childMinX + childRect.width;
                const childMaxY = childMinY + childRect.height;

                if (childMinX < minX) minX = childMinX;
                if (childMinY < minY) minY = childMinY;
                if (childMaxX > maxX) maxX = childMaxX;
                if (childMaxY > maxY) maxY = childMaxY;
            }
        });

        if (!hasChildren) return;

        if (this.horizontalFit !== 'unconstrained') {
            // For now, minSize and preferredSize are treated the same.
            // A more complex implementation would involve a multi-pass layout calculation.
            rectTransform.width = maxX - minX;
        }

        if (this.verticalFit !== 'unconstrained') {
            rectTransform.height = maxY - minY;
        }
    }
}

registerComponent('ContentSizeFitter', ContentSizeFitter);

export class LayoutElement extends Leyes {
    constructor(materia) {
        super(materia);
        this.ignoreLayout = false;

        // -1 means 'not set', so the LayoutGroup will use the RectTransform's value.
        this.minWidth = -1;
        this.minHeight = -1;
        this.preferredWidth = -1;
        this.preferredHeight = -1;
        this.flexibleWidth = -1;
        this.flexibleHeight = -1;
    }
}

registerComponent('LayoutElement', LayoutElement);

export class AspectRatioFitter extends Leyes {
    constructor(materia) {
        super(materia);
        this.aspectMode = 'None'; // None, WidthControlsHeight, HeightControlsWidth, FitInParent, EnvelopeParent
        this.aspectRatio = 1;
    }

    update() {
        if (this.aspectMode === 'None') return;

        const rectTransform = this.materia.getComponent(RectTransform);
        if (!rectTransform) return;

        const parent = this.materia.parent;
        const parentRect = parent ? parent.getComponent(RectTransform) : null;

        switch (this.aspectMode) {
            case 'WidthControlsHeight':
                rectTransform.height = rectTransform.width / this.aspectRatio;
                break;
            case 'HeightControlsWidth':
                rectTransform.width = rectTransform.height * this.aspectRatio;
                break;
            case 'FitInParent':
                if (!parentRect) return;

                const parentAspectRatio = parentRect.width / parentRect.height;

                if (parentAspectRatio > this.aspectRatio) {
                    // Parent is wider than the target aspect ratio, so height is the limiting factor
                    rectTransform.height = parentRect.height;
                    rectTransform.width = rectTransform.height * this.aspectRatio;
                } else {
                    // Parent is taller or same aspect ratio, so width is the limiting factor
                    rectTransform.width = parentRect.width;
                    rectTransform.height = rectTransform.width / this.aspectRatio;
                }
                break;
            case 'EnvelopeParent':
                 if (!parentRect) return;

                const parentRatio = parentRect.width / parentRect.height;

                if (parentRatio > this.aspectRatio) {
                    // Parent is wider, so we must match the parent's width
                    rectTransform.width = parentRect.width;
                    rectTransform.height = rectTransform.width / this.aspectRatio;
                } else {
                    // Parent is taller, so we must match the parent's height
                    rectTransform.height = parentRect.height;
                    rectTransform.width = rectTransform.height * this.aspectRatio;
                }
                break;
        }
    }
}

registerComponent('AspectRatioFitter', AspectRatioFitter);
