from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8000/index.html")

        # Wait for intro
        time.sleep(5)

        # Open account modal
        page.click("#btn-account-modal")

        # Go to preferences
        page.click("li[data-section='prefs-section']")

        # Check button
        reset_btn = page.query_selector("#btn-reset-engine")
        if reset_btn:
            print("Reset button found.")
            reset_btn.click()
            time.sleep(1)

            # Look for dialog
            dialog = page.query_selector(".dialog-container")
            if dialog:
                print("Confirmation dialog found.")
                # Look for 'Aceptar' button in dialog
                # The primary button in dialog-footer is the first one
                accept_btn = dialog.query_selector(".dialog-button.primary")
                if accept_btn:
                    print("Accept button found in dialog.")
                    # We won't click it to avoid reloading the page and losing context for this test,
                    # but we've verified the UI flow.
                else:
                    print("Accept button NOT found in dialog.")
            else:
                print("Confirmation dialog NOT found.")
        else:
            print("Reset button NOT found.")

        browser.close()

if __name__ == "__main__":
    run()
