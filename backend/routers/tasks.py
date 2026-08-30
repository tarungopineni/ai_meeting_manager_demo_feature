import os
from fastapi import APIRouter
from ..database import SessionLocal, get_db
from typing import Annotated
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException
from datetime import datetime, timedelta
from dotenv import load_dotenv
from pydantic import BaseModel
from ..models import *
from starlette import status
from .auth import get_current_user
from .emails import *

load_dotenv()

router = APIRouter(
    prefix="/tasks",
    tags=["tasks"]
)

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict,Depends(get_current_user)]

class TaskRequest(BaseModel):
    title:str
    description:str
    priority:str
    completed:bool = False
    manager_id:int
    assignee_id:int
    deadline: datetime | None = None
    deadline_text: str | None = None
    verified_by_manager: bool = False
    approved_by_manager: bool = False

class TaskStatusRequest(BaseModel):
    title:str
    description:str
    priority:str
    completed:bool
    verified_by_manager: bool

def create_task_db(task: TaskRequest, db, is_demo: bool = False, demo_session_id: str | None = None):
    model = Tasks(
        title=task.title,
        description=task.description,
        priority=task.priority,
        manager_id=task.manager_id,
        assignee_id=task.assignee_id,
        deadline=task.deadline,
        deadline_text=task.deadline_text,
        verified_by_manager=task.verified_by_manager,
        approved_by_manager=task.approved_by_manager,
        is_demo=is_demo,
        demo_session_id=demo_session_id
    )
    db.add(model)
    db.commit()

@router.get("/get_verified_tasks",status_code=status.HTTP_200_OK)
async def get_all_verified_tasks(user:user_dependency,db:db_dependency):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "user not authenticated")
    query = db.query(Tasks).filter(
        Tasks.assignee_id == user["id"],
        Tasks.approved_by_manager == True,
        ~((Tasks.completed == True) & (Tasks.verified_by_manager == False))
    )
    if user.get("is_demo"):
        query = query.filter(Tasks.is_demo == True, Tasks.demo_session_id == user["demo_session_id"])
    else:
        query = query.filter(Tasks.is_demo == False)
    return query.all()

@router.get("/get_not_verified_tasks",status_code=status.HTTP_200_OK)
async def get_all_not_verified_tasks(user:user_dependency,db:db_dependency):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "user not authenticated")
    query = db.query(Tasks).filter(
        Tasks.assignee_id == user["id"],
        (Tasks.approved_by_manager == False) | ((Tasks.completed == True) & (Tasks.verified_by_manager == False))
    )
    if user.get("is_demo"):
        query = query.filter(Tasks.is_demo == True, Tasks.demo_session_id == user["demo_session_id"])
    else:
        query = query.filter(Tasks.is_demo == False)
    return query.all()

@router.get("/get_yet_to_be_verified_tasks",status_code=status.HTTP_200_OK)
async def get_all_yet_to_be_verified_tasks(user:user_dependency,db:db_dependency):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "user not authenticated")
    if user["role"] != "manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="You are not authorized to view tasks for this employee")
    query = db.query(Tasks).filter(
        Tasks.manager_id == user["id"],
        (Tasks.approved_by_manager == False) | ((Tasks.completed == True) & (Tasks.verified_by_manager == False))
    )
    if user.get("is_demo"):
        query = query.filter(Tasks.is_demo == True, Tasks.demo_session_id == user["demo_session_id"])
    else:
        query = query.filter(Tasks.is_demo == False)
    return query.all()

@router.get("/performance_report_user",status_code=status.HTTP_200_OK)
async def get_performance_report_user(user:user_dependency,db:db_dependency):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "user not authenticated")
    base_query = db.query(Tasks).filter(Tasks.assignee_id == user["id"],Tasks.verified_by_manager == True)
    if user.get("is_demo"):
        base_query = base_query.filter(Tasks.is_demo == True, Tasks.demo_session_id == user["demo_session_id"])
    else:
        base_query = base_query.filter(Tasks.is_demo == False)
    total_tasks = base_query.count()
    completed_tasks = base_query.filter(Tasks.completed == True).count()
    pending_tasks = total_tasks - completed_tasks
    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "completion_percentage": f"{(completed_tasks / total_tasks * 100) if total_tasks > 0 else 0:.2f}%"
    }

