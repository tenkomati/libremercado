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
- `npm audit --workspaces --audit-level=moderate`
- QA manual pre-beta documentado en `QA_PRE_BETA.md`; pendiente ejecutar completo sobre local/staging.

Nota:

- Sigue apareciendo una advertencia no bloqueante de Next sobre detección del plugin de ESLint en build.
- Al 2026-04-21, `npm audit --workspaces --audit-level=moderate` queda en `0 vulnerabilities`.

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
- `EscrowAvailabilitySlot`
- `EscrowDeliveryProposal`
- `EscrowMeetingProposal`
- `EscrowMessage`
- `PaymentIntent`
- `PaymentEvent`
- `UserNotification`
- `EscrowEvent`
- `AdminAuditLog`
- `PlatformSettings`

## Módulos Nest implementados

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/password-reset/request`
- `POST /auth/password-reset/confirm`
- `POST /auth/logout`
- `GET /auth/me`

Incluye:

- hash de password con `bcryptjs`
- JWT
- TTL configurable con `JWT_ACCESS_TOKEN_TTL_SECONDS`
- cookie web alineada a la expiración del token emitido por API
- rate limiting básico de login por email + IP en memoria
- rate limiting distribuible por Redis en `/auth/login` y `/auth/register`
- auditoría de login/logout exitosos
- auditoría de actualización de perfil
- auditoría de cambio de contraseña autenticado
- recuperación de contraseña por email con token hasheado de un solo uso
- auditoría de solicitud y confirmación de recuperación de contraseña
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
- `PATCH /users/:id/profile` -> self, admin/ops puede editar datos operativos de otro usuario
- `PATCH /users/:id/password` -> solo contraseña propia con contraseña actual
- `PATCH /users/:id/status` -> `ADMIN` / `OPS`
- `PATCH /users/:id/role` -> `ADMIN`

Query params de listado:

- `q`, `status`, `role`, `kycStatus`, `page`, `pageSize`, `sortBy`, `sortOrder`

### KYC

- `POST /kyc/verifications`
- `GET /kyc/verifications` -> `ADMIN` / `OPS`
- `GET /kyc/verifications/:id` -> `ADMIN` / `OPS`
- `PATCH /kyc/verifications/:id/review` -> `ADMIN` / `OPS`

Query params de listado:

- `q`, `userId`, `status`, `page`, `pageSize`, `sortBy`, `sortOrder`

Notas:

- una revisión KYC crea notificación interna `KYC_REVIEWED` para el usuario
- `REQUIRES_REVIEW` y `REJECTED` quedan visibles en `/account/kyc` con notas del revisor
- el usuario puede reenviar documentación completa desde `/account/kyc`

### Listings

- `POST /listings` -> autenticado
- `GET /listings`
- `GET /listings/:id`
- `PATCH /listings/:id` -> autenticado, propietario o admin/ops
- `PATCH /listings/:id/status` -> `ADMIN` / `OPS`

Notas:

- usuarios comunes solo pueden editar publicaciones propias
- usuarios comunes solo pueden cambiar estado propio a `PUBLISHED` o `PAUSED`
- las publicaciones aceptan `ARS` y `USD`
- la moneda default y la habilitacion de USD salen de `PlatformSettings`

### Platform Settings

- `GET /platform-settings` -> publico, expone politica comercial y monedas disponibles
- `PATCH /admin/platform-settings` -> `ADMIN`

Configuracion actual para beta:

- publicar es gratis
- comprador 0%
- vendedor 5% al concretar venta
- sin costo fijo por publicacion
- sin costo fijo por transaccion
- ARS default
- USD habilitado para productos premium

Query params de listado:

- `q`, `sellerId`, `status`, `page`, `pageSize`, `sortBy`, `sortOrder`

### Escrow

- `POST /escrows`
- `GET /escrows` -> `ADMIN` / `OPS`
- `GET /escrows/:id` -> `ADMIN` / `OPS`
- `GET /escrows/:id/meeting-suggestions`
- `POST /escrows/:id/meeting-proposals`
- `PATCH /escrows/:id/meeting-proposals/:proposalId/respond`
- `POST /escrows/:id/delivery-proposals`
- `PATCH /escrows/:id/delivery-proposals/:proposalId/respond`
- `POST /escrows/:id/availability-slots`
- `PATCH /escrows/:id/availability-slots/:slotId/select`
- `POST /escrows/:id/messages`
- `PATCH /escrows/:id/ship` -> vendedor o admin/ops
- `PATCH /escrows/:id/confirm-delivery` -> comprador o admin/ops
- `PATCH /escrows/:id/release`
- `PATCH /escrows/:id/cancel`
- `PATCH /escrows/:id/dispute` -> comprador/vendedor de la operacion o admin/ops
- `PATCH /escrows/:id/dispute/resolve` -> `ADMIN` / `OPS`

Query params de listado:

- `q`, `buyerId`, `sellerId`, `status`, `page`, `pageSize`, `sortBy`, `sortOrder`

Notas:

- la creación de compra protegida vía checkout ahora deja escrow en `FUNDS_PENDING`
- cuando el pago sandbox se aprueba, el escrow pasa a `FUNDS_HELD`
- los escrows nuevos calculan `feeAmount` y `netAmount` con la comision vendedora global vigente al iniciar la compra

### Payments

- `POST /payments/checkout`
- `GET /payments/:id`
- `POST /payments/webhooks/:provider` -> publico con firma HMAC obligatoria
- `POST /payments/:id/sandbox/approve` -> `ADMIN` / `OPS`

Implementado:

- capa neutral de pagos para soportar adapters `SANDBOX`, `MERCADO_PAGO` y `MOBBEX`
- seleccion de adapter por `PAYMENT_PROVIDER`
- checkout externo configurable por `PAYMENT_CHECKOUT_BASE_URL`
- `PaymentIntent` con estado financiero y referencias del proveedor
- `PaymentEvent` para eventos/webhooks auditables
- adapter sandbox inicial
- webhook neutral firmado con `x-lm-signature` HMAC SHA-256 usando `PAYMENT_WEBHOOK_SECRET` o `PAYMENT_WEBHOOK_SECRET_<PROVIDER>`
- normalizacion generica de eventos por `paymentIntentId`, `providerPaymentId` o `providerPreferenceId`
- idempotencia basica por `providerEventId`
- aprobación sandbox desde admin que mueve fondos a protegidos y notifica comprador/vendedor
- webhook `FUNDS_HELD` mueve escrow a `FUNDS_HELD`
- webhook `REFUNDED` mueve escrow a `REFUNDED`
- webhook `DISPUTED` mueve escrow a `DISPUTED`
- entrega confirmada mueve pagos asociados de `FUNDS_HELD` a `READY_TO_RELEASE`
- liberación de fondos mueve pagos asociados a `RELEASED`
- disputa mueve pagos asociados a `DISPUTED`
- cancelación operativa mueve escrow a `REFUNDED`, pagos asociados a `REFUNDED` y vuelve la publicación a `PUBLISHED`
- cada transición financiera crea eventos en `PaymentEvent`

### Insurance

- `POST /insurance/get-quote` -> autenticado
- `POST /insurance/webhooks/:providerName` -> publico con firma HMAC obligatoria

Implementado:

- tablas `insurance_providers` e `insurance_policies`
- `EscrowTransaction` ahora soporta `isInsured` e `insuranceFee`
- script SQL equivalente para Supabase en `supabase/sql/20260423_embedded_insurance.sql`
- base class `BaseInsuranceProvider`
- implementación ejemplo `GenericInsurtechProvider`
- lógica de umbrales por categoría y monto mínimo configurable
- cálculo de prima configurable por porcentaje
- emisión automática de póliza cuando el pago queda `FUNDS_HELD`
- validación de identidad verificada antes de emitir cobertura
- webhook de póliza para pasar estados `PENDING` / `ACTIVE` / `CLAIMED`
- documento funcional en `EMBEDDED_INSURANCE_MODULE.md`
- ficha pública `/market/[id]` muestra micro-seguro opcional con prima, cobertura y total
- `/account` y `/admin/escrows/:id` muestran estado de seguro, prima y link a póliza cuando existe
- `/admin` ahora lista pólizas con filtros operativos y permite mover estado manualmente para sandbox interno
- nueva ficha `/admin/insurance/:id` con detalle de póliza, pagos asociados, auditoría y operación manual sin proveedor real
- `POST /insurance/policies/:id/claim` permite abrir reclamo manual sin provider real
- `/account` ya permite al comprador iniciar un reclamo de siniestro sobre pólizas `ACTIVE`
- el reclamo queda persistido en `rawPayload.claim`, mueve la póliza a `CLAIMED`, genera auditoría y notificaciones
- el reclamo ahora soporta `evidenceUrls` para beta y se muestran tanto en `/account` como en `/admin/insurance/:id`
- `PATCH /insurance/policies/:id/claim/resolve` permite resolución operativa manual desde admin
- resolución `APPROVED` mantiene póliza en `CLAIMED`; resolución `REJECTED` devuelve la póliza a `ACTIVE`
- `POST /api/uploads/insurance-claim-image` sube evidencias reales al mismo storage local/S3 usado por KYC y listings
- `/account` ya usa uploader real de imágenes para reclamos en vez de pegar links manualmente
- script ejecutable `scripts/smoke-predeploy.mjs` cubre health, auth, admin, upload, listing, checkout, sandbox approve, póliza, claim y resolución
- comando root: `npm run smoke:predeploy`
- documento operativo: `SMOKE_PREDEPLOY.md`
- paquete Cloud Run mock listo:
  - `CLOUD_RUN_MOCK_DEPLOY.md`
  - `cloudrun/api.mock.env.yaml`
  - `cloudrun/web.mock.env.yaml`
  - `scripts/cloudrun/deploy-api.sh`
  - `scripts/cloudrun/deploy-web.sh`
- `apps/web` ahora arranca en `0.0.0.0:$PORT`, compatible con Cloud Run
- modo recomendado mientras proveedores sigan mock:
  - `PAYMENT_PROVIDER=SANDBOX`
  - `EMAIL_PROVIDER=log`
  - `MEDIA_STORAGE_DRIVER=local`
  - `max-instances=1`
- limitación explícita del modo mock en Cloud Run:
  - uploads locales efímeros
  - rate limiting distribuido no garantizado sin `REDIS_URL`

### Rate limiting / anti-abuso

- módulo `RateLimitModule` con guard global y decorador `@RateLimit`
- usa Redis con `REDIS_URL` cuando está disponible
- fallback en memoria si Redis no está disponible para no romper desarrollo local
- rutas protegidas:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/password-reset/request`
  - `POST /auth/password-reset/confirm`
  - `POST /kyc/verifications`
  - `POST /listings`
  - `PATCH /listings/:id`
  - `POST /escrows`
  - `POST /escrows/:id/meeting-proposals`
  - `POST /escrows/:id/delivery-proposals`
  - `POST /escrows/:id/availability-slots`
  - `POST /escrows/:id/messages`
  - `PATCH /escrows/:id/ship`
  - `PATCH /escrows/:id/confirm-delivery`
  - `PATCH /escrows/:id/dispute`
  - `POST /payments/checkout`
  - `POST /payments/:id/sandbox/approve`
  - `PATCH /users/:id/profile`
  - `PATCH /users/:id/password`

