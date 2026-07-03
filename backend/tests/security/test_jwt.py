"""Tests for JWT creation and decoding utilities."""

from datetime import timedelta

import pytest

from app.security.exceptions import ExpiredTokenException, InvalidTokenException
from app.security.jwt import (
    TOKEN_AUDIENCE,
    TOKEN_ISSUER,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
    decode_token,
)


def test_create_access_token_returns_a_token_string() -> None:
    access_token = create_access_token("user-123")
    assert isinstance(access_token.token, str)
    assert access_token.token.count(".") == 2  # header.payload.signature


def test_create_refresh_token_returns_a_token_string() -> None:
    refresh_token = create_refresh_token("user-123")
    assert isinstance(refresh_token.token, str)
    assert refresh_token.token.count(".") == 2


def test_decode_access_token_round_trips_claims() -> None:
    access_token = create_access_token("user-123")
    payload = decode_access_token(access_token.token)

    assert payload.sub == "user-123"
    assert payload.iss == TOKEN_ISSUER
    assert payload.aud == TOKEN_AUDIENCE
    assert payload.jti
    assert payload.iat.tzinfo is not None
    assert payload.exp.tzinfo is not None
    assert payload.exp > payload.iat


def test_decode_refresh_token_round_trips_claims() -> None:
    refresh_token = create_refresh_token("user-123")
    payload = decode_refresh_token(refresh_token.token)

    assert payload.sub == "user-123"
    assert payload.iss == TOKEN_ISSUER
    assert payload.aud == TOKEN_AUDIENCE


def test_each_token_has_a_unique_jti() -> None:
    first = decode_access_token(create_access_token("user-123").token)
    second = decode_access_token(create_access_token("user-123").token)
    assert first.jti != second.jti


def test_decode_access_token_rejects_a_refresh_token() -> None:
    """Access and refresh tokens are signed with different secrets."""
    refresh_token = create_refresh_token("user-123")
    with pytest.raises(InvalidTokenException):
        decode_access_token(refresh_token.token)


def test_decode_refresh_token_rejects_an_access_token() -> None:
    access_token = create_access_token("user-123")
    with pytest.raises(InvalidTokenException):
        decode_refresh_token(access_token.token)


def test_decode_token_rejects_a_malformed_token() -> None:
    with pytest.raises(InvalidTokenException):
        decode_token("not-a-real-jwt", "any-secret")


def test_decode_access_token_raises_on_expired_token() -> None:
    expired_token = create_access_token("user-123", expires_delta=timedelta(seconds=-1))
    with pytest.raises(ExpiredTokenException):
        decode_access_token(expired_token.token)


def test_access_token_expiry_reflects_configured_lifetime() -> None:
    custom_delta = timedelta(minutes=5)
    access_token = create_access_token("user-123", expires_delta=custom_delta)
    payload = decode_access_token(access_token.token)

    delta_seconds = (payload.exp - payload.iat).total_seconds()
    assert abs(delta_seconds - custom_delta.total_seconds()) < 2
