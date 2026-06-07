"""Clerk webhook verification and user shadow-row sync helpers."""

from collections.abc import Mapping
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from svix.webhooks import Webhook, WebhookVerificationError

from app.core.config import Settings
from app.db.models.user import User


def verify_clerk_webhook(
    payload: bytes,
    headers: Mapping[str, str],
    settings: Settings,
) -> dict[str, Any]:
    if not settings.clerk_webhook_signing_secret:
        raise RuntimeError("CLERK_WEBHOOK_SIGNING_SECRET is required for Clerk webhooks")

    webhook = Webhook(settings.clerk_webhook_signing_secret)
    verified_event = webhook.verify(payload, dict(headers))
    if not isinstance(verified_event, dict):
        raise WebhookVerificationError("Unexpected webhook payload type")
    return verified_event


def _extract_primary_email(user_data: Mapping[str, Any]) -> str | None:
    primary_email_id = user_data.get("primary_email_address_id")
    email_addresses = user_data.get("email_addresses") or []
    for email in email_addresses:
        if not isinstance(email, Mapping):
            continue
        if email.get("id") == primary_email_id:
            value = email.get("email_address")
            return value if isinstance(value, str) else None
    return None


async def _get_user_by_clerk_id(session: AsyncSession, clerk_user_id: str) -> User | None:
    statement = select(User).where(User.clerk_user_id == clerk_user_id)
    return (await session.scalars(statement)).first()


async def sync_clerk_user_event(session: AsyncSession, event: Mapping[str, Any]) -> User | None:
    event_type = event.get("type")
    user_data = event.get("data")
    if not isinstance(event_type, str) or not isinstance(user_data, Mapping):
        return None

    clerk_user_id = user_data.get("id")
    if not isinstance(clerk_user_id, str):
        return None

    user = await _get_user_by_clerk_id(session, clerk_user_id)

    if event_type == "user.deleted":
        if user is None:
            return None
        user.is_active = False
        await session.flush()
        await session.refresh(user)
        return user

    if event_type not in {"user.created", "user.updated"}:
        return None

    if user is None:
        user = User(clerk_user_id=clerk_user_id)
        session.add(user)

    user.primary_email_address = _extract_primary_email(user_data)
    first_name = user_data.get("first_name")
    last_name = user_data.get("last_name")
    username = user_data.get("username")
    image_url = user_data.get("image_url")
    user.first_name = first_name if isinstance(first_name, str) else None
    user.last_name = last_name if isinstance(last_name, str) else None
    user.username = username if isinstance(username, str) else None
    user.image_url = image_url if isinstance(image_url, str) else None
    user.is_active = True

    await session.flush()
    await session.refresh(user)
    return user
