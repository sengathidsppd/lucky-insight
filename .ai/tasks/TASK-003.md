# TASK-003 — Base Models & User Entity

Version: 1.0

Priority: Critical

Estimated Time: 30-45 minutes

---

# Objective

Create the core SQLAlchemy models that every entity in the system will inherit from.

Do NOT implement authentication.

Do NOT create API endpoints.

Do NOT implement CRUD.

---

# Read First

README.md

PRD.md

CLAUDE.md

docs/ARCHITECTURE.md

docs/DATABASE.md

---

# Create

backend/app/models/

base.py

mixins.py

user.py

---

# Base Model

Create Declarative Base

Every model must inherit from Base.

---

# Timestamp Mixin

Include

created_at

updated_at

Automatically populate values.

Timezone aware.

UTC only.

---

# Soft Delete Mixin

deleted_at

Never hard delete records.

---

# UUID Mixin

Primary key

UUID

Default generated automatically.

Use PostgreSQL UUID type.

---

# BaseEntity

Every table inherits

UUIDMixin

TimestampMixin

SoftDeleteMixin

---

# User Model

Table

users

Columns

id

email

password_hash

is_active

is_verified

last_login_at

created_at

updated_at

deleted_at

---

# Constraints

email UNIQUE

email indexed

password_hash NOT NULL

---

# Validation

Email format

Maximum email length = 255

Password hash cannot be empty.

---

# __repr__

Provide readable __repr__ implementation.

---

# Metadata

Use naming convention from DATABASE.md.

---

# Tests

Create

tests/test_user_model.py

Verify

UUID generated

created_at populated

email unique

soft delete column exists

---

# Do NOT

No JWT

No Login

No Register

No CRUD

No API

---

# Acceptance Criteria

✓ Base model reusable

✓ User model created

✓ UUID works

✓ Timestamps work

✓ Tests pass

✓ Ruff passes

✓ mypy passes

Stop.