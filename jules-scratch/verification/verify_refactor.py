import asyncio
from playwright.sync_api import sync_playwright, expect

def run_verification(page):
    renderer_loaded = False
    physics_loaded = False
    error_found = False

    def handle_console(msg):
        nonlocal renderer_loaded, physics_loaded, error_found
        print(f"Console [{msg.type}]: {msg.text}")
        if "Renderer.js loaded" in msg.text:
            renderer_loaded = True
        if "Physics.js loaded" in msg.text:
            physics_loaded = True
        if msg.type == "error":
            # Ignore this specific error, which is expected in this context
            if "Failed to load resource: the server responded with a status of 404 (File not found)" in msg.text and "favicon.ico" in msg.text:
                pass
            else:
                error_found = True

    page.on("console", handle_console)

    # The editor is served by a local http server
    page.goto("http://localhost:8000/editor.html?project=TestProject")

    # Wait for a reasonable amount of time for the editor to load
    page.wait_for_timeout(20000)

    # Take screenshot
    page.screenshot(path="jules-scratch/verification/verification.png")

    # Assertions
    if not renderer_loaded:
        raise Exception("Renderer module not loaded")
    if not physics_loaded:
        raise Exception("Physics module not loaded")
    if error_found:
        raise Exception("Console errors found during verification")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        run_verification(page)
        browser.close()

if __name__ == "__main__":
    main()