@router.get("/get_team_performance",status_code=status.HTTP_200_OK)
async def get_team_performance(user:user_dependency,db:db_dependency):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "user not authenticated")
    if user["role"] != "manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="You are not authorized to view team performance reports")
    base_query = db.query(Tasks).filter(Tasks.manager_id == user["id"],Tasks.verified_by_manager == True)
    if user.get("is_demo"):
        base_query = base_query.filter(Tasks.is_demo == True, Tasks.demo_session_id == user["demo_session_id"])
    else:
        base_query = base_query.filter(Tasks.is_demo == False)
    total_tasks = base_query.count()
    completed_tasks = base_query.filter(Tasks.completed == True).count()
    pending_tasks = total_tasks - completed_tasks
    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "completion_percentage": f"{(completed_tasks / total_tasks * 100) if total_tasks > 0 else 0:.2f}%"
    }

@router.get("/overdue_tasks")
async def get_overdue_tasks(user: user_dependency, db: db_dependency):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not authenticated")
    query = db.query(Tasks).filter(
        Tasks.assignee_id == user["id"],
        Tasks.deadline != None,
        Tasks.deadline < datetime.datetime.now(),
        Tasks.completed == False
    )
    if user.get("is_demo"):
        query = query.filter(Tasks.is_demo == True, Tasks.demo_session_id == user["demo_session_id"])
    else:
        query = query.filter(Tasks.is_demo == False)
    return query.all()

@router.put("/change_priority/{task_id}",status_code=status.HTTP_204_NO_CONTENT)
async def change_task_priority(user:user_dependency,task_id:int,new_priority:str,db:db_dependency):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "user not authenticated")
    valid_priorities = ["HIGH", "MEDIUM", "LOW"]
    new_priority = new_priority.upper()
    if new_priority not in valid_priorities:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="Invalid priority")
    query = db.query(Tasks).filter(Tasks.id == task_id)
    if user.get("is_demo"):
        query = query.filter(Tasks.is_demo == True, Tasks.demo_session_id == user["demo_session_id"])
    else:
        query = query.filter(Tasks.is_demo == False)
    model = query.first()
    if model is None or model.manager_id != user["id"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="task not found")
    model.priority = new_priority
    db.commit()

@router.put("/verify_task/{task_id}",status_code=status.HTTP_204_NO_CONTENT)
async def verify_task(user:user_dependency,task_id:int,db:db_dependency):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "user not authenticated")
    query = db.query(Tasks).filter(Tasks.id == task_id)
    if user.get("is_demo"):
        query = query.filter(Tasks.is_demo == True, Tasks.demo_session_id == user["demo_session_id"])
    else:
        query = query.filter(Tasks.is_demo == False)
    model = query.first()
    if model is None or model.manager_id != user["id"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="task not found")
    if not model.approved_by_manager:
        model.approved_by_manager = True
    elif model.completed and not model.verified_by_manager:
        model.verified_by_manager = True
    db.commit()

@router.put("/reject_task/{task_id}",status_code=status.HTTP_204_NO_CONTENT)
async def reject_task(user:user_dependency,task_id:int,db:db_dependency):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "user not authenticated")
    query = db.query(Tasks).filter(Tasks.id == task_id)
    if user.get("is_demo"):
        query = query.filter(Tasks.is_demo == True, Tasks.demo_session_id == user["demo_session_id"])
    else:
        query = query.filter(Tasks.is_demo == False)
    model = query.first()
    if model is None or model.manager_id != user["id"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="task not found")
    if not model.approved_by_manager:
        db.delete(model)
    else:
        model.completed = False
        model.verified_by_manager = False
    db.commit()

@router.put("/update_task/{task_id}",status_code=status.HTTP_204_NO_CONTENT)
async def update_task(user:user_dependency,task_id:int,task:TaskRequest,db:db_dependency):
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "user not authenticated")
    query = db.query(Tasks).filter(Tasks.id == task_id)
    if user.get("is_demo"):
        query = query.filter(Tasks.is_demo == True, Tasks.demo_session_id == user["demo_session_id"])
    else:
        query = query.filter(Tasks.is_demo == False)
    model = query.first()
    if model is None or user["role"] != "manager" or model.manager_id != user["id"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="task not found")
    model.title = task.title
    model.description = task.description
    model.priority = task.priority
    model.completed = task.completed
    model.manager_id = user["id"]
    model.assignee_id = task.assignee_id
    model.deadline = task.deadline
    model.deadline_text = task.deadline_text
    model.verified_by_manager = task.verified_by_manager
    model.approved_by_manager = task.approved_by_manager
    db.commit()

