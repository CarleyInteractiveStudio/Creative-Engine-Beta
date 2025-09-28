import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Listen for any console errors, which would indicate a problem.
        page.on("console", lambda msg: print(f"BROWSER CONSOLE: [{msg.type}] {msg.text}"))

        try:
            # 1. Navigate to the editor in TEST MODE.
            # This mode uses a fake project handle to avoid filesystem API issues.
            await page.goto("http://localhost:8000/editor.html?JULES_TEST_MODE=true", wait_until="networkidle")

            # 2. Verify that the loading screen disappears.
            # This is the key check to confirm the startup error is fixed.
            await expect(page.locator("#loading-overlay")).to_be_hidden(timeout=20000)

            # 3. Verify the main editor container is now visible.
            await expect(page.locator("#editor-container")).to_be_visible()

            print("SUCCESS: The editor loaded successfully and the loading screen disappeared.")
            await page.screenshot(path="jules-scratch/verification/startup_success.png")
            print("A success screenshot has been saved.")

        except Exception as e:
            print(f"\n\n--- VERIFICATION FAILED ---")
            print(f"The editor failed to load. This likely means the startup error is NOT fixed.")
            print(f"Error details: {e}")
            await page.screenshot(path="jules-scratch/verification/startup_error.png")
            print("\nAn error screenshot has been saved.")
        finally:
            await browser.close()

if __name__ == "__main__":
    asyncio.run(main())