Uploads web protegidos:

- helper compartido `apps/web/lib/rate-limit.ts`
- usa Redis con `REDIS_URL` cuando está disponible
- fallback en memoria si Redis no está disponible
- runtime Node explícito para evitar Edge runtime accidental
- rutas protegidas:
  - `POST /api/uploads/listing-image`
  - `POST /api/uploads/kyc-image`
- además corta requests con `content-length` excesivo antes de parsear `formData`

### Emails transaccionales

- `EmailModule` neutral con `EmailService`
- provider por defecto: `EMAIL_PROVIDER=log`
- `EMAIL_PROVIDER=disabled` desactiva emisión externa
- `EMAIL_FROM` define remitente
- `APP_PUBLIC_URL` arma links absolutos hacia la web
- los emails son best-effort: si fallan, no bloquean la operación principal

Eventos cubiertos:

- bienvenida luego de registro público
- verificación de identidad aprobada, rechazada o con corrección requerida
- compra protegida iniciada
- pago protegido aprobado
- cambios de entrega y encuentro seguro
- mensajes de coordinación
- entrega confirmada, fondos liberados, disputa y cancelación/reembolso

## QA pre-beta

Archivo:

- `QA_PRE_BETA.md`

Incluye:

- smoke test tecnico
- flujo registro/login/KYC
- flujo revision KYC admin
- flujo publicacion vendedor
- flujo compra protegida y pago sandbox
- flujo coordinacion de entrega y encuentro seguro
- flujo envio, entrega y liberacion de fondos
- flujo disputa, cancelacion y reembolso
- permisos/admin/auditoria
- seguridad y anti-abuso
- responsive y experiencia
- matriz de bloqueo para decidir si la beta puede abrirse

