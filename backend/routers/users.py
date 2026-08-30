from fastapi import APIRouter
try:
    from ..database import SessionLocal, get_db
    from ..models import *
    from .auth import get_current_user
except Exception:
    try:
        from backend.database import SessionLocal, get_db
        from backend.models import *
        from backend.routers.auth import get_current_user
    except Exception:
        from database import SessionLocal, get_db
        from models import *
        from auth import get_current_user
from passlib.context import CryptContext
from typing import Annotated, Optional
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from datetime import datetime
from starlette import status

router = APIRouter(
    prefix="/users",
    tags=["users"]
)
     
bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict,Depends(get_current_user)]

class UserRequest(BaseModel):
    manager_id: Optional[int] = None
    name:str
    email:str
    username:str
    first_name:str
    last_name:str
    password:str
    role:str

class UserResponse(BaseModel):
    id: int
    manager_id: Optional[int] = None
    name: str
    email: str
    username: str
    role: str

    model_config = ConfigDict(from_attributes=True)

class UpdateUserRequest(BaseModel):
    manager_id: Optional[int] = None
    name: str
    email: str
    first_name: str
    last_name: str
    role: str

class UpdateCredentialsRequest(BaseModel):
    username: str
    password: str

@router.post(
    "/create",
    status_code=status.HTTP_201_CREATED,
    response_model=UserResponse
)
async def create_user(user: user_dependency,db: db_dependency,user_req: UserRequest):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail="user not authenticated")
    if user["role"] != "coordinator":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="user not authorized")
    if db.query(Users).filter(Users.username == user_req.username).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="username already exists")
    if db.query(Users).filter(Users.email == user_req.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="email already exists")
    
    is_demo = user.get("is_demo", False)
    demo_session_id = user.get("demo_session_id") if is_demo else None

    if user_req.manager_id is not None and user_req.manager_id != 0:
        manager_query = db.query(Users).filter(Users.id == user_req.manager_id)
        if is_demo:
            manager_query = manager_query.filter(Users.is_demo == True, Users.demo_session_id == demo_session_id)
        else:
            manager_query = manager_query.filter(Users.is_demo == False)
        manager = manager_query.first()
        if manager is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="manager not found")
        if manager.role != "manager":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="provided manager_id does not belong to a manager")
    valid_roles = ["coordinator", "manager", "employee","dev"]
    if user_req.role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail="invalid role"
        )
    new_user = Users(
        manager_id=user_req.manager_id if (user_req.manager_id and user_req.manager_id != 0) else None,
        name=user_req.name,
        email=user_req.email,
        username=user_req.username,
        first_name=user_req.first_name,
        last_name=user_req.last_name,
        hashed_password=bcrypt_context.hash(user_req.password),
        role=user_req.role,
        is_demo=is_demo,
        demo_session_id=demo_session_id,
        demo_session_created_at=datetime.utcnow() if is_demo else None
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

@router.post(
    "/create/example",
    status_code=status.HTTP_201_CREATED,
    response_model=UserResponse
)
async def create_user_example(db: db_dependency,user_req: UserRequest):
    if db.query(Users).filter(Users.username == user_req.username).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="username already exists")
    if db.query(Users).filter(Users.email == user_req.email).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="email already exists")
    if user_req.manager_id is not None and user_req.manager_id != 0:
        manager = db.query(Users).filter(Users.id == user_req.manager_id, Users.is_demo == False).first()
        if manager is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="manager not found")
        if manager.role != "manager":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="provided manager_id does not belong to a manager")
    valid_roles = ["coordinator", "manager", "employee","dev"]
    if user_req.role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail="invalid role"
        )
    new_user = Users(
        manager_id=user_req.manager_id if (user_req.manager_id and user_req.manager_id != 0) else None,
        name=user_req.name,
        email=user_req.email,
        username=user_req.username,
        first_name=user_req.first_name,
        last_name=user_req.last_name,
        hashed_password=bcrypt_context.hash(user_req.password),
        role=user_req.role,
        is_demo=False,
        demo_session_id=None
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user

@router.get("/get_users",status_code=status.HTTP_200_OK,response_model=list[UserResponse])
async def get_all_users(db: db_dependency,user:user_dependency):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "user not authenticated")
    if user["role"] != "coordinator":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail = "user not authorized")
    query = db.query(Users)
    if user.get("is_demo"):
        query = query.filter(Users.is_demo == True, Users.demo_session_id == user["demo_session_id"])
    else:
        query = query.filter(Users.is_demo == False)
    return query.all()

@router.get("/get_user/{user_id}",status_code=status.HTTP_200_OK,response_model=UserResponse)
async def get_user_by_id(db:db_dependency,user_id:int,user:user_dependency):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "user not authenticated")
    if user["role"] != "coordinator":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail = "user not authorized")
    query = db.query(Users).filter(Users.id == user_id)
    if user.get("is_demo"):
        query = query.filter(Users.is_demo == True, Users.demo_session_id == user["demo_session_id"])
    else:
        query = query.filter(Users.is_demo == False)
    model = query.first()
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="user not found")
    return model

