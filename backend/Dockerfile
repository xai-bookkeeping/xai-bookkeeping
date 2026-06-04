FROM python:3.14-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

COPY pyproject.toml ./
COPY app ./app

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -e ".[dev]"

RUN ln -s /app/backend/alembic.ini /app/alembic.ini

EXPOSE 8000

CMD ["sh", "-lc", "uvicorn app.main:app --host 0.0.0.0 --port ${API_CONTAINER_PORT:-8000} --reload"]
