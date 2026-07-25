import os
import sys
from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))

    print("Opening editor...")
    page.goto("http://localhost:8000/editor.html?project=TestProject")
    page.wait_for_selector("#loading-overlay", state="hidden", timeout=30000)
    page.wait_for_timeout(1000)

    # Programmatically create a 3D Cube
    print("Programmatically creating a 3D Cube...")
    page.evaluate("HierarchyWindow.handleContextMenuAction('create-cube')")
    page.wait_for_timeout(1000)

    # Select the cube to make sure it is selected and rendered
    print("Selecting the cube in hierarchy...")
    page.evaluate("selectMateria(SceneManager.currentScene.getAllMaterias()[0].id)")
    page.wait_for_timeout(1000)

    # Check active tool and set active tool to universal
    print("Setting active tool to universal...")
    page.evaluate("window._SceneView.setActiveTool('universal')")
    page.wait_for_timeout(1000)

    # Evaluate drawLineClipped logic programmatically to see what is calculated
    page.evaluate("""
        const mtr = SceneManager.currentScene.getAllMaterias()[0];
        const r3d = window._Renderer3D;
        const proj = r3d.lastProjectionMatrix;
        const view = r3d.lastViewMatrix;
        const cw = renderer.canvas.width;
        const ch = renderer.canvas.height;
        const transform = mtr.transform || mtr.getComponentByName('Transform') || mtr.getComponentByName('CarleyTransform3D');

        console.log('--- EVALUATING DRAWLINECLIPPED ON GIZMO AXES ---');
        const axes = window._SceneView.getMateriaAxes(mtr);
        const center = { x: axes.worldCenter[0], y: axes.worldCenter[1], z: axes.worldCenter[2] };
        console.log('CENTER:', JSON.stringify(center));
        console.log('AXES.X:', Array.from(axes.x).join(', '));

        const gizmoScale = window._SceneView.getGizmoScale(center, proj, view, cw, ch);
        console.log('GIZMO SCALE:', gizmoScale);
        const GIZMO_SIZE = 80 * gizmoScale;
        console.log('GIZMO SIZE:', GIZMO_SIZE);

        const endPos = { x: center.x + axes.x[0] * GIZMO_SIZE, y: center.y + axes.x[1] * GIZMO_SIZE, z: center.z + axes.x[2] * GIZMO_SIZE };
        console.log('END POS:', JSON.stringify(endPos));

        const glm = window.glMatrix;
        const mvp = glm.mat4.create();
        glm.mat4.multiply(mvp, proj, view);

        const v1 = glm.vec4.fromValues(center.x, center.y, center.z || 0, 1.0);
        const v2 = glm.vec4.fromValues(endPos.x, endPos.y, endPos.z || 0, 1.0);

        const c1 = glm.vec4.create(), c2 = glm.vec4.create();
        glm.vec4.transformMat4(c1, v1, mvp);
        glm.vec4.transformMat4(c2, v2, mvp);

        console.log('C1 (CLIP 1):', Array.from(c1).join(', '));
        console.log('C2 (CLIP 2):', Array.from(c2).join(', '));

        const wNear = 0.01;
        if (c1[3] >= wNear && c2[3] >= wNear) {
            const s1 = { x: (c1[0]/c1[3] * 0.5 + 0.5) * cw, y: (0.5 - c1[1]/c1[3] * 0.5) * ch };
            const s2 = { x: (c2[0]/c2[3] * 0.5 + 0.5) * cw, y: (0.5 - c2[1]/c2[3] * 0.5) * ch };
            console.log('S1 (SCREEN 1):', JSON.stringify(s1));
            console.log('S2 (SCREEN 2):', JSON.stringify(s2));
        } else {
            console.log('CLIPPED');
        }
    """)

    # Take screenshot at the key moment
    screenshot_path = "/app/verification_screenshots/verification.png"
    page.screenshot(path=screenshot_path)
    print(f"Screenshot saved to {screenshot_path}")
    page.wait_for_timeout(1000)  # Hold final state for the video

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/app/verification_videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        except Exception as e:
            print(f"An error occurred: {e}")
        finally:
            context.close()  # MUST close context to save the video
            browser.close()
