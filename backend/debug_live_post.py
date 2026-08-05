"""Debug POST /api/v1/tickets on live server."""

import urllib.request
import json

def test():
    # Login
    login_url = "https://lucky-insight.soumphonphukdysengathid.workers.dev/api/v1/auth/login"
    login_body = json.dumps({"email": "suzu@gmail.com", "password": "suzu1234"}).encode()
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
    
    req = urllib.request.Request(login_url, data=login_body, headers=headers, method="POST")
    try:
        resp = urllib.request.urlopen(req)
        data = json.loads(resp.read().decode())
        token = data.get("data", {}).get("access_token")
        print("Logged in successfully. Token length:", len(token))

        # Test POST tickets
        post_url = "https://lucky-insight.soumphonphukdysengathid.workers.dev/api/v1/tickets"
        post_body = json.dumps({
            "number_code": "748338",
            "category": "6D",
            "lottery_type": "THAI_NATIONAL",
            "amount_spent": 0,
            "status": "PENDING"
        }).encode()

        post_headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        }

        p_req = urllib.request.Request(post_url, data=post_body, headers=post_headers, method="POST")
        p_resp = urllib.request.urlopen(p_req)
        print("POST Response Status:", p_resp.status)
        print("POST Response Body:", p_resp.read().decode())

    except urllib.error.HTTPError as e:
        print(f"HTTPError Status: {e.code}")
        print(f"HTTPError Body: {e.read().decode()}")
    except Exception as e:
        print(f"General Error: {e}")

if __name__ == "__main__":
    test()
