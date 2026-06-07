"""Clerk webhook verification and user shadow-row sync helpers."""

from collections.abc import Mapping
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from svix.webhooks import Webhook, WebhookVerificationError

from app.db.models.company import Company
from app.db.models.company_membership import CompanyMembership
from app.core.config import Settings
from app.db.models.user import User
from app.platform.permissions import normalize_company_role


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


async def _get_company_by_id(session: AsyncSession, clerk_organization_id: str) -> Company | None:
    return await session.get(Company, clerk_organization_id)


async def _get_membership_by_clerk_id(
    session: AsyncSession,
    clerk_membership_id: str,
) -> CompanyMembership | None:
    statement = select(CompanyMembership).where(
        CompanyMembership.clerk_membership_id == clerk_membership_id
    )
    return (await session.scalars(statement)).first()


async def _get_membership_by_company_user(
    session: AsyncSession,
    company_id: str,
    user_id: int,
) -> CompanyMembership | None:
    statement = select(CompanyMembership).where(
        CompanyMembership.company_id == company_id,
        CompanyMembership.user_id == user_id,
    )
    return (await session.scalars(statement)).first()


def _extract_string(value: Any) -> str | None:
    return value if isinstance(value, str) and value else None


def _extract_organization_id(membership_data: Mapping[str, Any]) -> str | None:
    organization = membership_data.get("organization")
    if isinstance(organization, Mapping):
        organization_id = _extract_string(organization.get("id"))
        if organization_id:
            return organization_id
    return _extract_string(membership_data.get("organization_id"))


def _extract_membership_user_id(membership_data: Mapping[str, Any]) -> str | None:
    public_user_data = membership_data.get("public_user_data")
    if isinstance(public_user_data, Mapping):
        user_id = _extract_string(public_user_data.get("user_id"))
        if user_id:
            return user_id

    user = membership_data.get("user")
    if isinstance(user, Mapping):
        user_id = _extract_string(user.get("id"))
        if user_id:
            return user_id

    return _extract_string(membership_data.get("user_id"))


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


async def sync_clerk_company_event(session: AsyncSession, event: Mapping[str, Any]) -> Company | None:
    event_type = event.get("type")
    company_data = event.get("data")
    if not isinstance(event_type, str) or not isinstance(company_data, Mapping):
        return None

    if event_type not in {"organization.created", "organization.updated", "organization.deleted"}:
        return None

    clerk_organization_id = _extract_string(company_data.get("id"))
    if clerk_organization_id is None:
        return None

    company = await _get_company_by_id(session, clerk_organization_id)

    if event_type == "organization.deleted":
        if company is None:
            return None

        company.is_active = False
        memberships = (
            await session.scalars(
                select(CompanyMembership).where(CompanyMembership.company_id == clerk_organization_id)
            )
        ).all()
        for membership in memberships:
            membership.status = "inactive"

        await session.flush()
        await session.refresh(company)
        return company

    if company is None:
        company = Company(
            id=clerk_organization_id,
            name=_extract_string(company_data.get("name")) or clerk_organization_id,
        )
        session.add(company)

    company.name = _extract_string(company_data.get("name")) or company.name
    company.slug = _extract_string(company_data.get("slug"))
    company.image_url = _extract_string(company_data.get("image_url"))
    company.is_active = True

    await session.flush()
    await session.refresh(company)
    return company


async def sync_clerk_company_membership_event(
    session: AsyncSession,
    event: Mapping[str, Any],
) -> CompanyMembership | None:
    event_type = event.get("type")
    membership_data = event.get("data")
    if not isinstance(event_type, str) or not isinstance(membership_data, Mapping):
        return None

    if event_type not in {
        "organizationMembership.created",
        "organizationMembership.updated",
        "organizationMembership.deleted",
    }:
        return None

    clerk_membership_id = _extract_string(membership_data.get("id"))
    clerk_organization_id = _extract_organization_id(membership_data)
    clerk_user_id = _extract_membership_user_id(membership_data)
    if clerk_membership_id is None or clerk_organization_id is None or clerk_user_id is None:
        return None

    company = await _get_company_by_id(session, clerk_organization_id)
    if company is None:
        company = Company(
            id=clerk_organization_id,
            name=clerk_organization_id,
            is_active=True,
        )
        session.add(company)
        await session.flush()

    user = await _get_user_by_clerk_id(session, clerk_user_id)
    if user is None:
        user = User(clerk_user_id=clerk_user_id, is_active=True)
        session.add(user)
        await session.flush()

    membership = await _get_membership_by_clerk_id(session, clerk_membership_id)
    if membership is None:
        membership = await _get_membership_by_company_user(session, company.id, user.id)
    if membership is None and event_type != "organizationMembership.deleted":
        membership = CompanyMembership(
            clerk_membership_id=clerk_membership_id,
            company_id=company.id,
            user_id=user.id,
            role=normalize_company_role(_extract_string(membership_data.get("role"))),
            status="active",
        )
        session.add(membership)
    elif membership is None:
        return None

    membership.clerk_membership_id = clerk_membership_id
    membership.company_id = company.id
    membership.user_id = user.id
    membership.role = normalize_company_role(
        _extract_string(membership_data.get("role")) or membership.role
    )
    membership.status = "inactive" if event_type == "organizationMembership.deleted" else "active"

    await session.flush()
    await session.refresh(membership)
    return membership


async def sync_clerk_event(session: AsyncSession, event: Mapping[str, Any]) -> None:
    await sync_clerk_user_event(session, event)
    await sync_clerk_company_event(session, event)
    await sync_clerk_company_membership_event(session, event)
