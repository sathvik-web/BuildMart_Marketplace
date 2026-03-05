# ============================================================
# BuildMart — Makefile
# Shortcuts for common development tasks.
# Usage: make <target>
# ============================================================

.PHONY: help setup dev build test lint clean db-up db-down

PNPM := pnpm
COMPOSE := docker compose

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-22s\033[0m %s\n", $$1, $$2}'

# ── First-time setup ─────────────────────────────────────
setup: ## Full first-time setup: install deps, start Docker, migrate DB, seed
	$(PNPM) install
	$(COMPOSE) up -d postgres redis
	@echo "⏳ Waiting for Postgres to be ready..."
	@sleep 8
	$(PNPM) db:generate
	$(PNPM) db:migrate:dev
	$(PNPM) db:seed
	@echo "✅  BuildMart dev environment ready!"

# ── Development ──────────────────────────────────────────
dev: ## Start all apps in dev mode (Turbo watch)
	$(PNPM) dev

dev-api: ## Start only the NestJS API
	$(PNPM) dev:api

dev-web: ## Start only the Next.js web app
	$(PNPM) dev:web

# ── Build ─────────────────────────────────────────────────
build: ## Build all apps via Turbo
	$(PNPM) build

# ── Testing ──────────────────────────────────────────────
test: ## Run unit tests
	$(PNPM) test

test-e2e: ## Run e2e tests
	$(PNPM) test:e2e

# ── Linting ───────────────────────────────────────────────
lint: ## Lint all packages
	$(PNPM) lint

type-check: ## TypeScript type check all packages
	$(PNPM) type-check

# ── Database ──────────────────────────────────────────────
db-up: ## Start Postgres + Redis
	$(COMPOSE) up -d postgres redis

db-down: ## Stop database services
	$(COMPOSE) stop postgres redis

db-migrate: ## Run Prisma migrations (dev)
	$(PNPM) db:migrate:dev

db-studio: ## Open Prisma Studio
	$(PNPM) db:studio

db-seed: ## Seed the database
	$(PNPM) db:seed

db-reset: ## Reset database (drop + re-migrate + seed)
	$(PNPM) db:reset && $(PNPM) db:seed

# ── Docker ────────────────────────────────────────────────
docker-up: ## Start all Docker services
	$(COMPOSE) up -d

docker-tools: ## Start Docker + GUI tools (pgAdmin, RedisInsight)
	$(COMPOSE) --profile tools up -d

docker-down: ## Stop all Docker services
	$(COMPOSE) down

docker-full: ## Start Docker + API container
	$(COMPOSE) --profile full up -d

docker-nuke: ## ⚠  Destroy all containers + volumes
	$(COMPOSE) down -v --remove-orphans

# ── Cleanup ───────────────────────────────────────────────
clean: ## Remove all build artifacts and node_modules
	$(PNPM) clean
