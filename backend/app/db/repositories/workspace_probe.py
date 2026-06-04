from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.workspace_probe import WorkspaceProbeRun


def create_workspace_probe_run(session: Session, source: str, status: str) -> WorkspaceProbeRun:
    """Persist a new workspace probe row and return the stored ORM object."""

    probe_run = WorkspaceProbeRun(source=source, status=status)
    session.add(probe_run)
    session.commit()
    session.refresh(probe_run)
    return probe_run


def get_latest_workspace_probe_run(session: Session) -> WorkspaceProbeRun | None:
    """Return the newest workspace probe row, if one exists."""

    statement = select(WorkspaceProbeRun).order_by(WorkspaceProbeRun.id.desc()).limit(1)
    return session.scalars(statement).first()
