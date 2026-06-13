"""Platform-level workspace probe helpers for the Phase 1 walking skeleton."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.repositories.workspace_probe import (
    create_workspace_probe_run,
    get_latest_workspace_probe_run,
)

WorkspaceProbeStatus = Literal["completed"]


class WorkspaceProbeCreateRequest(BaseModel):
    source: str = Field(min_length=1, max_length=120)
    status: WorkspaceProbeStatus = "completed"


class WorkspaceProbeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source: str
    status: WorkspaceProbeStatus
    created_at: datetime
    updated_at: datetime


async def create_workspace_probe(
    session: AsyncSession,
    payload: WorkspaceProbeCreateRequest,
) -> WorkspaceProbeResponse:
    probe_run = await create_workspace_probe_run(
        session=session,
        source=payload.source,
        status=payload.status,
    )
    return WorkspaceProbeResponse.model_validate(probe_run)


async def get_latest_workspace_probe(session: AsyncSession) -> WorkspaceProbeResponse | None:
    probe_run = await get_latest_workspace_probe_run(session)
    if probe_run is None:
        return None
    return WorkspaceProbeResponse.model_validate(probe_run)
