FROM node:24.18-alpine AS build

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY index.html tsconfig*.json vite.config.ts eslint.config.js ./
COPY src ./src
RUN pnpm build

FROM node:24.18-alpine AS runtime

ARG FOUNDATIONOS_VERSION=0.5.0-alpha

LABEL org.opencontainers.image.title="FoundationOS" \
      org.opencontainers.image.description="Self-hosted operating system for small grantmaking foundations" \
      org.opencontainers.image.version="${FOUNDATIONOS_VERSION}" \
      org.opencontainers.image.licenses="GPL-3.0-or-later"

ENV NODE_ENV=production \
    FOUNDATION_OS_DATA_DIR=/data \
    FOUNDATION_OS_PUBLIC_DIR=/app/dist \
    FOUNDATION_OS_PORT=3000

WORKDIR /app
RUN mkdir -p /data && chown node:node /data

COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node server.mjs ./server.mjs
COPY --chown=node:node src/server ./src/server
COPY --chown=node:node package.json ./package.json

USER node
EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=10s --timeout=3s --start-period=8s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/health/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["node", "server.mjs"]
