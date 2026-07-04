# TASK-009 — Login API

Version: 1.0

Priority: High

Estimated Time: 30-45 minutes

---

# Objective

Implement the Login API.

Use the existing AuthService.

Do NOT implement Refresh Token endpoint.

Do NOT implement Logout endpoint.

Stop after completion.

---

# Read

.ai/tasks/TASK-009.md

Inspect the current backend implementation.

---

# Endpoint

POST /api/v1/auth/login

---

# Request

email

password

---

# Validation

- Email required
- Password required

---

# Business Logic

Use AuthService.authenticate_user()

Use AuthService.generate_tokens()

---

# Response

HTTP 200 OK

{
    "success": true,
    "message": "Login successful.",
    "data": {
        "access_token": "...",
        "refresh_token": "...",
        "token_type": "Bearer"
    }
}

---

# Error

401 Invalid credentials

403 User inactive

---

# Requirements

No Refresh endpoint

No Logout

No Middleware

No Current User API

---

# Tests

Create

tests/api/test_login.py

Test

- Successful login
- Wrong password
- Unknown email
- Inactive user

---

# Acceptance

✓ Login works

✓ JWT generated

✓ Tests pass

✓ Ruff passes

✓ Black passes

✓ MyPy passes

Stop after completion.