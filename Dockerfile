# ---- ビルドステージ ----
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
# このプロジェクトはpeer依存の解決に --legacy-peer-deps が必要
RUN npm ci --legacy-peer-deps

COPY . .
RUN npm run build

# satori は harfbuzzjs の wasm を node_modules から実行時に読むが、
# Nitro はこれを .output へ運ばないので明示的に同梱する
RUN mkdir -p .output/server/node_modules/harfbuzzjs \
 && cp node_modules/harfbuzzjs/hb.wasm .output/server/node_modules/harfbuzzjs/

# ---- 実行ステージ（Nitroの.outputは自己完結）----
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV NITRO_HOST=0.0.0.0
ENV NITRO_PORT=3000
# 定期投稿のcronを日本時間で解釈させる
ENV TZ=Asia/Tokyo

COPY --from=build /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
