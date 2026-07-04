# TASK-007 — Authentication Service Layer

Version: 1.0

Priority: High

Estimated Time: 45-60 minutes

---

# Objective

Implement the Authentication Service layer.

This layer contains business logic only.

It must not depend on FastAPI routers or HTTPException.

Stop immediately after TASK-007 is complete.

---

# Read

.ai/tasks/TASK-007.md

Inspect the existing backend implementation before making changes.

---

# Create

backend/app/services/

auth_service.py

user_service.py

---

# AuthService

Implement the following methods.

register_user()

- Validate email format
- Check duplicate email
- Hash password using password.py
- Create user through UserRepository
- Return User entity

authenticate_user()

- Find user by email
- Verify password
- Reject inactive users
- Return authenticated user

generate_tokens()

- Create access token
- Create refresh token
- Return TokenResponse

refresh_tokens()

- Verify refresh token
- Issue new access token
- Issue new refresh token

change_password()

- Verify current password
- Hash new password
- Update repository

---

# UserService

Implement

get_user_by_id()

get_user_by_email()

update_profile()

activate_user()

deactivate_user()

---

# Dependencies

Use

UserRepository

Security Password

JWT Security

Settings

Logging

---

# Logging

Log

User Registered

Duplicate Email

Authentication Success

Authentication Failed

Password Changed

User Activated

User Deactivated

---

# Error Handling

Raise domain exceptions only.

Never raise HTTPException.

Never return JSON.

---

# Tests

Create

tests/services/

test_auth_service.py

test_user_service.py

Test

Successful Register

Duplicate Email

Successful Login

Wrong Password

Inactive User

Password Change

Refresh Token

---

# Requirements

Business Logic only.

No FastAPI Router.

No API.

No CRUD implementation.

No Middleware.

No HTTPException.

Use dependency injection.

Type hints everywhere.

Google-style docstrings.

---

# Acceptance Criteria

✓ AuthService implemented

✓ UserService implemented

✓ All unit tests pass

✓ Ruff passes

✓ Black passes

✓ MyPy passes

✓ No lint errors

Stop after completion.