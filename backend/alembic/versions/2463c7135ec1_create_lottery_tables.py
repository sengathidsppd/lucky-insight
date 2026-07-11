# ruff: noqa: E501
"""create_lottery_tables

Revision ID: 2463c7135ec1
Revises: 00bb85eb4919
Create Date: 2026-07-11 09:51:28.326159

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '2463c7135ec1'
down_revision: str | None = '00bb85eb4919'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Add is_admin to users
    op.add_column('users', sa.Column('is_admin', sa.Boolean(), nullable=False, server_default=sa.text('false')))

    # 2. Create lottery_games
    op.create_table('lottery_games',
    sa.Column('name', sa.String(length=100), nullable=False),
    sa.Column('code', sa.String(length=20), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_lottery_games'))
    )
    op.create_index(op.f('idx_lottery_games_code'), 'lottery_games', ['code'], unique=True)
    op.create_index(op.f('idx_lottery_games_name'), 'lottery_games', ['name'], unique=True)

    # 3. Create lottery_results
    op.create_table('lottery_results',
    sa.Column('game_id', sa.UUID(), nullable=False),
    sa.Column('draw_date', sa.Date(), nullable=False),
    sa.Column('draw_number', sa.String(length=50), nullable=True),
    sa.Column('first_prize', sa.String(length=20), nullable=False),
    sa.Column('last2', sa.String(length=10), nullable=True),
    sa.Column('front3', sa.String(length=50), nullable=True),
    sa.Column('back3', sa.String(length=50), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['game_id'], ['lottery_games.id'], name=op.f('fk_lottery_results_lottery_games')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_lottery_results'))
    )
    op.create_index(op.f('idx_lottery_results_draw_date'), 'lottery_results', ['draw_date'], unique=False)
    op.create_index(op.f('idx_lottery_results_game_id'), 'lottery_results', ['game_id'], unique=False)

    # 4. Seed initial lottery games
    import uuid
    from datetime import UTC, datetime

    games_table = sa.sql.table(
        'lottery_games',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    )
    op.bulk_insert(games_table, [
        {
            "id": uuid.uuid4(),
            "name": "Thai Government Lottery",
            "code": "THAI",
            "description": "Official government lottery of Thailand, drawn on the 1st and 16th of each month.",
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
        },
        {
            "id": uuid.uuid4(),
            "name": "Lao Development Lottery",
            "code": "LAO",
            "description": "Official lottery of Laos, drawn multiple times a week.",
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
        },
    ])


def downgrade() -> None:
    # 1. Drop lottery_results
    op.drop_index(op.f('idx_lottery_results_game_id'), table_name='lottery_results')
    op.drop_index(op.f('idx_lottery_results_draw_date'), table_name='lottery_results')
    op.drop_table('lottery_results')

    # 2. Drop lottery_games
    op.drop_index(op.f('idx_lottery_games_name'), table_name='lottery_games')
    op.drop_index(op.f('idx_lottery_games_code'), table_name='lottery_games')
    op.drop_table('lottery_games')

    # 3. Drop is_admin from users
    op.drop_column('users', 'is_admin')
