# Production Dockerfile for Solar Monitor Backend
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy non-root user and dependencies
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

# Create non-root user directory permissions
RUN chown -R node:node /app
USER node

EXPOSE 4000

CMD ["node", "src/index.js"]
