FROM node:22.23.3-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
FROM node:22.23.3-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production PORT=8080 UPLOAD_DIR=/data/uploads
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund \
    && mkdir -p /data/uploads && chown -R node:node /data/uploads
COPY --from=build /app/dist ./dist
COPY staging ./staging
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=15s --start-period=60s --retries=3 \
  CMD ["node", "staging/healthcheck.mjs"]
CMD ["node", "--import", "./staging/preflight.mjs", "dist/server.js"]
