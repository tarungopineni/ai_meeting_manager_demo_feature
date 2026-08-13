example_transcript = '''Rahul (Project Manager):

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
team_members = [
    {
        "id": 1,
        "name": "John"
    },
    {
        "id": 2,
        "name": "Priya"
    },
    {
        "id": 3,
        "name": "Anita"
    },
    {
        "id": 4,
        "name": "Arun"
    }
]

content = """{
  "summary": "The team reviewed progress on the employee management system. John will complete RBAC and deploy the authentication service to staging by Friday, after which analytics API development will begin. Priya will test the authentication service after deployment and complete testing by Monday. Rahul will obtain finalized leave management requirements, while Arun will prepare a database scaling proposal due to storage utilization concerns. Analytics APIs were designated as the highest priority after authentication work.",
  "participants": [
    {
      "name": "Rahul",
      "role": "Project Manager"
    },
    {
      "name": "John",
      "role": "Backend Developer"
    },
    {
      "name": "Priya",
      "role": "QA Engineer"
    },
    {
      "name": "Anita",
      "role": "Frontend Developer"
    },
    {
      "name": "Arun",
      "role": "DevOps Engineer"
    }
  ],
  "decisions": [
    "Analytics APIs become the highest priority after authentication."
  ],
  "risks": [
    {
      "description": "Database utilization is already at 82% and may hit storage limits within six to eight weeks.",
      "owner": "Arun"
    },
    {
      "description": "Final leave management requirements from the product team are not yet available and are blocking dependent dashboard work.",
      "owner": "Priya"
    }
  ],
  "tasks": [
  {
    "title": "Complete RBAC implementation",
    "description": "Implement role-based access control for the authentication service.",
    "priority": "HIGH",
    "completed": false,
    "manager_id": 10,
    "assignee_id": 11,
    "deadline": "2026-07-08T23:59:59",
    "deadline_text": "by Friday"
  },
  {
    "title": "Deploy authentication service to staging",
    "description": "Deploy the authentication service to the staging environment after RBAC completion.",
    "priority": "HIGH",
    "completed": false,
    "manager_id": 10,
    "assignee_id": 11,
    "deadline": "2026-07-08T18:00:00",
    "deadline_text": "Friday evening"
  },
  {
    "title": "Complete authentication testing",
    "description": "Test the authentication service after deployment and complete validation.",
    "priority": "MEDIUM",
    "completed": false,
    "manager_id": 10,
    "assignee_id": 12,
    "deadline": "2026-07-08T23:59:59",
    "deadline_text": "by Monday"
  },
  {
    "title": "Obtain finalized leave management requirements",
    "description": "Coordinate with the product manager and obtain the finalized leave management requirements document.",
    "priority": "MEDIUM",
    "completed": false,
    "manager_id": 10,
    "assignee_id": 10,
    "deadline": "2026-07-08T15:00:00",
    "deadline_text": "by tomorrow afternoon"
  },
  {
    "title": "Start analytics API development",
    "description": "Begin development of analytics APIs after authentication deployment.",
    "priority": "HIGH",
    "completed": false,
    "manager_id": 10,
    "assignee_id": 11,
    "deadline": null,
    "deadline_text": null
  },
  {
    "title": "Prepare database scaling proposal",
    "description": "Create and share a database scaling proposal to address future storage growth.",
    "priority": "MEDIUM",
    "completed": false,
    "manager_id": 10,
    "assignee_id": 14,
    "deadline": "2026-07-08T00:00:00",
    "deadline_text": "before Wednesday"
  }
]
}
"""