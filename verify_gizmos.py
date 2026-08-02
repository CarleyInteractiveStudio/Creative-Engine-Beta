import os
import sys
from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.on("console", lambda msg: print(f"[Browser Console] {msg.text}"))

    print("Opening editor...")
    page.goto("http://localhost:8000/editor.html?project=TestProject")
    page.wait_for_selector("#loading-overlay", state="hidden", timeout=30000)
    page.wait_for_timeout(2000)

    # Programmatically create a 3D Cube
    print("Programmatically creating a 3D Cube...")
    page.evaluate("HierarchyWindow.handleContextMenuAction('create-cube')")
    page.wait_for_timeout(2000)

    # Select the cube to make sure it is selected and rendered
    print("Selecting the cube in hierarchy...")
    page.evaluate("selectMateria(SceneManager.currentScene.getAllMaterias()[0].id)")
    page.wait_for_timeout(2000)

    # Let's print the projected vertices of Gizmos.drawWireCube with correct matrices
    page.evaluate("""
        const mtr = SceneManager.currentScene.getAllMaterias()[0];
        const r3d = window._Renderer3D;
        const proj = r3d.lastProjectionMatrix;
        const view = r3d.lastViewMatrix;
        const cw = renderer.canvas.width;
        const ch = renderer.canvas.height;
        const transform = mtr.transform || mtr.getComponentByName('Transform') || mtr.getComponentByName('CarleyTransform3D');

        console.log('--- EXECUTING DRAWWIRECUBO MANUALLY WITH CORRECT MATRICES ---');
        console.log('PROJECTION MATRIX:', Array.from(proj).join(', '));
        console.log('VIEW MATRIX:', Array.from(view).join(', '));

        const scale = { x: transform.scale.x * 2, y: transform.scale.y * 2, z: (transform.scale.z || 1) * 2 };
        const rotation = { x: transform.rotationX || 0, y: transform.rotationY || 0, z: transform.rotationZ || 0 };

        const glm = window.glMatrix;
        const hw = scale.x / 2;
        const hh = scale.y / 2;
        const hd = scale.z / 2;

        const points = [
            [ -hw, -hh, -hd ], [ hw, -hh, -hd ], [ hw, hh, -hd ], [ -hw, hh, -hd ],
            [ -hw, -hh, hd ], [ hw, -hh, hd ], [ hw, hh, hd ], [ -hw, hh, hd ]
        ];

        const q = glm.quat.create();
        glm.quat.fromEuler(q, rotation.x, rotation.y, rotation.z);

        const worldPoints = points.map(p => {
            const rotated = glm.vec3.create();
            glm.vec3.transformQuat(rotated, p, q);
            return {
                x: (transform.position?.x ?? transform.x ?? 0) + rotated[0],
                y: (transform.position?.y ?? transform.y ?? 0) + rotated[1],
                z: (transform.position?.z ?? transform.z ?? 0) + rotated[2]
            };
        });

        const mvp = glm.mat4.create();
        glm.mat4.multiply(mvp, proj, view);

        worldPoints.forEach((wp, idx) => {
            const v = glm.vec4.fromValues(wp.x, wp.y, wp.z, 1.0);
            const c = glm.vec4.create();
            glm.vec4.transformMat4(c, v, mvp);
            const wNear = 0.01;
            console.log('Point ' + idx + ' (world: ' + JSON.stringify(wp) + ') -> clip: ' + c[0] + ', ' + c[1] + ', ' + c[2] + ', ' + c[3]);
            if (c[3] >= wNear) {
                const s = { x: (c[0]/c[3] * 0.5 + 0.5) * cw, y: (0.5 - c[1]/c[3] * 0.5) * ch };
                console.log('    -> screen: ' + s.x + ', ' + s.y);
            } else {
                console.log('    -> CLIPPED (w < 0.01)');
            }
        });
    """)

    # Save a screenshot of the entire window to verify visual presentation
    print("Taking verification screenshot...")
    page.screenshot(path="verification_screenshot.png")
    print("Screenshot saved to verification_screenshot.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        try:
            run_cuj(page)
        except Exception as e:
            print(f"An error occurred: {e}")
        finally:
            context.close()
            browser.close()
