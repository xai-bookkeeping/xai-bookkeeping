from collections.abc import Callable
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.role_permission import RolePermission
from app.db.session import get_db_session
from app.platform.company_access import CompanyAccessContext, get_company_access_context

COMPANY_ROLES = ("owner", "admin", "accountant", "viewer")

ROLE_LABELS: dict[str, str] = {
    "owner": "Owner",
    "admin": "Admin",
    "accountant": "Accountant",
    "viewer": "Viewer",
}

ROLE_HELPER_COPY: dict[str, str] = {
    "owner": "Full company access, including billing and company management.",
    "admin": "Full company access except billing ownership.",
    "accountant": "Can work with finance records, reports, and audit history.",
    "viewer": "Can view records and reports but cannot make changes.",
}

FIXED_ROLE_PERMISSION_MATRIX: dict[str, set[str]] = {
    "owner": {
        "audit:view",
        "company:configure",
        "records:approve",
        "records:create",
        "records:delete",
        "records:edit",
        "records:view",
        "reports:export",
        "reports:view",
        "settings:update",
        "users:invite",
        "users:remove",
        "users:update-role",
        "users:view",
    },
    "admin": {
        "audit:view",
        "records:approve",
        "records:create",
        "records:delete",
        "records:edit",
        "records:view",
        "reports:export",
        "reports:view",
        "settings:update",
        "users:invite",
        "users:remove",
        "users:update-role",
        "users:view",
    },
    "accountant": {
        "audit:view",
        "records:approve",
        "records:create",
        "records:edit",
        "records:view",
        "reports:export",
        "reports:view",
        "users:view",
    },
    "viewer": {
        "records:view",
        "reports:view",
        "users:view",
    },
}


def normalize_company_role(role: str | None) -> str:
    if not role:
        return "viewer"

    normalized = role.strip().lower()
    if normalized not in COMPANY_ROLES:
        return "viewer"
    return normalized


def permission_id(resource: str, action: str) -> str:
    return f"{resource}:{action}"


def build_fixed_role_permissions() -> list[tuple[str, str, str]]:
    rows: list[tuple[str, str, str]] = []
    for role, permissions in FIXED_ROLE_PERMISSION_MATRIX.items():
        for entry in sorted(permissions):
            resource, action = entry.split(":", maxsplit=1)
            rows.append((role, resource, action))
    return rows


@dataclass(frozen=True)
class CompanyPermissionContext:
    access: CompanyAccessContext
    permissions: frozenset[str]

    def has(self, permission: str) -> bool:
        return permission in self.permissions


async def list_permissions_for_role(session: AsyncSession, role: str) -> frozenset[str]:
    normalized_role = normalize_company_role(role)
    statement = select(RolePermission).where(RolePermission.role == normalized_role)
    rows = (await session.scalars(statement)).all()
    return frozenset(permission_id(row.resource, row.action) for row in rows)


async def get_company_permission_context(
    access: CompanyAccessContext = Depends(get_company_access_context),
    session: AsyncSession = Depends(get_db_session),
) -> CompanyPermissionContext:
    permissions = await list_permissions_for_role(session, access.membership.role)
    return CompanyPermissionContext(access=access, permissions=permissions)


def require_company_permission(permission: str) -> Callable[..., CompanyPermissionContext]:
    async def dependency(
        context: CompanyPermissionContext = Depends(get_company_permission_context),
    ) -> CompanyPermissionContext:
        if permission not in context.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"You do not have permission to do that in {context.access.company.name}.",
            )
        return context

    return dependency
