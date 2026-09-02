ARG NODE_IMAGE=node:24.14.1-slim
ARG APT_DEBIAN_MIRROR=
ARG APT_DEBIAN_SECURITY_MIRROR=
ARG NPM_REGISTRY=
ARG HTTP_PROXY=
ARG HTTPS_PROXY=
ARG NO_PROXY=

# Stage 1: Build Frontend
FROM ${NODE_IMAGE} AS build-stage
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
ARG NPM_REGISTRY
WORKDIR /app
COPY package*.json ./
# .npmrc 统一承载 peer-dep 策略（openapi-typescript peer ^5 vs 根 typescript ^6），
# 各阶段不再重复传 --legacy-peer-deps（第 16 轮审查）。
COPY .npmrc ./
# Use clean install for consistency
RUN npm ci --ignore-scripts --registry "${NPM_REGISTRY:-https://registry.npmjs.org/}"
COPY . .
RUN npm run build

# Stage 2: Production Dependencies
FROM ${NODE_IMAGE} AS prod-deps
WORKDIR /app
ARG APT_DEBIAN_MIRROR
ARG APT_DEBIAN_SECURITY_MIRROR
ARG NPM_REGISTRY
ARG HTTP_PROXY
ARG HTTPS_PROXY
ARG NO_PROXY
COPY package*.json ./
COPY .npmrc ./
COPY docker/apt-mirror.sh /tmp/apt-mirror.sh
# Install only production dependencies
# Install native build tools needed for better-sqlite3
# hadolint ignore=DL3008
RUN chmod +x /tmp/apt-mirror.sh \
    && /tmp/apt-mirror.sh \
    && apt-get -o Acquire::Retries=3 update \
    && apt-get -o Acquire::Retries=3 install -y --no-install-recommends python3 make g++ \
    && npm ci --omit=dev --ignore-scripts --registry "${NPM_REGISTRY:-https://registry.npmjs.org/}" \
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

# Copy server + shared TypeScript source (runtime via tsx).
# 只复制运行时需要的目录：dist 已含前端产物，web/src 等其余源码不进镜像。
COPY package*.json ./
COPY server.ts ./
COPY tsconfig.server.json ./
COPY docker/docker-entrypoint.sh /usr/local/bin/
COPY src/server ./src/server
COPY src/shared ./src/shared

# 生产容器以 tsx 执行 TS 源码（server.ts via tsx）是 AGENTS.md 记录的既定单进程架构。
# 取舍说明（第 16 轮审查记录）：tsc 预编译会引入独立 dist-server 产物、调整 COPY/CMD/
# 探针与 compose 形态，改动面大且与既定设计冲突，故不采用；tsx/esbuild 以锁版本 +
# npm audit 覆盖其供应链面，TS 源码为私有部署自托管代码，暴露面可控。
# 镜像体积注意：prod-deps 阶段按 package.json 分类安装，前端运行时库（vue 等）现归
# dependencies（第 16 轮审查为让 audit:prod 覆盖前端运行时攻击面），会一并进入运行时
# node_modules；dist 才是浏览器实际消费的产物，二者互不影响。

# Setup permissions; strip CRLF so shebang works if checked out on Windows
RUN tr -d "\r" < /usr/local/bin/docker-entrypoint.sh > /tmp/docker-entrypoint.sh \
    && mv /tmp/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh
ENV NODE_ENV=production \
    PORT=8080 \
    DATA_PATH=/app/data \
    TZ=Asia/Shanghai

EXPOSE 8080

# 与 docker-compose.yml 的探针保持一致：镜像自身也暴露健康状态。
HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=60s \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8080/api/health').then((res)=>process.exit(res.ok?0:1)).catch(()=>process.exit(1))"]

ENTRYPOINT ["/usr/bin/dumb-init", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["./node_modules/.bin/tsx", "server.ts"]
