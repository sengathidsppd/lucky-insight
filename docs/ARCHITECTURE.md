# Lucky Insight Architecture

Version: 1.0.0

Status: Draft

Owner: Software Architecture Team

---

# 1. Architecture Goals

The architecture must be

- Scalable
- Maintainable
- Secure
- Testable
- AI-Friendly
- Cloud Ready

---

# 2. High-Level Architecture

                    Browser
                        │
                Next.js Frontend
                        │
                 HTTPS REST API
                        │
                 FastAPI Backend
                        │
          Service / Business Layer
                        │
             Repository Pattern
                        │
                PostgreSQL Database

---

# 3. Technology Stack

Frontend

Next.js 15

TypeScript

TailwindCSS

shadcn/ui

TanStack Query

Axios

Recharts

Backend

Python 3.13

FastAPI

SQLAlchemy 2

Alembic

Pydantic v2

Database

PostgreSQL (Neon)

Deployment

Frontend → Vercel

Backend → Render

Database → Neon

---

# 4. Clean Architecture

Presentation Layer

↓

API Layer

↓

Service Layer

↓

Repository Layer

↓

Database

Responsibilities

Presentation

UI

API

Receive Request

Validate Request

Service

Business Logic

Repository

Database Access

Database

Persistent Storage

---

# 5. Backend Structure

backend/

app/

api/

core/

models/

schemas/

repositories/

services/

utils/

middleware/

dependencies/

tests/

alembic/

---

# 6. Frontend Structure

frontend/

src/

app/

components/

features/

hooks/

services/

types/

utils/

styles/

---

# 7. Data Flow

User

↓

Frontend

↓

API

↓

Service

↓

Repository

↓

Database

↓

Repository

↓

Service

↓

API

↓

Frontend

---

# 8. Authentication Flow

Login

↓

Validate Credentials

↓

Generate JWT

↓

Return Token

↓

Store Securely

↓

Send Authorization Header

↓

Validate JWT

↓

Access Resource

---

# 9. Analysis Flow

Number Record

↓

Validation

↓

Store Database

↓

Analysis Service

↓

Statistics Engine

↓

Result

↓

Dashboard

---

# 10. Error Flow

Exception

↓

Global Exception Handler

↓

Error Response

↓

Frontend Notification

---

# 11. Logging

Every request must have

Request ID

Timestamp

User ID

Execution Time

Status Code

No sensitive information

---

# 12. Security

HTTPS Only

JWT

Argon2

Rate Limiting

Input Validation

SQL Injection Protection

XSS Protection

CSRF Protection

CORS

---

# 13. Scalability

Stateless Backend

Horizontal Scaling

Connection Pool

Database Index

Pagination

Caching (Future)

---

# 14. Coding Principles

SOLID

DRY

KISS

YAGNI

Repository Pattern

Dependency Injection

---

# 15. Future Architecture

OCR Module

↓

Import Module

↓

AI Summary

↓

Notification Service

↓

Mobile App

---

End of Document