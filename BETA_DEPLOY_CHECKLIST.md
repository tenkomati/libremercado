# LibreMercado - Checklist Pre-Beta Deploy

Este documento ordena los pasos necesarios para llevar LibreMercado a una beta seria, operable y segura. La idea es mantenerlo vivo: cada vez que se cierre un frente, se marca como completado y se actualiza el estado.

## Estado Actual

- [ ] App lista para beta cerrada
- [ ] App lista para beta publica limitada
- [ ] App lista para produccion inicial

## 1. Flujo Usuario Completo

- [x] Registro y login funcionando de punta a punta en frontend.
- [x] Cambio de contrasena autenticado desde `/account`.
- [x] Recuperacion de contrasena por email.
- [x] Perfil de usuario editable con datos basicos, direccion y contacto.
- [x] Onboarding KYC publico completo.
- [x] Carga de DNI frente y dorso.
- [x] Carga de selfie o prueba de vida.
- [x] Estado KYC visible para el usuario.
- [x] Correccion KYC visible para el usuario cuando admin pide revision.
- [x] Reenvio de DNI frente, dorso y selfie desde `/account/kyc`.
- [x] Publicacion de producto desde frontend.
- [x] Carga, previsualizacion y gestion de imagenes de publicaciones.
- [x] Edicion basica de publicaciones.
- [x] Estados claros de publicacion: borrador, activa, pausada, vendida, rechazada.
- [x] Flujo comprador inicia compra protegida.
- [x] Flujo vendedor acepta o gestiona la operacion.
- [x] Coordinacion de entrega por mensajeria, correo, retiro o encuentro seguro.
- [x] Vendedor marca envio desde `/account`.
- [x] Comprador confirma entrega desde `/account`.
- [ ] Liberacion de fondos.
- [x] Apertura de disputa desde `/account`.
- [ ] Seguimiento y resolucion de disputa desde usuario.
- [x] Mis compras con acciones pendientes claras.
- [x] Mis ventas con acciones pendientes claras.
- [x] Notificaciones visibles dentro de la cuenta.

## 2. Pagos y Escrow Real

- [ ] Definir proveedor de pago para Argentina.
- [ ] Validar si el proveedor permite retencion real de fondos o si requiere flujo alternativo.
- [x] Implementar pago sandbox.
- [ ] Implementar webhooks firmados.
- [x] Persistir estados financieros auditables.
- [x] Estado: pago iniciado.
- [x] Estado: pago aprobado.
- [x] Estado: pago retenido o protegido.
- [x] Estado: pago liberado.
- [x] Estado: pago reembolsado.
- [x] Estado: pago en disputa.
- [ ] Comisiones parametrizables por ambiente.
- [ ] Calculo de comision visible para comprador y vendedor.
- [x] Registro interno de eventos financieros.
- [ ] Pruebas de pago aprobado, rechazado, expirado y reembolsado.

## 3. Seguridad y Anti-Abuso

- [x] Rate limiting por IP en auth.
- [x] Rate limiting por usuario en acciones sensibles.
- [x] Rate limiting en mensajes.
- [x] Rate limiting en publicaciones.
- [x] Rate limiting en KYC.
- [x] Rate limiting en uploads de publicaciones y KYC.
- [ ] Proteccion DoW antes del deploy.
- [ ] Limites de acciones costosas por usuario no verificado.
- [ ] Cuotas por usuario, IP y dispositivo.
- [ ] Validacion fuerte de archivos subidos.
- [x] Limite de tamano por archivo.
- [x] Limite de cantidad de archivos por entidad.
- [ ] Validacion MIME real.
- [x] Conversion HEIC a JPG soportada.
- [ ] Escaneo basico de archivos o integracion antivirus.
- [x] Revision de roles y guards.
- [ ] Separacion de roles: usuario, admin, reviewer, soporte.
- [x] Sesiones con expiracion razonable.
- [ ] Refresh token o renovacion controlada.
- [x] Secrets fuera del repo.
- [ ] Variables separadas por ambiente.
- [ ] Headers de seguridad basicos.
- [ ] CORS restringido por ambiente.
- [x] `npm audit --workspaces --audit-level=moderate` sin vulnerabilidades reportadas.

## 4. Operacion y Admin

