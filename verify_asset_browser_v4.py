import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Go to the editor
        await page.goto("http://localhost:8080/editor.html", wait_until="networkidle")
        await page.wait_for_selector("#asset-browser", timeout=10000)
        print("Editor loaded")

        # 1. Test creating a folder and then an asset inside it
        # Right click on the browser
        await page.mouse.click(200, 800, button="right") # Assuming browser is around there
        await page.wait_for_selector(".context-menu")
        print("Context menu opened")

        # Click "Crear" -> "Carpeta"
        await page.hover("text=Crear")
        await page.wait_for_timeout(500)
        await page.screenshot(path="/home/jules/verification/step1_crear_menu.png")
        await page.get_by_text("Carpeta").click()

        # Wait for prompt and fill it
        await page.wait_for_selector(".dialog-window")
        await page.fill(".dialog-input", "TestFolder")
        await page.click("button:has-text('Aceptar')")
        print("Folder 'TestFolder' created")

        await page.wait_for_timeout(500)

        # 2. Verify creation in subfolder
        # Find the folder in the browser
        folder_locator = page.get_by_text("TestFolder")
        await folder_locator.wait_for()

        # Right click on the folder
        box = await folder_locator.bounding_box()
        await page.mouse.click(box['x'] + 5, box['y'] + 5, button="right")
        print("Right clicked on TestFolder")

        await page.hover("text=Crear")
        await page.wait_for_timeout(500)
        await page.get_by_text("Controlador de Animación (.ceanim)").click()

        await page.wait_for_selector(".dialog-window")
        await page.fill(".dialog-input", "InnerAnim")
        await page.click("button:has-text('Aceptar')")
        print("InnerAnim.ceanim created in TestFolder")

        await page.wait_for_timeout(500)
        await page.screenshot(path="/home/jules/verification/step2_inner_asset.png")

        # Check if file exists in FS via JS
        exists = await page.evaluate("FS.exists('TestFolder/InnerAnim.ceanim')")
        print(f"File TestFolder/InnerAnim.ceanim exists: {exists}")

        # 3. Test "stuck in blue" fix
        await page.mouse.move(200, 800)
        await page.evaluate("""
            const el = document.getElementById('asset-browser');
            const dragEnterEvent = new DragEvent('dragenter', { bubbles: true, cancelable: true });
            el.dispatchEvent(dragEnterEvent);
        """)
        has_class = await page.evaluate("document.getElementById('asset-browser').classList.contains('drag-over')")
        print(f"Browser has drag-over class: {has_class}")

        await page.evaluate("""
            const el = document.getElementById('asset-browser');
            const dragLeaveEvent = new DragEvent('dragleave', { bubbles: true, cancelable: true });
            el.dispatchEvent(dragLeaveEvent);
        """)
        has_class = await page.evaluate("document.getElementById('asset-browser').classList.contains('drag-over')")
        print(f"Browser has drag-over class after dragleave: {has_class}")

        # 4. Test Animator Controller "Abrir" button
        await page.click("text=Ventana")
        await page.click("text=Controlador de Animación")
        await page.wait_for_selector(".animator-controller-window")
        print("Animator window opened")

        # Click "Abrir"
        await page.click("#btn-anim-open")
        await page.wait_for_selector(".asset-selector-window")
        print("Asset selector opened")

        # Verify it shows .ceanim files
        anim_file = page.locator(".asset-item:has-text('InnerAnim.ceanim')")
        is_visible = await anim_file.is_visible()
        print(f"InnerAnim.ceanim visible in selector: {is_visible}")
        await page.screenshot(path="/home/jules/verification/step4_asset_selector.png")

        await browser.close()

asyncio.run(run())
