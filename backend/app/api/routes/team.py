from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Path, Response, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import record_audit_event
from app.db.models.company_membership import CompanyMembership
from app.db.models.user import User
from app.db.session import get_db_session
from app.platform.clerk_organizations import (
    ClerkInvitationRecord,
    ClerkOrganizationClient,
    get_clerk_organization_client,
)
from app.platform.permissions import (
    CompanyPermissionContext,
    ROLE_HELPER_COPY,
    ROLE_LABELS,
    get_company_permission_context,
    normalize_company_role,
    require_company_permission,
)

router = APIRouter(prefix="/api/v1/companies/{company_id}/team", tags=["team"])

CompanyRole = Literal["owner", "admin", "accountant", "viewer"]


class TeamPermissionsResponse(BaseModel):
    can_change_roles: bool
    can_invite_members: bool
    can_remove_members: bool


class TeamMemberResponse(BaseModel):
    clerk_membership_id: str
    clerk_user_id: str
    email_address: str | None
    is_current_user: bool
    last_active_at: datetime | None
    name: str
    role: CompanyRole
    role_description: str
    role_label: str
    status: str


class PendingInviteResponse(BaseModel):
    created_at: datetime | None
    email_address: str
    id: str
    role: CompanyRole
    role_description: str
    role_label: str
    status: str


class TeamDirectoryResponse(BaseModel):
    members: list[TeamMemberResponse]
    pending_invites: list[PendingInviteResponse]
    permissions: TeamPermissionsResponse


class TeamInviteRequest(BaseModel):
    email_address: str
    message: str | None = None
    role: CompanyRole = "viewer"


class TeamInviteResponse(BaseModel):
    created_at: datetime | None
    email_address: str
    id: str
    role: CompanyRole
    role_description: str
    role_label: str
    status: str


class TeamRoleUpdateRequest(BaseModel):
    role: CompanyRole


class TeamActionResponse(BaseModel):
    status: str


async def _get_company_member(
    session: AsyncSession,
    *,
    clerk_user_id: str,
    company_id: str,
) -> tuple[User, CompanyMembership]:
    statement = (
        select(User, CompanyMembership)
        .join(CompanyMembership, CompanyMembership.user_id == User.id)
        .where(CompanyMembership.company_id == company_id)
        .where(User.clerk_user_id == clerk_user_id)
    )
    row = (await session.execute(statement)).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company member not found")
    return row


def _build_display_name(user: User) -> str:
    full_name = " ".join(part for part in [user.first_name, user.last_name] if part)
    if full_name:
        return full_name
    if user.username:
        return user.username
    if user.primary_email_address:
        return user.primary_email_address
    return user.clerk_user_id


def _build_permissions_response(context: CompanyPermissionContext) -> TeamPermissionsResponse:
    return TeamPermissionsResponse(
        can_change_roles=context.has("users:update-role"),
        can_invite_members=context.has("users:invite"),
        can_remove_members=context.has("users:remove"),
    )


def _serialize_invitation(invitation: ClerkInvitationRecord) -> PendingInviteResponse:
    role = normalize_company_role(invitation.role)
    created_at = invitation.created_at if isinstance(invitation.created_at, datetime) else None
    return PendingInviteResponse(
        created_at=created_at,
        email_address=invitation.email_address,
        id=invitation.id,
        role=role,
        role_description=ROLE_HELPER_COPY[role],
        role_label=ROLE_LABELS[role],
        status=invitation.status,
    )


@router.get("", response_model=TeamDirectoryResponse)
async def get_team_directory(
    context: CompanyPermissionContext = Depends(get_company_permission_context),
    clerk_client: ClerkOrganizationClient = Depends(get_clerk_organization_client),
    session: AsyncSession = Depends(get_db_session),
) -> TeamDirectoryResponse:
    statement = (
        select(User, CompanyMembership)
        .join(CompanyMembership, CompanyMembership.user_id == User.id)
        .where(CompanyMembership.company_id == context.access.company.id)
        .where(CompanyMembership.status == "active")
        .order_by(User.primary_email_address.asc().nullslast(), User.id.asc())
    )
    rows = (await session.execute(statement)).all()
    invitations = clerk_client.list_pending_invitations(context.access.company.id)

    members = [
        TeamMemberResponse(
            clerk_membership_id=membership.clerk_membership_id,
            clerk_user_id=user.clerk_user_id,
            email_address=user.primary_email_address,
            is_current_user=user.clerk_user_id == context.access.principal.clerk_user_id,
            last_active_at=user.updated_at,
            name=_build_display_name(user),
            role=normalize_company_role(membership.role),
            role_description=ROLE_HELPER_COPY[normalize_company_role(membership.role)],
            role_label=ROLE_LABELS[normalize_company_role(membership.role)],
            status=membership.status,
        )
        for user, membership in rows
    ]

    return TeamDirectoryResponse(
        members=members,
        pending_invites=[_serialize_invitation(invitation) for invitation in invitations],
        permissions=_build_permissions_response(context),
    )


