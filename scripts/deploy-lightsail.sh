#!/usr/bin/env bash
# Lightsail Container Service へのデプロイスクリプト
#
#   ./scripts/deploy-lightsail.sh
#
# 前提:
#   - aws CLI 認証済み（aws configure）
#   - lightsailctl が PATH にある（~/.local/bin）
#   - .env に本番用の環境変数が入っている
#   - サービス作成済み: aws lightsail create-container-service \
#       --service-name akutagawa-soudan --power micro --scale 1
set -euo pipefail
cd "$(dirname "$0")/.."

SERVICE_NAME="${SERVICE_NAME:-akutagawa-soudan}"
export PATH="$HOME/.local/bin:$PATH"

# 本番用の環境変数を読み込む（.env.production を優先、なければ .env）
ENV_FILE=".env"
[ -f .env.production ] && ENV_FILE=".env.production"
echo "==> 環境変数: ${ENV_FILE} を使用"
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

: "${NUXT_ANTHROPIC_API_KEY:?}" "${NUXT_SUPABASE_URL:?}" "${NUXT_SUPABASE_SERVICE_KEY:?}" "${NUXT_PUBLIC_SITE_URL:?}"

echo "==> Dockerイメージをビルド"
docker build -t akutagawa-app .

echo "==> Lightsailへイメージをプッシュ"
PUSH_OUTPUT=$(aws lightsail push-container-image \
  --service-name "$SERVICE_NAME" \
  --label app \
  --image akutagawa-app 2>&1)
echo "$PUSH_OUTPUT"
IMAGE_REF=$(echo "$PUSH_OUTPUT" | grep -o ":${SERVICE_NAME}\.app\.[0-9]*" | tail -1)
[ -n "$IMAGE_REF" ] || { echo "プッシュ後のイメージ名を取得できませんでした"; exit 1; }

echo "==> デプロイ作成 (${IMAGE_REF})"
DEPLOY_JSON=$(mktemp)
trap 'rm -f "$DEPLOY_JSON"' EXIT
cat > "$DEPLOY_JSON" <<JSON
{
  "serviceName": "${SERVICE_NAME}",
  "containers": {
    "app": {
      "image": "${IMAGE_REF}",
      "environment": {
        "NUXT_ANTHROPIC_API_KEY": "${NUXT_ANTHROPIC_API_KEY}",
        "NUXT_SUPABASE_URL": "${NUXT_SUPABASE_URL}",
        "NUXT_SUPABASE_SERVICE_KEY": "${NUXT_SUPABASE_SERVICE_KEY}",
        "NUXT_PUBLIC_SITE_URL": "${NUXT_PUBLIC_SITE_URL}"
      },
      "ports": { "3000": "HTTP" }
    }
  },
  "publicEndpoint": {
    "containerName": "app",
    "containerPort": 3000,
    "healthCheck": { "path": "/", "successCodes": "200-399" }
  }
}
JSON

aws lightsail create-container-service-deployment \
  --cli-input-json "file://${DEPLOY_JSON}" > /dev/null

echo "==> デプロイ受付完了。状態確認:"
aws lightsail get-container-services --service-name "$SERVICE_NAME" \
  --query 'containerServices[0].{state:state,url:url}' --output table
