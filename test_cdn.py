import time
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        urls = [
            "https://esm.sh/codemirror",
            "https://cdn.jsdelivr.net/npm/codemirror/+esm",
            "https://unpkg.com/codemirror",
            "https://cdnjs.cloudflare.com/ajax/libs/codemirror/6.65.7/codemirror.min.js"
        ]
        for url in urls:
            try:
                response = page.goto(url, timeout=5000)
                print(f"URL: {url} - Status: {response.status if response else 'No response'}")
            except Exception as e:
                print(f"URL: {url} - FAILED: {e}")
        browser.close()

if __name__ == "__main__":
    run()
