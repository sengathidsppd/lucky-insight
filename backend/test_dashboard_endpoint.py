"""Test GET /dashboard/summary endpoint directly."""

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
        print("Logged in. Token:", token[:30] + "...")

        # Also get /auth/me or /users/me
        me_req = urllib.request.Request("https://lucky-insight.soumphonphukdysengathid.workers.dev/api/v1/users/me", headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": "Mozilla/5.0"
        })
        try:
            me_resp = urllib.request.urlopen(me_req, context=ctx)
            print("/users/me Response:", me_resp.read().decode())
        except Exception as me_err:
            print("/users/me Error:", me_err)

        dash_url = "https://lucky-insight.soumphonphukdysengathid.workers.dev/api/v1/dashboard/summary"
        d_req = urllib.request.Request(dash_url, headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": "Mozilla/5.0"
        })
        d_resp = urllib.request.urlopen(d_req, context=ctx)
        print("Dashboard GET Response Status:", d_resp.status)
        print("Dashboard Response Data:", d_resp.read().decode())

    except urllib.error.HTTPError as e:
        print(f"HTTPError Status: {e.code} - Body: {e.read().decode()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
