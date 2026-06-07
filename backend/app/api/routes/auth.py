from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from svix.webhooks import WebhookVerificationError

from app.db.models.user import User
from app.db.session import get_db_session
from app.platform.auth import AuthenticatedPrincipal, get_authenticated_principal
from app.platform.webhooks import sync_clerk_event, verify_clerk_webhook

router = APIRouter(prefix="/api/v1", tags=["auth"])


class AuthenticatedUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clerk_user_id: str
    primary_email_address: str | None
    first_name: str | None
    last_name: str | None
    username: str | None
    image_url: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


@router.get("/auth/me", response_model=AuthenticatedUserResponse)
async def get_authenticated_user(
    principal: AuthenticatedPrincipal = Depends(get_authenticated_principal),
    session: AsyncSession = Depends(get_db_session),
) -> AuthenticatedUserResponse:
    statement = select(User).where(User.clerk_user_id == principal.clerk_user_id)
    user = (await session.scalars(statement)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Authenticated user has no local shadow row",
        )
    return AuthenticatedUserResponse.model_validate(user)


@router.post("/webhooks/clerk", status_code=status.HTTP_204_NO_CONTENT)
async def receive_clerk_webhook(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> Response:
    payload = await request.body()
    try:
        event = verify_clerk_webhook(payload, request.headers, request.app.state.settings)
    except WebhookVerificationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Clerk webhook signature",
        ) from exc

    await sync_clerk_event(session, event)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
