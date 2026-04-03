import sys
import os
from playwright.sync_api import sync_playwright

def diagnose():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture all network requests and console logs
        page.on("console", lambda msg: print(f"[CONSOLE {msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: print(f"[PAGE ERROR] {err.message}\n{err.stack}"))
        page.on("requestfailed", lambda req: print(f"[REQ FAILED] {req.url} - {req.failure.error_text}"))

        try:
            print("Navigating to editor.html...")
            # Using absolute path for local file if server is not running,
            # but we'll use the server for importmap support.
            page.goto("http://localhost:8080/editor.html")

            # Wait for potential errors or successful load
            page.wait_for_timeout(10000)

            status = page.evaluate("""() => {
                const overlay = document.getElementById('loading-overlay');
                const isHidden = overlay ? overlay.classList.contains('hidden') : 'no overlay';
                const editorInitialized = window.editorInitialized;
                return { isHidden, editorInitialized };
            }""")
            print(f"Status: {status}")

        except Exception as e:
            print(f"EXCEPTION: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    diagnose()
