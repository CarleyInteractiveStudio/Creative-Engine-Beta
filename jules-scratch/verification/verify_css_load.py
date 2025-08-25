from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        page.goto("file:///app/editor.html")

        animation_panel = page.locator("#animation-panel")
        animation_panel.wait_for(state="visible", timeout=5000)

        page.wait_for_timeout(1000)

        animation_panel.screenshot(path="jules-scratch/verification/css_load_test.png")

        browser.close()

if __name__ == "__main__":
    run()