- [x] Panel admin protegido con login real.
- [x] Revision KYC desde admin.
- [x] Aprobar, rechazar o pedir correccion de KYC.
- [x] Ver operaciones escrow desde admin.
- [x] Ver historial de eventos de una operacion.
- [x] Intervenir disputas desde admin.
- [x] Bloquear o suspender usuario.
- [x] Pausar o rechazar publicacion.
- [x] Cancelar operacion con motivo auditado.
- [x] Audit logs utiles.
- [x] Filtros admin por usuario, estado, fecha y riesgo.
- [x] Vista de metricas basicas: usuarios, publicaciones, operaciones, disputas.
- [ ] Herramientas de soporte para responder casos.

## 5. Confianza y Experiencia Beta

- [x] Textos amigables para compra protegida.
- [x] Textos amigables para verificacion de identidad.
- [x] Textos amigables para encuentro seguro.
- [ ] Terminos claros de cancelacion.
- [ ] Terminos claros de disputa.
- [ ] Terminos claros de liberacion de fondos.
- [x] Landing/home con CTA real para comprar y vender.
- [x] Estados vacios profesionales.
- [x] Mensajes de error entendibles para usuarios comunes.
- [ ] Onboarding breve para comprador.
- [ ] Onboarding breve para vendedor.
- [x] Emails transaccionales minimos.
- [x] Notificacion de nueva operacion.
- [x] Notificacion de cambio de entrega.
- [x] Notificacion de mensaje.
- [x] Notificacion de disputa.
- [x] Notificacion de KYC aprobado/rechazado.

## 6. Infraestructura y Deploy

- [ ] Separar ambientes: local, staging/beta y produccion.
- [ ] Base de datos gestionada para beta.
- [x] MCP Supabase disponible en Codex para preparar migracion/control de proyecto.
- [x] Runbook staging/Supabase documentado.
- [x] Template `.env.staging.example` creado.
- [x] Scripts seguros de status/deploy de migraciones staging agregados.
- [x] Storage real de imagenes.
- [ ] Buckets separados por ambiente.
- [ ] CDN o entrega optimizada de imagenes.
- [ ] CI/CD minimo.
- [ ] Pipeline ejecuta lint.
- [ ] Pipeline ejecuta typecheck.
- [ ] Pipeline ejecuta build.
- [ ] Pipeline ejecuta migraciones de forma controlada.
- [ ] Logs centralizados.
- [ ] Healthcheck real de API.
- [ ] Monitoreo basico de uptime.
- [ ] Backups automaticos de base de datos.
- [ ] Plan de rollback.
- [ ] Dominio beta.
- [ ] HTTPS configurado.
- [ ] Politica de deploy documentada.

## 7. QA Pre-Beta

- [x] Seed demo estable.
- [x] Checklist QA pre-beta documentado en `QA_PRE_BETA.md`.
- [x] Checklist manual de flujo comprador documentado.
- [x] Checklist manual de flujo vendedor documentado.
- [x] Checklist manual de flujo admin documentado.
- [ ] Checklist manual de flujo comprador ejecutado.
- [ ] Checklist manual de flujo vendedor ejecutado.
- [ ] Checklist manual de flujo admin ejecutado.
- [ ] Pruebas de API para auth.
- [ ] Pruebas de API para KYC.
- [ ] Pruebas de API para listings.
- [ ] Pruebas de API para escrow.
- [ ] Pruebas de API para mensajes.
- [ ] Pruebas de API para propuestas de entrega.
- [ ] Prueba de imagen invalida.
- [ ] Prueba de token vencido.
- [ ] Prueba de usuario sin KYC.
- [ ] Prueba de vendedor que no responde.
- [ ] Prueba de comprador que cancela.
- [ ] Prueba de disputa abierta desde usuario.
- [ ] Prueba de disputa resuelta a favor del comprador.
- [ ] Prueba de disputa resuelta a favor del vendedor.
- [ ] Prueba de pago rechazado.
- [ ] Prueba responsive mobile.
- [ ] Prueba con usuarios reales internos.

## Orden Recomendado Inmediato

- [x] 1. Storage real de imagenes y archivos KYC.
- [x] 2. KYC admin funcional con revision.
- [x] 3. Integracion de pagos en modo sandbox.
- [x] 4. Notificaciones por email.
- [ ] 5. Hardening de seguridad, rate limits y DoW.
- [ ] 6. Deploy staging/beta con DB y storage reales.
- [ ] 7. QA completo comprador-vendedor-admin.

