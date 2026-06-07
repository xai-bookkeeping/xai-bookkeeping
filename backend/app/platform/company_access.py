from dataclasses import dataclass

from fastapi import Depends, HTTPException, Path, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.company import Company
from app.db.models.company_membership import CompanyMembership
from app.db.models.user import User
from app.db.session import get_db_session
from app.platform.auth import AuthenticatedPrincipal, get_authenticated_principal


@dataclass(frozen=True)
class CompanyAccessContext:
    principal: AuthenticatedPrincipal
    user: User
    company: Company
    membership: CompanyMembership


async def get_company_access_context(
    company_id: str = Path(...),
    principal: AuthenticatedPrincipal = Depends(get_authenticated_principal),
    session: AsyncSession = Depends(get_db_session),
) -> CompanyAccessContext:
    if principal.active_organization_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this company",
        )

    statement = (
        select(User, Company, CompanyMembership)
        .join(CompanyMembership, CompanyMembership.user_id == User.id)
        .join(Company, Company.id == CompanyMembership.company_id)
        .where(User.clerk_user_id == principal.clerk_user_id)
        .where(User.is_active.is_(True))
        .where(Company.id == company_id)
        .where(Company.is_active.is_(True))
        .where(CompanyMembership.status == "active")
    )
    row = (await session.execute(statement)).first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this company",
        )

    user, company, membership = row
    return CompanyAccessContext(
        principal=principal,
        user=user,
        company=company,
        membership=membership,
    )
