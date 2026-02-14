import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            await page.goto("http://localhost:8080/editor.html", wait_until="networkidle")
            await page.screenshot(path="/home/jules/verification/load_check.png")
            content = await page.content()
            with open("/home/jules/verification/page_content.txt", "w") as f:
                f.write(content)
        except Exception as e:
            print(f"Error: {e}")
        await browser.close()

asyncio.run(run())
