.PHONY: dev down reset-db logs migrate migrate-create install

dev:
	docker-compose up --build

down:
	docker-compose down

reset-db:
	docker-compose down -v
	docker volume rm schedula_schedula-db-data || true
	docker-compose up --build

logs:
	docker-compose logs -f

migrate:
	docker-compose exec backend npm run prisma:migrate

migrate-create:
	docker-compose exec backend npm run prisma:migrate:create

install:
	docker-compose exec backend npm install
	docker-compose exec frontend npm install

help:
	@echo "Schedula - Development Commands"
	@echo "================================"
	@echo "make dev          - Start all services with Docker Compose"
	@echo "make down         - Stop all services"
	@echo "make reset-db     - Drop database volume and restart"
	@echo "make logs         - Follow logs from all services"
	@echo "make migrate      - Run Prisma migrations"
	@echo "make migrate-create - Create new Prisma migration"
	@echo "make install      - Install npm dependencies in both containers"
