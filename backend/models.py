from .database import Base
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from datetime import datetime


class Users(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    username = Column(String, unique=True, nullable=False)
    first_name = Column(String)
    last_name = Column(String)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, nullable=False)
    is_demo = Column(Boolean, default=False, nullable=False)
    demo_session_id = Column(String, nullable=True, index=True)
    demo_session_created_at = Column(DateTime, nullable=True)

class Tasks(Base):
    __tablename__ = "tasks"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String)
    priority = Column(String)  # LOW, MEDIUM, HIGH
    completed = Column(Boolean, default=False)
    manager_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    deadline = Column(DateTime, nullable=True)
    deadline_text = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    verified_by_manager = Column(Boolean, default=False, nullable=False)
    approved_by_manager = Column(Boolean, default=False, nullable=False)
    is_demo = Column(Boolean, default=False, nullable=False)
    demo_session_id = Column(String, nullable=True, index=True)

class Meetings(Base):
    __tablename__ = "meetings"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    audio_file_path = Column(String, nullable=True)
    transcript = Column(String, nullable=True)
    summary = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_demo = Column(Boolean, default=False, nullable=False)
    demo_session_id = Column(String, nullable=True, index=True)