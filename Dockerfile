FROM node:22-slim AS builder

WORKDIR /app

RUN npm install -g pnpm@10

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY lib/ ./lib/
COPY scripts/ ./scripts/
COPY artifacts/api-server/ ./artifacts/api-server/
COPY tsconfig.base.json tsconfig.json ./

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @workspace/api-server run build

FROM node:22-slim AS runner

WORKDIR /app

RUN mkdir -p /data

COPY --from=builder /app/artifacts/api-server/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/artifacts/api-server/node_modules ./artifacts/api-server/node_modules

ENV NODE_ENV=production
ENV DATA_DIR=/data
ENV PORT=8080

VOLUME ["/data"]

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
