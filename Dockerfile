FROM node:22-alpine

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs

WORKDIR /app

# Install build dependencies if needed
RUN apk add --no-cache libc6-compat

# Copy package manifests and install all dependencies
COPY package.json package-lock.json* ./
RUN npm install --ignore-scripts

# Copy source code and build client bundle
COPY --chown=nodejs:nodejs . .
RUN npm run build

# Ensure data and uploads mount directories exist
RUN mkdir -p /app/data /app/uploads && chown -R nodejs:nodejs /app/data /app/uploads

USER nodejs

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "node_modules/.bin/tsx", "server.ts"]
