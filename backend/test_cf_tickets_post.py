"""Test sending POST to Cloudflare worker worker URL directly."""

import urllib.request
import json

CF_URL = "https://lucky-insight.soumphonphukdysengathid.workers.dev/api/v1/auth/login"

def main():
    # Login via Cloudflare proxy
    payload = json.dumps({"email": "suzu@gmail.com", "password": "suzu1234"}).encode()
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    req = urllib.request.Request(CF_URL, data=payload, headers=headers)
    try:
        resp = urllib.request.urlopen(req)
        res_data = json.loads(resp.read().decode())
        token = res_data.get("data", {}).get("access_token")
        print("Logged in via Cloudflare successfully.")

        # Test POST /tickets via Cloudflare proxy
        ticket_url = "https://lucky-insight.soumphonphukdysengathid.workers.dev/api/v1/tickets"
        ticket_payload = json.dumps({
            "number_code": "748338",
            "category": "6D",
            "lottery_type": "THAI_NATIONAL",
            "amount_spent": 0,
            "status": "PENDING"
        }).encode()

        t_headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        t_req = urllib.request.Request(ticket_url, data=ticket_payload, headers=t_headers, method="POST")

        t_resp = urllib.request.urlopen(t_req)
        print("POST /api/v1/tickets Response:", t_resp.status, t_resp.read().decode())

    except urllib.error.HTTPError as e:
        print(f"HTTPError: {e.code} - {e.read().decode()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
