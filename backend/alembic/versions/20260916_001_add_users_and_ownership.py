"""Add users table and scrape_jobs.owner_id FK.

Revision ID: 001_add_users_and_ownership
Revises: 
Create Date: 2026-09-16 14:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001_add_users_and_ownership'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("firebase_uid", sa.String(128), unique=True, nullable=False),
        sa.Column("email", sa.String(255), nullable=True),
        sa.Column("display_name", sa.String(255), nullable=True),
        sa.Column("photo_url", sa.Text(), nullable=True),
        sa.Column("plan", sa.String(32), server_default="free", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_users_firebase_uid", "users", ["firebase_uid"], unique=True)

    with op.batch_alter_table("scrape_jobs") as batch_op:
        batch_op.add_column(sa.Column("owner_id", sa.Integer(), nullable=True))
        batch_op.create_index("ix_scrape_jobs_owner_id", ["owner_id"])
        batch_op.create_foreign_key(
            "fk_scrape_jobs_owner_id",
            "users",
            ["owner_id"],
            ["id"],
            ondelete="CASCADE",
        )


def downgrade() -> None:
    with op.batch_alter_table("scrape_jobs") as batch_op:
        batch_op.drop_constraint("fk_scrape_jobs_owner_id", type_="foreignkey")
        batch_op.drop_index("ix_scrape_jobs_owner_id")
        batch_op.drop_column("owner_id")
    op.drop_index("ix_users_firebase_uid", table_name="users")
    op.drop_table("users")
