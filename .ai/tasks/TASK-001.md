# TASK-001 — Initialize Backend Foundation

Version: 1.0

Priority: Critical

Estimated Time: 15-20 minutes

---

# Objective

Create the production-ready backend foundation for Lucky Insight.

This task creates only the project skeleton.

Do NOT implement authentication.

Do NOT implement business logic.

Do NOT implement database models.

Stop after foundation is complete.

---

# Read First

Before coding, read:

README.md

PRD.md

CLAUDE.md

docs/ARCHITECTURE.md

docs/DATABASE.md

---

# Tech Stack

Python 3.13

FastAPI

SQLAlchemy 2.x

Alembic

Pydantic v2

python-dotenv

uvicorn

psycopg

---

# Create Folder Structure

backend/

    app/

        api/

            __init__.py

        core/

            __init__.py

            config.py

            database.py

            logging.py

        middleware/

            __init__.py

        dependencies/

            __init__.py

        repositories/

            __init__.py

        services/

            __init__.py

        models/

            __init__.py

        schemas/

            __init__.py

        utils/

            __init__.py

        main.py

    tests/

    alembic/

    requirements.txt

    .env.example

    .gitignore

    README.md

---

# Create requirements.txt

Include latest stable versions of

fastapi

uvicorn

sqlalchemy

alembic

psycopg[binary]

python-dotenv

pydantic

pydantic-settings

argon2-cffi

python-jose

email-validator

pytest

httpx

ruff

black

mypy

---

# Environment Variables

Create

.env.example

Include

APP_NAME=

APP_ENV=

APP_HOST=

APP_PORT=

DEBUG=

DATABASE_URL=

JWT_SECRET=

JWT_ALGORITHM=

ACCESS_TOKEN_EXPIRE_MINUTES=

LOG_LEVEL=

---

# Config

Create

core/config.py

Requirements

Use Pydantic Settings

Load .env automatically

Provide singleton settings object

Never hardcode values

---

# Database

Create

core/database.py

Requirements

Create SQLAlchemy Engine

Create SessionLocal

Create Base class

Do NOT create tables

No business logic

---

# Logging

Create

core/logging.py

Requirements

Structured logging

INFO default

Readable format

Console output

---

# FastAPI App

Create

main.py

Requirements

Create FastAPI app

Title

Lucky Insight API

Version

1.0.0

Enable Swagger

Enable ReDoc

Register startup event

Register shutdown event

Include Health Router

No authentication yet

---

# Health Endpoint

GET /health

Response

{
    "status":"ok",
    "version":"1.0.0"
}

HTTP 200

---

# README

backend/README.md

Explain

How to install

How to create venv

How to install dependencies

How to run

How to run tests

---

# Code Quality

Must satisfy

Black

Ruff

mypy

No warnings

No TODO

No print()

Use logging

---

# Do NOT

Do not implement User model

Do not implement Login

Do not implement JWT

Do not implement CRUD

Do not implement Alembic migration

Do not create tables

Do not create APIs except /health

---

# Acceptance Criteria

Application starts successfully

Swagger UI available

ReDoc available

GET /health returns HTTP 200

Environment variables loaded

Project structure matches Architecture.md

No lint issues

Ready for TASK-002

---

# Definition of Done

Backend foundation completed.

Stop immediately after completion.

Wait for TASK-002.