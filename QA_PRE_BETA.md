# LibreMercado - QA Pre-Beta

Este documento define las pruebas manuales y semi-tecnicas necesarias antes de abrir una beta cerrada. La prioridad es validar confianza operativa: registro, identidad, publicacion, compra protegida, entrega, pagos sandbox, admin y anti-abuso basico.

## Estado

- [ ] QA completo aprobado para beta cerrada
- [ ] QA completo aprobado para beta publica limitada
- [ ] Smoke test local ejecutado
- [ ] Smoke test staging ejecutado
- [ ] Regresion critica ejecutada despues del ultimo deploy

## Ambiente Requerido

- App web levantada en `http://localhost:3000`
- API levantada en `http://localhost:3001`
- PostgreSQL y Redis activos con `docker compose up -d`
- Migraciones aplicadas con `npm run prisma:migrate:deploy --workspace @libremercado/api`
- Seed cargado con `npm run prisma:seed --workspace @libremercado/api`
- `EMAIL_PROVIDER=log` para verificar emails transaccionales en logs
- `MEDIA_STORAGE_DRIVER=local` para pruebas locales de imagenes

## Credenciales Demo

Admin:

- Email: `sofia.romero@libremercado.test`
- Password: `Admin12345!`

Comprador:

- Email: `valentina.mendez@libremercado.test`
- Password: `Buyer12345!`

Antes de cada ronda importante, validar que el seed haya dejado al menos:

- un usuario comprador activo con identidad aprobada
- un usuario vendedor activo con identidad aprobada
- una publicacion publicada disponible
- operaciones en distintos estados para revisar admin y cuenta

## Reglas de Ejecucion

- Cada caso debe registrar resultado: `PASA`, `FALLA`, `BLOQUEADO` o `NO APLICA`.
- Todo fallo debe incluir URL, usuario usado, pasos reproducibles y captura si aplica.
- No abrir beta si falla un caso critico de auth, KYC, compra protegida, pagos, permisos o admin.
- Si un caso falla por una feature aun no implementada, debe quedar enlazado al checklist pre-beta como pendiente funcional.
- Despues de cada fix relevante, repetir al menos el smoke test y el caso que fallo.

## Severidad

- `P0`: bloquea beta. Riesgo de seguridad, perdida de datos, dinero, identidad o imposibilidad de operar.
- `P1`: bloquea beta si no hay workaround claro. Flujo principal roto o confusion fuerte para usuario.
- `P2`: no bloquea beta cerrada, pero debe quedar registrado. Problema visual, copy o friccion menor.
- `P3`: mejora futura.

## Smoke Test Tecnico

- [ ] `docker compose ps` muestra Postgres y Redis activos.
- [ ] `npm run typecheck --workspace @libremercado/api` pasa.
- [ ] `npm run typecheck --workspace @libremercado/web` pasa.
- [ ] `npm run lint --workspace @libremercado/api` pasa.
- [ ] `npm run lint --workspace @libremercado/web` pasa.
- [ ] `npm run build --workspace @libremercado/api` pasa.
- [ ] `npm run build --workspace @libremercado/web` pasa.
- [ ] `npm audit --workspaces --audit-level=moderate` queda en `0 vulnerabilities`.
- [ ] `GET /health` responde correctamente.
- [ ] Home carga sin errores visibles.
- [ ] `/market` lista publicaciones.
- [ ] `/login` permite iniciar sesion.
- [ ] `/account` exige sesion.
- [ ] `/admin` exige usuario admin.

## Flujo 1 - Registro, Login e Identidad

Criticidad: `P0`

