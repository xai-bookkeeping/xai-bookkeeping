from logging.config import fileConfig

from alembic import context
from sqlalchemy.engine import Engine

from app.core.config import get_settings
from app.db.base import Base
from app.db.models import AuditEvent  # noqa: F401
from app.db.models import Company  # noqa: F401
from app.db.models import CompanyMembership  # noqa: F401
from app.db.models import RolePermission  # noqa: F401
from app.db.models import User  # noqa: F401
from app.db.models import WorkspaceProbeRun  # noqa: F401
from app.db.session import build_engine

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

settings = get_settings()
if settings.database_url is None:
    raise RuntimeError("DATABASE_URL is required for Alembic migrations")

target_metadata = Base.metadata
config.set_main_option("sqlalchemy.url", settings.database_url)


def run_migrations_offline() -> None:
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable: Engine = build_engine(settings.database_url)

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
