
from playwright.sync_api import sync_playwright, expect
import subprocess
import time
import os

def run_verification():
    with sync_playwright() as p:
        # Iniciar el servidor
        server_process = subprocess.Popen(["python3", "-m", "http.server", "8000"], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        time.sleep(2)  # Dar tiempo al servidor para que se inicie

        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            # Ir a la página del editor
            page.goto("http://localhost:8000/editor.html")

            # Esperar a que el editor se cargue completamente
            expect(page.locator("#loading-overlay")).to_be_hidden(timeout=30000)

            # 1. Crear una nueva Materia
            page.locator("#hierarchy-content").click(button="right")
            page.get_by_text("Materia Vacía").click()

            # 2. Añadir un componente SpriteRenderer
            page.get_by_role("button", name="Añadir Ley").click()
            page.locator("#component-list").get_by_text("Sprite Renderer").click()

            # 3. Asignar el sprite
            # Hacer clic en el botón que abre el selector de assets para el sprite
            page.locator(".asset-dropper").click()

            # Esperar a que se abra el selector de assets y hacer clic en la imagen
            asset_selector = page.locator("#asset-selector-bubble")
            expect(asset_selector).to_be_visible()
            # Usar un selector que encuentre la imagen por su nombre de archivo
            page.locator('.grid-item[data-name="flygame.png"]').dblclick()

            # 4. Activar la herramienta de escalado
            page.locator("#tool-active").click()
            page.locator("#tool-scale").click()

            # Esperar a que el gizmo sea visible
            time.sleep(1) # Pequeña espera para asegurar el renderizado

            # 5. Tomar la captura de pantalla
            screenshot_path = "tests/verification.png"
            if not os.path.exists("tests"):
                os.makedirs("tests")
            page.screenshot(path=screenshot_path)
            print(f"Captura de pantalla guardada en {screenshot_path}")

        finally:
            browser.close()
            server_process.kill()

if __name__ == "__main__":
    run_verification()
