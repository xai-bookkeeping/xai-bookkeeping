from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.audit_event import AuditEvent
from app.db.session import get_db_session
from app.platform.permissions import CompanyPermissionContext, require_company_permission

router = APIRouter(prefix="/api/v1/companies/{company_id}/audit-events", tags=["audit"])


class AuditEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    action: str
    actor_clerk_user_id: str | None
    after_state: dict[str, Any] | None
    before_state: dict[str, Any] | None
    company_id: str
    created_at: datetime
    entity_id: str
    entity_type: str
    id: int
    session_id: str | None


class AuditEventListResponse(BaseModel):
    events: list[AuditEventResponse]


@router.get("", response_model=AuditEventListResponse)
async def list_audit_events(
    limit: int = Query(default=50, ge=1, le=200),
    permission: CompanyPermissionContext = Depends(require_company_permission("audit:view")),
    session: AsyncSession = Depends(get_db_session),
) -> AuditEventListResponse:
    statement = (
        select(AuditEvent)
        .where(AuditEvent.company_id == permission.access.company.id)
        .order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc())
        .limit(limit)
    )
    events = (await session.scalars(statement)).all()
    return AuditEventListResponse(
        events=[AuditEventResponse.model_validate(event) for event in events],
    )
