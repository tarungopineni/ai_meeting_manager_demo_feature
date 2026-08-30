<p align="center">
  <h1 align="center">AI Meeting Manager</h1>
  <p align="center">
    An AI-powered employee meeting and task management platform with role-based access control, automated meeting intelligence, and workflow automation.
  </p>
</p>

---

## Table of Contents
- [Try the Live Demo](#try-the-live-demo)
- [Introduction](#introduction)
- [Abstract](#abstract)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Installation and Usage](#installation-and-usage)
- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Demo Mode](#demo-mode)
- [Preview](#preview)
- [Future Improvements](#future-improvements)

---

# Try the Live Demo

> **Recruiters and evaluators can explore the complete application without creating an account.**

### Live Application

**[Open the AI Meeting Manager](YOUR_VERCEL_URL_HERE)**

### How to use the Demo

1. Open the deployed application.
2. On the login page, click **Try Demo**.
3. A temporary authenticated demo session will be created automatically.
4. The demo initially opens with the **Manager** role.
5. Use the role-switching functionality to explore:
   - **Manager** — management-level functionality
   - **Coordinator** — coordination and task-management functionality
   - **Employee** — employee-level functionality and assigned tasks
6. Explore meetings, employees, tasks, dashboards, task assignment, verification workflows, and other available features.

No registration or real account is required.

The demo runs through the actual backend and authentication flow rather than using a frontend-only mock.

---

## Introduction

<p align="left">
<b>AI Meeting Manager</b> is a full-stack employee management and meeting intelligence platform designed to convert meeting discussions into actionable work.

The platform combines <b>AI-powered meeting processing</b>, <b>automated task creation</b>, <b>role-based access control (RBAC)</b>, and <b>employee workflow management</b> into a single system. The primary focus of the implementation is the <b>backend architecture</b>, including REST APIs, authentication, authorization, database design, migrations, AI integrations, and secure data access.
</p>

---

## Abstract

<p align="left">
Traditional meeting management often leaves important decisions and action items scattered across conversations, notes, and messages. This makes it difficult to track responsibilities, deadlines, and task completion.

<b>AI Meeting Manager</b> addresses this problem by processing meeting recordings, generating transcripts, analyzing meeting content using AI, and converting identified action items into structured tasks assigned to appropriate employees.

The platform provides separate experiences for Managers, Coordinators, and Employees through a centralized <b>RBAC-based authorization system</b>. Managers can oversee teams and verify work, Coordinators can manage operational workflows, and Employees can access and complete their assigned tasks.

The system is built as a real full-stack application with a FastAPI backend, PostgreSQL database, JWT authentication, SQLAlchemy ORM, Alembic migrations, and AI integrations.
</p>

---

## Key Features

### AI-Powered Meeting Intelligence
- Meeting audio transcription using **Whisper**
- AI-assisted analysis of meeting discussions
- Extraction of actionable tasks from meeting content
- Automated conversion of meeting outcomes into structured tasks

### Task Management
- Create and assign tasks to employees
- Track task status and deadlines
- Task priority management
- Employee task completion workflow
- Manager task verification workflow

### Role-Based Access Control
The application provides different functionality based on user roles:

| Role | Main Responsibilities |
|---|---|
| **Manager** | Team oversight, task verification, employee management, dashboards |
| **Coordinator** | Meeting/task coordination and operational workflows |
| **Employee** | View assigned tasks, update task status, complete assigned work |

### Authentication & Authorization
- JWT-based authentication
- Secure password hashing
- Protected API endpoints
- Role-based authorization
- User account management

### Database & Backend
- PostgreSQL database
- SQLAlchemy ORM
- Alembic database migrations
- Structured REST API architecture
- Backend validation and error handling

### Demo Mode
- Recruiter-friendly **Try Demo** workflow
- No registration required
- Temporary authenticated demo sessions
- Manager, Coordinator, and Employee role exploration
- Session-level demo data isolation
- Real backend authorization and database interaction

---

## Technology Stack

| Technology | Purpose |
|---|---|
| **Python** | Backend development |
| **FastAPI** | REST API framework |
| **PostgreSQL** | Relational database |
| **SQLAlchemy** | ORM and database interaction |
| **Alembic** | Database migrations |
| **JWT** | Authentication |
| **RBAC** | Authorization and access control |
| **Whisper** | Meeting transcription |
| **OpenAI / LLM APIs** | Meeting analysis and task intelligence |
| **React** | Frontend application |
| **TypeScript** | Frontend development |
| **Vite** | Frontend build tooling |
| **Vercel** | Frontend deployment |
| **Render** | Backend deployment |
| **Neon** | Managed PostgreSQL hosting |
| **Git / GitHub** | Version control and source management |

---

## Installation and Usage

### Step 1: Clone the repository

```bash
git clone https://github.com/tarungopineni/ai-meeting-manager.git
cd ai-meeting-manager
```

### Step 2: Create and activate a virtual environment

For Windows:

```bash
python -m venv venv
venv\Scripts\activate
```

For Linux/Mac:

```bash
python -m venv venv
source venv/bin/activate
```

### Step 3: Install backend dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Configure environment variables

Create a `.env` file and configure the required backend variables, including the database connection, authentication secret, and AI service credentials.

Do not commit `.env` files or API keys to GitHub.

### Step 5: Run database migrations

```bash
alembic upgrade head
```

### Step 6: Start the backend

```bash
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8001
```

The backend API will be available at:

```text
http://127.0.0.1:8001
```

FastAPI's interactive Swagger documentation is available at:

```text
http://127.0.0.1:8001/docs
```

### Step 7: Run the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5173
```

---

## How It Works

1. **User Authentication** — Users authenticate through the FastAPI backend using JWT-based authentication.
2. **Role Identification** — The backend identifies the authenticated user's role and applies the appropriate authorization rules.
3. **Meeting Processing** — Meeting recordings can be processed to generate transcripts using Whisper.
4. **AI Analysis** — Meeting content is analyzed to identify important discussions, action items, and potential tasks.
5. **Task Generation** — Extracted action items can be converted into structured tasks.
6. **Task Assignment** — Tasks are assigned to the appropriate employees.
7. **Employee Workflow** — Employees can view and update their assigned tasks.
8. **Manager Verification** — Managers can review and verify completed tasks.
9. **Database Persistence** — Users, meetings, tasks, and related information are persisted in PostgreSQL.
10. **Access Control** — Backend authorization ensures users can only perform operations permitted by their role.

---

## Architecture

```text
                         React + TypeScript
                                |
                                v
                             Vercel
                                |
                           HTTPS / REST
                                |
                                v
                        FastAPI Backend
                                |
              +-----------------+------------------+
              |                 |                  |
              v                 v                  v
        JWT Authentication     RBAC          AI Integrations
              |                 |                  |
              |                 |          +-------+-------+
              |                 |          |               |
              |                 |       Whisper          LLM APIs
              |                 |          |               |
              +-----------------+----------+---------------+
                                |
                                v
                           SQLAlchemy
                                |
                                v
                           PostgreSQL
                                |
                                v
                              Neon
```

---

## Demo Mode

The application includes a dedicated **Demo Mode** designed for recruiters and evaluators.

### Demo Authentication

The demo can be started through:

```text
POST /auth/demo
```

The backend creates an authenticated temporary demo session so protected application functionality can be explored without registering a real account.

### Demo Role Switching

The initial demo experience starts with the Manager role:

```text
                    Demo Manager
                         |
             +-----------+-----------+
             |                       |
       Demo Coordinator        Demo Employee
```

The recruiter can switch between the three roles to understand how RBAC changes the application's available functionality.

### Demo Data Isolation

Demo records are associated with a specific demo session.

Backend data access follows an isolation rule equivalent to:

```text
is_demo == True
AND
demo_session_id == current_demo_session_id
```

This prevents one demo session from accessing another session's demo records.

The demo implementation was specifically tested against:

- Direct ID-based attacks
- Cross-session data leakage
- Unauthorized access to another demo session's records
- Access through manipulated record IDs
- Active demo-session deletion vulnerabilities

This means Demo Mode is not a frontend mock. It uses the application's real authentication, authorization, API, and database-access mechanisms while keeping demo data isolated.

---

## Preview

Screenshots and additional visuals of the application can be added here.

```text
Add project screenshots here:
- Login / Try Demo
- Manager Dashboard
- Coordinator Dashboard
- Employee Dashboard
- Meetings
- Task Management
- Verification Queue
- Employee Management
```

---

## Future Improvements

The current release is the first version of the platform. Future development is planned around expanding its meeting intelligence and workflow capabilities.

Potential improvements include:

1. More advanced meeting intelligence and contextual analysis.
2. Improved task-management workflows and automation.
3. More sophisticated task prioritization and dependency handling.
4. Enhanced meeting summaries and action-item extraction.
5. Improved analytics and employee performance insights.
6. A richer and more polished user experience.
7. Additional AI-powered productivity features.
8. More advanced notification and collaboration workflows.

---

## Project Focus

A major focus of this project was building a reliable **backend architecture** rather than only creating a visual frontend.

The backend implementation covers:

- REST API development with FastAPI
- PostgreSQL database design
- SQLAlchemy ORM
- Alembic migrations
- JWT authentication
- RBAC authorization
- Secure API access
- AI/LLM integration
- Whisper integration
- Automated meeting-to-task workflows
- Demo-session isolation
- Production deployment

The project demonstrates the complete flow from **AI-powered meeting processing to structured employee task management** in a deployable full-stack application.
