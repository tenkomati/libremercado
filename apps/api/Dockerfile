FROM node:22-alpine AS deps
WORKDIR /app
COPY . .
RUN npm install --workspaces --include-workspace-root

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
WORKDIR /app/apps/api
RUN /app/node_modules/.bin/prisma generate --schema prisma/schema.prisma
RUN /app/node_modules/.bin/tsc -p tsconfig.build.json

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3001
CMD ["sh", "-c", "/app/node_modules/.bin/prisma migrate deploy --schema apps/api/prisma/schema.prisma && node apps/api/dist/main"]
