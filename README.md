# AI Bug Triage System

An enterprise-grade, modern, full-stack platform that uses Artificial Intelligence to triage software bugs, analyze root causes, generate automated code patches with visual diffs, classify incident severities (P0–P4), and intelligently route bugs to specialized development teams.

---

## 🌟 Key Features

### 1. Enterprise SaaS User Experience
- **Theme System**: Dark Navy & Blue palette with subtle purple gradients (`#0B0F19`, `#0F172A`, `#3B82F6`, `#8B5CF6`) and instant Dark/Light mode toggle.
- **Responsive Layout**: Designed for high-density desktop displays, tablets, and mobile devices.
- **Monaco Code Editor**: Code snippet input and side-by-side or inline code diff visualization (`monaco.editor.createDiffEditor`).
- **Interactive Visualizations**: Real-time charts powered by Chart.js for Severity Distribution, Bug Lifecycle States, Ingestion Timelines, and Team Allocations.
- **Notification Drawer & Toast Alerts**: In-app notifications with unread counts and toast feedback.

### 2. Role-Based Access Control (RBAC) & Authentication
Secure JWT authentication with bcrypt-hashed passwords and backend-enforced authorization across three user personas:
- **Admin**: System configuration, user and role management, routing rules, system audit logs, and AI evaluation metrics.
- **Bug Reporter**: Guided bug submission with Monaco editor, log/screenshot uploads, status lifecycle tracking, and comment threads.
- **Developer**: Assigned bug workspace, AI root-cause analysis, visual code patch diffs, test recommendations, status transitions, and resolution notes.

### 3. AI Bug Triage & Root Cause Intelligence
Structured AI triage engine supporting Google Gemini, OpenAI GPT-4o, and an offline Heuristic Engine (Demo AI Mode):
- **A. Plain-English Summary**: Crystal-clear problem explanation.
- **B. Bug Classification**: Runtime Error, Syntax Error, Database Error, Security Vulnerability, Memory Error, Performance Issue, API Error, etc.
- **C. Root Cause Analysis**: Suspected cause, relevant code lines, trigger conditions, and hypothesis vs confirmed labels.
- **D. Severity Classification**: Strict P0 (Critical), P1 (High), P2 (Medium), P3 (Low), and P4 (Informational) with evidence and manual override audit logs.
- **E. Solution & Code Diff**: Step-by-step debugging instructions, fix rationale, Monaco side-by-side diff view, copyable patches, and suggested unit/regression tests.
- **F. Automated Development Team Routing**: Intelligent routing to 8 specialized engineering teams based on taxonomy and keyword markers.

---

## 👥 Demo Accounts (Development Mode)

For testing and grading, pre-seeded accounts are provided with 1-click fill buttons on the login screen:

| Role | Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@bugtriage.io` | `AdminPass123!` | User management, audit logs, team configuration, global bug management |
| **Bug Reporter** | `reporter@bugtriage.io` | `ReporterPass123!` | Create bug reports, upload attachments, track triage progress |
| **Developer** | `dev@bugtriage.io` | `DevPass123!` | Inspect root causes, review code diffs, transition bug status, post fixes |

---

## 🏗️ Technology Stack

- **Backend**: Python 3.12+ / 3.15, FastAPI, Uvicorn, SQLAlchemy 2.0, Pydantic v2.
- **Database**: SQLite (zero-config local) / PostgreSQL (production connection string via `DATABASE_URL`).
- **AI Integration**: Google Gemini API, OpenAI API, and automated Heuristic Engine.
- **Frontend**: HTML5, Vanilla JavaScript (ES6+), CSS3 Design System with CSS variables.
- **Code Editor**: Microsoft Monaco Editor.
- **Charts**: Chart.js.
- **Security**: PyJWT, Bcrypt password hashing, secure file validation, prompt injection sanitization.

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+ installed
- Git

### 2. Environment Setup
```bash
# Clone or navigate to the repository
cd "AI Bug Triage System"

# Activate the virtual environment
.\venv\Scripts\activate      # Windows PowerShell / CMD
# or: source venv/bin/activate  # macOS / Linux

# Install dependencies (if setting up fresh)
pip install -r requirements.txt
```

### 3. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default configuration runs SQLite and Demo AI Mode out-of-the-box. To enable live LLM integration, add your Gemini or OpenAI API key:
```env
GEMINI_API_KEY=your_gemini_api_key_here
# or
OPENAI_API_KEY=your_openai_api_key_here
```

### 4. Run the Application
Start the FastAPI server:
```bash
# Using Python directly:
python -m backend.app.main

# Or on Windows, double-click run.bat
```
The server will initialize the database, seed demo users and sample bugs, and start serving at:
👉 **http://127.0.0.1:8000**

Interactive Swagger API Documentation:
👉 **http://127.0.0.1:8000/docs**

---

## 🧪 Running Automated Tests

Run the backend integration test suite with `pytest`:
```bash
python -m pytest -v backend/tests/test_api.py
```
Test suite verifies:
- API health and startup lifecycles
- Role authentication and role mismatch rejections
- Bug creation and automated AI triage execution
- Severity classification and code diff generation
- Metrics and charts data generation

---

## 🛡️ Security Architecture

1. **Role-Based Authorization**: Every sensitive API route enforces user roles via FastAPI dependencies (`require_role(["admin", "developer"])`).
2. **Untrusted Code Handling**: Code snippets and stack traces are analyzed textually and never executed dynamically.
3. **Prompt Injection Sanitization**: Input fields are sanitized to filter out adversarial prompt injection payloads.
4. **File Upload Restrictions**: Only safe text-based code, log, and screenshot extensions are accepted; executable formats (`.exe`, `.bat`, `.sh`, `.dll`) are strictly blocked.
5. **Audit Trail**: High-impact actions (severity overrides, team reassignments, status transitions) are recorded in the `audit_logs` table with user attribution and timestamps.

---

## 📦 Production Deployment

### Docker Deployment
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### PostgreSQL Migration
To use PostgreSQL in production, set the environment variable:
```env
DATABASE_URL=postgresql://user:password@postgres-host:5432/bug_triage_db
```
SQLAlchemy will automatically configure the connection pool and create schemas.
