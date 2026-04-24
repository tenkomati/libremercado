#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:?Set PROJECT_ID}"
REGION="${REGION:-southamerica-east1}"
SERVICE_NAME="${API_SERVICE_NAME:-libremercado-api}"
REPOSITORY="${ARTIFACT_REPOSITORY:-libremercado}"
IMAGE="us-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE_NAME}"
ENV_FILE="${API_ENV_FILE:-cloudrun/api.mock.env.yaml}"

echo "Validating API env file: ${ENV_FILE}"
node scripts/cloudrun/validate-mock-env.mjs api

echo "Building API image: ${IMAGE}"
gcloud builds submit \
  --project "${PROJECT_ID}" \
  --tag "${IMAGE}" \
  --file apps/api/Dockerfile \
  .

echo "Deploying API service: ${SERVICE_NAME}"
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

echo "API deployed. Get URL with:"
echo "gcloud run services describe ${SERVICE_NAME} --project ${PROJECT_ID} --region ${REGION} --format='value(status.url)'"
