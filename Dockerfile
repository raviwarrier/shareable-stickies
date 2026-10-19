FROM node:22-alpine

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

WORKDIR /app

# Install build dependencies, libc6-compat, and su-exec for privilege dropping
RUN apk add --no-cache libc6-compat su-exec

# Copy package manifest and install all dependencies
COPY package.json ./
RUN npm install --legacy-peer-deps --ignore-scripts

# Copy only necessary files
COPY --chown=nodejs:nodejs package.json ./
COPY --chown=nodejs:nodejs server.ts ./
COPY --chown=nodejs:nodejs server/ ./server/
COPY --chown=nodejs:nodejs src/ ./src/
COPY --chown=nodejs:nodejs vite.config.ts ./
COPY --chown=nodejs:nodejs tsconfig.json ./
COPY --chown=nodejs:nodejs index.html ./
COPY --chown=nodejs:nodejs .env.example ./

# Copy entrypoint script to fix volume permissions and drop privileges at runtime
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Build client and create data directories in a single layer
RUN npm run build && \
    mkdir -p /app/data /app/uploads && \
    chown -R nodejs:nodejs /app

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "node_modules/.bin/tsx", "server.ts"]
