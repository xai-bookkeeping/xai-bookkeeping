from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict

from app.platform.company_access import CompanyAccessContext, get_company_access_context

router = APIRouter(prefix="/api/v1/companies", tags=["companies"])


class CompanyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    slug: str | None
    image_url: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime


@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company(
    access: CompanyAccessContext = Depends(get_company_access_context),
) -> CompanyResponse:
    return CompanyResponse.model_validate(access.company)
