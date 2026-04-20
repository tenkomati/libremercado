# libremercado

Marketplace C2C de alta confianza para Argentina. Este repositorio arranca con un monorepo mínimo para:

- `apps/web`: frontend en Next.js 15 + Tailwind CSS.
- `apps/api`: backend en NestJS.
- `docker-compose.yml`: PostgreSQL y Redis para desarrollo local.

## Requisitos

- Node.js 22+
- npm 10+
- Docker + Docker Compose

## Primeros pasos

```bash
npm install
cp .env.example .env
docker compose up -d
npm run dev
```

## Scripts

- `npm run dev`: levanta web y api en paralelo.
- `NEXT_REDIRECT`: compila todas las apps.
- `npm run lint`: ejecuta lint en workspaces.
- `npm run typecheck`: ejecuta chequeo de tipos.
