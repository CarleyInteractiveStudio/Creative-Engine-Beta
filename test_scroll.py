import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1280, 'height': 720})

        await page.goto('http://localhost:8000/editor.html')
        await page.wait_for_function("window.editorInitialized === true")

        # 1. Inject many items into hierarchy-context-menu
        await page.evaluate("""
            const menu = document.querySelector('#hierarchy-context-menu ul');
            for(let i=0; i<50; i++) {
                const li = document.createElement('li');
                li.textContent = 'Extra Item ' + i;
                menu.appendChild(li);
            }
        """)

        # Open the menu
        await page.click("#hierarchy-content", button="right")
        await page.wait_for_selector("#hierarchy-context-menu", state="visible")

        # Check if it's scrollable
        is_scrollable = await page.evaluate("""
            const menu = document.querySelector('#hierarchy-context-menu');
            menu.scrollHeight > menu.clientHeight
        """)
        print(f"Is context menu scrollable: {is_scrollable}")
        await page.screenshot(path="verification/long_menu.png")

        # 2. Test "Add Component" modal
        await page.evaluate("""
            const Materia = window.Materia;
            const scene = window.SceneManager.currentScene;
            const materia = new Materia('TestMateria');
            scene.addMateria(materia);
            window.selectMateria(materia);

            // Wait for inspector to render and click Add Component
            setTimeout(() => {
                document.getElementById('add-component-btn').click();
            }, 100);
        """)

        await page.wait_for_selector("#add-component-modal", state="visible")

        # Inject many categories into component modal
        await page.evaluate("""
            const list = document.getElementById('component-list');
            for(let i=0; i<30; i++) {
                const div = document.createElement('div');
                div.className = 'component-category-wrapper';
                div.style.height = '100px';
                div.innerHTML = '<h4>Category ' + i + '</h4>';
                list.appendChild(div);
            }
        """)

        is_modal_content_scrollable = await page.evaluate("""
            const content = document.querySelector('#add-component-modal .modal-content');
            const list = document.getElementById('component-list');
            // Check if modal content overflows its container or the list is scrollable
            content.scrollHeight > 720
        """)
        print(f"Is modal content exceeding screen height: {is_modal_content_scrollable}")

        await page.screenshot(path="verification/long_modal.png")

        await browser.close()

if __name__ == "__main__":
    if not os.path.exists("verification"):
        os.makedirs("verification")
    asyncio.run(run())
