ARG NODE_IMAGE=node:24.14.1-slim
ARG APT_DEBIAN_MIRROR=
ARG APT_DEBIAN_SECURITY_MIRROR=
ARG HTTP_PROXY=
ARG HTTPS_PROXY=
ARG NO_PROXY=

# Stage 1: Build Frontend
FROM ${NODE_IMAGE} AS build-stage
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
WORKDIR /app
COPY package*.json ./
# Use clean install for consistency
RUN npm ci --legacy-peer-deps --ignore-scripts
COPY . .
RUN npm run build

# Stage 2: Production Dependencies
FROM ${NODE_IMAGE} AS prod-deps
WORKDIR /app
ARG APT_DEBIAN_MIRROR
ARG APT_DEBIAN_SECURITY_MIRROR
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
COPY package*.json ./
COPY docker/apt-mirror.sh /tmp/apt-mirror.sh
# Install only production dependencies
# Install native build tools needed for better-sqlite3
# hadolint ignore=DL3008
RUN chmod +x /tmp/apt-mirror.sh \
    && /tmp/apt-mirror.sh \
    && apt-get -o Acquire::Retries=3 update \
    && apt-get -o Acquire::Retries=3 install -y --no-install-recommends python3 make g++ \
    && npm ci --omit=dev --legacy-peer-deps --ignore-scripts \
    && npm rebuild better-sqlite3 \
    && apt-get purge -y --auto-remove python3 make g++ \
    && rm -rf /var/lib/apt/lists/* \
    && npm cache clean --force \
    && rm -rf /root/.npm /usr/local/share/.cache \
    && find node_modules -type f \( -name "*.md" -o -name "*.markdown" -o -name "LICENSE*" -o -name "CHANGELOG*" -o -name "*.map" -o \( -name "*.ts" -a ! -name "*.d.ts" \) \) -delete \
    && find node_modules -type d \( -name "test" -o -name "tests" -o -name "__tests__" -o -name "example" -o -name "examples" -o -name "demo" -o -name "docs" -o -name "coverage" \) -exec rm -rf {} +

# Stage 3: Runtime
FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ARG APT_DEBIAN_MIRROR
ARG APT_DEBIAN_SECURITY_MIRROR
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY

COPY docker/apt-mirror.sh /tmp/apt-mirror.sh
# Install runtime utilities
# hadolint ignore=DL3008
RUN chmod +x /tmp/apt-mirror.sh \
    && /tmp/apt-mirror.sh \
    && apt-get -o Acquire::Retries=3 update \
    && apt-get -o Acquire::Retries=3 install -y --no-install-recommends dumb-init gosu tzdata \
    && rm -rf /var/lib/apt/lists/* /tmp/apt-mirror.sh

# Create data directory with correct permissions
RUN mkdir -p /app/data && chown -R node:node /app

# Copy optimized node_modules
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy built frontend assets
COPY --from=build-stage /app/dist ./dist

# Copy server + shared TypeScript source (runtime via tsx)
COPY package*.json ./
COPY server.ts ./
COPY tsconfig.server.json ./
COPY docker/docker-entrypoint.sh /usr/local/bin/
COPY src ./src

# Setup permissions; strip CRLF so shebang works if checked out on Windows
RUN tr -d "\r" < /usr/local/bin/docker-entrypoint.sh > /tmp/docker-entrypoint.sh \
    && mv /tmp/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh
ENV NODE_ENV=production \
    PORT=8080 \
    DATA_PATH=/app/data \
    TZ=Asia/Shanghai

EXPOSE 8080

ENTRYPOINT ["/usr/bin/dumb-init", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["./node_modules/.bin/tsx", "server.ts"]