Estado:

- Checklist documentado.
- Ejecucion manual completa pendiente.
- Confirmacion de entrega y apertura de disputa ya son self-service desde `/account`.
- Liberacion/cancelacion/reembolso siguen reservados a admin/ops.

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
- botón visible de cerrar sesión en `/account`
- CTAs visibles hacia `/signup` desde home, market y login

### DX local

Implementado con:

- `npm run dev` limpia primero puertos locales `3000`, `3001` y `3002` para evitar procesos colgados.
- `npm run dev:stop` permite liberar esos puertos manualmente.
- `concurrently` corre web/API con `--kill-others-on-fail` para que si Nest o Next fallan, no quede el otro proceso vivo.

### Account

Rutas:

- `/account`
- `/account/listings/[id]`
- `/account/listings/new`
- `/account/kyc`

Implementado con:

- middleware que exige sesión válida para `/account`
- resumen de perfil, estado de identidad y reputación
- edición de perfil desde `/account`: nombre, apellido, teléfono, ciudad y provincia
- cambio de contraseña autenticado desde `/account`
- historial de publicaciones propias
- historial de compras protegidas
- historial de ventas protegidas
- bloque "Próximas acciones" dinámico: no muestra KYC si la identidad ya está aprobada, lista acciones pendientes de compras/ventas y no incluye crear publicación
- compras protegidas compactas con acordeón por operación
- detalle de compra ordenado en tres bloques: producto/pago, envío/encuentro seguro y mensajes
- ventas protegidas compactas con acordeón por operación y los mismos tres bloques: producto/cobro, envío/encuentro seguro y mensajes
- propuestas de método de envío por operación: vendedor propone y comprador acepta/rechaza
- vendedor marca envio desde ventas con tracking opcional
- comprador confirma entrega desde compras cuando la operacion esta en camino
- comprador o vendedor abre disputa desde compras/ventas con motivo obligatorio
- propuestas de encuentro seguro por operación protegida
- sugerencias de puntos intermedios en estaciones YPF/Shell/Axion con Google Maps si hay `GOOGLE_MAPS_API_KEY`
- fallback local de puntos sugeridos cuando no hay API key o Google Maps falla
- disponibilidad del vendedor por franjas horarias
- selección de franja por parte del comprador
- mensajes de coordinación por operación protegida
- notificaciones visibles para cambios de encuentro, horarios y mensajes
- creación de publicación desde frontend
- edición de publicación propia
- pausa/reactivación de publicación propia
- carga local de imagen principal desde archivo
- soporte de JPG, PNG, WEBP, HEIC y HEIF en el uploader
- conversión automática de HEIC/HEIF a JPG con `sharp`
- storage configurable para imágenes y archivos KYC:
  - `MEDIA_STORAGE_DRIVER=local` guarda en `apps/web/public/uploads`
  - `MEDIA_STORAGE_DRIVER=s3` guarda en bucket compatible S3/R2 usando `S3_*`
