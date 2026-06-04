SHELL := /bin/sh
COMPOSE ?= docker compose

.PHONY: dev down logs gen-types migrate-backend test-backend test-frontend verify-stack verify-images config build

OPENAPI_SPEC_DIR ?= /tmp/xai-books-openapi

dev:
	$(COMPOSE) up --build

down:
	$(COMPOSE) down --remove-orphans

logs:
	$(COMPOSE) logs -f --tail=100

gen-types:
	@mkdir -p "$(OPENAPI_SPEC_DIR)"
	@$(COMPOSE) run --rm --no-deps -v "$(OPENAPI_SPEC_DIR):/spec" backend python -c 'from app.main import app; from pathlib import Path; import json; Path("/spec/openapi.json").write_text(json.dumps(app.openapi(), indent=2, sort_keys=True))'
	@$(COMPOSE) run --rm --no-deps -v "$(OPENAPI_SPEC_DIR):/spec" frontend npm run gen-types

migrate-backend:
	$(COMPOSE) run --rm backend alembic upgrade head

test-backend:
	$(COMPOSE) run --rm backend pytest -q

test-frontend:
	$(COMPOSE) run --rm frontend npm run test -- --run

config:
	$(COMPOSE) config

build:
	$(COMPOSE) build backend frontend

verify-stack:
	$(COMPOSE) config >/dev/null && $(COMPOSE) build backend frontend

verify-images: build
	docker run --rm --entrypoint npm xai-bookkeeping-frontend run build
	docker run --rm --entrypoint sh xai-bookkeeping-backend -lc 'alembic upgrade head'
