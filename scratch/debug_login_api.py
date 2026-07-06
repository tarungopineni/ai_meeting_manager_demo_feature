import requests

url = "http://localhost:8000/auth/token"
payload = {
    "username": "Rahul",
    "password": "Rahul"
}

try:
    print("Testing login with Rahul/Rahul...")
    res = requests.post(url, data=payload)
    print("Status code:", res.status_code)
    print("Response JSON:", res.json() if res.status_code == 200 else res.text)
except Exception as e:
    print("Request failed:", e)
