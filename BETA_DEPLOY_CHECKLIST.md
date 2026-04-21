# LibreMercado - Checklist Pre-Beta Deploy

Este documento ordena los pasos necesarios para llevar LibreMercado a una beta seria, operable y segura. La idea es mantenerlo vivo: cada vez que se cierre un frente, se marca como completado y se actualiza el estado.

## Estado Actual

- [ ] App lista para beta cerrada
- [ ] App lista para beta publica limitada
- [ ] App lista para produccion inicial

## 1. Flujo Usuario Completo

- [x] Registro y login funcionando de punta a punta en frontend.
- [ ] Recuperacion o cambio de contrasena.
- [ ] Perfil de usuario editable con datos basicos, direccion y contacto.
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
- [ ] Confirmacion de entrega.
- [ ] Liberacion de fondos.
- [ ] Apertura y seguimiento de disputa.
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
- [ ] Estado: pago reembolsado.
- [x] Estado: pago en disputa.
- [ ] Comisiones parametrizables por ambiente.
- [ ] Calculo de comision visible para comprador y vendedor.
- [x] Registro interno de eventos financieros.
- [ ] Pruebas de pago aprobado, rechazado, expirado y reembolsado.

## 3. Seguridad y Anti-Abuso

- [ ] Rate limiting por IP en auth.
- [ ] Rate limiting por usuario en acciones sensibles.
- [ ] Rate limiting en mensajes.
- [ ] Rate limiting en publicaciones.
- [ ] Rate limiting en KYC.
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
- [ ] Emails transaccionales minimos.
- [ ] Notificacion de nueva operacion.
- [ ] Notificacion de cambio de entrega.
- [ ] Notificacion de mensaje.
- [ ] Notificacion de disputa.
- [x] Notificacion de KYC aprobado/rechazado.

## 6. Infraestructura y Deploy

- [ ] Separar ambientes: local, staging/beta y produccion.
- [ ] Base de datos gestionada para beta.
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
- [ ] Checklist manual de flujo comprador.
- [ ] Checklist manual de flujo vendedor.
- [ ] Checklist manual de flujo admin.
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
- [ ] Prueba de disputa abierta.
- [ ] Prueba de pago rechazado.
- [ ] Prueba responsive mobile.
- [ ] Prueba con usuarios reales internos.

## Orden Recomendado Inmediato

- [x] 1. Storage real de imagenes y archivos KYC.
- [x] 2. KYC admin funcional con revision.
- [x] 3. Integracion de pagos en modo sandbox.
- [ ] 4. Notificaciones por email.
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
