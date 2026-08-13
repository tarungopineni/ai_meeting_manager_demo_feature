from backend.database import SessionLocal
from backend.models import Users

db = SessionLocal()
try:
    users_to_fix = {
        "Tarun": "tarungopineni@gmail.com",
        "Arun": "arun@gmail.com",
        "John": "john@gmail.com",
        "Anita": "anita@gmail.com"
    }
    
    print("=== FIXING USER EMAILS ===")
    for username, new_email in users_to_fix.items():
        user = db.query(Users).filter(Users.username == username).first()
        if user:
            print(f"Updating {username}: {user.email} -> {new_email}")
            user.email = new_email
        else:
            print(f"User {username} not found in DB")
            
    db.commit()
    print("Database updated successfully!")
finally:
    db.close()
