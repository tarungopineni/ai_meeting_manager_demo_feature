import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from .routers import auth, users, tasks, meetings
    from .database import Base, engine
except Exception:
    try:
        from backend.routers import auth, users, tasks, meetings
        from backend.database import Base, engine
    except Exception:
        from routers import auth, users, tasks, meetings
        from database import Base, engine

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://ai-meeting-manager-5yma.vercel.app",
    "https://ai-meeting-manager.vercel.app",
]

env_origins = os.getenv("ALLOWED_ORIGINS")
if env_origins:
    origins.extend([o.strip() for o in env_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(tasks.router)
app.include_router(meetings.router)

Base.metadata.create_all(bind=engine)