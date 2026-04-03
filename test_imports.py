import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Test CodeMirror imports
        js_code = """
        try {
            import('https://esm.sh/codemirror@6').then(m => console.log('codemirror:', Object.keys(m)));
            import('https://esm.sh/@codemirror/view@6').then(m => console.log('@codemirror/view:', Object.keys(m)));
        } catch (e) {
            console.error('Import error:', e.message);
        }
        """

        page.on("console", lambda msg: print(f"BROWSER: {msg.text}"))
        page.goto("about:blank")
        page.evaluate(js_code)
        time.sleep(5)
        browser.close()

if __name__ == "__main__":
    run()
