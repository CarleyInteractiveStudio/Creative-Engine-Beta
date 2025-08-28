import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Get the absolute path to the HTML file
        file_path = os.path.abspath('editor.html')
        await page.goto(f'file://{file_path}')

        # Give JS time to load and initialize
        await page.wait_for_timeout(1000)

        # 1. Open the UI Editor from the 'Ventana' (Window) menu
        await page.get_by_role("button", name="Ventana").click()
        await page.locator("#menu-window-ui-editor").click()

        # Wait for the panel to be visible
        ui_editor_panel = page.locator("#ui-editor-panel")
        await expect(ui_editor_panel).to_be_visible()

        # 2. Click the Maximize button
        maximize_button = ui_editor_panel.locator('#ui-maximize-btn')
        await expect(maximize_button).to_be_visible()
        await maximize_button.click()

        # 3. Assert that the panel is maximized
        await expect(ui_editor_panel).to_have_class(
            "editor-panel floating-panel maximized"
        )

        # 4. Take a screenshot for visual confirmation
        screenshot_path = "jules-scratch/verification/verification.png"
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
