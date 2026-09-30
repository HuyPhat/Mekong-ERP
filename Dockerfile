# syntax=docker/dockerfile:1

# ---- build: compile apps/erp with the pinned toolchain ----
FROM node:22.22.2-alpine AS build
RUN corepack enable
WORKDIR /repo
# Manifests first so dependency installation is cached across source edits.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json ./
COPY apps/erp/package.json apps/erp/
COPY apps/site/package.json apps/site/
COPY packages/config/package.json packages/config/
COPY packages/contract/package.json packages/contract/
COPY packages/ui/package.json packages/ui/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm turbo run build --filter=@mekong-erp/erp

# ---- runtime: static files behind nginx with the security headers ----
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY apps/erp/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/erp/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
