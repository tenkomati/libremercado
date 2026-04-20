# libremercado · Handoff

## Estado actual

Proyecto montado como monorepo con:

- `apps/web`: Next.js 15, App Router, Tailwind, login web con JWT en cookie `httpOnly`.
- `apps/api`: NestJS + Prisma + PostgreSQL.
- `docker-compose.yml`: PostgreSQL y Redis locales.

## Infra y arranque

Estado funcional:

- `docker compose up -d`
- `npm run prisma:migrate:deploy --workspace @libremercado/api`
- `npm run prisma:seed --workspace @libremercado/api`
- `npm run dev`

Validaciones que estaban pasando al cierre:

- `npm run typecheck --workspace @libremercado/api`
- `npm run typecheck --workspace @libremercado/web`
- `npm run lint --workspace @libremercado/api`
- `npm run lint --workspace @libremercado/web`
- `npm run build --workspace @libremercado/api`
- `npm run build --workspace @libremercado/web`

Nota:

- Sigue apareciendo una advertencia no bloqueante de Next sobre detección del plugin de ESLint en build.

## Backend implementado

### Base de datos

Schema Prisma ya creado con migraciones aplicadas para:

- marketplace core
- auth + roles
- admin audit logs

Modelos relevantes:

- `User`
- `KycVerification`
- `Listing`
- `ListingImage`
- `EscrowTransaction`
- `EscrowEvent`
- `AdminAuditLog`

## Módulos Nest implementados

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

Incluye:

- hash de password con `bcryptjs`
- JWT
- TTL configurable con `JWT_ACCESS_TOKEN_TTL_SECONDS`
- cookie web alineada a la expiración del token emitido por API
- rate limiting básico de login por email + IP en memoria
- auditoría de login/logout exitosos
- `JwtAuthGuard`
- `RolesGuard`
- decorators `@Public`, `@CurrentUser`, `@Roles`

Roles activos:

- `USER`
- `OPS`
- `ADMIN`

### Users

Protegido para lectura/listado operativo.

- `GET /users` -> `ADMIN` / `OPS`
- `GET /users/:id` -> self o admin/ops
- `PATCH /users/:id/status` -> `ADMIN` / `OPS`
- `PATCH /users/:id/role` -> `ADMIN`

Query params de listado:

- `q`, `status`, `role`, `kycStatus`, `page`, `pageSize`, `sortBy`, `sortOrder`

### KYC

- `POST /kyc/verifications`
- `GET /kyc/verifications` -> `ADMIN` / `OPS`
- `PATCH /kyc/verifications/:id/review` -> `ADMIN` / `OPS`

Query params de listado:

- `q`, `userId`, `status`, `page`, `pageSize`, `sortBy`, `sortOrder`

### Listings

- `POST /listings` -> autenticado
- `GET /listings`
- `GET /listings/:id`
- `PATCH /listings/:id` -> autenticado, propietario o admin/ops
- `PATCH /listings/:id/status` -> `ADMIN` / `OPS`

Notas:

- usuarios comunes solo pueden editar publicaciones propias
- usuarios comunes solo pueden cambiar estado propio a `PUBLISHED` o `PAUSED`

Query params de listado:

- `q`, `sellerId`, `status`, `page`, `pageSize`, `sortBy`, `sortOrder`

### Escrow

- `POST /escrows`
- `GET /escrows` -> `ADMIN` / `OPS`
- `GET /escrows/:id` -> `ADMIN` / `OPS`
- `PATCH /escrows/:id/ship`
- `PATCH /escrows/:id/confirm-delivery`
- `PATCH /escrows/:id/release`
- `PATCH /escrows/:id/dispute`

Query params de listado:

- `q`, `buyerId`, `sellerId`, `status`, `page`, `pageSize`, `sortBy`, `sortOrder`

### Auditoría

- `GET /admin/overview`
- `GET /admin/audit-logs?limit=...`

Query params de auditoría:

- `q`, `action`, `resourceType`, `page`, `pageSize`, `sortBy`, `sortOrder`, `limit`

Acciones auditadas:

- review de KYC
- edición de listing
- cambio de estado de listing
- acciones operativas de escrow
- cambios de estado y rol de usuarios
- login/logout

## Seed disponible

Archivo:

- `apps/api/prisma/seed.ts`

Carga:

- 6 usuarios
- 6 listings
- 3 escrows
- KYC con estados variados
- roles `ADMIN`, `OPS`, `USER`

Credenciales demo admin:

- email: `sofia.romero@libremercado.test`
- password: `Admin12345!`

Credenciales demo comprador:

- email: `valentina.mendez@libremercado.test`
- password: `Buyer12345!`

## Frontend implementado

### Home

Landing institucional azul/blanco, orientada a confianza y categoría grande.

