import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Log console messages
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))

        print("Loading page...")
        await page.goto("http://localhost:8080/editor.html", wait_until="networkidle")

        # Wait for AssetBrowser to be initialized
        await page.wait_for_function("window.assetBrowser !== undefined")
        print("AssetBrowser initialized")

        # 1. Create a folder via JS
        await page.evaluate("assetBrowser.createNewFolder('')")
        # Wait for prompt and fill it
        await page.wait_for_selector(".dialog-window")
        await page.fill(".dialog-input", "TestFolder")
        await page.click("button:has-text('Aceptar')")
        print("Folder 'TestFolder' created")

        # 2. Create an asset inside that folder
        await page.evaluate("assetBrowser.createNewAsset('ceanim', 'TestFolder')")
        await page.wait_for_selector(".dialog-window")
        await page.fill(".dialog-input", "InnerAnim")
        await page.click("button:has-text('Aceptar')")
        print("InnerAnim.ceanim created in TestFolder")

        # 3. Verify existence
        exists = await page.evaluate("FS.exists('TestFolder/InnerAnim.ceanim')")
        print(f"File TestFolder/InnerAnim.ceanim exists: {exists}")

        # 4. Test drag-over class behavior
        await page.evaluate("""() => {
            const el = document.getElementById('asset-browser');
            el.dispatchEvent(new DragEvent('dragenter', { bubbles: true }));
        }""")
        has_class = await page.evaluate("document.getElementById('asset-browser').classList.contains('drag-over')")
        print(f"Browser has drag-over class: {has_class}")

        await page.evaluate("""() => {
            const el = document.getElementById('asset-browser');
            el.dispatchEvent(new DragEvent('dragleave', { bubbles: true }));
        }""")
        has_class = await page.evaluate("document.getElementById('asset-browser').classList.contains('drag-over')")
        print(f"Browser has drag-over class after dragleave: {has_class}")

        # 5. Check Move-to-self bug
        # We need a file to move
        await page.evaluate("assetBrowser.createNewAsset('ces', '')")
        await page.wait_for_selector(".dialog-window")
        await page.fill(".dialog-input", "MoveTest")
        await page.click("button:has-text('Aceptar')")

        # Mock a drop event that moves MoveTest.ces to its own folder (root)
        await page.evaluate("""() => {
            const dt = new DataTransfer();
            dt.setData('text/plain', 'MoveTest.ces');
            const dropEvent = new DragEvent('drop', {
                bubbles: true,
                cancelable: true,
                dataTransfer: dt
            });
            document.getElementById('asset-browser').dispatchEvent(dropEvent);
        }""")

        exists_after_move = await page.evaluate("FS.exists('MoveTest.ces')")
        print(f"File MoveTest.ces exists after move-to-self: {exists_after_move}")

        await page.screenshot(path="/home/jules/verification/final_state.png")
        await browser.close()

asyncio.run(run())
