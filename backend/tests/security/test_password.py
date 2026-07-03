"""Tests for Argon2 password hashing utilities."""

import pytest

from app.security.password import hash_password, verify_password


def test_hash_password_returns_argon2_hash() -> None:
    hashed = hash_password("correct horse battery staple")
    assert hashed.startswith("$argon2id$")


def test_hash_password_rejects_empty_password() -> None:
    with pytest.raises(ValueError, match="cannot be empty"):
        hash_password("")


def test_verify_password_succeeds_for_correct_password() -> None:
    password = "correct horse battery staple"
    hashed = hash_password(password)
    assert verify_password(password, hashed) is True


def test_verify_password_fails_for_incorrect_password() -> None:
    hashed = hash_password("correct horse battery staple")
    assert verify_password("wrong password", hashed) is False


def test_verify_password_fails_for_malformed_hash() -> None:
    assert verify_password("anything", "not-a-real-argon2-hash") is False


def test_hash_password_produces_unique_hashes_for_same_password() -> None:
    """Argon2 salts each hash, so identical passwords hash differently."""
    password = "correct horse battery staple"
    assert hash_password(password) != hash_password(password)
