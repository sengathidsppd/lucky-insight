# TASK-004 — Development Tooling & CI

Version: 1.0

Priority: High

Estimated Time: 30-45 minutes

---

# Objective

Set up a professional development workflow.

No application features.

No authentication.

No database changes.

---

# Read First

README.md

CLAUDE.md

docs/ARCHITECTURE.md

---

# Configure

- Ruff
- Black
- MyPy
- Pytest
- pre-commit
- GitHub Actions

---

# Create

.github/workflows/

    backend-ci.yml

.pre-commit-config.yaml

---

# GitHub Actions

Trigger

push

pull_request

---

# Python Version

3.13

---

# CI Pipeline

Step 1

Checkout

Step 2

Install uv

Step 3

Sync dependencies

Step 4

Run Ruff

Step 5

Run Black --check

Step 6

Run MyPy

Step 7

Run Pytest

---

# Acceptance

✓ CI passes

✓ Ruff passes

✓ Black passes

✓ MyPy passes

✓ Tests pass

Stop.