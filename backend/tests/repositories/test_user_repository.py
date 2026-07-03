"""Tests for UserRepository and the generic BaseRepository it extends.

These tests create the ``users`` table directly via
``Base.metadata.create_all`` for the duration of this test module only,
and drop it afterwards. This is test setup, not an Alembic migration —
no migration files are created or modified.
"""

import uuid
from collections.abc import Generator

import pytest
from sqlalchemy.orm import Session

from app.core.database import SessionLocal, engine
from app.models.base import Base
from app.models.user import User
from app.repositories.exceptions import DuplicateEntityError, EntityNotFoundError
from app.repositories.user_repository import UserRepository

_users_table_obj = Base.metadata.tables[User.__tablename__]


@pytest.fixture(scope="module", autouse=True)
def _users_table() -> Generator[None]:
    """Create the users table for this test module, then drop it."""
    Base.metadata.create_all(bind=engine, tables=[_users_table_obj])
    yield
    Base.metadata.drop_all(bind=engine, tables=[_users_table_obj])


@pytest.fixture
def db_session() -> Generator[Session]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.rollback()
        session.close()


@pytest.fixture
def repo(db_session: Session) -> UserRepository:
    return UserRepository(db_session)


def _make_user(email: str, password_hash: str = "hashed-password-value") -> User:
    return User(email=email, password_hash=password_hash)


# --- create_user -------------------------------------------------------


def test_create_user_persists_and_returns_generated_fields(repo: UserRepository) -> None:
    user = _make_user("create.user@example.com")

    created = repo.create_user(user)

    assert created.id is not None
    assert created.created_at is not None
    assert created.email == "create.user@example.com"


def test_create_user_with_duplicate_email_raises(repo: UserRepository) -> None:
    email = "duplicate.repo@example.com"
    repo.create_user(_make_user(email))

    with pytest.raises(DuplicateEntityError):
        repo.create_user(_make_user(email))


def test_create_user_duplicate_failure_does_not_lose_prior_work(repo: UserRepository) -> None:
    """A failed duplicate-create must not roll back other uncommitted work
    already held by the same session (regression test for a savepoint bug)."""
    email = "savepoint.check@example.com"
    created = repo.create_user(_make_user(email))

    with pytest.raises(DuplicateEntityError):
        repo.create_user(_make_user(email))

    still_there = repo.get_by_id(created.id)
    assert still_there is not None
    assert still_there.email == email


# --- get_by_email / email_exists ---------------------------------------


def test_get_by_email_finds_existing_user(repo: UserRepository) -> None:
    email = "find.me@example.com"
    created = repo.create_user(_make_user(email))

    found = repo.get_by_email(email)

    assert found is not None
    assert found.id == created.id


def test_get_by_email_returns_none_for_missing_user(repo: UserRepository) -> None:
    assert repo.get_by_email("does.not.exist@example.com") is None


def test_email_exists_true_for_existing_user(repo: UserRepository) -> None:
    email = "exists.check@example.com"
    repo.create_user(_make_user(email))

    assert repo.email_exists(email) is True


def test_email_exists_false_for_missing_user(repo: UserRepository) -> None:
    assert repo.email_exists("nobody.here@example.com") is False


# --- update_last_login / activate / deactivate --------------------------


def test_update_last_login_sets_timestamp(repo: UserRepository) -> None:
    created = repo.create_user(_make_user("login.tracking@example.com"))
    assert created.last_login_at is None

    updated = repo.update_last_login(created.id)

    assert updated.last_login_at is not None


def test_update_last_login_raises_for_missing_user(repo: UserRepository) -> None:
    with pytest.raises(EntityNotFoundError):
        repo.update_last_login(uuid.uuid4())


def test_deactivate_and_activate_toggle_is_active(repo: UserRepository) -> None:
    created = repo.create_user(_make_user("toggle.active@example.com"))
    assert created.is_active is True

    deactivated = repo.deactivate(created.id)
    assert deactivated.is_active is False

    activated = repo.activate(created.id)
    assert activated.is_active is True


# --- soft_delete ---------------------------------------------------------


def test_soft_delete_marks_user_deleted(repo: UserRepository) -> None:
    created = repo.create_user(_make_user("soft.delete.repo@example.com"))

    result = repo.soft_delete(created.id)

    assert result is True
    assert repo.get_by_id(created.id) is None
    assert repo.get_by_id(created.id, include_deleted=True) is not None


def test_soft_delete_returns_false_for_missing_user(repo: UserRepository) -> None:
    assert repo.soft_delete(uuid.uuid4()) is False


def test_soft_deleted_user_excluded_from_get_by_email(repo: UserRepository) -> None:
    email = "soft.delete.email@example.com"
    created = repo.create_user(_make_user(email))
    repo.soft_delete(created.id)

    assert repo.get_by_email(email) is None
    assert repo.get_by_email(email, include_deleted=True) is not None


# --- exists / count (generic BaseRepository behavior) --------------------


def test_exists_true_for_created_user(repo: UserRepository) -> None:
    created = repo.create_user(_make_user("exists.repo@example.com"))
    assert repo.exists(created.id) is True


def test_exists_false_for_unknown_id(repo: UserRepository) -> None:
    assert repo.exists(uuid.uuid4()) is False


def test_exists_false_for_soft_deleted_user(repo: UserRepository) -> None:
    created = repo.create_user(_make_user("exists.soft.delete@example.com"))
    repo.soft_delete(created.id)

    assert repo.exists(created.id) is False
    assert repo.exists(created.id, include_deleted=True) is True


def test_count_reflects_active_users_only(repo: UserRepository) -> None:
    before = repo.count()

    repo.create_user(_make_user("count.one@example.com"))
    repo.create_user(_make_user("count.two@example.com"))
    after_create = repo.count()

    assert after_create == before + 2

    created = repo.create_user(_make_user("count.soft.delete@example.com"))
    repo.soft_delete(created.id)
    after_delete = repo.count()

    assert after_delete == after_create + 1 - 1  # net zero from the extra create + delete
    assert repo.count(include_deleted=True) == after_create + 1


# --- get_all ---------------------------------------------------------------


def test_get_all_excludes_soft_deleted_by_default(repo: UserRepository) -> None:
    active = repo.create_user(_make_user("get.all.active@example.com"))
    deleted = repo.create_user(_make_user("get.all.deleted@example.com"))
    repo.soft_delete(deleted.id)

    all_users = repo.get_all()
    ids = {user.id for user in all_users}

    assert active.id in ids
    assert deleted.id not in ids


def test_get_all_include_deleted_returns_soft_deleted_too(repo: UserRepository) -> None:
    deleted = repo.create_user(_make_user("get.all.include.deleted@example.com"))
    repo.soft_delete(deleted.id)

    all_users = repo.get_all(include_deleted=True)
    ids = {user.id for user in all_users}

    assert deleted.id in ids
