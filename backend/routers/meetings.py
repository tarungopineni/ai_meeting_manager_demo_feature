from fastapi import HTTPException,UploadFile, File, Form
from starlette import status
from typing_extensions import Annotated
import whisper
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ..database import SessionLocal, get_db
from ..models import *
from datetime import datetime
from .auth import get_current_user
from .tasks import TaskRequest, create_task_db
import json
from openai import OpenAI
from dotenv import load_dotenv
import os
import shutil
from temp import *

# =====================================================================================================================
    # openrouter

load_dotenv()

model = None
def transcribe_audio(audio_path: str) -> str:
    """
    Convert audio to English text using Whisper.
    """
    global model
    if model is None:
        print("\nLoading Whisper model...")
        try:
            model = whisper.load_model("medium")
        except Exception as e:
            print(f"Failed to load Whisper 'medium' model: {e}. Falling back to 'small'.")
            model = whisper.load_model("small")


    start_time = datetime.now()

    result = model.transcribe(
        audio_path,
        task="translate",  # Translate non-English speech to English
        fp16=False
    )

    end_time = datetime.now()

    elapsed = (end_time - start_time).total_seconds()

    print(f"\nTranscription completed in {elapsed:.2f} seconds")
    print(f"Detected language: {result['language']}")

    return result["text"]

