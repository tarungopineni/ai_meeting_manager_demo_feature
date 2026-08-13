import requests

BASE_URL = "http://127.0.0.1:8001"

print("Authenticating as manager Rahul...")
res_auth = requests.post(f"{BASE_URL}/auth/token", data={"username": "Rahul", "password": "Rahul"})
if res_auth.status_code != 200:
    print(f"Failed to login: {res_auth.status_code} - {res_auth.text}")
    exit(1)

token = res_auth.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}

print("Calling POST /tasks/send-warning-emails...")
res_emails = requests.post(f"{BASE_URL}/tasks/send-warning-emails", headers=headers)
print("Status Code:", res_emails.status_code)
print("Response Content:", res_emails.json() if res_emails.status_code in [200, 400] else res_emails.text)
