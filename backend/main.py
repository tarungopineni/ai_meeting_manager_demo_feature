from fastapi import FastAPI
from .routers import auth,users,tasks,meetings
from .database import Base,engine

app = FastAPI()

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(tasks.router)
app.include_router(meetings.router)

Base.metadata.create_all(bind = engine)