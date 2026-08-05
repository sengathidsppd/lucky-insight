"""Test tickets POST endpoint directly."""

import urllib.request
import json

CONN_URL = "https://lucky-insight.onrender.com/api/v1/auth/login"

def main():
    # Login to get access_token
    payload = json.dumps({"username": "suzu@gmail.com", "password": "suzu1234"}).encode()
    req = urllib.request.Request(CONN_URL, data=payload, headers={"Content-Type": "application/json"})
    try:
        resp = urllib.request.urlopen(req)
        res_data = json.loads(resp.read().decode())
        token = res_data.get("data", {}).get("access_token")
        print("Logged in successfully, token retrieved.")

        # Test POST /api/v1/tickets
        ticket_url = "https://lucky-insight.onrender.com/api/v1/tickets"
        ticket_payload = json.dumps({
            "number_code": "932479",
            "category": "6D",
            "lottery_type": "LAO",
            "amount_spent": 0,
            "status": "PENDING"
        }).encode()

        t_req = urllib.request.Request(ticket_url, data=ticket_payload, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}"
        }, method="POST")

        t_resp = urllib.request.urlopen(t_req)
        print("POST /api/v1/tickets Response:", t_resp.status, t_resp.read().decode())

    except urllib.error.HTTPError as e:
        print(f"HTTPError: {e.code} - {e.read().decode()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
