# TASK-011 — Current User API

Version: 1.0

Priority: High

Estimated Time: 20-30 minutes

---

# Objective

Implement the authenticated Current User API.

Use the existing authentication dependency from TASK-010.

Do NOT implement profile update.

Do NOT implement admin endpoints.

Stop immediately after completion.

---

# Read

.ai/tasks/TASK-011.md

Inspect the current backend implementation.

---

# Create

backend/app/api/v1/users.py

backend/app/schemas/user.py

---

# Endpoint

GET /api/v1/users/me

---

# Authentication

Require authenticated user.

Use

get_current_active_user()

Do not decode JWT manually.

---

# Response

HTTP 200 OK

{
    "success": true,
    "message": "Current user retrieved successfully.",
    "data": {
        "id": "...",
        "email": "...",
        "first_name": "...",
        "last_name": "...",
        "is_active": true,
        "created_at": "...",
        "updated_at": "..."
    }
}

---

# Response Schema

Create

UserResponse

CurrentUserResponse

Exclude

password

hashed_password

refresh_token

internal fields

deleted_at

---

# Error Responses

401 Unauthorized

403 Inactive User

---

# Requirements

Use APIRouter.

Use dependency injection.

Reuse authentication dependency.

No database access inside router.

No repository usage inside router.

No business logic inside router.

---

# Tests

Create

tests/api/test_current_user.py

Test

- Valid JWT returns current user
- Missing token
- Invalid token
- Expired token
- Inactive user

---

# Acceptance Criteria

✓ GET /api/v1/users/me works

✓ JWT authentication works

✓ Sensitive fields are excluded

✓ Tests pass

✓ Ruff passes

✓ Black passes

✓ MyPy passes

Stop immediately after completion.