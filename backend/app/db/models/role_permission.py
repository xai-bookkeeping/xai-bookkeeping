from datetime import datetime

from sqlalchemy import DateTime, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class RolePermission(Base):
    """Fixed role-to-permission mapping for company-scoped authorization."""

    __tablename__ = "role_permissions"
    __table_args__ = (
        UniqueConstraint("role", "resource", "action", name="uq_role_permissions_role_resource_action"),
    )

    role: Mapped[str] = mapped_column(String(32), primary_key=True)
    resource: Mapped[str] = mapped_column(String(64), primary_key=True)
    action: Mapped[str] = mapped_column(String(64), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
