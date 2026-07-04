"""Tests for the User model (CHR-004)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from walker.models import User


def test_user_can_be_created_without_a_name(session: Session) -> None:
    user = User(username="me")
    session.add(user)
    session.commit()
    session.refresh(user)

    assert user.name is None


def test_user_can_be_created_with_a_name(session: Session) -> None:
    user = User(username="me", name="Jane Doe")
    session.add(user)
    session.commit()
    session.refresh(user)

    assert user.name == "Jane Doe"
