from dataclasses import dataclass
from functools import lru_cache

import httpx
from clerk_backend_api import Clerk
from clerk_backend_api.security.types import AuthenticateRequestOptions, RequestState
from fastapi import Depends, HTTPException, Request, status

from app.core.config import Settings, get_settings


@dataclass(frozen=True)
class AuthenticatedPrincipal:
    clerk_user_id: str
    session_id: str | None
    active_organization_id: str | None


@lru_cache(maxsize=1)
def get_clerk_client(secret_key: str) -> Clerk:
    return Clerk(bearer_auth=secret_key)


def build_authenticate_request_options(settings: Settings) -> AuthenticateRequestOptions:
    return AuthenticateRequestOptions(
        secret_key=settings.clerk_secret_key,
        jwt_key=settings.clerk_jwt_key,
        authorized_parties=list(settings.clerk_authorized_parties) or None,
        accepts_token=["session_token"],
    )


def build_httpx_request(request: Request) -> httpx.Request:
    return httpx.Request(
        method=request.method,
        url=str(request.url),
        headers=request.headers.raw,
    )


def authenticate_backend_request(request: Request, settings: Settings) -> RequestState:
    if not settings.clerk_secret_key:
        raise RuntimeError("CLERK_SECRET_KEY is required for authenticated backend routes")

    client = get_clerk_client(settings.clerk_secret_key)
    return client.authenticate_request(
        build_httpx_request(request),
        build_authenticate_request_options(settings),
    )


def get_authenticated_principal(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> AuthenticatedPrincipal:
    request_state = authenticate_backend_request(request, settings)
    payload = request_state.payload or {}
    clerk_user_id = payload.get("sub")

    if not request_state.is_signed_in or not clerk_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is required",
        )

    return AuthenticatedPrincipal(
        clerk_user_id=clerk_user_id,
        session_id=payload.get("sid"),
        active_organization_id=payload.get("org_id"),
    )
