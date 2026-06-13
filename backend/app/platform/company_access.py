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


@dataclass(frozen=True)
class CompanyAccessRowState:
    user: User | None
    company: Company | None
    membership: CompanyMembership | None

    @property
    def is_ready(self) -> bool:
        return (
            self.user is not None
            and self.user.is_active
            and self.company is not None
            and self.company.is_active
            and self.membership is not None
            and self.membership.status == "active"
        )

    @property
    def is_pending(self) -> bool:
        return self.user is None or self.company is None or self.membership is None


def build_company_context_pending_detail(company_id: str) -> dict[str, str]:
    return {
        "code": "company_context_pending",
        "company_id": company_id,
        "message": "Company context is still materializing. Please try again.",
    }


async def load_company_access_row_state(
    session: AsyncSession,
    *,
    principal: AuthenticatedPrincipal,
    company_id: str,
) -> CompanyAccessRowState:
    user = (await session.scalars(select(User).where(User.clerk_user_id == principal.clerk_user_id))).first()
    company = await session.get(Company, company_id)

    membership = None
    if user is not None:
        membership = (
            await session.scalars(
                select(CompanyMembership)
                .where(CompanyMembership.company_id == company_id)
                .where(CompanyMembership.user_id == user.id)
            )
        ).first()

    return CompanyAccessRowState(
        user=user,
        company=company,
        membership=membership,
    )


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

    state = await load_company_access_row_state(
        session,
        principal=principal,
        company_id=company_id,
    )

    if state.is_pending:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=build_company_context_pending_detail(company_id),
        )

    if not state.is_ready:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this company",
        )

    return CompanyAccessContext(
        principal=principal,
        user=state.user,
        company=state.company,
        membership=state.membership,
    )
