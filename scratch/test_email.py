import os
from dotenv import load_dotenv
from backend.routers.emails import send_email

load_dotenv()

sender = "tarungopineni@gmail.com"
password = os.getenv("EMAIL_APP_PASS")
receiver = "tarungopineni@gmail.com" # Send to self to test
subject = "Test SMTP Auth"
body = "This is a test to verify SMTP app password configuration."

print("Attempting to send email...")
print("Sender:", sender)
print("Password exists:", bool(password))

success = send_email(sender, password, receiver, subject, body)
print("Email sent successfully:", success)
