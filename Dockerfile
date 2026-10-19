FROM node:22-alpine

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

WORKDIR /app

# Install build dependencies if needed
RUN apk add --no-cache libc6-compat

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

# Build client and create data directories in a single layer
RUN npm run build && \
    mkdir -p /app/data /app/uploads && \
    chown -R nodejs:nodejs /app/data /app/uploads

# Create entrypoint script that fixes volume ownership at runtime.
# Volumes mounted from the host may have different ownership than nodejs,
# so we chown at startup before dropping privileges.
RUN echo '#!/bin/sh\nchown -R nodejs:nodejs /app/data /app/uploads 2>/dev/null || true\nexec su -s /bin/sh nodejs -c "exec node /app/node_modules/.bin/tsx /app/server.ts"' > /usr/local/bin/start.sh && \
    chmod +x /usr/local/bin/start.sh

USER root

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

CMD ["sh", "/usr/local/bin/start.sh"]
