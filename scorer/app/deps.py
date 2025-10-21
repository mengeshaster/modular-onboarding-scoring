from fastapi import Header
from typing import Optional


async def get_internal_token(x_internal_token: Optional[str] = Header(None)) -> Optional[str]:
    """Dependency to extract internal token from headers."""
    return x_internal_token