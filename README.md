# Lucky Insight — Backend

FastAPI backend foundation for the Lucky Insight application.

This is the Sprint 1 / TASK-001 project skeleton. It contains no
authentication, business logic, or database models yet — only the
application foundation and a health check endpoint.

---

## Requirements

- Python 3.13
- PostgreSQL (for later tasks; not required to run this foundation)

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

Required variables are documented in `.env.example`.

## 4. Run the application

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/health

## 5. Run tests

```bash
pytest
```

## 6. Code quality

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
    alembic/
    requirements.txt
    .env.example
```

See `docs/ARCHITECTURE.md` and `docs/DATABASE.md` for full architectural
and database design details.
