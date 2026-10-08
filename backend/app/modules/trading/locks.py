"""Per-user async locks so concurrent orders can't overdraw a balance or position."""
import asyncio

_locks: dict[str, asyncio.Lock] = {}


def user_lock(user_id: str) -> asyncio.Lock:
    lock = _locks.get(user_id)
    if lock is None:
        lock = _locks[user_id] = asyncio.Lock()
    return lock
