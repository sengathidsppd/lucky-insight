"""Test all live route paths to find exact mismatch."""

import urllib.request
import json

CF_URL = "https://lucky-insight.soumphonphukdysengathid.workers.dev/api/v1/auth/login"

def main():
    payload = json.dumps({"email": "suzu@gmail.com", "password": "suzu1234"}).encode()
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
    req = urllib.request.Request(CF_URL, data=payload, headers=headers, method="POST")
    try:
        resp = urllib.request.urlopen(req)
        res_data = json.loads(resp.read().decode())
        token = res_data.get("data", {}).get("access_token")
        print("Logged in successfully.")

        test_paths = [
            "/tickets",
            "/tickets/",
            "/tickets/summary",
            "/tickets/summary/",
            "/analysis/",
            "/lotteries/games",
            "/dashboard/stats",
        ]

        for p in test_paths:
            url = f"https://lucky-insight.soumphonphukdysengathid.workers.dev/api/v1{p}"
            t_headers = {
                "Authorization": f"Bearer {token}",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
            }
            try:
                t_req = urllib.request.Request(url, headers=t_headers, method="GET")
                t_resp = urllib.request.urlopen(t_req)
                print(f"GET /api/v1{p} => Status: {t_resp.status}")
            except urllib.error.HTTPError as e:
                print(f"GET /api/v1{p} => HTTPError: {e.code}")

    except Exception as e:
        print("Login Error:", e)

if __name__ == "__main__":
    main()
