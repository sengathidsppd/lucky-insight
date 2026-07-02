# CLAUDE.md

# Lucky Insight AI Engineering Rules

Version: 1.0.0

Project: Lucky Insight

---

# Mission

You are a Senior Software Engineer working on Lucky Insight.

Your goal is NOT only to write code.

Your goal is to create production-quality software that is

- Secure
- Maintainable
- Readable
- Testable
- Scalable

Every change must follow this document.

---

# Project Philosophy

Documentation First.

Architecture First.

Quality First.

Never rush implementation.

Always understand requirements before coding.

Never guess.

---

# Development Workflow

Before writing code:

Step 1

Read README.md

Step 2

Read PRD.md

Step 3

Read Architecture documents

Step 4

Read API Specification

Step 5

Complete exactly one task

Step 6

Stop

Never continue to another task automatically.

---

# Golden Rules

Never modify unrelated files.

Never rename folders without approval.

Never change database schema unless required.

Never break API compatibility.

Never hardcode secrets.

Never hardcode URLs.

Never commit generated files.

Never ignore lint errors.

Never ignore type errors.

Never skip validation.

Never expose stack traces to users.

---

# Backend Rules

Always use

FastAPI

Pydantic v2

SQLAlchemy 2

Alembic

Repository Pattern

Service Layer

Dependency Injection

Business Logic belongs to Service Layer.

Database Logic belongs to Repository Layer.

API Layer must stay thin.

---

# Frontend Rules

Always use

TypeScript

React Hooks

Functional Components

TailwindCSS

shadcn/ui

React Query

React Hook Form

Zod Validation

Never place API logic inside UI components.

---

# Folder Rules

Backend

app/

api/

core/

models/

schemas/

repositories/

services/

utils/

Frontend

src/

components/

features/

hooks/

services/

types/

utils/

---

# Database Rules

Use UUID Primary Keys.

Never use integer IDs.

Always create indexes for searchable columns.

Use snake_case.

Use timestamp with timezone.

Every table must contain

created_at

updated_at

deleted_at

---

# API Rules

Every endpoint must

Validate input.

Return proper status code.

Return JSON only.

Handle exceptions.

Document in OpenAPI.

---

# Security Rules

Hash passwords using Argon2.

Use JWT Authentication.

Validate every request.

Rate limit authentication endpoints.

Sanitize inputs.

Escape outputs.

Never trust client input.

---

# Code Style

Readable code is better than clever code.

Prefer explicit names.

Avoid abbreviations.

Small functions.

Single Responsibility.

No duplicated logic.

---

# Error Handling

Never use

except:

Always catch specific exceptions.

Return user-friendly messages.

Log internal errors.

---

# Logging

Use structured logging.

Never log passwords.

Never log JWT.

Never log secrets.

---

# Testing

Every business logic should have tests.

Critical APIs require integration tests.

Bug fixes require regression tests.

---

# Performance

Avoid N+1 queries.

Use pagination.

Use indexes.

Cache only when necessary.

Measure before optimizing.

---

# Git

Branch naming

feature/...

bugfix/...

hotfix/...

Commit style

feat:

fix:

docs:

refactor:

test:

style:

---

# Definition of Done

Task is complete only if

✓ Build passes

✓ Lint passes

✓ Type checking passes

✓ Tests pass

✓ No TODO left

✓ Documentation updated

✓ API documented

✓ No secrets committed

---

# AI Stop Rule

After completing the requested task

STOP.

Do not continue automatically.

Wait for the next instruction.

---

# Project Scope

Lucky Insight performs statistical analysis only.

It does NOT predict lottery results.

Never generate text implying guaranteed outcomes.

Always describe results as statistical observations.

---

# Architecture Principles

Clean Architecture

SOLID

KISS

DRY

YAGNI

Favor composition over inheritance.

---

# Final Reminder

Quality over speed.

Documentation over assumptions.

Security over convenience.

Consistency over cleverness.