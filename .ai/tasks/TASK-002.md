# TASK-002 — Configure PostgreSQL & Alembic

Version: 1.0

Priority: Critical

Estimated Time: 20-30 minutes

---

# Objective

Configure PostgreSQL connectivity and Alembic migration.

This task prepares the database infrastructure.

Do NOT create any tables.

Do NOT create models.

Do NOT implement CRUD.

Stop after configuration.

---

# Read First

README.md

PRD.md

CLAUDE.md

docs/ARCHITECTURE.md

docs/DATABASE.md

.ai/tasks/TASK-002.md

---

# Tech Stack

PostgreSQL 17

SQLAlchemy 2.x

Alembic

psycopg

---

# Requirements

Configure SQLAlchemy Engine

Configure Session Factory

Configure Connection Pool

Configure Base Model

Configure Alembic

Create migration environment

No tables

No models

---

# Database Engine

Requirements

Pool Size = 10

Max Overflow = 20

Pool Timeout = 30

Pool Recycle = 1800

Pool Pre Ping = True

Future=True

Echo=False

---

# Database Session

Create

get_db()

using dependency injection.

Always close session.

---

# Alembic

Initialize Alembic.

Configure env.py.

Load DATABASE_URL from environment.

Enable SQLAlchemy metadata.

Do NOT create migrations.

---

# Health Endpoint

GET

/health/database

Return

{
    "status":"ok",
    "database":"connected"
}

Return HTTP 503 if connection fails.

---

# Logging

Log

Database Connected

Database Failed

Migration Started

Migration Completed

---

# Error Handling

Catch

OperationalError

ProgrammingError

TimeoutError

Return clean API response.

---

# Tests

Create

tests/test_database.py

Verify

Database connection

Health endpoint

Session creation

---

# Do NOT

No tables

No CRUD

No authentication

No business logic

No repository implementation

---

# Acceptance Criteria

✓ PostgreSQL connected

✓ Alembic initialized

✓ Health endpoint works

✓ Tests pass

✓ Ruff passes

✓ Black passes

✓ mypy passes

Stop.