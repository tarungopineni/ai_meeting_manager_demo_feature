from backend.database import SessionLocal
from backend.models import Users

db = SessionLocal()
try:
    users = db.query(Users).all()
    print("=== USERS IN DATABASE ===")
    for u in users:
        print(f"ID: {u.id} | Username: {u.username} | Name: {u.name} | Email: {u.email} | Role: {u.role}")
finally:
    db.close()
