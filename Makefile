SHELL := /bin/sh
COMPOSE ?= docker compose

.PHONY: dev down logs

dev:
	$(COMPOSE) up --build

down:
	$(COMPOSE) down --remove-orphans

logs:
	$(COMPOSE) logs -f --tail=100
