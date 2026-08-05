"""Inspect openapi paths using ssl context."""

import urllib.request
import json
import ssl

def main():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    url = "https://lucky-insight.onrender.com/openapi.json"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        resp = urllib.request.urlopen(req, context=ctx)
        data = json.loads(resp.read().decode())
        paths = list(data.get("paths", {}).keys())
        print("All registered paths on Render live server:")
        for p in sorted(paths):
            print(f"  {p}")
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    main()
