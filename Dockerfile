# Stage 1: Build the frontend
FROM node:20-alpine AS build-stage

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Use npm ci for deterministic and faster builds
RUN npm ci

# Copy source code
COPY . .

# Build the frontend
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine

# Install dumb-init for signal handling and su-exec for user switching
RUN apk add --no-cache dumb-init su-exec

WORKDIR /app

# Create data directory (will be overwritten by bind mount, but needed for standalone)
RUN mkdir -p /app/data && chown -R node:node /app

# Copy dependencies definition
COPY package*.json ./

# Install production dependencies as root, then fix ownership
RUN npm ci --omit=dev && npm cache clean --force

# Copy built assets and server code
COPY --from=build-stage /app/dist ./dist
COPY --from=build-stage /app/server.js ./
COPY --from=build-stage /app/backend ./backend
COPY --from=build-stage /app/common ./common
COPY --from=build-stage /app/browser-extension ./browser-extension

# Copy and setup entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Set environment variables
ENV NODE_ENV=production \
    PORT=3333 \
    DATA_PATH=/app/data

EXPOSE 3333

# Use dumb-init + entrypoint for proper signal handling and permission fix
ENTRYPOINT ["/usr/bin/dumb-init", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