### Market

Ruta:

- `/market`
- `/market/[id]`

Muestra publicaciones reales del seed consumiendo la API.

Incluye:

- cards públicas con link a detalle
- detalle público de listing
- ficha de vendedor verificado
- CTA de login/registro si no hay sesión
- compra protegida que crea un escrow desde la sesión actual

Notas:

- `POST /escrows` valida que un usuario común solo pueda crear escrow como comprador propio.
- La compra protegida exige usuario activo y KYC aprobado, por regla del backend.

### Signup

Ruta:

- `/signup`

Implementado con:

- registro real contra `/auth/register`
- almacenamiento de JWT en cookie `httpOnly`
- soporte de `next` para volver a una publicación luego del registro

### Login

Ruta:

- `/login`

Implementado con:

- login real contra `/auth/login`
- almacenamiento de JWT en cookie `httpOnly`
- logout via route handler Next
- soporte de usuarios comunes y admins/ops con `next`

### Account

Rutas:

- `/account`
- `/account/listings/[id]`
- `/account/listings/new`
- `/account/kyc`

Implementado con:

- middleware que exige sesión válida para `/account`
- resumen de perfil, estado de identidad y reputación
- historial de publicaciones propias
- historial de compras protegidas
- historial de ventas protegidas
- creación de publicación desde frontend
- edición de publicación propia
- pausa/reactivación de publicación propia
- carga local de imagen principal desde archivo
- soporte de JPG, PNG, WEBP, HEIC y HEIF en el uploader
- conversión automática de HEIC/HEIF a JPG con `sharp`
- onboarding público de verificación de identidad con historial de verificaciones
- copy público más amigable: se usa "verificación de identidad" en lugar de KYC y "pago/compra protegida" en lugar de escrow

Notas:

- `POST /kyc/verifications` valida que un usuario común solo pueda iniciar KYC propio.
- `POST /listings` ya valida que un usuario común solo pueda publicar como vendedor propio.
- crear publicación sigue exigiendo usuario `ACTIVE` e identidad `APPROVED`, por regla del backend.
- editar publicación propia permite cambiar datos básicos e imagen principal.
- la carga de imágenes actual es local/dev: guarda en `apps/web/public/uploads/listings`.
- si un HEIC/HEIF puntual no puede decodificarse, el usuario recibe error amigable para exportarlo como JPG.
- antes de producción, migrar imágenes a storage externo/CDN con límites de ancho de banda.

### Admin

Ruta:

- `/admin`

Protección:

- middleware en Next
- validación de JWT
- control de roles `ADMIN` / `OPS`

Funcionalidad actual:

- dashboard ejecutivo con KPIs globales desde `/admin/overview`
- lectura paginada de users, KYC, listings, escrows, audit logs
- filtros server-side por texto y estado
- navegación de páginas por bloque operativo
- banners de éxito/error
- parsing de errores API para mensajes más legibles
- botones con estado pendiente en acciones admin
- confirmaciones antes de acciones sensibles
- acciones admin desde UI:
  - aprobar/rechazar/revisar KYC
  - cambiar estado de listing
  - mover escrow entre estados operativos
  - activar/bloquear usuarios y cambiar roles

### Detalles admin implementados

- `/admin/users/[id]`
- `/admin/escrows/[id]`
- `/admin/listings/[id]`

Cada uno muestra:

- detalle de entidad
- contexto relacionado
- auditoría específica
- acciones operativas en contexto

## Archivos clave

### Infra

- `package.json`
- `.env.example`
- `docker-compose.yml`

