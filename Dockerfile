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

# Install dumb-init for proper signal handling (PID 1 problem)
RUN apk add --no-cache dumb-init

WORKDIR /app

# Create necessary directories and set ownership for non-root user
RUN mkdir -p src/config && chown -R node:node /app

# Copy dependencies definition
COPY --chown=node:node package*.json ./

# Switch to non-root user 'node' for security
USER node

# Install production dependencies and clean cache to reduce image size
RUN npm ci --omit=dev && npm cache clean --force

# Copy built assets and server code with correct ownership
COPY --chown=node:node --from=build-stage /app/dist ./dist
COPY --chown=node:node --from=build-stage /app/server.js ./
COPY --chown=node:node --from=build-stage /app/src/config/data.json ./src/config/data.json

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    ADMIN_USERNAME=admin \
    ADMIN_PASSWORD=admin123 \
    JWT_SECRET=change-me-in-production

EXPOSE 3000

# Use dumb-init as entrypoint to handle signals correctly
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "server.js"]
