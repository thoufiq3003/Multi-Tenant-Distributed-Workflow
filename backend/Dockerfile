# ==========================================
# Aegisflow Distributed Workflow Backend
# Production Multi-Tenant Orchestrator Container
# ==========================================
FROM node:20-alpine AS base

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY src ./src

# Expose backend REST API & WebSocket port
EXPOSE 4000

ENV PORT=4000 \
    NODE_ENV=production

# Health check probe
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1

CMD ["node", "src/server.js"]

