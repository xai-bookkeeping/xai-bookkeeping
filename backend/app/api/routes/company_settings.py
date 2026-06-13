from decimal import Decimal
import re
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from app.audit.service import record_audit_event
from app.db.models.company import Company
from app.db.session import get_db_session
from app.platform.company_access import CompanyAccessContext, get_company_access_context
from app.platform.permissions import CompanyPermissionContext, require_company_permission

router = APIRouter(prefix="/api/v1/companies/{company_id}/settings", tags=["company-settings"])

TRN_PATTERN = re.compile(r"^\d{15}$")


class CompanySettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    business_activity: str | None
    default_currency: str
    default_vat_rate: Decimal
    legal_name: str
    registered_address: str | None
    trn: str | None
    vat_registration_status: Literal["not_registered", "registered"]


class CompanySettingsUpdateRequest(BaseModel):
    business_activity: str
    legal_name: str
    registered_address: str | None = None
    trn: str | None = None
    vat_registration_status: Literal["not_registered", "registered"]

    @field_validator("business_activity", "legal_name")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("This field is required")
        return stripped

    @field_validator("trn")
    @classmethod
    def validate_trn(cls, value: str | None) -> str | None:
        if value is None or value == "":
            return None
        if not TRN_PATTERN.match(value):
            raise ValueError("TRN must be 15 digits")
        return value


def _serialize_company_settings(company: Company) -> CompanySettingsResponse:
    return CompanySettingsResponse(
        business_activity=company.business_activity,
        default_currency=company.default_currency,
        default_vat_rate=company.default_vat_rate,
        legal_name=company.legal_name or company.name,
        registered_address=company.registered_address,
        trn=company.trn,
        vat_registration_status=company.vat_registration_status,
    )


@router.get("", response_model=CompanySettingsResponse)
async def get_company_settings(
    access: CompanyAccessContext = Depends(get_company_access_context),
) -> CompanySettingsResponse:
    return _serialize_company_settings(access.company)


@router.patch("", response_model=CompanySettingsResponse)
async def update_company_settings(
    request: CompanySettingsUpdateRequest,
    permission: CompanyPermissionContext = Depends(require_company_permission("settings:update")),
    session: AsyncSession = Depends(get_db_session),
) -> CompanySettingsResponse:
    company = permission.access.company
    before_state = _serialize_company_settings(company).model_dump(mode="json")

    company.legal_name = request.legal_name
    company.business_activity = request.business_activity
    company.trn = request.trn
    company.vat_registration_status = request.vat_registration_status
    company.registered_address = request.registered_address

    await session.flush()
    await record_audit_event(
        session,
        action="company.settings_updated",
        actor_clerk_user_id=permission.access.principal.clerk_user_id,
        after_state=_serialize_company_settings(company).model_dump(mode="json"),
        before_state=before_state,
        company_id=company.id,
        entity_id=company.id,
        entity_type="company",
        session_id=permission.access.principal.session_id,
    )
    await session.commit()
    await session.refresh(company)
    return _serialize_company_settings(company)
