FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Eliminamos dependencias de desarrollo y dejamos solo las de prod
RUN npm prune --production

FROM node:20-alpine AS production

WORKDIR /app

# Asignar usuario no root por seguridad
RUN chown -R node:node /app
USER node

COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/src ./src

EXPOSE 3000

# Añadir healthcheck explícito para orquestadores y auto-curación
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["npm", "start"]
