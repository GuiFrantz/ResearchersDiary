"""drop unused columns

Revision ID: 20260611_0003_drop_unused_cols
Revises: 20260610_0002_pub_abstract
Create Date: 2026-06-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260611_0003_drop_unused_cols"
down_revision: Union[str, None] = "20260610_0002_pub_abstract"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("users", "position_title")
    op.drop_column("users", "auth_provider")
    op.drop_column("publications", "created_at")


def downgrade() -> None:
    op.add_column(
        "users", sa.Column("position_title", sa.String(), nullable=True)
    )
    op.add_column(
        "users",
        sa.Column("auth_provider", sa.String(), nullable=False, server_default="local"),
    )
    op.add_column(
        "publications",
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
