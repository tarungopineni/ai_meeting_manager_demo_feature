import os
import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.database import Base, get_db
from backend.main import app
from backend.routers.auth import cleanup_expired_demo_sessions
from backend.models import Users, Tasks, Meetings

# Use in-memory SQLite database for test isolation
SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_demo.db"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

def test_start_demo_creates_isolated_users_tasks_and_meetings():
    response = client.post("/auth/demo?initial_role=manager")
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    token = data["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    
    # Query staff tasks as demo manager
    tasks_res = client.get("/tasks/get_staff_tasks", headers=headers)
    assert tasks_res.status_code == 200
    tasks = tasks_res.json()
    assert len(tasks) > 0
    for task in tasks:
        assert task["id"] is not None

def test_concurrent_demo_sessions_are_isolated():
    # Recruiter A starts demo
    res_a = client.post("/auth/demo?initial_role=manager")
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Recruiter B starts demo
    res_b = client.post("/auth/demo?initial_role=manager")
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Get tasks for Session A and Session B
    tasks_a = client.get("/tasks/get_staff_tasks", headers=headers_a).json()
    tasks_b = client.get("/tasks/get_staff_tasks", headers=headers_b).json()

    task_ids_a = [t["id"] for t in tasks_a]
    task_ids_b = [t["id"] for t in tasks_b]

    # Session A task IDs must NOT overlap with Session B task IDs
    assert set(task_ids_a).isdisjoint(set(task_ids_b))

def test_demo_role_switching_maintains_session():
    # Start as Manager
    res = client.post("/auth/demo?initial_role=manager")
    token_mgr = res.json()["access_token"]
    headers_mgr = {"Authorization": f"Bearer {token_mgr}"}

    # Switch to Employee
    switch_emp = client.post("/auth/demo/switch-role", json={"role": "employee"}, headers=headers_mgr)
    assert switch_emp.status_code == 200
    token_emp = switch_emp.json()["access_token"]
    headers_emp = {"Authorization": f"Bearer {token_emp}"}

    # Employee gets assigned verified tasks
    verified_res = client.get("/tasks/get_verified_tasks", headers=headers_emp)
    assert verified_res.status_code == 200

    # Switch to Coordinator
    switch_coord = client.post("/auth/demo/switch-role", json={"role": "coordinator"}, headers=headers_emp)
    assert switch_coord.status_code == 200
    token_coord = switch_coord.json()["access_token"]
    headers_coord = {"Authorization": f"Bearer {token_coord}"}

    # Coordinator views meetings
    meetings_res = client.get("/meetings/get_meetings", headers=headers_coord)
    assert meetings_res.status_code == 200
    assert len(meetings_res.json()) > 0

def test_demo_users_cannot_access_real_users_or_data():
    db = TestingSessionLocal()
    # Create normal production user
    normal_user = Users(
        name="Real Production User",
        email="prod@company.com",
        username="prod_user",
        hashed_password="hashed_secret",
        role="employee",
        is_demo=False,
        demo_session_id=None
    )
    db.add(normal_user)
    db.commit()
    prod_id = normal_user.id
    db.close()

    # Create demo session
    res = client.post("/auth/demo?initial_role=coordinator")
    demo_token = res.json()["access_token"]
    demo_headers = {"Authorization": f"Bearer {demo_token}"}

    # Coordinator lists users (should only return demo users, NOT real production user)
    users_res = client.get("/users/get_users", headers=demo_headers)
    assert users_res.status_code == 200
    users_list = users_res.json()
    user_ids = [u["id"] for u in users_list]
    assert prod_id not in user_ids

    # Coordinator tries to get real user by ID -> 404
    user_detail = client.get(f"/users/get_user/{prod_id}", headers=demo_headers)
    assert user_detail.status_code == 404

def test_expired_demo_session_cleanup():
    db = TestingSessionLocal()
    old_time = datetime.utcnow() - timedelta(hours=3)
    recent_time = datetime.utcnow() - timedelta(minutes=15)

    old_user = Users(
        name="Expired Demo User",
        email="expired@demo.local",
        username="expired_user",
        hashed_password="hash",
        role="employee",
        is_demo=True,
        demo_session_id="expired123",
        demo_session_created_at=old_time
    )
    active_user = Users(
        name="Active Demo User",
        email="active@demo.local",
        username="active_user",
        hashed_password="hash",
        role="employee",
        is_demo=True,
        demo_session_id="active456",
        demo_session_created_at=recent_time
    )
    db.add(old_user)
    db.add(active_user)
    db.commit()

    cleanup_expired_demo_sessions(db, max_age_hours=2)

    # Expired session MUST be cleaned up
    expired_check = db.query(Users).filter(Users.demo_session_id == "expired123").first()
    assert expired_check is None

    # Active session MUST NOT be deleted
    active_check = db.query(Users).filter(Users.demo_session_id == "active456").first()
    assert active_check is not None
    db.close()

def test_security_audit_direct_id_attacks_between_sessions():
    # Session A (Coordinator, Manager, Employee)
    res_a_coord = client.post("/auth/demo?initial_role=coordinator").json()
    token_a_coord = res_a_coord["access_token"]
    headers_a_coord = {"Authorization": f"Bearer {token_a_coord}"}

    switch_a_mgr = client.post("/auth/demo/switch-role", json={"role": "manager"}, headers=headers_a_coord).json()
    headers_a_mgr = {"Authorization": f"Bearer {switch_a_mgr['access_token']}"}

    switch_a_emp = client.post("/auth/demo/switch-role", json={"role": "employee"}, headers=headers_a_coord).json()
    headers_a_emp = {"Authorization": f"Bearer {switch_a_emp['access_token']}"}

    # Session B (Coordinator, Manager, Employee)
    res_b_coord = client.post("/auth/demo?initial_role=coordinator").json()
    token_b_coord = res_b_coord["access_token"]
    headers_b_coord = {"Authorization": f"Bearer {token_b_coord}"}

    switch_b_mgr = client.post("/auth/demo/switch-role", json={"role": "manager"}, headers=headers_b_coord).json()
    headers_b_mgr = {"Authorization": f"Bearer {switch_b_mgr['access_token']}"}

    switch_b_emp = client.post("/auth/demo/switch-role", json={"role": "employee"}, headers=headers_b_coord).json()
    headers_b_emp = {"Authorization": f"Bearer {switch_b_emp['access_token']}"}

    # Target records in Session B
    users_b = client.get("/users/get_users", headers=headers_b_coord).json()
    user_b_id = users_b[0]["id"]

    tasks_b = client.get("/tasks/get_staff_tasks", headers=headers_b_coord).json()
    task_b_id = tasks_b[0]["id"]

    meetings_b = client.get("/meetings/get_meetings", headers=headers_b_coord).json()
    meeting_b_id = meetings_b[0]["id"]

    # --- 1. USER ENDPOINTS ID ATTACK (Session A Coordinator tries to access Session B User) ---
    assert client.get(f"/users/get_user/{user_b_id}", headers=headers_a_coord).status_code == 404
    assert client.put(f"/users/update_user/{user_b_id}", json={"name":"Hacked","email":"hacked@b.com","first_name":"H","last_name":"K","role":"employee"}, headers=headers_a_coord).status_code == 404
    assert client.put(f"/users/update_credentials/{user_b_id}", json={"username":"hacked_usr","password":"new_password123"}, headers=headers_a_coord).status_code == 404
    assert client.delete(f"/users/delete_user/{user_b_id}", headers=headers_a_coord).status_code == 404

    # --- 2. TASK ENDPOINTS ID ATTACK (Session A Manager / Employee tries to access Session B Task) ---
    assert client.put(f"/tasks/change_priority/{task_b_id}?new_priority=HIGH", headers=headers_a_mgr).status_code == 404
    assert client.put(f"/tasks/verify_task/{task_b_id}", headers=headers_a_mgr).status_code == 404
    assert client.put(f"/tasks/reject_task/{task_b_id}", headers=headers_a_mgr).status_code == 404
    assert client.delete(f"/tasks/delete_task/{task_b_id}", headers=headers_a_mgr).status_code == 404
    assert client.put(f"/tasks/mark_task_completed/{task_b_id}", headers=headers_a_emp).status_code == 404

def test_security_audit_direct_id_attacks_against_production_data():
    db = TestingSessionLocal()
    # Create real production records
    prod_user = Users(
        name="Production User",
        email="prod_admin@company.com",
        username="prod_admin",
        hashed_password="secure_prod_password",
        role="manager",
        is_demo=False,
        demo_session_id=None
    )
    db.add(prod_user)
    db.flush()

    prod_task = Tasks(
        title="Production Secret Roadmap",
        description="Confidential company roadmap 2027",
        priority="HIGH",
        completed=False,
        manager_id=prod_user.id,
        assignee_id=prod_user.id,
        approved_by_manager=True,
        verified_by_manager=True,
        is_demo=False,
        demo_session_id=None
    )
    prod_meeting = Meetings(
        title="Production Executive Board Sync",
        summary="Sensitive financial & strategic plans",
        transcript="Confidential transcript data",
        is_demo=False,
        demo_session_id=None
    )
    db.add(prod_task)
    db.add(prod_meeting)
    db.commit()

    prod_user_id = prod_user.id
    prod_task_id = prod_task.id
    prod_meeting_id = prod_meeting.id
    db.close()

    # Session A Demo Coordinator
    res_a = client.post("/auth/demo?initial_role=coordinator").json()
    headers_demo = {"Authorization": f"Bearer {res_a['access_token']}"}

    # Demo user attempting direct ID access on real production records
    assert client.get(f"/users/get_user/{prod_user_id}", headers=headers_demo).status_code == 404
    assert client.put(f"/users/update_user/{prod_user_id}", json={"name":"Malicious","email":"malicious@company.com","first_name":"M","last_name":"L","role":"employee"}, headers=headers_demo).status_code == 404
    assert client.delete(f"/users/delete_user/{prod_user_id}", headers=headers_demo).status_code == 404

    assert client.put(f"/tasks/change_priority/{prod_task_id}?new_priority=LOW", headers=headers_demo).status_code == 404
    assert client.delete(f"/tasks/delete_task/{prod_task_id}", headers=headers_demo).status_code == 404

    # Demo meetings list must not contain production meeting
    meetings_res = client.get("/meetings/get_meetings", headers=headers_demo).json()
    meeting_ids = [m["id"] for m in meetings_res]
    assert prod_meeting_id not in meeting_ids

