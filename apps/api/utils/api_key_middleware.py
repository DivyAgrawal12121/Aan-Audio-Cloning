"""
Resound Studio - API Key Authentication Middleware
===================================================
Optional API key authentication for production deployment.
Set RESOUND_API_KEY environment variable to enable.
Set RESOUND_RATE_LIMIT to max requests per minute (default: 60).

When enabled, all /api/* endpoints require the header:
  X-API-Key: <your-key>

Public endpoints (/api/health, /docs) are exempt.
"""

import os
import time
import logging
from collections import defaultdict
from typing import Optional

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger("resound-studio.auth")

# Configuration from environment
API_KEY = os.environ.get("RESOUND_API_KEY", "")
RATE_LIMIT = int(os.environ.get("RESOUND_RATE_LIMIT", "60"))  # requests per minute

# Public paths that don't require authentication
PUBLIC_PATHS = {"/api/health", "/docs", "/openapi.json", "/redoc"}

# Rate limiting storage: {api_key: [(timestamp, ...)] }
_rate_store: dict = defaultdict(list)


class ApiKeyMiddleware(BaseHTTPMiddleware):
    """
    Middleware that enforces API key authentication and rate limiting.
    Only active when RESOUND_API_KEY environment variable is set.
    """

    async def dispatch(self, request: Request, call_next):
        # Skip if no API key configured (development mode)
        if not API_KEY:
            return await call_next(request)

        path = request.url.path

        # Skip public endpoints
        if path in PUBLIC_PATHS or not path.startswith("/api/"):
            return await call_next(request)

        # Check API key
        provided_key = request.headers.get("X-API-Key", "")
        if provided_key != API_KEY:
            logger.warning(f"Invalid API key from {request.client.host}: {path}")
            return JSONResponse(
                status_code=401,
                content={
                    "error": "Unauthorized",
                    "message": "Invalid or missing API key. Set the X-API-Key header.",
                    "code": "AUTH_REQUIRED",
                },
            )

        # Rate limiting
        now = time.time()
        window_start = now - 60  # 1-minute window

        # Clean old entries and check limit
        _rate_store[provided_key] = [
            t for t in _rate_store[provided_key] if t > window_start
        ]

        if len(_rate_store[provided_key]) >= RATE_LIMIT:
            retry_after = int(60 - (now - _rate_store[provided_key][0]))
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests. Maximum {RATE_LIMIT}/minute. Retry after {retry_after}s.",
                    "code": "RATE_LIMITED",
                    "retry_after": retry_after,
                },
                headers={"Retry-After": str(retry_after)},
            )

        _rate_store[provided_key].append(now)

        return await call_next(request)