@router.put("/update_user/{user_id}",status_code=status.HTTP_204_NO_CONTENT)
async def update_user(user:user_dependency,db:db_dependency,req:UpdateUserRequest,user_id:int):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "user not authenticated")
    if user["role"] != "coordinator":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail = "user not authorized")
    valid_roles = ["coordinator", "manager", "employee","dev"]
    if req.role not in valid_roles:
        raise HTTPException(
            status_code=400,
            detail="invalid role"
        )
    query = db.query(Users).filter(Users.id == user_id)
    if user.get("is_demo"):
        query = query.filter(Users.is_demo == True, Users.demo_session_id == user["demo_session_id"])
    else:
        query = query.filter(Users.is_demo == False)
    model = query.first()
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="user not found")
    
    if req.manager_id is not None and req.manager_id != 0:
        manager_query = db.query(Users).filter(Users.id == req.manager_id)
        if user.get("is_demo"):
            manager_query = manager_query.filter(Users.is_demo == True, Users.demo_session_id == user["demo_session_id"])
        else:
            manager_query = manager_query.filter(Users.is_demo == False)
        manager_model = manager_query.first()
        if manager_model is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="manager not found")
        if manager_model.role != "manager":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="provided id do not belong to manager")
        if req.manager_id == user_id:
            raise HTTPException(status_code=400,detail="user cannot be assigned to themselves")
        if manager_model.manager_id == user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="user cannot be assigned to a subordinate"
            )
        model.manager_id = req.manager_id
    else:
        model.manager_id = None

    existing_email = db.query(Users).filter(Users.email == req.email,Users.id != user_id).first()
    if existing_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="email already exists")
    model.name = req.name
    model.email = req.email
    model.first_name = req.first_name
    model.last_name = req.last_name
    model.role = req.role
    db.commit()

@router.put("/update_user_manager/{user_id}",status_code=status.HTTP_204_NO_CONTENT)
async def update_user_manager(user:user_dependency,db:db_dependency,manager_id: int,user_id:int):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "user not authenticated")
    if user["role"] != "coordinator":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail = "user not authorized")
    query = db.query(Users).filter(Users.id == user_id)
    if user.get("is_demo"):
        query = query.filter(Users.is_demo == True, Users.demo_session_id == user["demo_session_id"])
    else:
        query = query.filter(Users.is_demo == False)
    model = query.first()
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="user not found")
    if model.id == manager_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="user cannot be assigned to themselves")
    
    manager_query = db.query(Users).filter(Users.id == manager_id)
    if user.get("is_demo"):
        manager_query = manager_query.filter(Users.is_demo == True, Users.demo_session_id == user["demo_session_id"])
    else:
        manager_query = manager_query.filter(Users.is_demo == False)
    manager_model = manager_query.first()
    if manager_model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="manager not found")
    if manager_model.manager_id == model.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="user cannot be assigned to a subordinate")
    if manager_model.role != "manager":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="provided manager_id does not belong to a manager")
    model.manager_id = manager_id
    db.commit()

@router.delete("/delete_user/{user_id}",status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user:user_dependency,db:db_dependency,user_id:int):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "user not authenticated")
    if user["role"] != "coordinator":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail = "user not authorized")
    query = db.query(Users).filter(Users.id == user_id)
    if user.get("is_demo"):
        query = query.filter(Users.is_demo == True, Users.demo_session_id == user["demo_session_id"])
    else:
        query = query.filter(Users.is_demo == False)
    model = query.first()
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="employee not found")
    if model.role == "manager":
        staff_query = db.query(Users).filter(Users.manager_id == user_id)
        if user.get("is_demo"):
            staff_query = staff_query.filter(Users.is_demo == True, Users.demo_session_id == user["demo_session_id"])
        else:
            staff_query = staff_query.filter(Users.is_demo == False)
        staff = staff_query.first()
        if staff:
            raise HTTPException(status_code=400,detail="manager has assigned employees")
    task_delete_query = db.query(Tasks).filter((Tasks.assignee_id == user_id) | (Tasks.manager_id == user_id))
    if user.get("is_demo"):
        task_delete_query = task_delete_query.filter(Tasks.is_demo == True, Tasks.demo_session_id == user["demo_session_id"])
    else:
        task_delete_query = task_delete_query.filter(Tasks.is_demo == False)
    task_delete_query.delete(synchronize_session=False)
    db.delete(model)
    db.commit()

@router.get("/get_team",status_code=status.HTTP_200_OK,response_model=list[UserResponse])
async def get_team(user:user_dependency,db:db_dependency):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "user not authenticated")
    if user["role"] != "manager":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail = "user not authorized")
    query = db.query(Users).filter(Users.manager_id == user["id"])
    if user.get("is_demo"):
        query = query.filter(Users.is_demo == True, Users.demo_session_id == user["demo_session_id"])
    else:
        query = query.filter(Users.is_demo == False)
    return query.all()

@router.put("/update_credentials/{user_id}",status_code=status.HTTP_204_NO_CONTENT)
async def update_credentials(user: user_dependency,db: db_dependency,user_id: int,req: UpdateCredentialsRequest):
    if user["role"] != "coordinator":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail="user not authorized")
    query = db.query(Users).filter(Users.id == user_id)
    if user.get("is_demo"):
        query = query.filter(Users.is_demo == True, Users.demo_session_id == user["demo_session_id"])
    else:
        query = query.filter(Users.is_demo == False)
    model = query.first()
    if model is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,detail="user not found")
    existing_username = db.query(Users).filter(Users.username == req.username,Users.id != user_id).first()
    if existing_username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,detail="username already exists")
    model.username = req.username
    model.hashed_password = bcrypt_context.hash(req.password)
    db.commit()