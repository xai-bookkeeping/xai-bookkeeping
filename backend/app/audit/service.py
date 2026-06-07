from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.audit_event import AuditEvent


async def record_audit_event(
    session: AsyncSession,
    *,
    action: str,
    actor_clerk_user_id: str | None,
    after_state: dict[str, Any] | None,
    before_state: dict[str, Any] | None,
    company_id: str,
    entity_id: str,
    entity_type: str,
    session_id: str | None = None,
) -> AuditEvent:
    event = AuditEvent(
        action=action,
        actor_clerk_user_id=actor_clerk_user_id,
        after_state=after_state,
        before_state=before_state,
        company_id=company_id,
        entity_id=entity_id,
        entity_type=entity_type,
        session_id=session_id,
    )
    session.add(event)
    await session.flush()
    await session.refresh(event)
    return event