@router.delete("/delete_task/{task_id}",status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(user:user_dependency,task_id:int,db:db_dependency):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "user not authenticated")
    query = db.query(Tasks).filter(Tasks.id == task_id)
    if user.get("is_demo"):
        query = query.filter(Tasks.is_demo == True, Tasks.demo_session_id == user["demo_session_id"])
    else:
        query = query.filter(Tasks.is_demo == False)
    model = query.first()
    if model is None or model.manager_id != user["id"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="task not found")
    db.delete(model)
    db.commit()

@router.put("/update_task_status/{task_id}",status_code=status.HTTP_204_NO_CONTENT)
async def update_task_status(user:user_dependency,task_id:int,task:TaskStatusRequest,db:db_dependency):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "user not authenticated")
    query = db.query(Tasks).filter(Tasks.id == task_id)
    if user.get("is_demo"):
        query = query.filter(Tasks.is_demo == True, Tasks.demo_session_id == user["demo_session_id"])
    else:
        query = query.filter(Tasks.is_demo == False)
    model = query.first()
    if model is None or user["role"] != "manager" or model.manager_id != user["id"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="task not found")
    model.title = task.title
    model.description = task.description
    model.priority = task.priority
    model.completed = task.completed
    model.verified_by_manager = task.verified_by_manager
    db.commit()

@router.post("/assign_task_to_employee/{employee_id}",status_code=status.HTTP_204_NO_CONTENT)
async def assign_task_to_employee(user:user_dependency,employee_id:int,task:TaskRequest,db:db_dependency):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "user not authenticated")
    emp_query = db.query(Users).filter(Users.id == employee_id)
    if user.get("is_demo"):
        emp_query = emp_query.filter(Users.is_demo == True, Users.demo_session_id == user["demo_session_id"])
    else:
        emp_query = emp_query.filter(Users.is_demo == False)
    model = emp_query.first()
    if model is None or model.manager_id != user["id"]:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="employee not found")
    task.assignee_id = employee_id
    task.manager_id = user["id"]
    task.verified_by_manager = False
    task.approved_by_manager = True
    create_task_db(
        task,
        db,
        is_demo=bool(user.get("is_demo")),
        demo_session_id=user.get("demo_session_id")
    )

@router.get("/get_staff_tasks",status_code=status.HTTP_200_OK)
async def get_tasks_for_employee(user:user_dependency,db:db_dependency):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "user not authenticated")
    if user["role"] not in ["manager", "coordinator"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="You are not authorized to view tasks")
    query = db.query(Tasks)
    if user.get("is_demo"):
        query = query.filter(Tasks.is_demo == True, Tasks.demo_session_id == user["demo_session_id"])
    else:
        query = query.filter(Tasks.is_demo == False)
    if user["role"] == "coordinator":
        return query.all()
    return query.filter(Tasks.manager_id == user["id"]).all()

@router.put("/mark_task_completed/{task_id}",status_code=status.HTTP_204_NO_CONTENT)
async def mark_task_completed(user:user_dependency,task_id:int,db:db_dependency):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "user not authenticated")
    query = db.query(Tasks).filter(Tasks.id == task_id,Tasks.assignee_id == user["id"])
    if user.get("is_demo"):
        query = query.filter(Tasks.is_demo == True, Tasks.demo_session_id == user["demo_session_id"])
    else:
        query = query.filter(Tasks.is_demo == False)
    model = query.first()
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="task not found")
    if model.completed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="task is already marked as completed")
    model.completed = True
    model.verified_by_manager = False
    
    mgr_query = db.query(Users).filter(Users.id == model.manager_id)
    if user.get("is_demo"):
        mgr_query = mgr_query.filter(Users.is_demo == True, Users.demo_session_id == user["demo_session_id"])
    else:
        mgr_query = mgr_query.filter(Users.is_demo == False)
    manager_model = mgr_query.first() if model.manager_id else None
    
    db.commit()
    if manager_model and manager_model.email and not user.get("is_demo"):
        email_text = generate_task_completion_email(
            employee_id=user["id"],
            employee_name=user["username"],
            employee_role=user["role"],
            task_id=model.id,
            task_title=model.title,
            task_description=model.description,
            completed_at=datetime.datetime.now().isoformat()
        )
        try:
            send_email(
                sender_email="tarungopineni@gmail.com",
                app_password=os.getenv("EMAIL_APP_PASS"),
                receiver_email=manager_model.email,
                subject=email_text[0],
                body=email_text[1]
            )
        except Exception as e:
            print("Error sending email:", e)

