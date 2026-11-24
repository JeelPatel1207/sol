# Build container for Solar Monitor Web PWA
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Lightweight static file container
FROM alpine:3.20 AS runner
WORKDIR /srv
COPY --from=builder /app/dist /srv

CMD ["sh", "-c", "cp -rn /srv/* /target/ && sleep infinity"]
