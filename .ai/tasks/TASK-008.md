# TASK-008 — Register API

Version: 1.0

Priority: High

Estimated Time: 30-45 minutes

---

# Objective

Implement the user registration API.

Use the existing AuthService created in TASK-007.

Do NOT implement Login API.

Do NOT implement Refresh Token API.

Stop immediately after TASK-008 is complete.

---

# Read

.ai/tasks/TASK-008.md

Inspect the current backend implementation before making changes.

---

# Create

backend/app/api/v1/auth.py

backend/app/schemas/auth.py

---

# Endpoint

POST /api/v1/auth/register

---

# Request

email

password

confirm_password

first_name

last_name

---

# Validation

- Valid email
- Password length >= 8
- Password confirmation must match
- Duplicate email not allowed

---

# Business Logic

Use AuthService.register_user()

Never access UserRepository directly.

---

# Response

HTTP 201 Created

Example

{
  "success": true,
  "message": "User registered successfully.",
  "data": {
      "id": "...",
      "email": "...",
      "first_name": "...",
      "last_name": "...",
      "is_active": true
  }
}

---

# Error Responses

400 Validation Error

409 Email Already Exists

---

# Requirements

Use APIRouter.

Use dependency injection.

No JWT.

No Login.

No Refresh Token.

No Middleware.

---

# Tests

Create

tests/api/

test_register.py

Test

- Successful registration
- Duplicate email
- Invalid email
- Password mismatch
- Weak password

---

# Acceptance Criteria

✓ POST /api/v1/auth/register works

✓ Returns HTTP 201

✓ Validation works

✓ Duplicate email handled

✓ Tests pass

✓ Ruff passes

✓ Black passes

✓ MyPy passes

Stop after completion.