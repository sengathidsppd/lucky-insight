# Product Requirements Document (PRD)

Project Name: Lucky Insight

Version: 1.0.0

Status: Draft

Owner: Sengathid Soumphonphukdy

Architecture Owner: ChatGPT

---

# 1. Introduction

Lucky Insight is a modern web application designed for recording numbers encountered in daily life and performing transparent statistical analysis.

The system is NOT designed to predict lottery outcomes.

Instead, it helps users organize historical data and explore patterns using explainable statistical methods.

---

# 2. Objectives

The application must allow users to

✓ Record daily numbers

✓ Organize number history

✓ Store historical lottery results

✓ Analyze statistics

✓ View interactive dashboards

✓ Search historical records

✓ Export data

✓ Import data

---

# 3. Target Users

Primary User

People who enjoy recording numbers and exploring statistical patterns.

Secondary User

Researchers interested in frequency analysis.

Future

Public statistical platform.

---

# 4. Functional Requirements

FR-001

User Registration

Description

Create new account.

Priority

High

---

FR-002

Login

JWT Authentication

Priority

High

---

FR-003

Logout

Destroy JWT Token

Priority

High

---

FR-004

User Profile

Edit

Name

Avatar

Password

Theme

Language

---

FR-005

Record Number

Users can save

Number

Source

Category

Tag

Note

Date

Time

Attachment (future)

GPS (optional)

---

FR-006

Edit Record

---

FR-007

Delete Record

Soft Delete

---

FR-008

Favorite Number

---

FR-009

Tag Number

Multiple Tags

---

FR-010

Search

Search by

Number

Tag

Category

Source

Date

Keyword

---

FR-011

Lottery Result

Admin imports

Official results

---

FR-012

Lottery History

View previous draws

---

FR-013

Statistical Analysis

Generate

Frequency

Pair

Triple

Position

Trend

Distribution

---

FR-014

Dashboard

Display

Recent Activity

Favorite Numbers

Charts

Heatmaps

Statistics

---

FR-015

Export

CSV

PDF

---

FR-016

Import

CSV

Excel

---

# 5. Non Functional Requirements

Performance

Average API Response

<300ms

Search

<1 second

Availability

99%

Security

JWT

HTTPS

Argon2

Rate Limiting

Validation

SQL Injection Protection

XSS Protection

---

# 6. Roles

User

Manage own data

Admin (Future)

Manage lottery history

Moderate data

---

# 7. Business Rules

Users can only access their own records.

Deleted data must use Soft Delete.

Lottery results cannot be modified after publication.

Every statistical result must include an explanation.

The system must never claim to predict lottery outcomes.

---

# 8. Future Features

OCR

AI Summary

Calendar View

Cloud Backup

Mobile App

Dark Mode Enhancements

Notifications

---

# 9. Success Metrics

Daily Active Users

Average Session Time

Records Created

Analyses Generated

Retention Rate

---

# 10. Out of Scope

Online lottery purchasing

Lottery prediction

Financial advice

Investment recommendations
