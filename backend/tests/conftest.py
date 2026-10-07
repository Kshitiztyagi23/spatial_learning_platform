"""Keep the test suite away from the study database.

By default every test runs against a throwaway in-memory SQLite database
(tables created from the models, wiped per test). Set TEST_DATABASE_URL to
run the API tests against a separate Postgres database instead (e.g. a Neon
branch migrated with alembic) to catch Postgres-specific behaviour.

DATABASE_URL must be set before `app` is imported because the engine is
created from settings at import time; the app's own engine is never used for
SQLite runs, since get_db is overridden.
"""
import os
import pytest
import pytest_asyncio

# Tests never call the real Claude API (tests of the AI layer use a fake client)
os.environ["AI_FEEDBACK_ENABLED"] = "false"

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
if TEST_DATABASE_URL:
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL
else:
    # Never fall through to the real database from .env
    os.environ["DATABASE_URL"] = "postgresql://unused:unused@localhost/unused"

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.core.database import Base, get_db  # noqa: E402
from app.main import app  # noqa: E402
from app import models as _models  # noqa: E402,F401  (registers every table on Base.metadata)


@pytest_asyncio.fixture(autouse=True)
async def sqlite_db():
    """Fresh in-memory database for each test, unless TEST_DATABASE_URL is set."""
    if TEST_DATABASE_URL:
        yield
        return

    engine = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    maker = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async def override_get_db():
        async with maker() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.pop(get_db, None)
    await engine.dispose()
