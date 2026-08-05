"""Test GET /api/v1/analysis/quota endpoint."""

import urllib.request
import json
import ssl

CF_URL = "https://lucky-insight.soumphonphukdysengathid.workers.dev/api/v1/auth/login"

def main():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    payload = json.dumps({"email": "suzu@gmail.com", "password": "suzu1234"}).encode()
    headers = {"Content-Type": "application/json", "User-Agent": "Mozilla/5.0"}
    req = urllib.request.Request(CF_URL, data=payload, headers=headers, method="POST")
    try:
        resp = urllib.request.urlopen(req, context=ctx)
        token = json.loads(resp.read().decode())["data"]["access_token"]
        print("Logged in.")

        quota_url = "https://lucky-insight.soumphonphukdysengathid.workers.dev/api/v1/analysis/quota"
        q_req = urllib.request.Request(quota_url, headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": "Mozilla/5.0"
        })
        q_resp = urllib.request.urlopen(q_req, context=ctx)
        print("Quota GET Response Status:", q_resp.status)
        print("Quota Response Data:", q_resp.read().decode())

    except urllib.error.HTTPError as e:
        print(f"HTTPError: {e.code} - {e.read().decode()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
