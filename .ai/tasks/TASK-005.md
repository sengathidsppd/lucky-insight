# TASK-005 — Security Infrastructure

## Objective

Create the security infrastructure for the application.

This task creates reusable security components only.

Do NOT implement Register API.

Do NOT implement Login API.

Do NOT implement authentication endpoints.

Stop after completion.

---

## Read First

README.md

CLAUDE.md

docs/ARCHITECTURE.md

docs/DATABASE.md

---

## Create

backend/app/security/

password.py

jwt.py

tokens.py

exceptions.py

---

## password.py

Use Argon2.

Implement

- hash_password(password: str) -> str
- verify_password(password: str, hashed: str) -> bool

---

## jwt.py

Implement

- create_access_token()
- create_refresh_token()
- decode_token()

Requirements

- python-jose
- UTC timezone
- exp
- iat
- jti
- sub
- iss
- aud

---

## tokens.py

Create Pydantic models

- TokenPayload
- TokenResponse
- AccessToken
- RefreshToken

---

## exceptions.py

Create

- InvalidTokenException
- ExpiredTokenException
- InvalidCredentialsException
- PermissionDeniedException

---

## Update Config

Add

JWT_SECRET_KEY

JWT_REFRESH_SECRET

JWT_ALGORITHM

ACCESS_TOKEN_EXPIRE_MINUTES

REFRESH_TOKEN_EXPIRE_DAYS

---

## Tests

Create

tests/security/

test_password.py

test_jwt.py

---

## Acceptance Criteria

- Password hashing works
- Password verification works
- JWT generation works
- JWT decoding works
- Tests pass
- Ruff passes
- Black passes
- MyPy passes

Stop after completion.