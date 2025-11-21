"""Google OAuth utilities for handling Google Sign-In tokens."""

import logging
from typing import Optional
from google.auth.transport import requests
from google.oauth2 import id_token
from app.schemas.auth import GoogleUserInfo
from app.core.config import settings

logger = logging.getLogger(__name__)


async def verify_google_token(token: str) -> Optional[GoogleUserInfo]:
    """
    Verify a Google ID token and extract user information.

    Args:
        token: Google ID token from client

    Returns:
        GoogleUserInfo if token is valid, None otherwise
    """
    if not settings.GOOGLE_CLIENT_ID:
        logger.error("GOOGLE_CLIENT_ID not configured")
        return None

    try:
        # Verify the token
        idinfo = id_token.verify_oauth2_token(
            token, requests.Request(), settings.GOOGLE_CLIENT_ID
        )

        # Token is valid, extract user info
        user_info = GoogleUserInfo(
            id=idinfo.get("sub"),
            email=idinfo.get("email"),
            name=idinfo.get("name"),
            picture=idinfo.get("picture"),
        )

        return user_info

    except Exception as e:
        logger.error(f"Error verifying Google token: {str(e)}")
        return None