def generate_summary(transcript: str,meeting_datetime: str,team_members: dict) -> str:
    """
    Generate meeting summary using OpenRouter GPT-OSS-120B.
    """

    client = OpenAI(
        api_key=os.getenv("OPENROUTER_API_KEY"),
        base_url="https://openrouter.ai/api/v1"
    )

    prompt = f"""
You are an expert project manager and meeting analyst.

The meeting occurred at:

{meeting_datetime}

The following participants are known and can be referenced when assigning tasks:

{team_members}

IMPORTANT RULES

* Use ONLY IDs from the provided participants list.
* Never invent IDs.
* Never invent participants.
* Every task must have both:

  * manager_id
  * assignee_id
* manager_id is the ID of the person who assigned the task.
* assignee_id is the ID of the person who must complete the task.
* If either person cannot be matched to a provided participant, do not create the task.

STEP 1 — Participants

Extract all participants mentioned in the meeting.

For each participant return:

* name
* role

STEP 2 — Decisions

Extract only decisions explicitly made during the meeting.

Do not infer decisions.

STEP 3 — Risks and Blockers

Extract:

* risks
* blockers
* concerns
* dependencies
* issues

Include owner only if explicitly mentioned.

STEP 4 — Tasks

Extract ONLY explicitly assigned tasks.

For every task determine:

* title
* description
* priority
* completed
* manager_id
* assignee_id
* deadline
* deadline_text

Assignment Rules

Example:

Rahul: "Ramu, complete backend integration by tomorrow."

Return:

manager_id = Rahul's ID
assignee_id = Ramu's ID

Examples:

John: "Priya, please test the authentication service."

manager_id = John's ID
assignee_id = Priya's ID

Rahul: "Arun, prepare a database scaling proposal."

manager_id = Rahul's ID
assignee_id = Arun's ID

Priority Rules

Use:

* HIGH
* MEDIUM
* LOW

If priority cannot be determined, use MEDIUM.

Completed Rules

Always set:

completed = false

Deadline Rules

Use the meeting datetime as the reference date.

Convert relative dates such as:

* tomorrow
* Friday
* Friday evening
* next Tuesday
* before Wednesday
* in 3 days

into:

YYYY-MM-DDTHH:MM:SS

Store the original phrase in deadline_text.

Examples:

deadline = "2026-07-05T18:00:00"
deadline_text = "Friday evening"

If no explicit deadline exists:

deadline = null
deadline_text = null

Task Extraction Rules

* Never invent tasks.
* Never infer tasks.
* Only extract explicitly assigned tasks.
* Do not create tasks from general discussion.
* Do not create tasks from possibilities.
* Do not duplicate tasks repeated during meeting recap.

STEP 5 — Summary

Generate a concise 3–5 sentence summary.

Return ONLY valid JSON.

No markdown.
No explanations.
No extra text.

JSON Schema

{{
"summary": "",
"participants": [
{{
"name": "",
"role": ""
}}
],
"decisions": [
""
],
"risks": [
{{
"description": "",
"owner": ""
}}
],
"tasks": [
{{
"title": "",
"description": "",
"priority": "HIGH|MEDIUM|LOW",
"completed": false,
"manager_id": 0,
"assignee_id": 0,
"deadline": null,
"deadline_text": null
}}
]
}}

Meeting Transcript:

{transcript}
"""


    response = client.chat.completions.create(
        model="openrouter/free",
        messages=[
            {
                "role": "system",
                "content": "You are an expert project manager."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return response.choices[0].message.content

# =====================================================================================================================

router = APIRouter(
    prefix="/meetings",
    tags=["meetings"]
)

db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict,Depends(get_current_user)]
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/create")
async def create_meeting(user:user_dependency,db: db_dependency,title: str=Form(...),audio_file:UploadFile = File(...)):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,detail = "user not authenticated")
    if user["role"] != "coordinator":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,detail = "user not authorized")
    
    is_demo = bool(user.get("is_demo"))
    demo_session_id = user.get("demo_session_id") if is_demo else None

    user_query = db.query(Users)
    if is_demo:
        user_query = user_query.filter(Users.is_demo == True, Users.demo_session_id == demo_session_id)
    else:
        user_query = user_query.filter(Users.is_demo == False)

    team_members = [
        {
            "id": u.id,
            "name": u.name
        }
        for u in user_query.all()
    ]
    file_path = os.path.join(
        UPLOAD_DIR,
        audio_file.filename
    )

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(audio_file.file, buffer)

    # transcript = transcribe_audio(file_path)
    transcript = example_transcript
    # content = generate_summary(transcript,datetime.now().isoformat(),team_members)
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="AI returned invalid JSON"
        )
    try:
        meeting = Meetings(
            title=title,
            summary=data["summary"],
            audio_file_path=file_path,
            transcript=transcript,
            is_demo=is_demo,
            demo_session_id=demo_session_id
        )
        db.add(meeting)
        for task in data["tasks"]:
            mgr_q = db.query(Users).filter(Users.id == task["manager_id"])
            ass_q = db.query(Users).filter(Users.id == task["assignee_id"])
            if is_demo:
                mgr_q = mgr_q.filter(Users.is_demo == True, Users.demo_session_id == demo_session_id)
                ass_q = ass_q.filter(Users.is_demo == True, Users.demo_session_id == demo_session_id)
            else:
                mgr_q = mgr_q.filter(Users.is_demo == False)
                ass_q = ass_q.filter(Users.is_demo == False)

            manager = mgr_q.first()
            assignee = ass_q.first()
            if not manager or not assignee:
                continue
            create_task_db(
                TaskRequest(
                    title=task["title"],
                    description=task["description"],
                    priority=task["priority"],
                    manager_id=task["manager_id"],
                    assignee_id=task["assignee_id"],
                    deadline=datetime.fromisoformat(task["deadline"]) if task["deadline"] else None,
                    deadline_text=task["deadline_text"],
                    completed=task["completed"],
                    verified_by_manager=task.get("verified_by_manager", False),
                    approved_by_manager=False
                ),
                db,
                is_demo=is_demo,
                demo_session_id=demo_session_id
            )
        db.commit()
        db.refresh(meeting)

        # return meeting
        return {"message": "Meeting summary and tasks created successfully."}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@router.get("/get_meetings", status_code=status.HTTP_200_OK)
async def get_all_meetings(user: user_dependency, db: db_dependency):
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="user not authenticated")
    if user["role"] != "coordinator":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="user not authorized")
    query = db.query(Meetings)
    if user.get("is_demo"):
        query = query.filter(Meetings.is_demo == True, Meetings.demo_session_id == user["demo_session_id"])
    else:
        query = query.filter(Meetings.is_demo == False)
    return query.order_by(Meetings.created_at.desc()).all()