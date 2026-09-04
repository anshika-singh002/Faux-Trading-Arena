"""Tests for authentication and security utilities."""
import pytest
from app.core.security import hash_password, verify_password, create_access_token, decode_token


def test_password_hash_and_verify():
    pw = "SecurePass1!"  # keep well under bcrypt's 72-byte limit
    hashed = hash_password(pw)
    assert hashed != pw
    assert verify_password(pw, hashed)
    assert not verify_password("WrongPassword", hashed)


def test_token_create_and_decode():
    user_id = "user-abc-123"
    token = create_access_token(subject=user_id)
    assert token
    decoded = decode_token(token)
    assert decoded == user_id


def test_invalid_token_raises():
    from fastapi import HTTPException
    with pytest.raises(HTTPException) as exc_info:
        decode_token("this.is.not.a.valid.jwt")
    assert exc_info.value.status_code == 401


def test_tampered_token_raises():
    from fastapi import HTTPException
    token = create_access_token(subject="user-1")
    tampered = token[:-5] + "XXXXX"
    with pytest.raises(HTTPException):
        decode_token(tampered)
