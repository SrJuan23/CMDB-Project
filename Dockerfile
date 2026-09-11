FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm ci --only=production

# Build backend
COPY backend/ ./
RUN npm run build

# Install frontend dependencies and build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Production image
FROM node:20-alpine

WORKDIR /app

# Install PostgreSQL client for health checks
RUN apk add --no-cache postgresql-client

# Copy built backend
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/backend/package.json ./package.json

# Copy frontend build
COPY --from=builder /app/frontend/dist ./public

# Create data directory for SQLite (development)
RUN mkdir -p data

EXPOSE 5000

CMD ["node", "dist/server.js"]