- [ ] Usuario nuevo puede abrir `/signup`.
- [ ] Formulario exige datos basicos obligatorios.
- [ ] Formulario exige frente de DNI.
- [ ] Formulario exige dorso de DNI.
- [ ] Formulario exige selfie.
- [ ] Formulario exige consentimiento de validacion de identidad.
- [ ] Upload acepta JPG, PNG, WEBP, HEIC y HEIF soportados.
- [ ] Upload rechaza archivo con extension no permitida.
- [ ] Upload rechaza archivo mayor al limite.
- [ ] Registro exitoso crea usuario y sesion.
- [ ] Registro exitoso crea verificacion de identidad `PENDING`.
- [ ] Email de bienvenida aparece en logs cuando `EMAIL_PROVIDER=log`.
- [ ] `/account` muestra identidad pendiente.
- [ ] Logout funciona.
- [ ] Login con credenciales correctas funciona.
- [ ] Login con password incorrecta falla sin filtrar si el email existe.
- [ ] Usuario autenticado puede editar nombre, apellido, teléfono, ciudad y provincia.
- [ ] Usuario autenticado no puede editar email ni DNI desde `/account`.
- [ ] Usuario autenticado puede cambiar contraseña informando contraseña actual.
- [ ] Cambio de contraseña falla si la contraseña actual es incorrecta.
- [ ] Cambio de contraseña falla si confirmación y nueva contraseña no coinciden.
- [ ] Usuario puede pedir recuperación de contraseña desde `/forgot-password`.
- [ ] Solicitud de recuperación no filtra si el email existe.
- [ ] Email/log de recuperación incluye enlace a `/reset-password`.
- [ ] Token de recuperación permite crear contraseña nueva una sola vez.
- [ ] Token usado o vencido no permite cambiar contraseña.
- [ ] Rate limit de login responde `429` despues de intentos excesivos.

Criterio de aceptacion:

- El usuario puede registrarse con evidencia minima de identidad y queda autenticado.
- No se puede operar como usuario aprobado hasta que admin revise la identidad.

## Flujo 2 - Revision KYC Admin

Criticidad: `P0`

- [ ] Admin puede entrar a `/admin`.
- [ ] Admin ve listado de verificaciones.
- [ ] Admin puede abrir detalle de KYC.
- [ ] Admin ve frente DNI, dorso DNI y selfie.
- [ ] Admin no puede aprobar si falta evidencia requerida.
- [ ] Admin puede aprobar identidad.
- [ ] Usuario recibe notificacion interna por KYC aprobado.
- [ ] Email de KYC aprobado aparece en logs.
- [ ] Admin puede pedir correccion con nota clara.
- [ ] Usuario ve nota de correccion en `/account/kyc`.
- [ ] Usuario puede reenviar frente, dorso y selfie.
- [ ] Admin puede rechazar identidad.
- [ ] Email de KYC rechazado o correccion requerida aparece en logs.

Criterio de aceptacion:

- El ciclo `PENDING -> APPROVED`, `PENDING -> REQUIRES_REVIEW` y `PENDING -> REJECTED` funciona con trazabilidad y notificacion.

## Flujo 3 - Publicacion Vendedor

Criticidad: `P0`

- [ ] Usuario sin identidad aprobada no puede publicar.
- [ ] Vendedor aprobado puede abrir `/account/listings/new`.
- [ ] Formulario exige titulo, descripcion, categoria, condicion, precio y ubicacion.
- [ ] Formulario permite elegir ARS.
- [ ] Formulario permite elegir USD si admin lo habilita.
- [ ] Vendedor ve antes de publicar que publicar cuesta $0.
- [ ] Vendedor ve comision estimada y neto estimado antes de publicar.
- [ ] Imagen principal se puede subir y previsualizar.
- [ ] HEIC/HEIF se convierte a JPG si el archivo es soportado por `sharp`.
- [ ] Publicacion se crea como propia del vendedor autenticado.
- [ ] Publicacion aparece en `/account`.
- [ ] Publicacion aparece en `/market` si queda publicada.
- [ ] Vendedor puede editar publicacion propia.
- [ ] Vendedor puede pausar/reactivar publicacion propia.
- [ ] Usuario no puede editar publicacion ajena.

Criterio de aceptacion:

- Un vendedor aprobado puede publicar y administrar producto sin romper permisos de propiedad.

## Flujo 4 - Compra Protegida y Pago Sandbox

Criticidad: `P0`

