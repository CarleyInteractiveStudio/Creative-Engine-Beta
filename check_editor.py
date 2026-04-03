import sys
from playwright.sync_api import sync_playwright

def check_editor():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.on("console", lambda msg: print(f"CONSOLE {msg.type}: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err.message}"))

        try:
            print("Navigating to editor...")
            # We need to start the server first or assume it's running
            page.goto("http://localhost:8080/editor.html")
            page.wait_for_timeout(5000)
            print("Finished waiting.")

            is_loading = page.evaluate("document.getElementById('loading-overlay') ? document.getElementById('loading-overlay').classList.contains('hidden') : 'no overlay'")
            print(f"Is loading overlay still visible? {is_loading}")

        except Exception as e:
            print(f"EXCEPTION: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    check_editor()
