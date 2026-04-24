# Cloud Run Mock Deploy

Esta guía deja `libremercado` publicado con las URLs públicas de Cloud Run, manteniendo en mock:

- pagos: `PAYMENT_PROVIDER=SANDBOX`
- seguros: `GenericInsurtech` mock
- emails: `EMAIL_PROVIDER=log`
- media storage: `MEDIA_STORAGE_DRIVER=local`
- face match: detección local de navegador o revisión manual

## Limitaciones importantes

Este modo sirve para staging/beta interna técnica, no para beta pública real.

- `MEDIA_STORAGE_DRIVER=local` en Cloud Run es efímero.
- Si la instancia reinicia o se redeploya, los uploads pueden perderse.
- Sin `REDIS_URL`, el rate limiting queda en memoria por instancia.
- Por eso los scripts fuerzan `--max-instances 1`.

## Requisitos

- proyecto GCP creado
- billing habilitado
- Cloud Run API habilitada
- Cloud Build API habilitada
- Artifact Registry API habilitada
- Postgres listo (por ejemplo Supabase)

## 1. Crear repositorio de imágenes

```bash
gcloud artifacts repositories create libremercado \
  --repository-format=docker \
  --location=us \
  --description="LibreMercado images"
```

## 2. Preparar variables

Copiar y completar:

- `cloudrun/api.mock.env.yaml`
- `cloudrun/web.mock.env.yaml`

Validar estructura antes del primer deploy:

```bash
node scripts/cloudrun/validate-mock-env.mjs all --example
```

Notas:

1. Primero deployá la API.
2. Tomá la URL pública de la API.
3. Pegala en `NEXT_PUBLIC_API_URL` dentro de `cloudrun/web.mock.env.yaml`.
4. Deployá la web.
5. Tomá la URL pública de la web.
6. Actualizá `APP_PUBLIC_URL` en `cloudrun/api.mock.env.yaml`.
7. Redeployá la API para que links y emails mock apunten bien.

Checklist mínimo de variables reales antes de deployar:

- `DATABASE_URL` con pooler/SSL de staging listo.
- `JWT_SECRET` idéntico en API y Web.
- `NEXT_PUBLIC_API_URL` apuntando a la API de Cloud Run.
- `APP_PUBLIC_URL` apuntando a la Web de Cloud Run.
- `PAYMENT_PROVIDER=SANDBOX`.
- `EMAIL_PROVIDER=log`.
- `MEDIA_STORAGE_DRIVER=local`.

## 3. Deploy API

```bash
PROJECT_ID="<tu-project-id>" REGION="southamerica-east1" \
bash scripts/cloudrun/deploy-api.sh
```

Obtener URL:

```bash
gcloud run services describe libremercado-api \
  --project "<tu-project-id>" \
  --region "southamerica-east1" \
  --format='value(status.url)'
```

## 4. Deploy Web

Editar `cloudrun/web.mock.env.yaml` con la URL de la API y correr:

```bash
PROJECT_ID="<tu-project-id>" REGION="southamerica-east1" \
bash scripts/cloudrun/deploy-web.sh
```

Obtener URL:

```bash
gcloud run services describe libremercado-web \
  --project "<tu-project-id>" \
  --region "southamerica-east1" \
  --format='value(status.url)'
```

## 5. Redeploy API con la URL real de la web

Actualizar `APP_PUBLIC_URL` en `cloudrun/api.mock.env.yaml` con la URL pública del servicio web y volver a correr:

```bash
PROJECT_ID="<tu-project-id>" REGION="southamerica-east1" \
bash scripts/cloudrun/deploy-api.sh
```

## 6. Migraciones

Con la base ya configurada:

```bash
npm run prisma:migrate:deploy:staging --workspace @libremercado/api
```

Si querés sembrar staging interno:

```bash
npm run prisma:seed --workspace @libremercado/api
```

## 7. Verificación mínima

1. Abrir la URL de web de Cloud Run.
2. Validar login buyer/admin.
3. Validar `/admin`.
4. Correr `npm run smoke:predeploy` apuntando a Cloud Run:

```bash
LM_SMOKE_API_URL="https://<api-url>" \
LM_SMOKE_WEB_URL="https://<web-url>" \
node --input-type=module -e "import('./scripts/smoke-predeploy.mjs')"
```

## Orden operativo recomendado

1. Completar `cloudrun/api.mock.env.yaml`.
2. Correr `node scripts/cloudrun/validate-mock-env.mjs api`.
3. Deployar API.
4. Copiar URL pública de API en `cloudrun/web.mock.env.yaml`.
5. Completar `cloudrun/web.mock.env.yaml` y poner mismo `JWT_SECRET`.
6. Correr `node scripts/cloudrun/validate-mock-env.mjs web`.
7. Deployar Web.
8. Copiar URL pública de Web a ambos `APP_PUBLIC_URL`.
9. Correr `npm run cloudrun:validate:mock`.
10. Redeployar API.
11. Ejecutar migraciones staging.
12. Correr smoke contra Cloud Run.

## Recomendación antes de beta pública

Antes de abrir usuarios externos, cambiar estos mocks:

- `MEDIA_STORAGE_DRIVER=local` -> `s3`
- `EMAIL_PROVIDER=log` -> proveedor real
- `PAYMENT_PROVIDER=SANDBOX` -> pasarela real
- seguro mock -> proveedor real
- rate limiting en memoria -> `REDIS_URL` gestionado
