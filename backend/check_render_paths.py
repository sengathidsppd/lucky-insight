"""Check OpenAPI endpoints on Render live server."""

import urllib.request
import json

def main():
    url = "https://lucky-insight.onrender.com/openapi.json"
    try:
        req = urllib.request.urlopen(url)
        data = json.loads(req.read().decode())
        paths = list(data.get("paths", {}).keys())
        print("Live Render OpenAPI paths:")
        for p in paths:
            print(f"  {p}")
    except Exception as e:
        print(f"Error fetching openapi.json: {e}")

if __name__ == "__main__":
    main()
