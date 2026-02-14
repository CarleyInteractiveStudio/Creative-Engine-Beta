import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print("Loading page...")
        await page.goto("http://localhost:8080/editor.html", wait_until="networkidle")

        # 1. Test "Stuck in Blue" fix
        # Simulate drag enter and leave
        print("Testing drag-over UI...")
        await page.evaluate("""() => {
            const el = document.getElementById('assets-content');
            el.dispatchEvent(new DragEvent('dragenter', { bubbles: true }));
            el.dispatchEvent(new DragEvent('dragenter', { bubbles: true })); // Nested
        }""")
        has_class = await page.evaluate("document.getElementById('assets-content').classList.contains('drag-over-fs')")
        print(f"Has drag-over class: {has_class}")

        await page.evaluate("""() => {
            const el = document.getElementById('assets-content');
            el.dispatchEvent(new DragEvent('dragleave', { bubbles: true }));
        }""")
        has_class = await page.evaluate("document.getElementById('assets-content').classList.contains('drag-over-fs')")
        print(f"Has drag-over class after 1 dragleave: {has_class}")

        await page.evaluate("""() => {
            const el = document.getElementById('assets-content');
            el.dispatchEvent(new DragEvent('dragleave', { bubbles: true }));
        }""")
        has_class = await page.evaluate("document.getElementById('assets-content').classList.contains('drag-over-fs')")
        print(f"Has drag-over class after 2 dragleaves: {has_class}")

        # 2. Verify Animator Controller UI
        print("Checking Animator Controller...")
        # Toggle via JS as Playwright is having trouble with the menu items
        await page.evaluate("document.getElementById('animator-controller-panel').classList.remove('hidden')")
        await page.wait_for_selector("#animator-controller-panel:not(.hidden)")
        await page.wait_for_timeout(500)
        await page.screenshot(path="/home/jules/verification/animator_check.png")

        # Check for "Abrir" button
        is_visible = await page.locator("#btn-anim-open").is_visible()
        print(f"Animator 'Abrir' button visible: {is_visible}")

        # Check for "Ninguno" overlay
        overlay_text = await page.locator(".animator-none-overlay h2").text_content()
        print(f"Animator overlay text: {overlay_text}")

        # 3. Create a subfolder and verify context menu targets it
        print("Testing subfolder creation...")
        # Right click on assets grid
        await page.locator("#asset-grid-view").click(button="right")
        await page.hover("text=Crear")
        await page.click("text=Carpeta")
        await page.fill(".dialog-input", "SubDir")
        await page.click("button:has-text('Aceptar')")
        await page.wait_for_timeout(500)

        # Right click on the new folder in the grid
        folder_item = page.locator(".grid-item:has-text('SubDir')")
        await folder_item.click(button="right")
        await page.hover("text=Crear")
        await page.click("text=Asset de Animación (.cea)")
        await page.fill(".dialog-input", "InnerAnim")
        await page.click("button:has-text('Aceptar')")
        await page.wait_for_timeout(500)

        # Check if file exists in the right place via FS
        exists = await page.evaluate("FS.exists('Assets/SubDir/InnerAnim.cea')")
        print(f"InnerAnim.cea exists in SubDir: {exists}")

        await page.screenshot(path="/home/jules/verification/final_ui_check.png")
        await browser.close()

asyncio.run(run())
