from datetime import datetime, timedelta
from backend.database import SessionLocal
from backend.models import Tasks, Users

db = SessionLocal()
try:
    now = datetime.now()
    warning_deadline = now + timedelta(days=1)
    
    tasks = db.query(Tasks).filter(
        Tasks.completed == False,
        Tasks.deadline != None,
        Tasks.deadline <= warning_deadline
    ).all()
    
    print(f"=== ELIGIBLE WARNING TASKS (Total: {len(tasks)}) ===")
    for t in tasks:
        assignee = db.query(Users).filter(Users.id == t.assignee_id).first()
        assignee_username = assignee.username if assignee else "Unknown"
        assignee_email = assignee.email if assignee else "None"
        print(f"Task ID: {t.id} | Title: '{t.title}' | Assignee: {assignee_username} ({assignee_email}) | Deadline: {t.deadline}")
finally:
    db.close()