@router.get("/task-warnings", status_code=status.HTTP_200_OK)
async def get_task_warnings(user: user_dependency,db: db_dependency):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="User not authenticated")
    now = datetime.datetime.now()
    warning_deadline = now + timedelta(days=1)
    query = db.query(Tasks).filter(Tasks.assignee_id == user["id"],Tasks.completed == False,Tasks.deadline != None,Tasks.deadline <= warning_deadline)
    if user.get("is_demo"):
        query = query.filter(Tasks.is_demo == True, Tasks.demo_session_id == user["demo_session_id"])
    else:
        query = query.filter(Tasks.is_demo == False)
    tasks = query.all()

    warnings = []

    for task in tasks:
        time_remaining = task.deadline - now
        if timedelta(0) <= time_remaining <= timedelta(days=1):

            warnings.append({
                "task_id": task.id,
                "title": task.title,
                "description": task.description,
                "priority": task.priority,
                "deadline": task.deadline,
                "remaining_hours": round(time_remaining.total_seconds() / 3600, 2),
                "deadline_text": task.deadline_text,
                "is_overdue": time_remaining.total_seconds() < 0
            })

    return warnings

@router.get("/manager/task-warnings", status_code=status.HTTP_200_OK)
async def get_manager_task_warnings(
    user: user_dependency,
    db: db_dependency
):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="User not authenticated")
    if user["role"] != "manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="User not authorized to view task warnings")
    now = datetime.datetime.now()
    warning_deadline = now + timedelta(days=1)

    query = db.query(Tasks).filter(Tasks.manager_id == user["id"],Tasks.completed == False,Tasks.deadline != None,Tasks.deadline <= warning_deadline)
    if user.get("is_demo"):
        query = query.filter(Tasks.is_demo == True, Tasks.demo_session_id == user["demo_session_id"])
    else:
        query = query.filter(Tasks.is_demo == False)
    tasks = query.all()

    warnings = []

    for task in tasks:
        time_remaining = task.deadline - now
        if timedelta(0) <= time_remaining <= timedelta(days=1):

            warnings.append({
                "task_id": task.id,
                "title": task.title,
                "description": task.description,
                "priority": task.priority,
                "assignee_id": task.assignee_id,
                "deadline": task.deadline,
                "deadline_text": task.deadline_text,
                "remaining_hours": round(
                    time_remaining.total_seconds() / 3600,
                    2
                ),
                "is_overdue": time_remaining.total_seconds() < 0
            })

    return warnings

@router.post("/send-warning-emails", status_code=status.HTTP_200_OK)
async def send_warning_emails(user: user_dependency,db: db_dependency):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="User not authenticated")
    if user["role"] not in ["manager", "coordinator"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="User not authorized to send warning emails")
    
    if user.get("is_demo"):
        return {"message": "0 warning emails sent (demo mode active)"}

    now = datetime.datetime.now()
    warning_deadline = now + timedelta(days=1)
    
    query = db.query(Tasks).filter(
        Tasks.completed == False,
        Tasks.deadline != None,
        Tasks.deadline <= warning_deadline,
        Tasks.is_demo == False
    )
    if user["role"] == "manager":
        query = query.filter(Tasks.manager_id == user["id"])
        
    tasks = query.all()
    emails_sent = 0
    
    for task in tasks:
        employee = (
            db.query(Users)
            .filter(Users.id == task.assignee_id, Users.is_demo == False)
            .first()
        )
        if employee is None or not employee.email:
            continue
        remaining_hours = round((task.deadline - now).total_seconds() / 3600,2)
        subject, body = generate_task_warning_email(
            employee_name=employee.username,
            employee_role=employee.role,
            task_id=task.id,
            task_title=task.title,
            task_description=task.description,
            deadline=str(task.deadline),
            remaining_hours=remaining_hours
        )
        try:
            success = send_email(
                sender_email="tarungopineni@gmail.com",
                app_password=os.getenv('EMAIL_APP_PASS'),
                receiver_email=employee.email,
                subject=subject,
                body=body
            )
            if success:
                emails_sent += 1
        except Exception as e:
            print(f"Failed to send email for task {task.id}: {e}")
            
    return {
        "message": f"{emails_sent} warning emails sent"
    }