### Prisma

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/seed.ts`
- `apps/api/prisma/migrations/*`

### Auth backend

- `apps/api/src/modules/auth/*`

### Audit backend

- `apps/api/src/modules/audit/*`

### Admin web

- `apps/web/app/login/page.tsx`
- `apps/web/app/signup/page.tsx`
- `apps/web/app/signup/signup-form.tsx`
- `apps/web/app/account/page.tsx`
- `apps/web/app/account/actions.ts`
- `apps/web/app/account/listing-image-upload.tsx`
- `apps/web/app/account/listings/[id]/page.tsx`
- `apps/web/app/account/listings/new/page.tsx`
- `apps/web/app/account/kyc/page.tsx`
- `apps/web/app/api/uploads/listing-image/route.ts`
- `apps/web/app/market/page.tsx`
- `apps/web/app/market/[id]/page.tsx`
- `apps/web/app/market/[id]/actions.ts`
- `apps/web/app/admin/page.tsx`
- `apps/web/app/admin/actions.ts`
- `apps/web/app/admin/form-controls.tsx`
- `apps/web/app/admin/users/[id]/page.tsx`
- `apps/web/app/admin/escrows/[id]/page.tsx`
- `apps/web/app/admin/listings/[id]/page.tsx`
- `apps/web/middleware.ts`

## Antes del deploy

### Protección Denial of Wallet / DoW

Objetivo:

- evitar que bots o tráfico malicioso generen costos excesivos de nube, base de datos, ancho de banda o servicios externos.

Lectura del plan Gemini:

- La estrategia por capas es correcta: WAF/rate limiting, caché, límites de gasto, fricción anti-bot y aislamiento gradual.
- Para este proyecto conviene priorizar controles simples y efectivos antes del deploy, sin saltar todavía a microservicios prematuros.
- La separación en microservicios puede esperar; antes tiene más impacto limitar consumo, cachear lecturas públicas y proteger escrituras caras.

Prioridad alta antes de producción:

- Poner Cloudflare delante del frontend/API con WAF, reglas anti-bot y rate limiting por IP.
- Configurar budget alerts y cuotas duras en el proveedor cloud.
- Definir máximos de autoscaling para API/web/base, aunque eso degrade servicio bajo ataque.
- Mover rate limiting de login desde memoria a Redis para que funcione con múltiples instancias.
- Agregar rate limiting Redis por endpoint sensible: `/auth/login`, `/auth/register`, `/listings`, `/escrows`, `/kyc/verifications`.
- Agregar protección anti-bot en registro y login con Cloudflare Turnstile o equivalente.
- Cachear lecturas públicas de alto tráfico: `/listings`, `/listings/:id`, `/admin/overview` según rol/contexto.
- Configurar timeouts estrictos en API y base de datos.
- Revisar índices de Postgres para búsquedas/filtros públicos y admin.
- Usar connection pooling para PostgreSQL en producción, idealmente PgBouncer o pool administrado del proveedor.

Prioridad media:

- Limitar tamaño de payloads y cantidad de imágenes por publicación.
- Limitar frecuencia de creación de listings, KYC y escrows por usuario.
- Agregar verificación de email para cuentas nuevas.
- Evaluar SMS/WhatsApp solo para acciones de mayor riesgo, porque también puede generar costos explotables.
- Separar cuotas por usuario autenticado además de IP.
- Permitir bots buenos de SEO y bloquear scraping agresivo.

Prioridad baja / más adelante:

- Microservicios separados para búsqueda, pagos, mensajería y core transaccional.
- Bot management avanzado pago.
- CDN de imágenes con transformaciones y límites de ancho de banda.
- Circuit breakers por dependencia externa.

Decisión recomendada:

- Para el primer deploy, no depender solo del rate limit en código. La primera línea debe ser Cloudflare/WAF y cuotas de gasto.
- Redis ya está en `docker-compose.yml`, así que es el candidato natural para rate limiting distribuido y caché.
- No activar autoescalado ilimitado hasta tener métricas reales, presupuestos y alarmas probadas.

## Qué falta hacer

Orden sugerido de ejecución:

### 1. Hardening de auth avanzado

Objetivo:

- pasar de protección MVP a sesiones persistentes productivas

Incluye:

- refresh token strategy
- modelo persistente de sesiones
- rotación de refresh tokens
- revocación por dispositivo
- password reset

### 2. Frontoffice real de publicaciones avanzado

Objetivo:

- completar autogestión pública y confianza transaccional

Incluye:

- publicación asistida por IA
- precio sugerido
- checkout protegido con proveedor de pago real
- tracking visible para comprador/vendedor
- QR de conformidad para entrega presencial
- storage externo/CDN para imágenes en producción

### 3. Compliance/Risk layer

Objetivo:

- acercarse a la operación real

Incluye:

- score de riesgo
- flags antifraude
- cola de revisión manual
- evidencia de disputa

### 4. DoW hardening pre-deploy

Objetivo:

- proteger infraestructura y bolsillo antes de exponer tráfico real.

Incluye:

- WAF/Cloudflare
- budget alerts y cuotas cloud
- rate limiting Redis distribuido
- Turnstile en login/registro
- caché Redis/CDN para lecturas públicas
- DB timeouts y connection pooling

### 5. Observabilidad y deployment

Objetivo:

- preparar entorno serio

Incluye:

- logs estructurados
- métricas
- tracing
- variables por entorno
- Dockerfiles finales y despliegue cloud

## Sugerencia para el próximo agente

Si entra otro agente, el mejor punto de entrada es:

1. leer este archivo
2. revisar `schema.prisma`
3. revisar `apps/web/app/admin/page.tsx`
4. seguir con frontoffice real o hardening avanzado de sesiones, según prioridad

## Comandos útiles

```bash
docker compose up -d
npm run prisma:migrate:deploy --workspace @libremercado/api
npm run prisma:seed --workspace @libremercado/api
npm run dev
npm run lint
npm run typecheck
npm run build
```
