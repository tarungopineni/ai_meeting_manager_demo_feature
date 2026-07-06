import requests
import json
from backend.database import SessionLocal
from backend.models import Tasks, Meetings, Users
from datetime import datetime

BASE_URL = "http://127.0.0.1:8001"

def test_flow():
    print("=== STARTING MANUAL FLOW TEST ===")
    
    # 1. Authenticate users
    print("\n--- 1. Authenticating Users ---")
    tokens = {}
    for username, role in [("Tarun", "coordinator"), ("Rahul", "manager"), ("John", "dev")]:
        try:
            res = requests.post(f"{BASE_URL}/auth/token", data={"username": username, "password": username})
            if res.status_code == 200:
                tokens[role] = res.json()["access_token"]
                print(f"Logged in as {username} ({role}) successfully.")
            else:
                print(f"Failed to log in as {username}: {res.status_code} - {res.text}")
        except Exception as e:
            print(f"Login request failed for {username}: {e}")
            return

    # 2. Upload meeting audio as Coordinator
    print("\n--- 2. Uploading Meeting Audio (Coordinator) ---")
    headers_coord = {"Authorization": f"Bearer {tokens['coordinator']}"}
    files = {"audio_file": ("test_audio.mp3", open("test_audio.mp3", "rb"), "audio/mp3")}
    data = {"title": "Integration Sync Review"}
    
    try:
        res = requests.post(f"{BASE_URL}/meetings/create", headers=headers_coord, data=data, files=files)
        print("Upload Status Code:", res.status_code)
        print("Upload Response:", res.json() if res.status_code == 200 else res.text)
    except Exception as e:
        print("Upload meeting request failed:", e)

    # 3. Retrieve meetings as Coordinator and Manager
    print("\n--- 3. Testing GET /meetings/get_meetings ---")
    try:
        res_coord = requests.get(f"{BASE_URL}/meetings/get_meetings", headers=headers_coord)
        print("Coordinator view meetings status:", res_coord.status_code)
        if res_coord.status_code == 200:
            meetings = res_coord.json()
            print(f"Coordinator sees {len(meetings)} meetings. Titles: {[m['title'] for m in meetings]}")
        else:
            print("Coordinator fail response:", res_coord.text)
            
        headers_mgr = {"Authorization": f"Bearer {tokens['manager']}"}
        res_mgr = requests.get(f"{BASE_URL}/meetings/get_meetings", headers=headers_mgr)
        print("Manager view meetings status (Should be 403):", res_mgr.status_code)
        print("Manager view response content:", res_mgr.json() if res_mgr.status_code == 403 else res_mgr.text)
        
    except Exception as e:
        print("GET meetings request failed:", e)

    # 4. Simulate an AI task creation with approved_by_manager = False
    print("\n--- 4. Simulating AI Task Creation (approved_by_manager=False) ---")
    db = SessionLocal()
    try:
        john = db.query(Users).filter(Users.username == "John").first()
        rahul = db.query(Users).filter(Users.username == "Rahul").first()
        
        simulated_task = Tasks(
            title="Implement OAuth provider",
            description="Setup external OAuth providers for authentication service.",
            priority="HIGH",
            completed=False,
            manager_id=rahul.id,
            assignee_id=john.id,
            verified_by_manager=False,
            approved_by_manager=False
        )
        db.add(simulated_task)
        db.commit()
        db.refresh(simulated_task)
        task_id = simulated_task.id
        print(f"Simulated task created in DB. ID: {task_id}, Title: '{simulated_task.title}', approved_by_manager: {simulated_task.approved_by_manager}")
    finally:
        db.close()

    # 5. Check Employee list
    print("\n--- 5. Checking Task visibility for Employee ---")
    headers_emp = {"Authorization": f"Bearer {tokens['dev']}"}
    try:
        # Should NOT show in verified
        res_verified = requests.get(f"{BASE_URL}/tasks/get_verified_tasks", headers=headers_emp)
        verified_ids = [t["id"] for t in res_verified.json()]
        print("Task in employee's Verified Tasks list (Should be False):", task_id in verified_ids)
        
        # Should show in unverified/awaiting verification
        res_unverified = requests.get(f"{BASE_URL}/tasks/get_not_verified_tasks", headers=headers_emp)
        unverified_ids = [t["id"] for t in res_unverified.json()]
        print("Task in employee's Not Verified Tasks list (Should be True):", task_id in unverified_ids)
    except Exception as e:
        print("Employee task checks failed:", e)

    # 6. Check Manager Verification list
    print("\n--- 6. Checking Task visibility for Manager ---")
    try:
        res_yet_to_verify = requests.get(f"{BASE_URL}/tasks/get_yet_to_be_verified_tasks", headers=headers_mgr)
        yet_to_verify_ids = [t["id"] for t in res_yet_to_verify.json()]
        print("Task in manager's Yet To Be Verified list (Should be True):", task_id in yet_to_verify_ids)
    except Exception as e:
        print("Manager verification check failed:", e)

    # 7. Manager approves the task creation
    print("\n--- 7. Manager Approving Task Creation ---")
    try:
        res_approve = requests.put(f"{BASE_URL}/tasks/verify_task/{task_id}", headers=headers_mgr)
        print("Approve status code:", res_approve.status_code)
        
        # Verify approved status
        db = SessionLocal()
        t_after = db.query(Tasks).filter(Tasks.id == task_id).first()
        print(f"After manager approval: approved_by_manager = {t_after.approved_by_manager}, completed = {t_after.completed}")
        db.close()
        
        # Check employee lists again
        res_verified = requests.get(f"{BASE_URL}/tasks/get_verified_tasks", headers=headers_emp)
        verified_ids = [t["id"] for t in res_verified.json()]
        print("Task in employee's Verified Tasks list (Should be True):", task_id in verified_ids)
        
        res_unverified = requests.get(f"{BASE_URL}/tasks/get_not_verified_tasks", headers=headers_emp)
        unverified_ids = [t["id"] for t in res_unverified.json()]
        print("Task in employee's Not Verified Tasks list (Should be False):", task_id in unverified_ids)
    except Exception as e:
        print("Task approval test failed:", e)

    # 8. Employee marks task completed
    print("\n--- 8. Employee Marking Task Completed ---")
    try:
        res_complete = requests.put(f"{BASE_URL}/tasks/mark_task_completed/{task_id}", headers=headers_emp)
        print("Complete status code:", res_complete.status_code)
        
        db = SessionLocal()
        t_comp = db.query(Tasks).filter(Tasks.id == task_id).first()
        print(f"After completion: completed = {t_comp.completed}, verified_by_manager = {t_comp.verified_by_manager}")
        db.close()
        
        # Should now show in employee's unverified tab (awaiting verification)
        res_unverified = requests.get(f"{BASE_URL}/tasks/get_not_verified_tasks", headers=headers_emp)
        unverified_ids = [t["id"] for t in res_unverified.json()]
        print("Task in employee's Not Verified Tasks list (Should be True):", task_id in unverified_ids)
    except Exception as e:
        print("Completion flow failed:", e)

    # 9. Manager rejects completion
    print("\n--- 9. Manager Rejecting Task Completion ---")
    try:
        res_reject = requests.put(f"{BASE_URL}/tasks/reject_task/{task_id}", headers=headers_mgr)
        print("Reject status code:", res_reject.status_code)
        
        db = SessionLocal()
        t_rej = db.query(Tasks).filter(Tasks.id == task_id).first()
        print(f"After rejection: completed = {t_rej.completed}, verified_by_manager = {t_rej.verified_by_manager}, approved_by_manager = {t_rej.approved_by_manager}")
        db.close()
        
        # Should return to employee's active list
        res_verified = requests.get(f"{BASE_URL}/tasks/get_verified_tasks", headers=headers_emp)
        verified_ids = [t["id"] for t in res_verified.json()]
        print("Task in employee's Verified Tasks list (Should be True):", task_id in verified_ids)
    except Exception as e:
        print("Rejection flow failed:", e)

    # 10. Test Rejecting an Unapproved Task (should delete it)
    print("\n--- 10. Testing Rejecting an Unapproved Task (Should Delete) ---")
    db = SessionLocal()
    try:
        john = db.query(Users).filter(Users.username == "John").first()
        rahul = db.query(Users).filter(Users.username == "Rahul").first()
        
        unapproved_task = Tasks(
            title="Task to be rejected",
            description="This task should be deleted on rejection.",
            priority="LOW",
            completed=False,
            manager_id=rahul.id,
            assignee_id=john.id,
            verified_by_manager=False,
            approved_by_manager=False
        )
        db.add(unapproved_task)
        db.commit()
        db.refresh(unapproved_task)
        unapproved_id = unapproved_task.id
        print(f"Created unapproved task ID: {unapproved_id}")
    finally:
        db.close()

    try:
        res_reject_new = requests.put(f"{BASE_URL}/tasks/reject_task/{unapproved_id}", headers=headers_mgr)
        print("Reject new task status code:", res_reject_new.status_code)
        
        db = SessionLocal()
        exists = db.query(Tasks).filter(Tasks.id == unapproved_id).first() is not None
        print("Does task still exist in DB? (Should be False):", exists)
        db.close()
    except Exception as e:
        print("New rejection deletion test failed:", e)

    print("\n=== FLOW TEST COMPLETED ===")

if __name__ == "__main__":
    test_flow()
