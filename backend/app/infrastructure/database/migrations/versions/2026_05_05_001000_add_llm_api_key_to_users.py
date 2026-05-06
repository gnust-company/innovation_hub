"""Add llm_api_key column to users table

Revision ID: add_llm_api_key
Revises: add_chat_tables
"""
from alembic import op
import sqlalchemy as sa

revision = "add_llm_api_key"
down_revision = "add_chat_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("llm_api_key", sa.String(255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "llm_api_key")
