# ruff: noqa: E501
"""create_analysis_tables

Revision ID: e20483f6d35d
Revises: 2463c7135ec1
Create Date: 2026-07-11 09:57:57.143135

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e20483f6d35d'
down_revision: str | None = '2463c7135ec1'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Create analysis_jobs
    op.create_table('analysis_jobs',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('analysis_type', sa.String(length=50), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('parameters', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_analysis_jobs_users')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_analysis_jobs'))
    )
    op.create_index(op.f('idx_analysis_jobs_analysis_type'), 'analysis_jobs', ['analysis_type'], unique=False)
    op.create_index(op.f('idx_analysis_jobs_user_id'), 'analysis_jobs', ['user_id'], unique=False)

    # 2. Create analysis_results
    op.create_table('analysis_results',
    sa.Column('job_id', sa.UUID(), nullable=False),
    sa.Column('result_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('explanation', sa.Text(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['job_id'], ['analysis_jobs.id'], name=op.f('fk_analysis_results_analysis_jobs')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_analysis_results'))
    )
    op.create_index(op.f('idx_analysis_results_job_id'), 'analysis_results', ['job_id'], unique=True)


def downgrade() -> None:
    # 1. Drop analysis_results
    op.drop_index(op.f('idx_analysis_results_job_id'), table_name='analysis_results')
    op.drop_table('analysis_results')

    # 2. Drop analysis_jobs
    op.drop_index(op.f('idx_analysis_jobs_user_id'), table_name='analysis_jobs')
    op.drop_index(op.f('idx_analysis_jobs_analysis_type'), table_name='analysis_jobs')
    op.drop_table('analysis_jobs')
