# DATABASE.md

Project: Lucky Insight

Version: 1.0.0

Status: Draft

Database: PostgreSQL 17 (Neon)

ORM: SQLAlchemy 2.x

Migration: Alembic

---

# 1. Design Principles

The database must be

- Normalize to 3NF
- Optimized for read-heavy workloads
- Easy to extend
- UUID based
- Audit friendly
- Soft Delete supported

---

# 2. Naming Convention

Tables

snake_case

Example

number_records

lottery_results

analysis_history

Columns

snake_case

Example

created_at

updated_at

user_id

Indexes

idx_table_column

Example

idx_number_records_number

Foreign Keys

fk_child_parent

Primary Keys

pk_table

Unique Keys

uk_table_column

---

# 3. Common Columns

Almost every table contains

id UUID PRIMARY KEY

created_at TIMESTAMP WITH TIME ZONE

updated_at TIMESTAMP WITH TIME ZONE

deleted_at TIMESTAMP WITH TIME ZONE NULL

created_by UUID NULL

updated_by UUID NULL

---

# 4. Tables

users

profiles

number_records

number_sources

number_categories

number_tags

record_tags

lottery_games

lottery_results

analysis_jobs

analysis_results

favorites

attachments

audit_logs

user_settings

---

# users

Purpose

Store authentication information.

Columns

id UUID PK

email VARCHAR(255)

password_hash TEXT

is_active BOOLEAN

is_verified BOOLEAN

last_login_at TIMESTAMP

created_at

updated_at

deleted_at

Indexes

email UNIQUE

---

# profiles

Purpose

User profile.

Columns

user_id FK

display_name

avatar_url

theme

language

timezone

bio

---

# number_records

Purpose

Store every number recorded by user.

Columns

id UUID

user_id UUID FK

number VARCHAR(20)

source_id UUID

category_id UUID

note TEXT

recorded_at TIMESTAMP

is_favorite BOOLEAN

Indexes

number

recorded_at

user_id

---

# number_sources

Examples

Car Plate

Phone

House Number

Dream

Receipt

Random

---

# number_categories

Examples

Lucky

Daily

Lottery

Observation

Other

---

# number_tags

User-defined tags.

Examples

Family

Work

Travel

---

# record_tags

Many-to-many relationship

record_id

tag_id

---

# lottery_games

Examples

Lao Lottery

Thai Lottery

Future games

---

# lottery_results

Columns

game_id

draw_date

first_prize

last2

front3

back3

created_at

Indexes

draw_date

game_id

---

# analysis_jobs

Stores every analysis request.

Status

Pending

Running

Completed

Failed

---

# analysis_results

Stores generated statistics.

Examples

Frequency

Pair

Triple

Trend

JSON Result

Score

Created At

---

# favorites

Saved numbers.

---

# attachments

Future

OCR

Images

Screenshots

---

# audit_logs

Every important action.

Examples

Login

Create

Delete

Export

Import

Analysis

---

# user_settings

Theme

Language

Notification

Timezone

Dashboard Layout

---

# Relationships

users

↓

profiles

↓

number_records

↓

record_tags

↓

number_tags

number_records

↓

analysis_jobs

↓

analysis_results

lottery_games

↓

lottery_results

---

# Index Strategy

Create index for

email

number

draw_date

user_id

recorded_at

status

---

# UUID Strategy

Every table uses UUID v7.

Never use integer IDs.

Reason

Safer

Distributed

Future-ready

---

# Soft Delete

Never permanently delete data.

Use deleted_at.

---

# Migration Rules

Never edit existing migration.

Always create new migration.

Migration names

YYYYMMDD_description

---

# Backup Strategy

Neon automatic backup.

Future

Weekly export.

---

# Future Tables

notifications

api_keys

devices

sessions

ai_models

analysis_templates
