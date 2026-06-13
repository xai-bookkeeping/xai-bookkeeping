from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from svix.webhooks import WebhookVerificationError

from app.audit.service import record_audit_event
from app.api.routes.companies import CompanyResponse
from app.db.models.audit_event import AuditEvent
from app.db.models.company import Company
from app.db.models.company_membership import CompanyMembership
from app.db.models.user import User
from app.db.session import get_db_session
from app.platform.auth import AuthenticatedPrincipal, get_authenticated_principal
from app.platform.clerk_organizations import (
    ClerkOrganizationClient,
    get_clerk_organization_client,
)
from app.platform.company_access import load_company_access_row_state
from app.platform.webhooks import (
    sync_clerk_event,
    sync_clerk_organization_materialization,
    verify_clerk_webhook,
)

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


class AuthBootstrapResponse(BaseModel):
    status: Literal["no_active_company", "company_context_pending", "ready"]
    active_organization_id: str | None = None
    company: CompanyResponse | None = None
    membership_role: str | None = None


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

    if principal.active_organization_id and principal.session_id:
        existing_event = (await session.scalars(
            select(AuditEvent)
            .where(AuditEvent.company_id == principal.active_organization_id)
            .where(AuditEvent.action == "auth.login_success")
            .where(AuditEvent.session_id == principal.session_id)
        )).first()

        if existing_event is None:
            company = await session.get(Company, principal.active_organization_id)
            membership = (await session.scalars(
                select(CompanyMembership)
                .where(CompanyMembership.company_id == principal.active_organization_id)
                .where(CompanyMembership.user_id == user.id)
                .where(CompanyMembership.status == "active")
            )).first()
            if company is not None and company.is_active and membership is not None:
                await record_audit_event(
                    session,
                    action="auth.login_success",
                    actor_clerk_user_id=principal.clerk_user_id,
                    after_state={
                        "role": membership.role,
                        "status": membership.status,
                    },
                    before_state=None,
                    company_id=company.id,
                    entity_id=principal.session_id,
                    entity_type="session",
                    session_id=principal.session_id,
                )
                await session.commit()

    return AuthenticatedUserResponse.model_validate(user)


@router.get("/auth/bootstrap", response_model=AuthBootstrapResponse)
async def get_auth_bootstrap(
    principal: AuthenticatedPrincipal = Depends(get_authenticated_principal),
    clerk_client: ClerkOrganizationClient = Depends(get_clerk_organization_client),
    session: AsyncSession = Depends(get_db_session),
) -> AuthBootstrapResponse:
    active_company_id = principal.active_organization_id
    if active_company_id is None:
        return AuthBootstrapResponse(status="no_active_company")

    state = await load_company_access_row_state(
        session,
        principal=principal,
        company_id=active_company_id,
    )
    if state.is_ready:
        return AuthBootstrapResponse(
            status="ready",
            active_organization_id=active_company_id,
            company=CompanyResponse.model_validate(state.company),
            membership_role=state.membership.role,
        )

    snapshot = clerk_client.get_principal_company_snapshot(
        company_id=active_company_id,
        clerk_user_id=principal.clerk_user_id,
    )
    if snapshot is not None:
        await sync_clerk_organization_materialization(
            session,
            clerk_user_id=principal.clerk_user_id,
            organization=snapshot.organization,
            membership=snapshot.membership,
        )
        await session.commit()

        state = await load_company_access_row_state(
            session,
            principal=principal,
            company_id=active_company_id,
        )
        if state.is_ready:
            return AuthBootstrapResponse(
                status="ready",
                active_organization_id=active_company_id,
                company=CompanyResponse.model_validate(state.company),
                membership_role=state.membership.role,
            )

    return AuthBootstrapResponse(
        status="company_context_pending",
        active_organization_id=active_company_id,
    )


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
