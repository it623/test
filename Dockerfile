# Sunloc Server - Docker Image
FROM node:18-alpine

WORKDIR /app

# Copy all files
COPY sunloc-server/package.json ./
COPY sunloc-server/server.js ./
COPY sunloc-server/sunloc-api-client.js ./
COPY sunloc-server/public/ ./public/

# Install dependencies
RUN npm install --production

# Force fresh build - timestamp: 2026-03-19T07:30:00Z
RUN echo "Building at $(date)" && echo "Random: $RANDOM"

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Start server
CMD ["node", "server.js"]
