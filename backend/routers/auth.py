import os
import secrets
from fastapi import APIRouter
try:
    from ..database import SessionLocal, get_db
    from ..models import Users, Tasks, Meetings
except Exception:
    try:
        from backend.database import SessionLocal, get_db
        from backend.models import Users, Tasks, Meetings
    except Exception:
        from database import SessionLocal, get_db
        from models import Users, Tasks, Meetings
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from typing import Annotated, Optional
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel
from jose import jwt, JWTError
from starlette import status
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

oauth2_bearer = OAuth2PasswordBearer(tokenUrl='auth/token')
ALGORITHM = 'HS256'
bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

class SwitchRoleRequest(BaseModel):
    role: str

async def create_access_token(
    username: str,
    user_id: int,
    role: str,
    expires_delta: timedelta,
    is_demo: bool = False,
    demo_session_id: Optional[str] = None
):
    encode = {
        "sub": username,
        "id": user_id,
        "role": role,
        "is_demo": is_demo,
        "demo_session_id": demo_session_id
    }
    expires = datetime.now(timezone.utc) + expires_delta
    encode.update({"exp": expires})
    return jwt.encode(
        encode,
        os.getenv("SECRET_KEY"),
        algorithm=ALGORITHM
    )

async def authenticate(username: str, password: str, db: Session):
    model = db.query(Users).filter(Users.username.ilike(username)).first()
    if model is None:
        return None
    result = bcrypt_context.verify(
        password,
        model.hashed_password
    )
    if not result:
        return None
    return model

async def get_current_user(
    token: Annotated[str, Depends(oauth2_bearer)],
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(
            token,
            os.getenv("SECRET_KEY"),
            algorithms=[ALGORITHM]
        )
        username = payload.get("sub")
        user_id = payload.get("id")
        user_role = payload.get("role")
        if username is None or user_id is None or user_role is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user")
        
        user = db.query(Users).filter(Users.id == user_id).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

        return {
            "username": user.username,
            "id": user.id,
            "role": user.role,
            "is_demo": bool(getattr(user, "is_demo", False)),
            "demo_session_id": getattr(user, "demo_session_id", None)
        }
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user") 

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

def cleanup_expired_demo_sessions(db: Session, max_age_hours: int = 2):
    try:
        cutoff = datetime.utcnow() - timedelta(hours=max_age_hours)
        expired_users = db.query(Users).filter(
            Users.is_demo == True,
            Users.demo_session_created_at != None,
            Users.demo_session_created_at < cutoff
        ).all()
        
        if not expired_users:
            return
            
        session_ids = list(set([u.demo_session_id for u in expired_users if u.demo_session_id]))
        if session_ids:
            db.query(Tasks).filter(Tasks.is_demo == True, Tasks.demo_session_id.in_(session_ids)).delete(synchronize_session=False)
            db.query(Meetings).filter(Meetings.is_demo == True, Meetings.demo_session_id.in_(session_ids)).delete(synchronize_session=False)
            db.query(Users).filter(Users.is_demo == True, Users.demo_session_id.in_(session_ids)).delete(synchronize_session=False)
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error cleaning up expired demo sessions: {e}")

@router.post("/token", status_code=status.HTTP_200_OK)
async def login(db: db_dependency, form_data: Annotated[OAuth2PasswordRequestForm, Depends()]):
    user = await authenticate(form_data.username, form_data.password, db)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate"
        )
    token = await create_access_token(
        user.username,
        user.id,
        user.role,
        timedelta(minutes=60),
        is_demo=bool(getattr(user, "is_demo", False)),
        demo_session_id=getattr(user, "demo_session_id", None)
    )
    return {
        "access_token": token,
        "token_type": "bearer"
    }

