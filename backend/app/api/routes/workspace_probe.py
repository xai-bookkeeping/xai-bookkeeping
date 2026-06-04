from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ConfigDict
from sqlalchemy.orm import Session

from app.db.repositories.workspace_probe import (
    create_workspace_probe_run,
    get_latest_workspace_probe_run,
)
from app.db.session import get_db_session

router = APIRouter(tags=["workspace-probe"])

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


@router.post("/workspace-probe", response_model=WorkspaceProbeResponse, status_code=201)
def create_workspace_probe(
    payload: WorkspaceProbeCreateRequest,
    session: Session = Depends(get_db_session),
) -> WorkspaceProbeResponse:
    probe_run = create_workspace_probe_run(
        session=session,
        source=payload.source,
        status=payload.status,
    )
    return WorkspaceProbeResponse.model_validate(probe_run)


@router.get("/workspace-probe/latest", response_model=WorkspaceProbeResponse)
def get_latest_workspace_probe(
    session: Session = Depends(get_db_session),
) -> WorkspaceProbeResponse:
    probe_run = get_latest_workspace_probe_run(session)
    if probe_run is None:
        raise HTTPException(status_code=404, detail="No workspace probe runs have been recorded")
    return WorkspaceProbeResponse.model_validate(probe_run)
