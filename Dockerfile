# ---- ビルドステージ ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
# このプロジェクトはpeer依存の解決に --legacy-peer-deps が必要
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# ---- 実行ステージ（Nitroの.outputは自己完結）----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000

COPY --from=build /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
