# TASK-012 — Refresh Token API

Version: 1.0

Priority: High

Estimated Time: 20-30 minutes

---

# Objective

Implement the Refresh Token API.

Use the existing AuthService and JWT utilities.

Do NOT implement Logout API.

Do NOT implement token blacklist.

Stop immediately after completion.

---

# Read

.ai/tasks/TASK-012.md

Inspect the current backend implementation.

---

# Endpoint

POST /api/v1/auth/refresh

---

# Request

{
    "refresh_token": "..."
}

---

# Validation

- Refresh token is required
- Verify JWT signature
- Verify token expiration
- Verify token type is "refresh"
- Verify user exists
- Verify user is active

---

# Business Logic

Use AuthService.refresh_tokens()

Never decode JWT manually inside the router.

Never access UserRepository directly.

---

# Response

HTTP 200 OK

{
    "success": true,
    "message": "Token refreshed successfully.",
    "data": {
        "access_token": "...",
        "refresh_token": "...",
        "token_type": "Bearer"
    }
}

---

# Error Responses

400 Invalid refresh token

401 Expired refresh token

403 Inactive user

---

# Requirements

Use APIRouter.

Use dependency injection.

Reuse AuthService.

No middleware.

No logout implementation.

No blacklist implementation.

---

# Tests

Create

tests/api/test_refresh.py

Test

- Valid refresh token
- Expired refresh token
- Invalid token
- Wrong token type (access token sent instead of refresh token)
- Inactive user

---

# Acceptance Criteria

✓ POST /api/v1/auth/refresh works

✓ New access token generated

✓ New refresh token generated

✓ Validation works

✓ Tests pass

✓ Ruff passes

✓ Black passes

✓ MyPy passes

Stop immediately after completion.