- [ ] Comprador aprobado puede abrir detalle de publicacion en `/market/[id]`.
- [ ] Comprador no puede comprar su propia publicacion.
- [ ] Comprador inicia compra protegida.
- [ ] API crea escrow en `FUNDS_PENDING`.
- [ ] API crea `PaymentIntent` en `PAYMENT_PENDING`.
- [ ] Comprador ve la compra en `/account`.
- [ ] Vendedor ve la venta en `/account`.
- [ ] Admin ve la operacion en `/admin`.
- [ ] Email/log de compra protegida iniciada se emite para comprador y vendedor.
- [ ] Admin puede aprobar pago sandbox.
- [ ] Pago pasa a `FUNDS_HELD`.
- [ ] Escrow pasa a `FUNDS_HELD`.
- [ ] Webhook firmado con `x-lm-signature` valido actualiza `PaymentIntent`.
- [ ] Webhook sin firma o con firma invalida responde error y no cambia estados.
- [ ] Webhook duplicado por mismo `eventId` no duplica efectos.
- [ ] Webhook `FUNDS_HELD` mueve escrow a `FUNDS_HELD`.
- [ ] Webhook `REFUNDED` mueve escrow a `REFUNDED`.
- [ ] Webhook `DISPUTED` mueve escrow a `DISPUTED`.
- [ ] Compra en ARS conserva moneda, monto, comision y neto vendedor correctos.
- [ ] Compra en USD conserva moneda, monto, comision y neto vendedor correctos.
- [ ] Si el comprador elige seguro, el `PaymentIntent.amount` incluye `insurance_fee`.
- [ ] Publicacion queda reservada/no disponible para otra compra.
- [ ] Email/log de fondos protegidos se emite para comprador y vendedor.

Criterio de aceptacion:

- La compra queda protegida y visible para ambas partes, con estado financiero auditable.

## Flujo 4C - Seguro Embebido

Criticidad: `P1`

- [ ] Endpoint `POST /insurance/get-quote` responde solo para usuarios autenticados.
- [ ] Categoría no elegible no ofrece seguro.
- [ ] Monto inferior al umbral no ofrece seguro.
- [ ] Categoría elegible y monto alto devuelve prima y cobertura.
- [ ] Usuario sin identidad aprobada no puede emitir seguro aunque vea cotización.
- [ ] Checkout con `insuranceSelected=true` guarda `is_insured=true` en escrow.
- [ ] Checkout con seguro guarda `insurance_fee` en escrow.
- [ ] Ficha pública muestra checkbox de micro-seguro con prima, cobertura y total.
- [ ] Pago confirmado emite póliza automáticamente.
- [ ] Se crea registro en `insurance_policies`.
- [ ] `policy_id_externo`, `premium_amount`, `coverage_amount` y `policy_url` quedan persistidos.
- [ ] `/account` muestra estado del seguro y link a póliza.
- [ ] `/admin/escrows/:id` muestra estado del seguro y link a póliza.
- [ ] Webhook de póliza firmado actualiza estado a `ACTIVE` o `CLAIMED`.
- [ ] Webhook de póliza sin firma válida no actualiza nada.

Criterio de aceptacion:

- El seguro se ofrece solo donde tiene sentido, se cobra dentro del checkout y la póliza nace únicamente cuando el pago queda realmente protegido.

## Flujo 4B - Comisiones y Moneda Admin

Criticidad: `P0`

- [ ] Admin ve bloque de comisiones globales en `/admin`.
- [ ] Admin puede dejar comprador en `0%`.
- [ ] Admin puede dejar vendedor en `5%`.
- [ ] Admin puede dejar costo fijo de publicacion en `0`.
- [ ] Admin puede dejar costo fijo de venta en `0`.
- [ ] Admin puede habilitar/deshabilitar publicaciones en USD.
- [ ] Cambio de comisiones queda auditado como `PLATFORM_SETTINGS_UPDATED`.
- [ ] Nueva publicacion toma moneda default si no se informa moneda.
- [ ] Si USD esta deshabilitado, API rechaza publicacion USD.
- [ ] Vendedor ve neto estimado antes de editar una publicacion.

