FROM node:22.23.3-bookworm-slim AS build
ARG APP
ARG MUSEUM_URL
WORKDIR /workspace
COPY scripts/customer-design-sync.mjs ./scripts/customer-design-sync.mjs
COPY design/customer/tokens.json ./design/customer/tokens.json
COPY frontend-mobile/src/theme/tokens.ts ./frontend-mobile/src/theme/tokens.ts
COPY frontend-web/src/styles/customer-tokens.generated.css ./frontend-web/src/styles/customer-tokens.generated.css
COPY frontend-web/src/design/customer.generated.ts ./frontend-web/src/design/customer.generated.ts
COPY ${APP}/package.json ${APP}/package-lock.json ./${APP}/
WORKDIR /workspace/${APP}
RUN npm ci --no-audit --no-fund
COPY ${APP}/ ./
ENV VITE_API_BASE_URL=/api VITE_PUBLIC_MUSEUM_URL=${MUSEUM_URL} VITE_CUSTOMER_TRANSLATION_ENABLED=false VITE_GROUP_TRANSLATION_ENABLED=false
RUN npm run build
FROM nginx:1.28-alpine
ARG APP
COPY --from=build /workspace/${APP}/dist/ /usr/share/nginx/html/
COPY infra/local-cd/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
HEALTHCHECK --interval=5s --timeout=3s --retries=5 CMD wget -q -O /dev/null http://127.0.0.1:8080/local-ready || exit 1
