# Stage 1: Dependencies & Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY sunloc-server/package*.json ./

# Install dependencies
RUN npm install --production

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application files from sunloc-server directory
COPY sunloc-server/package.json ./
COPY sunloc-server/server.js ./
COPY sunloc-server/sunloc-api-client.js ./
COPY sunloc-server/public/ ./public/

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server
CMD ["node", "server.js"]