Criterio de aceptacion:

- La politica comercial se puede cambiar desde admin sin redeploy y el vendedor entiende cuanto cobra antes de publicar o aceptar una venta.

## Flujo 5 - Coordinacion de Entrega

Criticidad: `P1`

- [ ] Vendedor puede proponer metodo de entrega.
- [ ] Comprador puede aceptar metodo de entrega.
- [ ] Comprador puede rechazar metodo con mensaje.
- [ ] Vendedor puede publicar franjas horarias para encuentro seguro.
- [ ] No se permite franja que cruza de dia.
- [ ] Campo "Disponible hasta" se habilita solo despues de elegir "Disponible desde".
- [ ] Comprador puede elegir una franja disponible.
- [ ] Sugerencias de puntos intermedios funcionan con fallback local sin Google Maps.
- [ ] Con `GOOGLE_MAPS_API_KEY`, sugerencias reales no rompen el flujo.
- [ ] Mensajes de coordinacion se guardan y se ven en compra/venta.
- [ ] Email/log se emite ante propuesta, respuesta, franja, seleccion y mensaje.

Criterio de aceptacion:

- Las partes pueden acordar como entregar sin salir de la app.

## Flujo 6 - Estados de Envio, Entrega y Fondos

Criticidad: `P0`

- [ ] Vendedor/admin puede marcar envio con tracking si aplica.
- [ ] Vendedor puede marcar envio desde `/account` con tracking opcional.
- [ ] Comprador y vendedor reciben notificacion/email de envio.
- [ ] Comprador puede confirmar entrega desde `/account`.
- [ ] Entrega confirmada mueve escrow a `DELIVERED`.
- [ ] Pagos asociados pasan a `READY_TO_RELEASE`.
- [ ] Liberacion de fondos mueve escrow a `RELEASED`.
- [ ] Pagos asociados pasan a `RELEASED`.
- [ ] Publicacion pasa a `SOLD`.
- [ ] Eventos financieros quedan auditables.

Pendiente funcional conocido:

- Liberacion de fondos sigue reservada a admin/ops hasta definir reglas operativas y legales.

Criterio de aceptacion:

- La operacion puede cerrarse de punta a punta sin estados inconsistentes.

## Flujo 7 - Disputa, Cancelacion y Reembolso

Criticidad: `P0`

- [ ] Admin puede abrir disputa en operacion elegible.
- [ ] Comprador puede abrir disputa desde `/account` con motivo obligatorio.
- [ ] Vendedor puede abrir disputa desde `/account` con motivo obligatorio.
- [ ] Escrow pasa a `DISPUTED`.
- [ ] Pago pasa a `DISPUTED`.
- [ ] Publicacion queda `UNDER_REVIEW`.
- [ ] Comprador y vendedor reciben notificacion/email.
- [ ] Admin puede cancelar operacion elegible.
- [ ] Escrow pasa a `REFUNDED`.
- [ ] Pago pasa a `REFUNDED`.
- [ ] Publicacion vuelve a `PUBLISHED` si corresponde.
- [ ] Motivo queda registrado en eventos.
- [ ] Admin puede resolver disputa a favor del comprador con reembolso.
- [ ] Admin puede resolver disputa a favor del vendedor con liberacion de fondos.
- [ ] Comprador y vendedor ven el seguimiento/resolucion en `/account`.
- [ ] Home explica cancelacion, disputa y liberacion de fondos sin lenguaje tecnico.
- [ ] Detalle de publicacion muestra reglas de compra protegida antes de comprar.
- [ ] `/account` muestra reglas de compra/venta protegida dentro de cada operacion.
- [ ] Home muestra guia breve para comprador y vendedor.
- [ ] Market y detalle de publicacion muestran guia breve para comprar seguro.
- [ ] `/account` muestra guia breve para comprar y vender seguro.

Pendiente funcional conocido:

- Seguimiento y resolucion de disputa desde usuario ya muestra motivo/eventos relevantes; soporte/admin resuelve por panel.

Criterio de aceptacion:

