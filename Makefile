SHELL := /bin/sh
COMPOSE ?= docker compose

.PHONY: dev down logs gen-types test-backend test-frontend verify-stack config build

dev:
	$(COMPOSE) up --build

down:
	$(COMPOSE) down --remove-orphans

logs:
	$(COMPOSE) logs -f --tail=100

gen-types:
	@printf '%s\n' 'Phase 1 Plan 3 will replace this placeholder with OpenAPI client generation.'

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
