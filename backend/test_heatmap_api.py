import urllib.request
import json

url = "https://lucky-insight.onrender.com/api/v1/lotteries/heatmap?year=2026"
req = urllib.request.Request(url)

try:
    print("Testing backend /api/v1/lotteries/heatmap?year=2026 ...")
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode())
        print("Response status:", res.get("success"))
        print("Data count:", len(res.get("data", [])))
        print("Sample data:", res.get("data")[:3])
except Exception as e:
    print("Error testing backend heatmap API:", e)
