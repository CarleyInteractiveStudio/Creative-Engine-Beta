from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        js_code = """
        import { basicSetup, EditorView } from "https://esm.sh/codemirror@6.6.2";
        import { EditorState } from "https://esm.sh/@codemirror/state@6.4.1";
        console.log("basicSetup:", typeof basicSetup);
        console.log("EditorView:", typeof EditorView);
        console.log("EditorState:", typeof EditorState);
        """

        # Test imports in a clean environment
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda err: print(f"ERROR: {err.message}"))

        content = f"<html><body><script type='module'>{js_code}</script></body></html>"
        page.set_content(content)
        page.wait_for_timeout(5000)
        browser.close()

if __name__ == "__main__":
    run()
