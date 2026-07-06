import requests

token_url = "http://localhost:8000/auth/token"
payload = {
    "username": "Rahul",
    "password": "Rahul"
}

try:
    print("Getting token...")
    res = requests.post(token_url, data=payload)
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test yet to be verified tasks
    print("Testing GET /tasks/get_yet_to_be_verified_tasks...")
    res_tasks = requests.get("http://localhost:8000/tasks/get_yet_to_be_verified_tasks", headers=headers)
    print("Status:", res_tasks.status_code)
    print("Content:", res_tasks.json()[:3] if res_tasks.status_code == 200 else res_tasks.text)
    
    # Test get team
    print("Testing GET /users/get_team...")
    res_team = requests.get("http://localhost:8000/users/get_team", headers=headers)
    print("Status:", res_team.status_code)
    print("Content:", res_team.json()[:3] if res_team.status_code == 200 else res_team.text)
    
except Exception as e:
    print("Request failed:", e)
