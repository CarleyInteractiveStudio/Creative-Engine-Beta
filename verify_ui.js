
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('UI Canvas System Verification', () => {
    const projectPath = 'TestProject';
    const sceneName = 'ui_test_scene.ceScene';
    const scenePath = path.join(projectPath, 'Assets', sceneName);
    const screenshotsDir = 'ui_test_screenshots';

    // Helper function to take prefixed screenshots
    const screenshot = async (page, name) => {
        await page.screenshot({ path: path.join(screenshotsDir, name) });
    };

    test.beforeAll(() => {
        // Create a directory for screenshots if it doesn't exist
        if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir);
        }

        // Define the scene content with a nested UI structure
        const sceneContent = {
            "name": "UITestScene",
            "materias": [
                {
                    "id": 1,
                    "name": "Main Camera",
                    "components": [
                        { "type": "Transform", "position": { "x": 0, "y": 0 }, "rotation": 0, "scale": { "x": 1, "y": 1 } },
                        { "type": "Camera", "projection": "Orthographic", "orthographicSize": 500, "nearClipPlane": 0.1, "farClipPlane": 1000, "backgroundColor": [0.1, 0.1, 0.1, 1] }
                    ],
                    "parent": null,
                    "children": []
                },
                {
                    "id": 2,
                    "name": "UICanvas",
                    "components": [
                        { "type": "Transform", "position": { "x": -200, "y": 150 }, "rotation": 0, "scale": { "x": 1, "y": 1 } },
                        { "type": "Canvas", "renderMode": "Screen Space" }
                    ],
                    "parent": null,
                    "children": [3]
                },
                {
                    "id": 3,
                    "name": "ParentImage",
                    "components": [
                        { "type": "UITransform", "anchorPreset": "middle-center", "pivot": { "x": 0.5, "y": 0.5 }, "position": { "x": 0, "y": 0 }, "size": { "x": 200, "y": 150 } },
                        { "type": "UIImage", "source": "TestProject/Assets/images/test_image.png", "color": [1, 1, 1, 1] }
                    ],
                    "parent": 2,
                    "children": [4]
                },
                {
                    "id": 4,
                    "name": "ChildImage",
                    "components": [
                         { "type": "UITransform", "anchorPreset": "top-right", "pivot": { "x": 1, "y": 1 }, "position": { "x": 0, "y": 0 }, "size": { "x": 50, "y": 50 } },
                         { "type": "UIImage", "source": "TestProject/Assets/images/test_image.png", "color": [0.8, 0.8, 1, 1] }
                    ],
                    "parent": 3,
                    "children": []
                }
            ]
        };

        // Write the scene file
        fs.writeFileSync(scenePath, JSON.stringify(sceneContent, null, 4));
        console.log(`Created test scene: ${scenePath}`);
    });

    test('should correctly render and manipulate nested UI elements', async ({ page }) => {
        // Navigate directly to the editor with the test scene
        await page.goto(`http://localhost:8000/editor.html?project=${projectPath}&scene=${sceneName.replace('.ceScene', '')}`);

        // Wait for the editor to load by checking for the hierarchy panel
        await expect(page.locator('#hierarchy-panel')).toBeVisible({ timeout: 20000 });

        // --- Verification Step 1: Initial State ---
        console.log("Verifying initial state...");
        await page.getByText('UICanvas').click();
        await expect(page.locator('#inspector-panel')).toBeVisible();
        await screenshot(page, '01_initial_state.png');

        // --- Verification Step 2: Move Parent Canvas ---
        console.log("Moving parent canvas...");
        // Get the canvas handle for dragging
        const sceneCanvas = await page.locator('#scene-canvas');
        const canvasBoundingBox = await sceneCanvas.boundingBox();

        // Simulate dragging the canvas to a new position
        const startDragPoint = { x: canvasBoundingBox.x + canvasBoundingBox.width / 2, y: canvasBoundingBox.y + canvasBoundingBox.height / 2 };
        await page.mouse.move(startDragPoint.x, startDragPoint.y);
        await page.mouse.down();
        await page.mouse.move(startDragPoint.x + 150, startDragPoint.y - 100);
        await page.mouse.up();

        await page.waitForTimeout(500); // Wait for repaint
        await screenshot(page, '02_canvas_moved.png');
        console.log("Parent canvas moved.");

        // --- Verification Step 3: Resize Child Element ---
        console.log("Resizing child element...");
        // Select the child image
        await page.getByText('ParentImage').click();
        await expect(page.locator('#inspector-panel')).toBeVisible();
        await page.waitForTimeout(500); // Wait for gizmos to update
        await screenshot(page, '03_child_selected.png');

        // Get the bounding box of the selected child to find its gizmo handle
         const childRect = await page.evaluate(() => {
            const selectedMateria = window.MateriaFactory.getSelectedMateria();
            if (!selectedMateria) return null;
            return window.UITransformUtils.getUIRectRecursive(selectedMateria, window.SceneManager.currentScene, { renderer: window.renderer, getActiveView: () => 'scene' });
        });

        expect(childRect).not.toBeNull();

        // Convert world coordinates to screen coordinates to find the handle
        const worldToScreen = (worldPos) => {
            const camera = window.renderer.camera;
            const canvas = window.renderer.canvas;
            const screenX = (worldPos.x - camera.x) * camera.effectiveZoom + canvas.width / 2;
            const screenY = (worldPos.y - camera.y) * camera.effectiveZoom + canvas.height / 2;
            return { x: screenX, y: screenY };
        };

        const handleWorldPos = { x: childRect.x + childRect.width, y: childRect.y + childRect.height / 2 }; // Right handle
        const handleScreenPos = await page.evaluate(worldToScreen, handleWorldPos);

        const canvasRect = await sceneCanvas.boundingBox();
        const finalHandlePos = { x: canvasRect.x + handleScreenPos.x, y: canvasRect.y + handleScreenPos.y };

        // Drag the resize handle
        await page.mouse.move(finalHandlePos.x, finalHandlePos.y);
        await page.mouse.down();
        await page.mouse.move(finalHandlePos.x + 100, finalHandlePos.y);
        await page.mouse.up();

        await page.waitForTimeout(500);
        await screenshot(page, '04_child_resized.png');
        console.log("Child element resized.");

        // --- Verification Step 4: Final check ---
        // Click on the grand-child to ensure its gizmo also appears correctly
        await page.getByText('ChildImage').click();
        await expect(page.locator('#inspector-panel')).toBeVisible();
        await page.waitForTimeout(500);
        await screenshot(page, '05_grandchild_selected.png');
    });

    test.afterAll(() => {
        // Clean up the test scene file
        if (fs.existsSync(scenePath)) {
            fs.unlinkSync(scenePath);
            console.log(`Cleaned up test scene: ${scenePath}`);
        }
    });
});
