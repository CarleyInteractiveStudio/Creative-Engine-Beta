import urllib.request

url = "https://esm.sh/@codemirror/view@6.26.3?deps=@codemirror/state@6.4.1"
try:
    with urllib.request.urlopen(url) as response:
        content = response.read().decode('utf-8')
        print(f"URL: {url}")
        print(f"Content snippet: {content[:300]}")
except Exception as e:
    print(f"ERROR: {e}")