@router.post("/invitations", response_model=TeamInviteResponse, status_code=status.HTTP_201_CREATED)
async def invite_team_member(
    request: TeamInviteRequest,
    permission: CompanyPermissionContext = Depends(require_company_permission("users:invite")),
    clerk_client: ClerkOrganizationClient = Depends(get_clerk_organization_client),
    session: AsyncSession = Depends(get_db_session),
) -> TeamInviteResponse:
    invitation = clerk_client.invite_member(
        company_id=permission.access.company.id,
        email_address=request.email_address,
        inviter_user_id=permission.access.principal.clerk_user_id,
        message=request.message,
        role=request.role,
    )
    serialized = _serialize_invitation(invitation)
    await record_audit_event(
        session,
        action="team.member_invited",
        actor_clerk_user_id=permission.access.principal.clerk_user_id,
        after_state=serialized.model_dump(mode="json"),
        before_state=None,
        company_id=permission.access.company.id,
        entity_id=serialized.id,
        entity_type="invitation",
        session_id=permission.access.principal.session_id,
    )
    await session.commit()
    return TeamInviteResponse(**serialized.model_dump())


@router.patch("/members/{clerk_user_id}", response_model=TeamActionResponse)
async def update_member_role(
    request: TeamRoleUpdateRequest,
    clerk_user_id: str = Path(...),
    permission: CompanyPermissionContext = Depends(require_company_permission("users:update-role")),
    clerk_client: ClerkOrganizationClient = Depends(get_clerk_organization_client),
    session: AsyncSession = Depends(get_db_session),
) -> TeamActionResponse:
    user, membership = await _get_company_member(
        session,
        clerk_user_id=clerk_user_id,
        company_id=permission.access.company.id,
    )
    clerk_client.update_member_role(
        company_id=permission.access.company.id,
        clerk_user_id=clerk_user_id,
        role=request.role,
    )
    await record_audit_event(
        session,
        action="team.role_updated",
        actor_clerk_user_id=permission.access.principal.clerk_user_id,
        after_state={
            "email_address": user.primary_email_address,
            "role": request.role,
        },
        before_state={
            "email_address": user.primary_email_address,
            "role": membership.role,
        },
        company_id=permission.access.company.id,
        entity_id=clerk_user_id,
        entity_type="membership",
        session_id=permission.access.principal.session_id,
    )
    await session.commit()
    return TeamActionResponse(status="accepted")


@router.delete("/members/{clerk_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    clerk_user_id: str = Path(...),
    permission: CompanyPermissionContext = Depends(require_company_permission("users:remove")),
    clerk_client: ClerkOrganizationClient = Depends(get_clerk_organization_client),
    session: AsyncSession = Depends(get_db_session),
) -> Response:
    user, membership = await _get_company_member(
        session,
        clerk_user_id=clerk_user_id,
        company_id=permission.access.company.id,
    )
    clerk_client.remove_member(
        company_id=permission.access.company.id,
        clerk_user_id=clerk_user_id,
    )
    await record_audit_event(
        session,
        action="team.member_removed",
        actor_clerk_user_id=permission.access.principal.clerk_user_id,
        after_state={
            "email_address": user.primary_email_address,
            "status": "removed",
        },
        before_state={
            "email_address": user.primary_email_address,
            "role": membership.role,
            "status": membership.status,
        },
        company_id=permission.access.company.id,
        entity_id=clerk_user_id,
        entity_type="membership",
        session_id=permission.access.principal.session_id,
    )
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_invitation(
    invitation_id: str = Path(...),
    permission: CompanyPermissionContext = Depends(require_company_permission("users:invite")),
    clerk_client: ClerkOrganizationClient = Depends(get_clerk_organization_client),
    session: AsyncSession = Depends(get_db_session),
) -> Response:
    invitation = clerk_client.revoke_invitation(
        company_id=permission.access.company.id,
        invitation_id=invitation_id,
        requesting_user_id=permission.access.principal.clerk_user_id,
    )
    await record_audit_event(
        session,
        action="team.invitation_revoked",
        actor_clerk_user_id=permission.access.principal.clerk_user_id,
        after_state={
            "email_address": invitation.email_address,
            "status": invitation.status,
        },
        before_state={
            "status": "pending",
        },
        company_id=permission.access.company.id,
        entity_id=invitation_id,
        entity_type="invitation",
        session_id=permission.access.principal.session_id,
    )
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
