import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        js_code = """
        Promise.all([
            import('https://esm.sh/codemirror@6'),
            import('https://esm.sh/@codemirror/view@6'),
            import('https://esm.sh/@codemirror/state@6'),
            import('https://esm.sh/@codemirror/commands@6'),
            import('https://esm.sh/@codemirror/language@6'),
            import('https://esm.sh/@codemirror/autocomplete@6')
        ]).then(([cm, view, state, cmd, lang, auto]) => {
            console.log('CM keys:', Object.keys(cm));
            console.log('View keys:', Object.keys(view));
            console.log('Basic Setup in CM?', !!cm.basicSetup);
        });
        """
        page.on("console", lambda msg: print(f"BROWSER: {msg.text}"))
        page.goto("about:blank")
        page.evaluate(js_code)
        time.sleep(5)
        browser.close()

if __name__ == "__main__":
    run()
