# TASK-006 — User Repository

Version: 1.0

Priority: High

Estimated Time: 30-45 minutes

---

# Objective

Implement the User Repository layer following the Repository Pattern.

This task creates the data access layer only.

Do NOT implement authentication endpoints.

Do NOT implement business logic.

Do NOT implement services.

Stop after completion.

---

# Read First

.ai/tasks/TASK-006.md

Inspect the current backend source code before making changes.

---

# Create

backend/app/repositories/

base_repository.py

user_repository.py

---

# Base Repository

Implement a reusable generic repository.

Support generic SQLAlchemy models.

Include

- get_by_id()
- get_all()
- create()
- update()
- soft_delete()
- exists()
- count()

Use Async SQLAlchemy session if the project already uses async.

Otherwise continue using the existing sync implementation.

Never commit transactions inside repository methods unless project convention already requires it.

---

# User Repository

Implement

get_by_email(email)

email_exists(email)

create_user(user)

update_last_login(user_id)

activate(user_id)

deactivate(user_id)

---

# Error Handling

Raise domain exceptions.

Never expose SQLAlchemy exceptions directly.

---

# Logging

Log

Create User

Update User

Soft Delete User

Database Errors

---

# Tests

Create

tests/repositories/

test_user_repository.py

Verify

Create User

Find by Email

Duplicate Email

Soft Delete

Exists

Count

---

# Requirements

Type hints everywhere.

Google style docstrings.

Repository Pattern only.

No API.

No Service.

No JWT.

No Authentication.

No Business Logic.

---

# Acceptance Criteria

✓ User repository implemented

✓ Generic repository reusable

✓ Tests pass

✓ Ruff passes

✓ Black passes

✓ MyPy passes

Stop immediately after completion.