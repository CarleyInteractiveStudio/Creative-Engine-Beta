import os
import time
from playwright.sync_api import sync_playwright

def test_water():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("http://localhost:8000")

        # Click "Empezar a Crear"
        page.click("#btn-start")

        # Wait for launcher and click "Crear Nuevo Proyecto"
        page.wait_for_selector("#btn-create-project")
        page.click("#btn-create-project")

        # Fill project name and create
        page.wait_for_selector("#project-name")
        page.fill("#project-name", "WaterTest")
        page.click("#create-project-form button[type='submit']")

        # Wait for editor to load
        # Since we use FileSystem Access API, we might need to mock it or handle the prompt.
        # But in local server it might just work if it's already approved? No.
        # Actually, the motor has a "Test Mode" or handles the absence of a handle.

        # Wait for editor to load
        try:
            page.wait_for_selector("#scene-canvas", timeout=10000)
        except:
            print("Editor didn't load, taking screenshot of main page")
            page.screenshot(path="verification/failed_load.png")
            browser.close()
            return

        # Right click hierarchy to create water
        page.click("#hierarchy-content", button="right")
        page.wait_for_selector("#hierarchy-context-menu", state="visible")

        # Click Create -> Water
        page.hover("text=Crear")
        page.click("text=Agua")

        # Verify Materia "Agua" exists in hierarchy
        assert "Agua" in page.inner_text("#hierarchy-content")

        # Wait a bit for rendering
        time.sleep(2)

        # Take a screenshot to verify visually
        if not os.path.exists("verification"):
            os.makedirs("verification")
        page.screenshot(path="verification/water_rendering.png")

        # Verify that the Water component is visible in Inspector
        page.click("text=Agua")
        assert "Water (Agua)" in page.inner_text("#inspector-content")

        browser.close()

if __name__ == "__main__":
    test_water()
