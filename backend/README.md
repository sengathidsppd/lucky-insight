# Lucky Insight — Backend

FastAPI backend foundation for the Lucky Insight application.

This is the Sprint 1 project skeleton (TASK-001 + TASK-002). It contains
no authentication, business logic, or database models yet — only the
application foundation, database/Alembic configuration, and health check
endpoints.

---

## Requirements

- Python 3.13
- PostgreSQL 17 (a local PostgreSQL server, e.g. via Docker or a native
  install, is required to exercise the database health endpoint)

---

## 1. Create a virtual environment

```bash
python3.13 -m venv .venv
source .venv/bin/activate        # macOS / Linux
.venv\Scripts\activate           # Windows
```

## 2. Install dependencies

```bash
pip install -r requirements.txt
```

## 3. Configure environment variables

Copy the example file and fill in real values:

```bash
cp .env.example .env
```

Set `DATABASE_URL` to point at your PostgreSQL instance, e.g.:

```
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/lucky_insight
```

All other required variables are documented in `.env.example`.

## 4. Run the application

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/health
- Database health check: http://localhost:8000/health/database

## 5. Alembic

The migration environment is initialized and configured to read
`DATABASE_URL` from application settings — no connection string is
hardcoded in `alembic.ini`. No migrations exist yet.

```bash
alembic current       # verify Alembic can connect and read migration state
alembic revision -m "description"   # (future) create a new migration
alembic upgrade head                # (future) apply migrations
```

## 6. Run tests

```bash
pytest
```

## 7. Code quality

```bash
ruff check .
black --check .
mypy app
```

---

## Project Structure

```
backend/
    app/
        api/            # API routers (presentation layer)
        core/            # Config, database, logging
        middleware/       # Custom middleware
        dependencies/     # FastAPI dependencies
        repositories/     # Data access layer
        services/         # Business logic layer
        models/            # SQLAlchemy ORM models
        schemas/           # Pydantic schemas
        utils/              # Shared utilities
        main.py            # Application entrypoint
    tests/
    alembic/               # Migration environment (no migrations yet)
    alembic.ini
    requirements.txt
    .env.example
```

See `docs/ARCHITECTURE.md` and `docs/DATABASE.md` for full architectural
and database design details.