## Notas de Decision

- El foco antes de beta debe ser confianza operativa, no cantidad de features.
- Sin storage real no conviene abrir beta, porque publicaciones y KYC dependen de archivos persistentes.
- Sin pagos sandbox y webhooks no conviene validar escrow con usuarios externos.
- Sin herramientas admin, cualquier disputa o KYC queda bloqueado manualmente.

## Avances Registrados

- 2026-04-21: se agrego storage configurable `local` / `s3` compatible para imagenes de publicaciones y archivos KYC. El codigo ya soporta buckets externos; para beta falta configurar credenciales, bucket/CDN y politica de acceso del proveedor elegido.
- 2026-04-21: se agrego ficha admin dedicada para revisar identidad con DNI frente/dorso, selfie, decision operativa, notas, auditoria y bloqueo de aprobacion cuando falta evidencia.
- 2026-04-21: se agrego correccion KYC para usuario: si admin pide revision o rechaza, `/account/kyc` muestra el motivo, permite reenviar DNI frente/dorso/selfie y genera notificacion interna de revision KYC.
- 2026-04-21: se agrego capa neutral de pagos con `PaymentIntent`, `PaymentEvent`, adapter `SANDBOX`, checkout protegido y aprobacion sandbox desde admin para mover escrows de `FUNDS_PENDING` a `FUNDS_HELD`.
- 2026-04-21: se completo el ciclo financiero posterior: entrega confirmada mueve pagos a `READY_TO_RELEASE`, liberacion mueve pagos a `RELEASED` y disputa mueve pagos a `DISPUTED`, todo con eventos financieros auditables.
- 2026-04-21: se agrego cancelacion controlada desde admin con reembolso sandbox: escrows cancelables pasan a `REFUNDED`, pagos asociados a `REFUNDED`, la publicacion vuelve a `PUBLISHED` y quedan eventos/auditoria.
- 2026-04-21: se agrego rate limiting distribuible con Redis y fallback en memoria para auth, KYC, publicaciones, mensajes, coordinacion de escrow y checkout/pagos sandbox.
- 2026-04-21: se agrego rate limiting Redis/fallback en memoria para uploads web de imagenes de publicaciones y KYC, con corte temprano por `content-length`.
- 2026-04-21: se reviso `npm audit --workspaces --audit-level=moderate`; se actualizaron parches de Nest, Next, Prisma y tooling hasta quedar en `0 vulnerabilities`.
- 2026-04-22: se agrego `EmailModule` con provider local `log` y emails transaccionales minimos para bienvenida, identidad, compra protegida, pagos, entrega, mensajes y disputa.
- 2026-04-22: se agrego `QA_PRE_BETA.md` con smoke test, flujos comprador/vendedor/admin, matriz de bloqueo beta y criterios de aceptacion.
- 2026-04-22: se agrego edicion de perfil desde `/account` y cambio de contrasena autenticado con auditoria backend.
- 2026-04-22: se agregaron acciones self-service en `/account` para marcar envio, confirmar entrega y abrir disputa con auditoria, rate limits y notificaciones.
- 2026-04-22: se agrego resolucion admin/ops de disputas: reembolso al comprador o liberacion al vendedor, con auditoria, eventos, pagos actualizados, notificaciones y seguimiento visible para usuarios.
- 2026-04-22: se verifico MCP Supabase disponible en Codex para el proyecto `https://qjmhiagfolrlcktrnqtu.supabase.co`; falta definir migracion/variables por ambiente antes de usarlo como beta DB.
- 2026-04-22: se podaron carpetas extra de integraciones de agentes/skills y se dejo el repo Codex-only; se agrego `STAGING_SUPABASE_RUNBOOK.md`, `.env.staging.example` y scripts de migracion staging.
- 2026-04-22: se elimino `@aws-sdk/client-s3` por vulnerabilidades transitivas y se reemplazo el upload S3/R2 por firma AWS Signature V4 nativa; `npm audit` vuelve a `0 vulnerabilities`.
- 2026-04-23: se agrego recuperacion de contrasena por email con token hasheado de un solo uso, expiracion configurable, auditoria, rate limiting y pantallas `/forgot-password` / `/reset-password`.
