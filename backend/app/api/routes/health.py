from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings
from app.platform.health import HealthResponse, build_health_response

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def get_health(settings: Settings = Depends(get_settings)) -> HealthResponse:
    return build_health_response(settings)
