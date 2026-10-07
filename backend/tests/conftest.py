"""Keep the test suite away from the study database.

Tests that hit the API write real rows, so they only run when
TEST_DATABASE_URL points at a separate database (e.g. a Neon branch).
It must be set before `app` is imported, because the engine is created
from settings at import time.
"""
import os
import pytest

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
if TEST_DATABASE_URL:
    os.environ["DATABASE_URL"] = TEST_DATABASE_URL

DB_TEST_MODULES = {"test_participants.py", "test_sessions.py"}


def pytest_collection_modifyitems(config, items):
    if TEST_DATABASE_URL:
        return
    skip_db = pytest.mark.skip(reason="set TEST_DATABASE_URL to a separate database to run API tests")
    for item in items:
        if item.path.name in DB_TEST_MODULES:
            item.add_marker(skip_db)