- Soporte/admin puede intervenir y dejar trazabilidad financiera ante problemas.

## Flujo 8 - Admin, Permisos y Auditoria

Criticidad: `P0`

- [ ] Usuario comun no puede entrar a `/admin`.
- [ ] Usuario comun no puede listar usuarios.
- [ ] Usuario comun no puede revisar KYC ajeno.
- [ ] Usuario comun no puede aprobar pagos sandbox.
- [ ] OPS puede acceder a operaciones permitidas.
- [ ] ADMIN puede cambiar rol de usuario.
- [ ] ADMIN/OPS puede bloquear usuario.
- [ ] Cambios de usuario generan audit log.
- [ ] Cambios de publicacion generan audit log.
- [ ] Revision KYC genera audit log.
- [ ] Acciones de escrow generan eventos/auditoria.
- [ ] Filtros admin por estado, usuario y busqueda funcionan.

Criterio de aceptacion:

- No hay escalamiento de privilegios evidente y las acciones operativas quedan auditadas.

## Flujo 9 - Seguridad y Anti-Abuso

Criticidad: `P0`

- [ ] Rate limit de auth responde `429`.
- [ ] Rate limit de KYC responde `429`.
- [ ] Rate limit de publicaciones responde `429`.
- [ ] Rate limit de mensajes responde `429`.
- [ ] Rate limit de checkout responde `429`.
- [ ] Rate limit de upload responde `429`.
- [ ] Upload con `content-length` excesivo responde `413`.
- [ ] Upload invalido responde error amigable.
- [ ] Token invalido no accede a rutas privadas.
- [ ] Token vencido no accede a rutas privadas.
- [ ] CORS queda revisado para ambiente beta.
- [ ] Secrets reales no estan commiteados.
- [ ] `npm audit` queda limpio.

Criterio de aceptacion:

- Los flujos caros y sensibles tienen barreras basicas antes de exponer beta.

## Flujo 10 - Responsive y Experiencia

Criticidad: `P1`

- [ ] Home se ve correctamente en mobile.
- [ ] Market se ve correctamente en mobile.
- [ ] Detalle de publicacion se ve correctamente en mobile.
- [ ] Login/signup se ve correctamente en mobile.
- [ ] `/account` se puede operar en mobile.
- [ ] Acordeones de compras/ventas son usables en mobile.
- [ ] Formularios de publicacion y KYC son usables en mobile.
- [ ] Admin es operable al menos en desktop.
- [ ] Estados vacios son claros.
- [ ] Mensajes de error son entendibles para usuario comun.

Criterio de aceptacion:

- Un beta tester puede completar flujo comprador/vendedor desde mobile sin quedar trabado.

## Matriz de Bloqueo Beta

No abrir beta cerrada si queda abierto:

- [ ] Registro/login roto.
- [ ] KYC admin no puede aprobar o pedir correccion.
- [ ] Publicacion desde frontend rota.
- [ ] Checkout protegido no crea escrow/payment intent.
- [ ] Admin no puede aprobar pago sandbox.
- [ ] Comprador/vendedor no ven sus operaciones.
- [ ] Permisos permiten acceso a datos ajenos.
- [ ] Upload de DNI o imagenes no funciona.
- [ ] `npm audit` reporta vulnerabilidades high/moderate sin decision documentada.
- [ ] Build de API o Web falla.

Puede abrir beta cerrada con riesgo aceptado y documentado:

- [ ] Proveedor de email real aun no conectado, si `EMAIL_PROVIDER=log` se reemplaza antes de beta publica.
- [ ] Google Maps sin API key, si fallback local funciona.
- [ ] Pagos reales pendientes, si beta usa sandbox con testers internos.
- [ ] Disputa self-service sin seguimiento dedicado, si soporte/admin opera la resolucion manualmente.

## Resultado de Ejecucion

Completar al correr QA:

- Fecha:
- Ambiente:
- Commit:
- Responsable:
- Resultado general:
- Bloqueantes P0:
- Riesgos aceptados:
- Link a issues/tareas:
