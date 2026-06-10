"""add is_imported to projects and experiences

Revision ID: 20260610_0001_orcid_is_imported
Revises: 20260512_0000_baseline
Create Date: 2026-06-10

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260610_0001_orcid_is_imported"
down_revision: Union[str, None] = "20260512_0000_baseline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "projects",
        sa.Column(
            "is_imported", sa.Boolean(), nullable=False, server_default="false"
        ),
    )
    op.add_column(
        "experiences",
        sa.Column(
            "is_imported", sa.Boolean(), nullable=False, server_default="false"
        ),
    )


def downgrade() -> None:
    op.drop_column("experiences", "is_imported")
    op.drop_column("projects", "is_imported")
