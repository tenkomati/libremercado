# Smoke Predeploy

Este smoke test valida el flujo crítico buyer-seller-admin contra el stack local o staging sin proveedor real de pagos ni seguros.

## Prerrequisitos

- API levantada en `http://localhost:3001`
- Web levantada en `http://localhost:3000`
- Base sembrada con:

```bash
npm run prisma:seed --workspace @libremercado/api
```

- `PAYMENT_PROVIDER=SANDBOX`

## Comando

```bash
npm run smoke:predeploy
```

## Variables opcionales

- `LM_SMOKE_API_URL`
- `LM_SMOKE_WEB_URL`
- `LM_SMOKE_ADMIN_EMAIL`
- `LM_SMOKE_ADMIN_PASSWORD`
- `LM_SMOKE_SELLER_EMAIL`
- `LM_SMOKE_SELLER_PASSWORD`
- `LM_SMOKE_BUYER_EMAIL`
- `LM_SMOKE_BUYER_PASSWORD`

## Qué valida

1. `GET /health`
2. login de admin, seller y buyer
3. `GET /auth/me`
4. `GET /admin/overview`
5. upload real de imagen de publicación por web
6. creación de listing nuevo por seller
7. cotización elegible de micro-seguro
8. checkout protegido con seguro
9. aprobación sandbox por admin
10. emisión automática de póliza
11. upload real de evidencia de claim por web
12. apertura de reclamo por buyer
13. resolución manual del reclamo por admin
14. auditoría de apertura y resolución

## Qué sigue siendo manual

- revisión visual de home, market, `/account` y `/admin`
- UX de formularios y mensajes
- casos de error de navegador
- performance real con datos grandes
- validación operativa de emails/logs

## Ronda manual recomendada

Después del smoke automático:

1. Entrar como seller y revisar que la publicación nueva aparezca en `/account`.
2. Entrar como buyer y verificar estado de compra, póliza y reclamo en `/account`.
3. Entrar a `/admin/insurance/:id` y revisar evidencias, auditoría y resolución.
4. Entrar a `/admin/audit-logs` y confirmar trazabilidad completa.
