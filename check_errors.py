import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))
        try:
            page.goto("http://localhost:8000/editor.html?project=TestProject")
            time.sleep(10)
        except Exception as e:
            print(f"FAILED: {e}")
        browser.close()

if __name__ == "__main__":
    run()
