import urllib.request

urls = [
    "https://esm.sh/codemirror@6.0.1",
    "https://esm.sh/@codemirror/state@6.4.1",
    "https://esm.sh/@codemirror/view@6.26.3",
    "https://esm.sh/@codemirror/lang-javascript@6.2.2",
    "https://esm.sh/@codemirror/theme-one-dark@6.1.2",
    "https://esm.sh/@codemirror/commands@6.3.3",
    "https://esm.sh/@codemirror/autocomplete@6.16.0",
    "https://esm.sh/@codemirror/lint@6.4.2"
]

for url in urls:
    try:
        req = urllib.request.Request(url, method='HEAD')
        with urllib.request.urlopen(req) as response:
            print(f"{url}: {response.status}")
    except Exception as e:
        print(f"{url}: ERROR {e}")
