from typing import Tuple
from datetime import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

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

def generate_task_warning_email(
    employee_name: str,
    employee_role: str,
    task_id: int,
    task_title: str,
    task_description: str,
    deadline: str,
    remaining_hours: float
) -> Tuple[str, str]:

    subject = f"Task Warning: '{task_title}' requires attention"

    body = f"""
Hello,

This is an automated task warning notification.

The following task assigned to {employee_name} ({employee_role}) is approaching its deadline and requires immediate attention.

Task Details:
----------------------------------------
Task ID          : {task_id}
Task Title       : {task_title}
Description      : {task_description}
Deadline         : {deadline}
Hours Remaining  : {remaining_hours:.2f}
----------------------------------------

This task is currently in the warning stage and should be completed within the next 24 hours.

Please ensure the task is completed before the deadline to avoid delays.

Regards,
Task Management System
"""

    return subject, body

def send_task_warning_email(
    sender_email: str,
    app_password: str,
    receiver_email: str,
    employee_name: str,
    employee_role: str,
    task_id: int,
    task_title: str,
    task_description: str,
    deadline: str,
    remaining_hours: float
):
    subject, body = generate_task_warning_email(
        employee_name,
        employee_role,
        task_id,
        task_title,
        task_description,
        deadline,
        remaining_hours
    )

    send_email(
        sender_email=sender_email,
        app_password=app_password,
        receiver_email=receiver_email,
        subject=subject,
        body=body
    )