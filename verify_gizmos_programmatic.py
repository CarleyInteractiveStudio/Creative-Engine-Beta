
import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, args=["--use-gl=egl"])
        page = await browser.new_page()

        try:
            page.set_default_timeout(60000)

            print("Navigating to the editor...")
            await page.goto("http://localhost:8000/editor.html?project=TestProject")

            print("Waiting for the editor to load...")
            await page.wait_for_selector("#loading-overlay", state="detached", timeout=30000)
            await page.wait_for_selector("#hierarchy-panel", state="visible")
            print("Editor loaded.")

            # --- Programmatic Test Setup ---
            print("Creating Canvas and Image elements programmatically...")
            await page.evaluate("""() => {
                const { MateriaFactory, Components, selectMateria, updateHierarchy, updateInspector } = window;
                const canvasMateria = MateriaFactory.createCanvasObject();
                const imageMateria = MateriaFactory.createImageObject(canvasMateria);
                const uiTransform = imageMateria.getComponent(Components.UITransform);
                uiTransform.pivot.x = 0;
                uiTransform.pivot.y = 0;
                selectMateria(imageMateria);
                updateHierarchy();
                updateInspector();
            }""")
            print("Elements created and pivot set.")

            await page.wait_for_timeout(500)

            # --- Test Scaling ---
            print("Testing scaling with new pivot...")
            await page.evaluate("window.setActiveTool('scale')")

            # Wait for renderer to be available
            await page.wait_for_function("window.renderer && window.renderer.camera")

            # Get all necessary info from the browser context in one go
            js_get_info = """() => {
                const materia = window.SceneManager.currentScene.getAllMaterias().find(m => m.name === 'Image');
                const canvasComp = materia.parent.getComponent(window.Components.Canvas);
                const uiTransform = materia.getComponent(window.Components.UITransform);
                const initialRect = canvasComp.getWorldRect(uiTransform);

                const camera = window.renderer.camera;
                const canvasEl = window.renderer.canvas;

                const worldToScreen = (worldX, worldY) => {
                    const screenX = (worldX - camera.x) * camera.effectiveZoom + (canvasEl.width / 2);
                    const screenY = (worldY - camera.y) * camera.effectiveZoom + (canvasEl.height / 2);
                    return { x: screenX, y: screenY };
                };

                const handleWorldPos = { x: initialRect.x, y: initialRect.y };
                const handleScreenPos = worldToScreen(handleWorldPos.x, handleWorldPos.y);

                return {
                    initialRect: initialRect,
                    handleScreenPos: handleScreenPos,
                    zoom: camera.effectiveZoom,
                };
            }"""

            info = await page.evaluate(js_get_info)
            initial_rect = info['initialRect']
            handle_screen_pos = info['handleScreenPos']
            zoom = info['zoom']
            print(f"Initial Rect (World): {initial_rect}")
            print(f"Handle Screen Pos (Canvas Coords): {handle_screen_pos}")

            scene_canvas = page.locator("#scene-canvas")
            scene_box = await scene_canvas.bounding_box()
            if not scene_box:
                raise Exception("Could not get scene canvas bounding box.")

            # Convert canvas-relative screen coords to viewport coords
            handle_x = scene_box['x'] + handle_screen_pos['x']
            handle_y = scene_box['y'] + handle_screen_pos['y']

            # Simulate dragging
            drag_to_x = handle_x + 50
            drag_to_y = handle_y + 50

            print(f"Dragging from viewport ({handle_x:.2f}, {handle_y:.2f}) to ({drag_to_x:.2f}, {drag_to_y:.2f})")
            await page.mouse.move(handle_x, handle_y)
            await page.mouse.down()
            await page.mouse.move(drag_to_x, drag_to_y, steps=10)
            await page.mouse.up()
            print("Drag finished.")

            await page.wait_for_timeout(500)

            # --- Verification ---
            print("Verifying final state...")
            final_rect = await page.evaluate("""() => {
                const materia = window.SceneManager.currentScene.getAllMaterias().find(m => m.name === 'Image');
                const canvas = materia.parent.getComponent(window.Components.Canvas);
                return canvas.getWorldRect(materia.getComponent(window.Components.UITransform));
            }""")
            print(f"Final Rect: {final_rect}")

            initial_br_x = initial_rect['x'] + initial_rect['width']
            initial_br_y = initial_rect['y'] + initial_rect['height']
            final_br_x = final_rect['x'] + final_rect['width']
            final_br_y = final_rect['y'] + final_rect['height']

            print(f"Initial BR corner: ({initial_br_x:.2f}, {initial_br_y:.2f})")
            print(f"Final BR corner:   ({final_br_x:.2f}, {final_br_y:.2f})")

            expected_delta = 50 / zoom

            width_correct = abs(final_rect['width'] - (initial_rect['width'] - expected_delta)) < 2
            height_correct = abs(final_rect['height'] - (initial_rect['height'] - expected_delta)) < 2
            pos_correct = abs(final_br_x - initial_br_x) < 2 and abs(final_br_y - initial_br_y) < 2

            if width_correct and height_correct and pos_correct:
                 print("✅ Test Passed: Scaling with pivot (0,0) works correctly.")
            else:
                 print(f"❌ Test Failed: Scaling incorrect.")
                 print(f"  - Width correct: {width_correct} (Expected change ~{expected_delta:.2f}, Got {initial_rect['width'] - final_rect['width']:.2f})")
                 print(f"  - Height correct: {height_correct} (Expected change ~{expected_delta:.2f}, Got {initial_rect['height'] - final_rect['height']:.2f})")
                 print(f"  - Position correct: {pos_correct} (BR corner moved by dx:{final_br_x - initial_br_x:.2f}, dy:{final_br_y - initial_br_y:.2f})")

            print("Taking screenshot...")
            screenshot_path = os.path.join(os.path.expanduser("~"), "verification", "verification.png")
            os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
            await page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

            if not (width_correct and height_correct and pos_correct):
                raise Exception("Verification failed.")

        except Exception as e:
            print(f"An error occurred: {e}")
            screenshot_path = os.path.join(os.path.expanduser("~"), "verification", "error.png")
            os.makedirs(os.path.dirname(screenshot_path), exist_ok=True)
            await page.screenshot(path=screenshot_path)
            print(f"Error screenshot saved to {screenshot_path}")
            raise

        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
