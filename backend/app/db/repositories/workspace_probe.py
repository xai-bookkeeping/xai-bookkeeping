from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.workspace_probe import WorkspaceProbeRun


async def create_workspace_probe_run(
    session: AsyncSession,
    source: str,
    status: str,
) -> WorkspaceProbeRun:
    """Persist a new workspace probe row and return the stored ORM object."""

    probe_run = WorkspaceProbeRun(source=source, status=status)
    session.add(probe_run)
    await session.commit()
    await session.refresh(probe_run)
    return probe_run


async def get_latest_workspace_probe_run(session: AsyncSession) -> WorkspaceProbeRun | None:
    """Return the newest workspace probe row, if one exists."""

    statement = select(WorkspaceProbeRun).order_by(WorkspaceProbeRun.id.desc()).limit(1)
    return (await session.scalars(statement)).first()
