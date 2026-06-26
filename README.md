# Revenue Recovery System

## Overview

The Revenue Recovery System is a full-stack web application for managing and recovering property tax arrears. It combines a FastAPI backend, a Next.js frontend, and a PostgreSQL database to support defaulter tracking, notice generation, and AI-assisted analysis for municipal revenue operations.

The system is designed for internal use by revenue or municipal departments. It allows users to:

- view defaulters and outstanding dues,
- inspect ward-level and district-level summaries,
- generate formal tax notices,
- export notices as PDF documents,
- use an AI assistant to query the database using natural language.

## Architecture

The application is organized into three major layers:

1. Backend API
   - Built with FastAPI.
   - Exposes REST endpoints for defaulters, notices, authentication, and AI assistance.
   - Uses async SQLAlchemy with PostgreSQL.

2. Frontend Web Application
   - Built with Next.js.
   - Provides dashboards and management screens for viewing defaulters, notices, wards, and users.

3. Data and Document Services
   - PostgreSQL stores the operational data.
   - Notice generation uses LLM-based workflow integration.
   - PDF notices are rendered using HTML templates and WeasyPrint.

## Main Features

### Defaulter Management
The backend exposes endpoints to:

- retrieve a single defaulter by property ID,
- list defaulters with optional ward filtering,
- view top defaulters by outstanding balance,
- get ward-level aggregation summaries.

### Notice Generation
The system supports:

- streaming notice generation through the API,
- saving generated notices as text files,
- converting saved notices to PDF format,
- sending notice content by email.

### AI Assistant
The AI module uses LangGraph and an LLM provider to allow natural language querying of the database. It can answer questions about defaulter data and provide insights based on the available PostgreSQL tables.

### Authentication
The application includes authentication endpoints for login, user creation, password recovery, and user removal.

## Technology Stack

### Backend
- Python 3
- FastAPI
- SQLAlchemy (async)
- PostgreSQL
- Pydantic
- LangChain / LangGraph
- WeasyPrint
- Jinja2

### Frontend
- Next.js
- React
- Recharts
- Framer Motion
- Lucide React

### Infrastructure
- Docker
- Docker Compose

## Project Structure

```text
app/                 # FastAPI backend application
  database.py        # Async database configuration
  main.py            # Application entry point
  notice_generator.py # Notice generation logic
  routers/           # API route modules
  services/          # Business logic and integrations
frontend/            # Next.js frontend application
notices/             # Generated notice text files
sql/                 # SQL scripts and database helpers
docs/                # API documentation and developer notes
docker-compose.yml   # Multi-service container orchestration
Dockerfile           # Backend container definition
frontend/Dockerfile  # Frontend container definition
requirements.txt     # Python dependencies
```

## Prerequisites

Before running the project, ensure that the following are installed:

- Python 3.10 or newer
- Node.js 18 or newer
- Docker and Docker Compose
- PostgreSQL (if running outside Docker)

## Environment Variables

Create a `.env` file in the project root with the required environment variables.

Example:

```env
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/postgres
AI_AGENT_DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/postgres

# Optional LLM credentials
Google_AI_Studio=your_gemini_api_key
# or
GROQ_API_KEY=your_groq_api_key
```

The backend uses these variables for:

- database access,
- AI agent initialization,
- LLM-based notice generation and natural language analysis.

## Running Locally

### 1. Backend Setup

Install Python dependencies:

```bash
pip install -r requirements.txt
```

Start the FastAPI server:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at:

- http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- Redoc: http://localhost:8000/redoc

### 2. Frontend Setup

Install frontend dependencies:

```bash
cd frontend
npm install
```

Start the Next.js development server:

```bash
npm run dev
```

The frontend will be available at:

- http://localhost:3000

## Running with Docker Compose

The project includes Docker support for the full stack.

From the project root, run:

```bash
docker compose up --build
```

This starts:

- PostgreSQL on port 5432
- Backend API on port 8000
- Frontend on port 3000

To stop the services:

```bash
docker compose down
```

## API Summary

### Health Check
- GET /health

### Defaulters
- GET /defaulters
- GET /defaulters/{property_id}
- GET /defaulters/top
- GET /defaulters/summary/ward

### Notices
- POST /notices/generate
- GET /notices/list
- GET /notices/{property_id}/content
- GET /notices/{property_id}/pdf
- POST /notices/send-email

### Authentication
- POST /auth/login
- GET /auth/users
- POST /auth/users/add
- POST /auth/users/remove
- POST /auth/users/recover-password

## Database Notes

The application uses PostgreSQL and executes SQL directly through SQLAlchemy. The data layer is intentionally lightweight and does not rely on an ORM abstraction for the core query paths.

The SQL scripts in the sql/ directory include helpers for materialized views and database triggers used by the reporting and aggregation logic.

## Notice Generation Flow

The notice generation workflow is as follows:

1. The backend fetches the defaulter record from the database.
2. The notice content is generated using the configured LLM provider.
3. The generated text is streamed to the client or saved to the notices directory.
4. The content can be rendered into a PDF for download or delivery.

## Development Notes

- The backend is configured for CORS to allow frontend access during development.
- AI initialization is attempted during application startup; if configuration is missing, the app still starts but AI features may be unavailable.
- Generated notice text files are stored under the notices/ directory.

## License

This project currently does not include a published license file. If you plan to distribute or reuse it, add an appropriate license before deployment.
