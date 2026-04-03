import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.on("console", lambda msg: print(f"CONSOLE [{msg.type}]: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))
        try:
            page.goto("http://localhost:8000/editor.html?project=TestProject")
            # Wait for any critical errors or long enough to see if it hangs
            time.sleep(15)
            # Check if loading overlay is hidden
            is_hidden = page.evaluate("document.getElementById('loading-overlay').classList.contains('hidden')")
            print(f"Loading overlay hidden: {is_hidden}")
            page.screenshot(path="fix_boot.png")
        except Exception as e:
            print(f"FAILED: {e}")
        browser.close()

if __name__ == "__main__":
    run()