- onboarding público de verificación de identidad con historial de verificaciones
- corrección pública de verificación de identidad con reenvío de frente DNI, dorso DNI y selfie desde `/account/kyc`
- copy público más amigable: se usa "verificación de identidad" en lugar de KYC y "pago/compra protegida" en lugar de escrow
- componente compartido `ProtectedPurchaseTerms` explica cancelacion, disputa y liberacion de fondos en home, detalle de publicacion y operaciones de `/account`
- componente compartido `SafeOperationGuides` muestra onboarding breve comprador/vendedor en home, market, detalle de publicacion y `/account`
- registro público exige frente de DNI, dorso de DNI, selfie y consentimiento de validación de identidad
- alta pública crea automáticamente una verificación de identidad `PENDING` asociada al usuario
- la selfie intenta detección local de rostro si el navegador soporta `FaceDetector`; si no, queda para revisión manual

Notas:

- `POST /kyc/verifications` valida que un usuario común solo pueda iniciar KYC propio.
- `POST /auth/register` ahora requiere imágenes de identidad subidas previamente a `/api/uploads/kyc-image`.
- `POST /listings` ya valida que un usuario común solo pueda publicar como vendedor propio.
- `PATCH /users/:id/profile` no permite cambiar email ni DNI desde cuenta porque forman parte de identidad/compliance.
- `PATCH /users/:id/password` exige contraseña actual y solo permite cambiar contraseña propia.
- `PATCH /escrows/:id/ship` exige vendedor de la operacion o admin/ops.
- `PATCH /escrows/:id/confirm-delivery` exige comprador de la operacion o admin/ops.
- `PATCH /escrows/:id/dispute` exige comprador/vendedor de la operacion o admin/ops.
- `PATCH /escrows/:id/dispute/resolve` exige admin/ops y permite resolver a favor del comprador con reembolso o a favor del vendedor con liberacion de fondos.
- crear publicación sigue exigiendo usuario `ACTIVE` e identidad `APPROVED`, por regla del backend.
- editar publicación propia permite cambiar datos básicos e imagen principal.
- la carga de imágenes sigue usando storage local por defecto para desarrollo.
- para beta/staging, configurar `MEDIA_STORAGE_DRIVER=s3`, `S3_BUCKET`, `S3_PUBLIC_BASE_URL`, credenciales y endpoint del proveedor.
- si un HEIC/HEIF puntual no puede decodificarse, el usuario recibe error amigable para exportarlo como JPG.
- antes de producción, definir política de privacidad/acceso para KYC, CDN, lifecycle rules y límites de ancho de banda.
- antes de producción, conectar validación documental/biométrica con proveedor real; el MVP no debe aprobar identidad solo por detección local de navegador.
- encuentros seguros MVP: comprador/vendedor pueden proponer fecha, hora y shop de estación `YPF`, `SHELL` o `AXION`; la contraparte puede aceptar o rechazar con nota.
- coordinación segura MVP: el vendedor puede "pintar" franjas horarias y el comprador puede elegir una o enviar un mensaje si no le sirve.
- el formulario de franjas bloquea "Disponible hasta" hasta elegir "Disponible desde", preselecciona la misma fecha y el backend rechaza rangos que crucen de día.
- las notificaciones actuales son persistentes en base de datos, visibles en `/account` y además emiten email transaccional en modo `log`.
- `/account` muestra seguimiento de disputa con motivo y eventos relevantes cuando una operacion esta en revision o fue resuelta.
- `/account` muestra reglas de compra/venta protegida dentro de cada operacion para bajar dudas antes de cancelar, disputar o esperar liberacion.
- `/account` muestra guia breve de buenas practicas para comprar/vender sin salir del flujo protegido.
- MCP Supabase verificado disponible en esta sesion con proyecto `https://qjmhiagfolrlcktrnqtu.supabase.co`; aun falta definir migracion, variables por ambiente y politica de ramas antes de usarlo como DB beta.
- Staging/Supabase preparado en documentacion: `.env.staging.example`, `STAGING_SUPABASE_RUNBOOK.md` y scripts `prisma:migrate:status:staging` / `prisma:migrate:deploy:staging`.
- Se podaron carpetas no trackeadas de integraciones multiagente/skills para dejar el workspace Codex-only; `pruebas.txt` sigue sin tocar.
- Upload S3/R2 ya no depende de `@aws-sdk/client-s3`; usa firma AWS Signature V4 nativa en `apps/web/lib/media-storage.ts` para evitar la cadena vulnerable de `fast-xml-parser`.
- antes de producción, conectar `EmailService` a proveedor real como Resend, SES, SendGrid o SMTP transaccional.
- `GOOGLE_MAPS_API_KEY` habilita sugerencias reales por Google Maps; sin clave se usa fallback local para mantener el flujo operativo.
- antes de producción, validar que todos los puntos sugeridos sean shops reales y seguros, guardar place IDs, horarios de atención y auditoría de cambios de último momento.

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
- `/admin/kyc/[id]`
- `/admin/escrows/[id]`
- `/admin/listings/[id]`

