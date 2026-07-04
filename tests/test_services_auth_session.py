"""Unit tests for the signed session-cookie token (BIZ-029)."""

from __future__ import annotations

import time

import pytest

from walker.services.auth_session import create_session_token, read_session_token


def test_round_trips_a_user_id() -> None:
    token = create_session_token(user_id=42, secret="s3cr3t-enough-for-tests", max_age_seconds=3600)

    assert read_session_token(token, secret="s3cr3t-enough-for-tests") == 42


def test_rejects_token_signed_with_a_different_secret() -> None:
    token = create_session_token(user_id=42, secret="s3cr3t-enough-for-tests", max_age_seconds=3600)

    assert read_session_token(token, secret="a-different-secret-value") is None


def test_rejects_expired_token() -> None:
    token = create_session_token(user_id=42, secret="s3cr3t-enough-for-tests", max_age_seconds=-1)

    time.sleep(0.01)
    assert read_session_token(token, secret="s3cr3t-enough-for-tests") is None


def test_rejects_garbage_token() -> None:
    assert read_session_token("not-a-real-token", secret="s3cr3t-enough-for-tests") is None


@pytest.mark.parametrize("token", ["", "a.b", "a.b.c.d"])
def test_rejects_malformed_tokens(token: str) -> None:
    assert read_session_token(token, secret="s3cr3t-enough-for-tests") is None
