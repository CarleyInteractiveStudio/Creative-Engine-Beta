import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto("http://localhost:8080/editor.html", wait_until="networkidle")

        await page.click("#menubar >> text=Ventana")
        await page.wait_for_selector("#window-menu-content.visible")
        await page.screenshot(path="/home/jules/verification/window_menu_open.png")

        await browser.close()

asyncio.run(run())
