FROM node:22.23.3-bookworm-slim@sha256:3ed98443660ff48413b5af19ecefce3b9d50845a901a43420d47cc63a9fddbe9 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev

FROM node:22.23.3-bookworm-slim@sha256:3ed98443660ff48413b5af19ecefce3b9d50845a901a43420d47cc63a9fddbe9 AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && ffmpeg -version >/dev/null && ffprobe -version >/dev/null \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
RUN mkdir -p /var/lib/narration-staging/media /app/uploads \
    && chown -R node:node /var/lib/narration-staging /app/uploads
USER node
EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('node:http').get({host:'127.0.0.1',port:process.env.PORT||8080,path:'/api/health',timeout:3000},r=>{r.resume();process.exitCode=r.statusCode===200?0:1}).on('timeout',function(){this.destroy()}).on('error',()=>{process.exitCode=1})"
CMD ["node", "dist/server.js"]
