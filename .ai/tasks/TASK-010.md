# TASK-010 — Authentication Dependency

Version: 1.0

Priority: High

Estimated Time: 20-30 minutes

---

# Objective

Implement reusable authentication dependencies for FastAPI.

This task adds authentication dependency injection only.

Do NOT create Current User API.

Do NOT create Logout.

Do NOT create Refresh endpoint.

Stop after completion.

---

# Read

.ai/tasks/TASK-010.md

Inspect the existing backend.

---

# Create

backend/app/api/dependencies/auth.py

---

# Implement

get_current_user()

- Read Bearer token
- Decode JWT
- Validate signature
- Validate expiration
- Validate user exists
- Return User entity

---

get_current_active_user()

- Reuse get_current_user()
- Reject inactive users

---

optional_current_user()

- Return User if token exists
- Return None if no token

---

# Use

OAuth2PasswordBearer

Dependency Injection

Existing AuthService

Existing JWT utilities

---

# Error Handling

Use domain exceptions.

Convert to HTTP responses only in dependency layer.

---

# Tests

tests/api/test_auth_dependency.py

Test

- Valid JWT
- Invalid JWT
- Expired JWT
- Missing JWT
- Inactive User

---

# Acceptance

✓ Authentication dependency works

✓ Tests pass

✓ Ruff passes

✓ Black passes

✓ MyPy passes

Stop.