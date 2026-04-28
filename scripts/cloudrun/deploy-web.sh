#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID}"
REGION="${REGION:-southamerica-east1}"
SERVICE_NAME="${WEB_SERVICE_NAME:-libremercado-web}"
REPOSITORY="${ARTIFACT_REPOSITORY:-libremercado}"
ARTIFACT_REGION="${ARTIFACT_REGION:-southamerica-east1}"
IMAGE="${ARTIFACT_REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE_NAME}"
ENV_FILE="${WEB_ENV_FILE:-cloudrun/web.mock.env.yaml}"

echo "Validating Web env file: ${ENV_FILE}"
node scripts/cloudrun/validate-mock-env.mjs web --file "${ENV_FILE}"

echo "Building Web image: ${IMAGE}"
gcloud builds submit \
  --project "${PROJECT_ID}" \
  --config cloudbuild.web.yaml \
  --substitutions "_IMAGE=${IMAGE}" \
  .

echo "Deploying Web service: ${SERVICE_NAME}"
gcloud run deploy "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 1 \
  --set-env-vars "PORT=8080" \
  --env-vars-file "${ENV_FILE}" \
  --image "${IMAGE}"

echo "Web deployed. Get URL with:"
echo "gcloud run services describe ${SERVICE_NAME} --project ${PROJECT_ID} --region ${REGION} --format='value(status.url)'"
