import sys
import os
from playwright.sync_api import sync_playwright

def diagnose():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.on("console", lambda msg: print(f"[CONSOLE {msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: print(f"[PAGE ERROR] {err.message}"))
        page.on("requestfailed", lambda req: print(f"[REQ FAILED] {req.url}"))

        try:
            print("Navigating to editor.html...")
            page.goto("http://localhost:8080/editor.html")

            # Use wait_for_function to detect when the editor is ready or if it fails
            page.wait_for_timeout(10000)

            status = page.evaluate("""() => {
                const overlay = document.getElementById('loading-overlay');
                const isHidden = overlay ? overlay.classList.contains('hidden') : 'no overlay';
                const statusMsg = document.getElementById('loading-status-message')?.textContent;
                const errorVisible = document.getElementById('loading-error-section')?.style.display !== 'none';
                const errorMsg = document.getElementById('loading-error-message')?.textContent;
                return { isHidden, editorInitialized: window.editorInitialized, statusMsg, errorVisible, errorMsg };
            }""")
            print(f"Status: {status}")

        except Exception as e:
            print(f"EXCEPTION: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    diagnose()
