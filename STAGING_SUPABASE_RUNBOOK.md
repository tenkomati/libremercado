# LibreMercado - Runbook Staging con Supabase

Este documento prepara el pasaje a una beta real sin mezclar desarrollo local con datos de staging.

## Estado Actual

- MCP Supabase verificado desde Codex.
- Proyecto detectado: `https://qjmhiagfolrlcktrnqtu.supabase.co`.
- La app sigue usando Prisma sobre Postgres propio; Supabase se usa como Postgres gestionado, no como auth principal.
- No se ejecutaron migraciones sobre Supabase en este paso.

## Decision Tecnica

Para el backend Nest actual, que corre como servicio server-based, usar primero Supavisor en Session mode, puerto `5432`, o conexion directa si el hosting lo permite. Esto evita complejidad prematura.

Si mas adelante la API corre en serverless/autoscaling agresivo, pasar a:

- `DATABASE_URL`: Supavisor Transaction mode, puerto `6543`, con `pgbouncer=true`.
- `DIRECT_URL`: Supavisor Session mode o conexion directa para migraciones.
- `schema.prisma`: agregar `directUrl = env("DIRECT_URL")`.

Referencia usada: documentacion oficial de Supabase para Prisma recomienda usuario dedicado `prisma`, Session mode para migraciones y Transaction mode con `pgbouncer=true` para serverless.

## Preparacion En Supabase

1. Crear usuario dedicado para Prisma desde SQL Editor.

```sql
create user "prisma" with password '<strong-password>' bypassrls createdb;
grant "prisma" to "postgres";
grant usage on schema public to prisma;
grant create on schema public to prisma;
grant all on all tables in schema public to prisma;
grant all on all routines in schema public to prisma;
grant all on all sequences in schema public to prisma;
alter default privileges for role postgres in schema public grant all on tables to prisma;
alter default privileges for role postgres in schema public grant all on routines to prisma;
alter default privileges for role postgres in schema public grant all on sequences to prisma;
```

2. Copiar `.env.staging.example` a `.env.staging`.

3. Completar `DATABASE_URL` con el usuario `prisma`, password fuerte y host del pooler de Supabase.

4. Configurar Redis gestionado antes de abrir beta publica. Sin `REDIS_URL`, la app cae a rate limiting en memoria y eso no alcanza para multiples instancias.

5. Configurar storage S3/R2 para imagenes y KYC. No usar storage local en staging.

6. Mantener `EMAIL_PROVIDER=log` solo para beta interna. Para beta publica, conectar proveedor real antes de invitar usuarios externos.

## Comandos Seguros

Ver estado de migraciones sin modificar la base:

```bash
npm run prisma:migrate:status:staging --workspace @libremercado/api
```

Aplicar migraciones versionadas:

```bash
npm run prisma:migrate:deploy:staging --workspace @libremercado/api
```

Validar app antes de deploy:

```bash
npm run lint
npm run typecheck
npm run build
npm audit --workspaces --audit-level=moderate
```

## Reglas De Seguridad

- No commitear `.env.staging`.
- No usar credenciales `postgres` de Supabase en la app si ya existe usuario `prisma`.
- No correr `prisma migrate reset` contra staging.
- No seedear staging con datos personales reales.
- No habilitar beta publica sin backups automaticos, logs y rate limiting distribuido.
- No exponer KYC en buckets publicos sin una politica formal de acceso.

## Checklist Antes Del Primer Deploy Staging

- [ ] `.env.staging` creado localmente y fuera de git.
- [ ] Usuario `prisma` creado en Supabase.
- [ ] `DATABASE_URL` de staging probado con `prisma migrate status`.
- [ ] Migraciones aplicadas con `prisma migrate deploy`.
- [ ] Redis gestionado configurado.
- [ ] Storage S3/R2 configurado.
- [ ] Dominio beta y HTTPS definidos.
- [ ] Backups de Supabase verificados.
- [ ] Logs de API y web disponibles.
- [ ] QA comprador-vendedor-admin ejecutado contra staging.
