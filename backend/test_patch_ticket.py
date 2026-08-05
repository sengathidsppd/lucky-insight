"""Test PATCH /tickets/{id} directly to inspect 500 error."""

import urllib.request
import json
import ssl

CF_URL = "https://lucky-insight.soumphonphukdysengathid.workers.dev/api/v1/auth/login"

def main():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    payload = json.dumps({"email": "suzu@gmail.com", "password": "suzu1234"}).encode()
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0"
    }
    req = urllib.request.Request(CF_URL, data=payload, headers=headers, method="POST")
    try:
        resp = urllib.request.urlopen(req, context=ctx)
        token = json.loads(resp.read().decode())["data"]["access_token"]
        print("Logged in.")

        # Get existing tickets
        get_req = urllib.request.Request("https://lucky-insight.soumphonphukdysengathid.workers.dev/api/v1/tickets", headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": "Mozilla/5.0"
        })
        get_resp = urllib.request.urlopen(get_req, context=ctx)
        tickets = json.loads(get_resp.read().decode())
        print(f"Retrieved {len(tickets)} tickets.")

        if len(tickets) > 0:
            target_id = tickets[0]["id"]
            print("Patching ticket:", target_id)
            patch_url = f"https://lucky-insight.soumphonphukdysengathid.workers.dev/api/v1/tickets/{target_id}"
            patch_body = json.dumps({
                "draw_date": "2026-08-05",
                "amount_spent": 86000,
                "prize_won": 0,
                "status": "PENDING",
                "notes": ""
            }).encode()

            p_req = urllib.request.Request(patch_url, data=patch_body, headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
                "User-Agent": "Mozilla/5.0"
            }, method="PATCH")

            p_resp = urllib.request.urlopen(p_req, context=ctx)
            print("PATCH Success:", p_resp.status, p_resp.read().decode())

    except urllib.error.HTTPError as e:
        print(f"HTTPError: {e.code} - {e.read().decode()}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
