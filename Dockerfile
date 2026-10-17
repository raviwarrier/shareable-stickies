FROM node:22-alpine

WORKDIR /app

# Install build dependencies if needed
RUN apk add --no-cache libc6-compat

# Copy package manifests and install all dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source code and build client bundle
COPY . .
RUN npm run build

# Ensure data and uploads mount directories exist
RUN mkdir -p /app/data /app/uploads

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

CMD ["npx", "tsx", "server.ts"]
