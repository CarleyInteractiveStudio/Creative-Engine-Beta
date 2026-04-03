import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.on("console", lambda msg: print(f"CONSOLE [{msg.type}]: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))
        page.on("requestfailed", lambda req: print(f"REQUEST FAILED: {req.url}"))
        try:
            page.goto("http://localhost:8000/editor.html?project=TestProject")
            # Wait for any critical errors or long enough to see if it hangs
            time.sleep(15)

            # Diagnostic info
            is_hidden = page.evaluate("document.getElementById('loading-overlay').classList.contains('hidden')")
            print(f"Loading overlay hidden: {is_hidden}")

            # Check for _CodeEditor
            exists = page.evaluate("typeof window._CodeEditor !== 'undefined'")
            print(f"_CodeEditor exists: {exists}")

            page.screenshot(path="debug_boot_v3.png")
        except Exception as e:
            print(f"FAILED: {e}")
        browser.close()

if __name__ == "__main__":
    run()
