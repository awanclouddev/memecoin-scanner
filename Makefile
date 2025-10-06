.PHONY: build start start-daemon docker-up docker-down logs health

build:
	npm ci
	npm run build

start:
	npm run start

start-daemon:
	npm run start-daemon

docker-up:
	docker-compose up --build -d

docker-down:
	docker-compose down

logs:
	docker-compose logs -f

health:
	curl -sS http://localhost:3000/api/health | jq || true
