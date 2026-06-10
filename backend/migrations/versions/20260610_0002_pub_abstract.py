"""add abstract to publications

Revision ID: 20260610_0002_pub_abstract
Revises: 20260610_0001_orcid_is_imported
Create Date: 2026-06-10

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "20260610_0002_pub_abstract"
down_revision: Union[str, None] = "20260610_0001_orcid_is_imported"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "publications", sa.Column("abstract", sa.String(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column("publications", "abstract")
