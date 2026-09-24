# syntax=docker/dockerfile:1.7
# MeuSite — SvelteKit + adapter-node, multi-stage.

FROM node:22-alpine AS builder
RUN apk add --no-cache curl && corepack enable
WORKDIR /app
RUN chown -R node:node /app
USER node

COPY --chown=node:node package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --ignore-scripts

COPY --chown=node:node . .

ARG BASE_PATH=""
ENV BASE_PATH=${BASE_PATH}
RUN pnpm exec svelte-kit sync && pnpm build
RUN pnpm prune --prod --ignore-scripts

FROM node:22-alpine AS runner
RUN apk add --no-cache curl
WORKDIR /app
RUN chown -R node:node /app
USER node

COPY --from=builder --chown=node:node /app/build ./build
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=5173
ARG APP_REVISION=local
ENV APP_REVISION=${APP_REVISION}
EXPOSE 5173
HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=10 \
  CMD curl -fsS http://localhost:5173/ >/dev/null 2>&1 || exit 1

CMD ["node", "build/index.js"]
