import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Create a new isolated browser context
        context = await browser.new_context()
        page = await context.new_page()

        # Go to the editor
        await page.goto("http://localhost:8000/editor.html?project=TestProject")

        # Force the editor to load by hiding the loading overlay and showing the editor container
        await page.evaluate("document.getElementById('loading-overlay').style.display = 'none';")
        await page.evaluate("document.getElementById('editor-container').style.display = 'flex';")

        # Wait for a key element to be visible to ensure the editor is ready
        await page.wait_for_selector('#hierarchy-panel', state='visible')

        # Open the Library window by clicking the 'Librerías' button in the menubar
        await page.locator("#menubar-libraries-btn").click()

        # Wait for the library panel to appear
        await page.wait_for_selector('#library-panel', state='visible')

        # Click the "Crear" button within the library panel
        await page.locator('#library-panel-create-btn').click()

        # Wait for the create library modal to become visible
        await page.wait_for_selector('#create-library-modal', state='visible')

        # Take a screenshot of the modal
        await page.screenshot(path="/home/jules/verification/02_create_library_modal.png")

        # Close the context and the browser
        await context.close()
        await browser.close()

asyncio.run(main())
