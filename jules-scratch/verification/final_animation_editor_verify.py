from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        page.goto("file:///app/editor.html")

        # The animation panel is visible due to the change in editor.html
        animation_panel = page.locator("#animation-panel")
        animation_panel.wait_for(state="visible", timeout=5000)

        # Wait for JS to initialize
        page.wait_for_timeout(1000)

        # Forcefully remove the overlay and set up the test state
        page.evaluate("""() => {
            document.getElementById('animation-panel-overlay').style.display = 'none';

            // Manually inject a dummy animation asset into the global scope
            // This is a bit of a hack for testing, as we can't easily call the internal functions
            const dummyFrame1_red_dot = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIAAQMAAADOtka5AAAABlBMVEUAAAD/AAAAAACw23x3AAAACXBIWXMAAAsTAAALEwEAmpwYAAABPUlEQVR42u3MMQ0AAAgEMcC/gDbOVnCgAAAAAAB403w95gEAAAAAAAAAAAAA8Fl/agEAAAAAAAAAAAAAwAv2pBMAAAAAAAAAAAAAAOBV/5oFAAAAAAAAAAAAAMB79qUTAQAAAAAAAAAAAADwVf+aBwAAAAAAAAAAAADAW/akEwEAAAAAAAAAAAAA8Cr/mgUAAAAAAAAAAAAA8B596UQAAAAAAAAAAAAAwFf9aw4AAAAAAAAAAAAA4C170okAAAAAAAAAAAAA4FX/mgUAAAAAAAAAAAAA8B596UQAAAAAAAAAAAAAwFf9aw4AAAAAAAAAAAAA4C170okAAAAAAAAAAAAA4FX/mgUAAAAAAAAAAAAA8B596UQAAAAAAAAAAAAAwFf9aw4AAAAAAAAAAAAA4C170okAAAAAAAAAAAAA4FX/mgUAAAAAAAAAAAAA8B596UQAAAAAAAAAAAAAwFf9aw4AAAAAAAAAAAAA4C170okAAAAAAAAAAAAA4FX/2gMAAAAAAAAAAAAAgH8B1gAB5lAyplIAAAAASUVORK5CYII=';
            window.currentAnimationAsset = {
                animations: [{ name: 'default', speed: 10, loop: true, frames: [dummyFrame1_red_dot] }]
            };
            window.currentFrameIndex = 1;
        }""")

        # Click the background toggle button to switch to white
        page.locator("#anim-bg-toggle-btn").click()

        # The grid and onion skin should be active by default

        page.wait_for_timeout(500)

        animation_panel.screenshot(path="jules-scratch/verification/final_anim_editor.png")

        browser.close()

if __name__ == "__main__":
    run()
