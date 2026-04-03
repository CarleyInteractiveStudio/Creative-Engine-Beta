import urllib.request

urls = [
    "https://esm.sh/codemirror@6.0.1",
    "https://esm.sh/@codemirror/state@6.4.1",
    "https://esm.sh/@codemirror/view@6.33.0"
]

for url in urls:
    try:
        with urllib.request.urlopen(url) as response:
            content = response.read().decode('utf-8')
            print(f"URL: {url}")
            print(f"Content snippet: {content[:200]}")
            print("-" * 20)
    except Exception as e:
        print(f"{url}: ERROR {e}")
