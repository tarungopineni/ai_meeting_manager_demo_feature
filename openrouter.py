import json
from openai import OpenAI
from dotenv import load_dotenv
import os
from datetime import datetime, timedelta
from backend.routers.tasks import create_task_db, TaskRequest
from typing import Annotated
from sqlalchemy.orm import Session
from fastapi import Depends
from backend.database import SessionLocal
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

load_dotenv()

from datetime import datetime

def generate_task_completion_email(
    employee_id: int,
    employee_name: str,
    employee_role: str,
    task_id: int,
    task_title: str,
    task_description: str,
    completed_at: datetime | str
):
    subject = f"Task Completed: {task_title}"

    body = f"""
Dear Manager,

This is to inform you that a task has been marked as completed by one of your team members.

Employee Details
----------------
Employee ID   : {employee_id}
Employee Name : {employee_name}
Role          : {employee_role}

Task Details
------------
Task ID          : {task_id}
Task Title       : {task_title}
Task Description : {task_description}

Completion Details
------------------
Completed At : {completed_at}

Please review the completed work if verification or approval is required.

Regards,
Task Management System
""".strip()

    return subject, body

def send_email(sender_email: str,app_password: str,receiver_email: str,subject: str,body: str) -> bool:
    try:
        message = MIMEMultipart()
        message["From"] = sender_email
        message["To"] = receiver_email
        message["Subject"] = subject

        message.attach(MIMEText(body, "plain"))

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(sender_email, app_password)
            server.send_message(message)

        return True

    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

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

Known Participants (Name → ID Mapping):

{team_members}

CRITICAL RULES

* Use ONLY participant IDs from the provided participant list.
* Never invent IDs.
* Never invent participants.
* Never return manager names or assignee names inside tasks.
* Tasks must contain only numeric IDs.
* Participants may appear in the transcript who are NOT present in the provided participant list.
* Such participants may still appear in the participants section.
* However, tasks may only be created when BOTH manager and assignee can be matched to IDs from the provided participant list.
* If either manager or assignee cannot be matched, DO NOT create the task.
* Never output manager_id = 0.
* Never output assignee_id = 0.
* Omit invalid tasks entirely.

────────────────────────────

STEP 1 — PARTICIPANTS

Extract all participants explicitly mentioned in the meeting.

For each participant return:

* name
* role

If role is not mentioned, return null.

────────────────────────────

STEP 2 — DECISIONS

Extract only decisions that were explicitly made.

Do NOT infer decisions.

Examples:

Valid:

* "Analytics APIs become the highest priority after authentication."

Invalid:

* "The team will probably focus on analytics next."

────────────────────────────

STEP 3 — RISKS / BLOCKERS

Extract:

* risks
* blockers
* concerns
* dependencies
* issues

For each risk return:

* description
* owner

If owner is not explicitly mentioned:

owner = null

────────────────────────────

STEP 4 — TASK EXTRACTION

Extract ONLY explicitly assigned tasks.

A task exists only when someone is clearly responsible for performing an action.

Examples:

"John will complete RBAC by Friday."

Create task.

"Arun, prepare a database scaling proposal."

Create task.

"Analytics APIs are important."

Do NOT create task.

"Dashboard depends on analytics APIs."

Do NOT create task.

────────────────────────────

TASK FIELDS

For every valid task determine:

* title
* description
* priority
* manager_id
* assignee_id
* deadline
* deadline_text

DO NOT include:

* manager_name
* assignee_name
* assigned_by
* assigned_to

────────────────────────────

MANAGER / ASSIGNEE RULES

manager_id = ID of the person assigning the task.

assignee_id = ID of the person responsible for completing the task.

Examples:

Rahul:
"John, deploy authentication by Friday."

manager_id = Rahul's ID
assignee_id = John's ID

John:
"Priya, test authentication after deployment."

manager_id = John's ID
assignee_id = Priya's ID

Meeting recap:

"John will complete RBAC by Friday."

Treat as:

manager_id = Rahul's ID
assignee_id = John's ID

only if the recap clearly reflects an assignment made during the meeting.

If manager or assignee cannot be matched to an ID:

DO NOT CREATE THE TASK.

────────────────────────────

PRIORITY RULES

Use only:

* HIGH
* MEDIUM
* LOW

Use HIGH when:

* explicitly stated as highest priority
* urgent blockers
* critical path work

Use MEDIUM when priority is unclear.

Use LOW only when clearly low priority.

────────────────────────────

COMPLETION RULES

Assume all extracted tasks are incomplete.

Do NOT include a completed field in the output.

────────────────────────────

DEADLINE RULES

Use the meeting datetime as the reference date.

Convert relative dates such as:

* tomorrow
* Friday
* Friday evening
* next Tuesday
* before Wednesday
* in 3 days

to:

YYYY-MM-DDTHH:MM:SS

Examples:

deadline = "2026-07-05T18:00:00"
deadline_text = "Friday evening"

If no deadline is explicitly mentioned:

deadline = null
deadline_text = null

────────────────────────────

DUPLICATION RULES

Do not duplicate tasks.

If a task appears again during a recap, return it only once.

────────────────────────────

STEP 5 — SUMMARY

Generate a concise 3–5 sentence summary of the meeting.

────────────────────────────

OUTPUT RULES

Return ONLY valid JSON.

No markdown.
No explanations.
No comments.
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
        model="openai/gpt-oss-120b:free",
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

transcript = '''Rahul (Project Manager):

Good morning everyone. Let's start with the progress update on the employee management system.

John (Backend Developer):

The authentication service is completed. Login, registration, and refresh token APIs are working. I still need to integrate role-based access control. I should be able to finish that by Friday.

Rahul:

Okay. Please deploy the authentication service to staging once RBAC is complete.

John:

Sure, I'll deploy it on Friday evening.

Priya (QA Engineer):

Once it's deployed, I'll start testing on Saturday morning. Assuming no major issues, testing should be completed by Monday.

Rahul:

Sounds good.

What about the employee dashboard?

Anita (Frontend Developer):

The dashboard UI is mostly done. Around eighty percent is complete. The only thing blocking me right now is the analytics API.

John:

I haven't started that yet. After RBAC deployment I'll begin work on analytics APIs. It should take about three days.

Rahul:

Okay. Analytics APIs become the highest priority after authentication.

Priya:

One concern. We still don't have the final leave management requirements from the product team.

Rahul:

Good point.

I'll speak with the product manager today and get the finalized requirements document by tomorrow afternoon.

Anita:

That would help because some dashboard screens depend on those requirements.

Rahul:

Noted.

Any infrastructure concerns?

Arun (DevOps Engineer):

Actually yes. Database utilization is already at eighty-two percent. If the current growth trend continues, we may hit storage limits within the next six to eight weeks.

Rahul:

That's concerning.

Can you prepare a database scaling proposal?

Arun:

Yes. I'll prepare a proposal and share it before Wednesday.

Rahul:

Perfect.

Let's quickly summarize.

John will complete RBAC by Friday and deploy authentication to staging Friday evening.

Priya will complete authentication testing by Monday.

Rahul will obtain the finalized leave management requirements by tomorrow afternoon.

John will start analytics APIs after authentication deployment.

Arun will prepare a database scaling proposal before Wednesday.

Anita will continue dashboard development once analytics APIs and requirements are available.

Thank you everyone. Let's meet again next Tuesday.'''

d = {
    "Rahul": 5,
    "John": 1,
    "Priya": 2,
    "Anita": 3,
    "Arun": 4
}

content = generate_summary(transcript,datetime.now().isoformat(),d)

print(content)
data = json.loads(content)
print(data)