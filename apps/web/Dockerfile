FROM node:22-alpine AS deps
WORKDIR /app
COPY . .
RUN npm install --workspaces --include-workspace-root

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace @libremercado/web

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["sh", "-c", "cd /app/apps/web && /app/node_modules/.bin/next start -H 0.0.0.0 -p ${PORT:-3000}"]
