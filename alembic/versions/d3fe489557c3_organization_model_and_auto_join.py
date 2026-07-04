"""organization model and auto-join

Revision ID: d3fe489557c3
Revises: 2dcd1014de82
Create Date: 2026-07-04 10:00:00.000000
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "d3fe489557c3"
down_revision: str | None = "2dcd1014de82"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # New Organization entity (ADR-0010, BIZ-028): a group of Users sharing one real-code catalog
    # (the catalog re-scope itself is BIZ-030 — this migration only introduces the entity).
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email_domain", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email_domain", name="uq_organization_email_domain"),
    )

    # `email` and `organization_id` are nullable: existing users (the implicit `settings.default_user`
    # of a standalone install, ADR-0007) never sign in and so never get a real email — see User's
    # docstring. SQLite needs batch mode to add a foreign key constraint.
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.add_column(sa.Column("email", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("organization_id", sa.Integer(), nullable=True))
        batch_op.create_unique_constraint("uq_users_email", ["email"])
        batch_op.create_index(op.f("ix_users_organization_id"), ["organization_id"], unique=False)
        batch_op.create_foreign_key(
            "fk_users_organization_id_organizations", "organizations", ["organization_id"], ["id"]
        )

    # Backfill: every pre-existing User gets its own new Organization of one, so no existing data is
    # orphaned by the new, nullable FK. A placeholder, deterministic, non-guessable-as-real domain
    # (`user-<id>.invalid`) — the `.invalid` TLD is reserved by RFC 2606 for exactly this purpose, so
    # it can never collide with a real email domain resolved later by BIZ-029's SSO login.
    connection = op.get_bind()
    users_table = sa.table("users", sa.column("id", sa.Integer), sa.column("organization_id", sa.Integer))
    organizations_table = sa.table("organizations", sa.column("id", sa.Integer), sa.column("email_domain", sa.String))
    user_ids = [row[0] for row in connection.execute(sa.select(users_table.c.id))]
    for user_id in user_ids:
        org_id = connection.execute(
            organizations_table.insert()
            .values(email_domain=f"user-{user_id}.invalid")
            .returning(organizations_table.c.id)
        ).scalar_one()
        connection.execute(users_table.update().where(users_table.c.id == user_id).values(organization_id=org_id))


def downgrade() -> None:
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_constraint("fk_users_organization_id_organizations", type_="foreignkey")
        batch_op.drop_index(op.f("ix_users_organization_id"))
        batch_op.drop_constraint("uq_users_email", type_="unique")
        batch_op.drop_column("organization_id")
        batch_op.drop_column("email")
    op.drop_table("organizations")
