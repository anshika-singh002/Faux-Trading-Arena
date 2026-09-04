import sys
import os
import pytest

# Add backend root to path so `app` is importable from tests/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"