Cada uno muestra:

- detalle de entidad
- contexto relacionado
- auditoría específica
- acciones operativas en contexto

Detalle KYC implementado:

- ficha dedicada de revisión de identidad
- imágenes visibles de frente de DNI, dorso y selfie
- apertura de originales en nueva pestaña
- bloqueo visual para aprobar si falta evidencia obligatoria
- notas operativas y acciones aprobar, pedir corrección/revisión o rechazar
- snapshot del usuario y auditoría específica de la verificación

Detalle escrow implementado:

- vista de intentos de pago asociados
- eventos financieros por intento de pago
- acción admin para simular aprobación sandbox
- acción admin para cancelar operación y registrar reembolso
- acción admin para resolver disputa a favor del comprador o vendedor con motivo obligatorio

## Archivos clave

### Infra

- `package.json`
- `.env.example`
- `.env.staging.example`
- `docker-compose.yml`
- `BETA_DEPLOY_CHECKLIST.md`
- `QA_PRE_BETA.md`
- `STAGING_SUPABASE_RUNBOOK.md`

### Prisma

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/seed.ts`
- `apps/api/prisma/migrations/*`

### Auth backend

- `apps/api/src/modules/auth/*`

### Audit backend

- `apps/api/src/modules/audit/*`

### Email backend

- `apps/api/src/modules/email/*`

### Admin web

- `apps/web/app/login/page.tsx`
- `apps/web/app/signup/page.tsx`
- `apps/web/app/signup/signup-form.tsx`
- `apps/web/app/account/page.tsx`
- `apps/web/app/account/actions.ts`
- `apps/web/app/account/kyc-correction-form.tsx`
- `apps/web/app/account/listing-image-upload.tsx`
- `apps/web/app/account/listings/[id]/page.tsx`
- `apps/web/app/account/listings/new/page.tsx`
- `apps/web/app/account/kyc/page.tsx`
- `apps/web/app/api/uploads/kyc-image/route.ts`
- `apps/web/app/api/uploads/listing-image/route.ts`
- `apps/web/lib/media-storage.ts`
- `apps/web/lib/upload-images.ts`
- `apps/web/app/market/page.tsx`
- `apps/web/app/market/[id]/page.tsx`
- `apps/web/app/market/[id]/actions.ts`
- `apps/api/src/modules/escrow/dto/create-meeting-proposal.dto.ts`
- `apps/api/src/modules/escrow/dto/respond-meeting-proposal.dto.ts`
- `apps/api/src/modules/escrow/dto/create-availability-slot.dto.ts`
- `apps/api/src/modules/escrow/dto/select-availability-slot.dto.ts`
- `apps/api/src/modules/escrow/dto/create-escrow-message.dto.ts`
- `apps/api/src/modules/escrow/google-maps.service.ts`
- `apps/api/src/modules/payments/*`
- `apps/web/app/admin/page.tsx`
- `apps/web/app/admin/actions.ts`
- `apps/web/app/admin/form-controls.tsx`
- `apps/web/app/admin/users/[id]/page.tsx`
- `apps/web/app/admin/kyc/[id]/page.tsx`
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
- Agregar protección anti-bot en registro y login con Cloudflare Turnstile o equivalente.
- Cachear lecturas públicas de alto tráfico: `/listings`, `/listings/:id`, `/admin/overview` según rol/contexto.
- Configurar timeouts estrictos en API y base de datos.
- Revisar índices de Postgres para búsquedas/filtros públicos y admin.
- Usar connection pooling para PostgreSQL en producción, idealmente PgBouncer o pool administrado del proveedor.

Cerrado en código:

- Rate limiting de login y registro movido a Redis con fallback en memoria.
- Rate limiting Redis/fallback agregado para endpoints sensibles: auth, KYC, listings, escrows, mensajes, coordinación de entrega y pagos sandbox.
- Rate limiting Redis/fallback agregado para uploads web de publicaciones y KYC.
- Corte temprano por tamaño de payload en uploads de imágenes antes de parsear `formData`.
- Recuperación de contraseña pública implementada en `/forgot-password` y `/reset-password`; usa `PasswordResetToken`, `PASSWORD_RESET_TOKEN_TTL_SECONDS` y email transaccional.

Prioridad media:

- Limitar cantidad de imágenes por publicación.
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
- calendario visual para disponibilidad con drag/select real en vez de campos `datetime-local`
- notificaciones externas avanzadas para cambios de último momento: push web o WhatsApp/SMS transaccional
- reglas de reprogramación y no-show para encuentros presenciales
- integración completa con Google Maps Places: place IDs, distancia estimada, horarios de shop y navegación

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
