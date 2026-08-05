"""Inspect live openapi.json from Render."""

import urllib.request
import json

def main():
    url = "https://lucky-insight.onrender.com/openapi.json"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        resp = urllib.request.urlopen(req)
        data = json.loads(resp.read().decode())
        paths = list(data.get("paths", {}).keys())
        print("All registered paths on Render live server:")
        for p in sorted(paths):
            print(f"  {p}")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
