import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.on("console", lambda msg: print(f"CONSOLE [{msg.type}]: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        # Track failed requests with more detail
        def handle_request_failed(request):
            print(f"REQUEST FAILED: {request.url} - {request.failure}")
        page.on("requestfailed", handle_request_failed)

        try:
            page.goto("http://localhost:8000/editor.html?project=TestProject")
            time.sleep(20)

            # Check variables
            info = page.evaluate("""() => {
                return {
                    status: document.getElementById('loading-status-message')?.textContent,
                    progress: document.getElementById('progress-bar')?.style.width,
                    editorReady: typeof window.isEditorReady !== 'undefined' ? window.isEditorReady : 'undefined',
                    localizationExists: typeof window.Localization !== 'undefined',
                    codeEditorExists: typeof window._CodeEditor !== 'undefined'
                };
            }""")
            print(f"Boot Info: {info}")

            page.screenshot(path="debug_boot_v4.png")
        except Exception as e:
            print(f"FAILED: {e}")
        browser.close()

if __name__ == "__main__":
    run()
