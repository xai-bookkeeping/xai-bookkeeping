from fastapi import APIRouter

from app.api.routes.audit import router as audit_router
from app.api.routes.auth import router as auth_router
from app.api.routes.company_settings import router as company_settings_router
from app.api.routes.companies import router as companies_router
from app.api.routes.health import router as health_router
from app.api.routes.team import router as team_router
from app.api.routes.workspace_probe import router as workspace_probe_router

api_router = APIRouter()
api_router.include_router(audit_router)
api_router.include_router(auth_router)
api_router.include_router(company_settings_router)
api_router.include_router(companies_router)
api_router.include_router(health_router)
api_router.include_router(team_router)
api_router.include_router(workspace_probe_router)
