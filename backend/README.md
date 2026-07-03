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

## 1. Set up the project

Using [uv](https://docs.astral.sh/uv/) (recommended — matches CI):

```bash
uv sync
```

This creates `.venv` and installs both runtime and development
dependencies (ruff, black, mypy, pytest, httpx) from `pyproject.toml`.

Or, using a plain virtual environment:

```bash
python3.13 -m venv .venv
source .venv/bin/activate        # macOS / Linux
.venv\Scripts\activate           # Windows
pip install -r requirements.txt
```

## 2. Configure environment variables

Copy the example file and fill in real values:

```bash
cp .env.example .env
```

Set `DATABASE_URL` to point at your PostgreSQL instance, e.g.:

```
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/lucky_insight
```

All other required variables are documented in `.env.example`.

## 3. Run the application

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# or, with uv:
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/health
- Database health check: http://localhost:8000/health/database

## 4. Alembic

The migration environment is initialized and configured to read
`DATABASE_URL` from application settings — no connection string is
hardcoded in `alembic.ini`. No migrations exist yet.

```bash
alembic current       # verify Alembic can connect and read migration state
alembic revision -m "description"   # (future) create a new migration
alembic upgrade head                # (future) apply migrations
```

## 5. Run tests

```bash
pytest
# or: uv run pytest
```

## 6. Code quality

```bash
ruff check .
black --check .
mypy app tests alembic/env.py
```

(Prefix any of the above with `uv run` if using uv.)

## 7. Pre-commit hooks

A `.pre-commit-config.yaml` is provided at the repository root, running
ruff, black, and mypy on every commit (and the full test suite on
`git push`).

```bash
pip install pre-commit        # or: uv tool install pre-commit
pre-commit install            # installs the pre-commit git hook
pre-commit install --hook-type pre-push   # installs the pre-push (pytest) hook
pre-commit run --all-files    # run all hooks manually
```

## 8. Continuous Integration

`.github/workflows/backend-ci.yml` (at the repository root) runs on every
push and pull request against a real PostgreSQL 17 service container. The
pipeline: checks out the code, installs `uv`, runs `uv sync`, then runs
Ruff, Black (`--check`), MyPy, and Pytest, in that order. All four must
pass for CI to succeed.

---

## Project Structure

```
lucky-insight/
    .github/
        workflows/
            backend-ci.yml     # CI: ruff, black, mypy, pytest against Postgres
    .pre-commit-config.yaml    # Local pre-commit/pre-push hooks
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
        pyproject.toml         # Project metadata + tool config (ruff/black/mypy/uv)
        requirements.txt       # Pinned deps (pip-based alternative to uv)
        .env.example
```

See `docs/ARCHITECTURE.md` and `docs/DATABASE.md` for full architectural
and database design details.
