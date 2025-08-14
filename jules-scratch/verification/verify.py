import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # 1. Navigate to the editor page via HTTP server.
        await page.goto("http://localhost:8000/editor.html?project=VerificationTest", wait_until="domcontentloaded")

        # 2. Wait for a key element to be visible to ensure the page is loaded.
        await expect(page.locator("#hierarchy-panel")).to_be_visible(timeout=10000)
        await expect(page.locator("#assets-panel")).to_be_visible()

        # 3. Take a screenshot for visual verification.
        screenshot_path = "jules-scratch/verification/panel_visibility_fix.png"
        await page.screenshot(path=screenshot_path)
        print(f"Screenshot saved to {screenshot_path}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
