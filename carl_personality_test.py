import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.goto("http://localhost:8000")

        # Wait for editor to initialize
        await page.wait_for_function("window.editorInitialized === true")

        # Open Carl IA panel
        await page.click("#menubar-carl-ia-btn")

        # Wait a bit for the welcome message
        await page.wait_for_timeout(1000)

        # Take screenshot
        await page.screenshot(path="/home/jules/verification/carl_new_look.png")

        await browser.close()

if __name__ == "__main__":
    import os
    import subprocess

    # Start server
    server = subprocess.Popen(["python3", "-m", "http.server", "8000"])
    try:
        asyncio.run(run())
    finally:
        server.terminate()