@router.post("/demo", status_code=status.HTTP_200_OK)
async def start_demo(db: db_dependency, initial_role: Optional[str] = "manager"):
    # 1. Clean up expired demo sessions lazily
    cleanup_expired_demo_sessions(db)

    # 2. Generate cryptographically strong unique demo session ID
    session_id = secrets.token_hex(6)
    created_now = datetime.utcnow()
    demo_pass_hash = bcrypt_context.hash(secrets.token_urlsafe(16))

    # 3. Create demo users: coordinator, manager, employee
    coord_user = Users(
        name="Demo Coordinator",
        email=f"coord_{session_id}@demo.local",
        username=f"demo_coordinator_{session_id}",
        first_name="Demo",
        last_name="Coordinator",
        hashed_password=demo_pass_hash,
        role="coordinator",
        is_demo=True,
        demo_session_id=session_id,
        demo_session_created_at=created_now
    )
    db.add(coord_user)

    manager_user = Users(
        name="Demo Manager",
        email=f"manager_{session_id}@demo.local",
        username=f"demo_manager_{session_id}",
        first_name="Demo",
        last_name="Manager",
        hashed_password=demo_pass_hash,
        role="manager",
        is_demo=True,
        demo_session_id=session_id,
        demo_session_created_at=created_now
    )
    db.add(manager_user)
    db.flush()

    emp_user = Users(
        manager_id=manager_user.id,
        name="Demo Employee",
        email=f"employee_{session_id}@demo.local",
        username=f"demo_employee_{session_id}",
        first_name="Demo",
        last_name="Employee",
        hashed_password=demo_pass_hash,
        role="employee",
        is_demo=True,
        demo_session_id=session_id,
        demo_session_created_at=created_now
    )
    db.add(emp_user)
    db.flush()

    # 4. Create realistic demo tasks
    now = datetime.utcnow()
    tasks = [
        Tasks(
            title="Sprint 14 Architecture Review",
            description="Evaluate microservice communication boundaries and API performance bottlenecks.",
            priority="HIGH",
            completed=False,
            manager_id=manager_user.id,
            assignee_id=emp_user.id,
            deadline=now + timedelta(days=2),
            deadline_text="In 2 days",
            approved_by_manager=True,
            verified_by_manager=True,
            is_demo=True,
            demo_session_id=session_id
        ),
        Tasks(
            title="Database Indexing Optimization",
            description="Audit composite indexes on tasks and users tables for faster query responses.",
            priority="MEDIUM",
            completed=True,
            manager_id=manager_user.id,
            assignee_id=emp_user.id,
            deadline=now + timedelta(days=1),
            deadline_text="Tomorrow",
            approved_by_manager=True,
            verified_by_manager=False,
            is_demo=True,
            demo_session_id=session_id
        ),
        Tasks(
            title="Security & Dependency Audit",
            description="Scan third-party packages for security advisories and update key libraries.",
            priority="HIGH",
            completed=False,
            manager_id=manager_user.id,
            assignee_id=emp_user.id,
            deadline=now + timedelta(days=4),
            deadline_text="In 4 days",
            approved_by_manager=True,
            verified_by_manager=False,
            is_demo=True,
            demo_session_id=session_id
        ),
        Tasks(
            title="Prepare Quarterly Progress Report",
            description="Draft performance metrics and key achievements for management review.",
            priority="LOW",
            completed=False,
            manager_id=manager_user.id,
            assignee_id=emp_user.id,
            deadline=now + timedelta(days=5),
            deadline_text="Next week",
            approved_by_manager=False,
            verified_by_manager=False,
            is_demo=True,
            demo_session_id=session_id
        ),
    ]
    for t in tasks:
        db.add(t)

    # 5. Create realistic demo meetings
    meetings = [
        Meetings(
            title="Q3 Engineering & Product Sync",
            summary="Reviewed sprint performance, task completion metrics, and isolated session isolation goals.",
            transcript="Discussion centered on system scalability, prompt handling, and user permissions across roles.",
            audio_file_path=None,
            is_demo=True,
            demo_session_id=session_id
        ),
        Meetings(
            title="Weekly Team Standup",
            summary="Aligned on database migration rollout and assigned tasks for performance optimization.",
            transcript="Team members presented progress updates and resolved blocker dependencies.",
            audio_file_path=None,
            is_demo=True,
            demo_session_id=session_id
        )
    ]
    for m in meetings:
        db.add(m)

    db.commit()

    # 6. Authenticate requested initial role (default to manager)
    active_user = manager_user
    if initial_role == "coordinator":
        active_user = coord_user
    elif initial_role == "employee":
        active_user = emp_user

    token = await create_access_token(
        active_user.username,
        active_user.id,
        active_user.role,
        timedelta(minutes=120),
        is_demo=True,
        demo_session_id=session_id
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }

@router.post("/demo/switch-role", status_code=status.HTTP_200_OK)
async def switch_demo_role(
    req: SwitchRoleRequest,
    user: user_dependency,
    db: db_dependency
):
    if not user.get("is_demo") or not user.get("demo_session_id"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role switching is only available for demo sessions"
        )
    
    target_role = req.role.lower()
    if target_role not in ["coordinator", "manager", "employee"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role requested"
        )
    
    # Query target user belonging ONLY to current user's demo session
    target_user = db.query(Users).filter(
        Users.is_demo == True,
        Users.demo_session_id == user["demo_session_id"],
        Users.role == target_role
    ).first()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target demo user not found in this session"
        )

    token = await create_access_token(
        target_user.username,
        target_user.id,
        target_user.role,
        timedelta(minutes=120),
        is_demo=True,
        demo_session_id=user["demo_session_id"]
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }