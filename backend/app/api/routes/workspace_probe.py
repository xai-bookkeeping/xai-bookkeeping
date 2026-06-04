from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.platform.workspace_probe import (
    WorkspaceProbeCreateRequest,
    WorkspaceProbeResponse,
    create_workspace_probe as create_workspace_probe_record,
    get_latest_workspace_probe as get_latest_workspace_probe_record,
)

router = APIRouter(tags=["workspace-probe"])


@router.post("/workspace-probe", response_model=WorkspaceProbeResponse, status_code=201)
def create_workspace_probe(
    payload: WorkspaceProbeCreateRequest,
    session: Session = Depends(get_db_session),
) -> WorkspaceProbeResponse:
    return create_workspace_probe_record(session=session, payload=payload)


@router.get("/workspace-probe/latest", response_model=WorkspaceProbeResponse)
def get_latest_workspace_probe(
    session: Session = Depends(get_db_session),
) -> WorkspaceProbeResponse:
    probe_run = get_latest_workspace_probe_record(session)
    if probe_run is None:
        raise HTTPException(status_code=404, detail="No workspace probe runs have been recorded")
    return probe_run
