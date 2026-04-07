import asyncio
from playwright.async_api import async_playwright
import os
import subprocess

async def verify_collab_ui_final():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={'width': 1280, 'height': 720})
        page = await context.new_page()

        server_process = subprocess.Popen(['python3', '-m', 'http.server', '8081'])
        await asyncio.sleep(2)

        try:
            await page.goto('http://localhost:8081/index.html')

            # Switch to launcher
            await page.click('#btn-start')
            await page.wait_for_selector('#launcher-view')

            # Click Join Collab
            await page.click('#btn-join-collab')
            await page.wait_for_selector('#collab-join-container')

            # ES
            content_es = await page.inner_text('#collab-join-container')
            btn_text_es = await page.inner_text('#btn-confirm-join')
            print(f"Content ES: {content_es}")
            print(f"Btn ES: {btn_text_es}")

            await page.screenshot(path='/home/jules/verification/launcher_collab_final_es.png')

            # EN
            await page.click('#btn-account-modal')
            await page.select_option('#main-lang-select', 'EN')
            # Wait for translation
            await asyncio.sleep(1)
            await page.click('#close-account')

            content_en = await page.inner_text('#collab-join-container')
            btn_text_en = await page.inner_text('#btn-confirm-join')
            print(f"Content EN: {content_en}")
            print(f"Btn EN: {btn_text_en}")

            await page.screenshot(path='/home/jules/verification/launcher_collab_final_en.png')

        finally:
            server_process.terminate()
            await browser.close()

if __name__ == "__main__":
    asyncio.run(verify_collab_ui_final())
