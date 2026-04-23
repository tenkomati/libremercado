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
- `npm run build`: compila todas las apps.
- `npm run lint`: ejecuta lint en workspaces.
- `npm run typecheck`: ejecuta chequeo de tipos.

## Staging/Beta con Supabase

El repo incluye `.env.staging.example` y `STAGING_SUPABASE_RUNBOOK.md` para
preparar una beta con Supabase Postgres sin mezclar credenciales locales.

Comandos disponibles:

```bash
npm run prisma:migrate:status:staging --workspace @libremercado/api
npm run prisma:migrate:deploy:staging --workspace @libremercado/api
```

Antes de ejecutar migraciones reales, crear `.env.staging`, usar un usuario
dedicado `prisma` en Supabase y validar backups/rate limiting/storage externo.

## Storage de imágenes

Por defecto, los uploads de publicaciones y verificación de identidad se guardan
en `apps/web/public/uploads` para desarrollo local.

Para beta/staging se puede usar cualquier storage compatible con S3, por ejemplo
Cloudflare R2, AWS S3 o MinIO:

```bash
MEDIA_STORAGE_DRIVER=s3
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=libremercado-beta
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
S3_PUBLIC_BASE_URL=https://cdn.example.com
S3_FORCE_PATH_STYLE=true
```

Los endpoints internos siguen siendo los mismos:

- `/api/uploads/listing-image`
- `/api/uploads/kyc-image`

Ambos normalizan JPG, PNG, WEBP, HEIC y HEIF antes de persistir el archivo.

## Pagos

El core de pagos está desacoplado del proveedor final. Para desarrollo y beta
interna existe un adapter `SANDBOX` que permite probar la compra protegida sin
Mercado Pago ni Mobbex todavía.

Flujo actual:

1. El comprador inicia checkout con `POST /payments/checkout`.
2. La API crea un escrow en `FUNDS_PENDING`.
3. La API crea un `PaymentIntent` en `PAYMENT_PENDING`.
4. Admin/ops simula aprobación desde `/admin/escrows/[id]`.
5. El pago pasa a `FUNDS_HELD` y el escrow queda con fondos protegidos.

Modelos principales:

- `PaymentIntent`
- `PaymentEvent`

Adapters previstos:

- `SANDBOX`
- `MERCADO_PAGO`
- `MOBBEX`

## Rate limiting

La API incluye rate limiting por endpoint sensible con Redis y fallback en
memoria para desarrollo local. Redis se configura con:

```bash
REDIS_URL=redis://localhost:6379
```

Rutas API protegidas:

- `POST /auth/register`
- `POST /auth/login`
- `POST /kyc/verifications`
- `POST /listings`
- `PATCH /listings/:id`
- `POST /escrows`
- `POST /escrows/:id/messages`
- `POST /payments/checkout`

Uploads web protegidos:

- `POST /api/uploads/listing-image`
- `POST /api/uploads/kyc-image`

## Emails transaccionales

La API incluye un `EmailModule` neutral para eventos criticos. En desarrollo usa
`EMAIL_PROVIDER=log`, por lo que los emails se registran en los logs sin enviar
a un proveedor externo.

```bash
APP_PUBLIC_URL=http://localhost:3000
EMAIL_PROVIDER=log
EMAIL_FROM="LibreMercado <no-reply@libremercado.local>"
```

Eventos cubiertos:

- bienvenida luego del registro
- recuperación de contraseña con enlace de un solo uso
- verificacion de identidad aprobada, rechazada o con correccion requerida
- inicio de compra protegida y pago protegido
- cambios de entrega, encuentro seguro, mensajes y disputa

## Recuperación de contraseña

El flujo público usa tokens aleatorios hasheados en base de datos. El token vence
por defecto a los 30 minutos y se invalida al usarlo.

```bash
PASSWORD_RESET_TOKEN_TTL_SECONDS=1800
```

Rutas:

- `/forgot-password`
- `/reset-password?token=...`
- `POST /auth/password-reset/request`
- `POST /auth/password-reset/confirm`

## Seguridad de dependencias

Se revisa con:

```bash
npm audit --workspaces --audit-level=moderate
```

Al 2026-04-21 el audit queda en `0 vulnerabilities` despues de aplicar parches
de Nest, Next, Prisma y tooling de desarrollo.
