#!/usr/bin/env bash
# バズ時のスペック増強と、その巻き戻し。
#
#   ./scripts/scale.sh up      # 増強（medium: 1vCPU/2GB, 同時24本）
#   ./scripts/scale.sh down    # 平常（micro : 0.25vCPU/1GB, 同時8本）
#   ./scripts/scale.sh status  # 現状確認
#
# イメージは再ビルドせず、今動いているものをそのまま使い回すので数分で切り替わる。
#
# 注意: ノード数(scale)は 1 のまま変えないこと。
#   レート制限と同時実行制限はプロセス内のメモリで数えているため、
#   ノードを増やすとその数だけ制限が緩む（例: 2ノードなら実質2倍まで通る）。
#   1日の相談回数だけはDBで数えているのでノード数の影響を受けない。
#   横に増やすのはメモリ制限を共有ストアに移してから。
set -euo pipefail
cd "$(dirname "$0")/.."

SERVICE_NAME="${SERVICE_NAME:-akutagawa-soudan}"
MODE="${1:-status}"

# スペック変更やデプロイの直後はサービスが遷移中になり、続けて操作できない。
# 落ち着くまで待つ（RUNNING か READY で受け付け可能）。
wait_ready() {
  local state
  for _ in $(seq 1 120); do
    state=$(aws lightsail get-container-services --service-name "$SERVICE_NAME" \
      --query 'containerServices[0].state' --output text 2>/dev/null || echo UNKNOWN)
    case "$state" in
      RUNNING|READY) return 0 ;;
      DISABLED|FAILED) echo "サービスが $state です。手当てが必要です"; return 1 ;;
    esac
    sleep 10
  done
  echo "待機がタイムアウトしました（現在: $state）"
  return 1
}

show_status() {
  aws lightsail get-container-services --service-name "$SERVICE_NAME" \
    --query 'containerServices[0].{power:power,nodes:scale,state:state,url:url}' --output table
  echo "現在の同時生成上限:"
  aws lightsail get-container-services --service-name "$SERVICE_NAME" \
    --query 'containerServices[0].currentDeployment.containers.app.environment.NUXT_MAX_CONCURRENT_ASKS' \
    --output text
}

case "$MODE" in
  up)   POWER="medium"; CONCURRENT="24" ;;
  down) POWER="micro";  CONCURRENT="8"  ;;
  status) show_status; exit 0 ;;
  *) echo "使い方: $0 {up|down|status}"; exit 1 ;;
esac

# 今デプロイされているイメージをそのまま使う（再ビルドしない）
IMAGE=$(aws lightsail get-container-services --service-name "$SERVICE_NAME" \
  --query 'containerServices[0].currentDeployment.containers.app.image' --output text)
if [ -z "$IMAGE" ] || [ "$IMAGE" = "None" ]; then
  echo "稼働中のイメージが見つかりません。先に ./scripts/deploy-lightsail.sh を実行してください"
  exit 1
fi
echo "==> 使用イメージ: $IMAGE"

ENV_FILE=".env.production"
[ -f "$ENV_FILE" ] || ENV_FILE=".env"
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
: "${NUXT_ANTHROPIC_API_KEY:?}" "${NUXT_SUPABASE_URL:?}" "${NUXT_SUPABASE_SERVICE_KEY:?}" "${NUXT_PUBLIC_SITE_URL:?}"

echo "==> サービスが操作可能になるのを待つ"
wait_ready

echo "==> スペックを ${POWER} に変更"
aws lightsail update-container-service \
  --service-name "$SERVICE_NAME" --power "$POWER" --scale 1 > /dev/null

# パワー変更はサービスを遷移状態にする。ここで待たずにデプロイすると弾かれる
echo "==> 反映を待つ"
wait_ready

echo "==> 同時生成上限 ${CONCURRENT} で再デプロイ"
DEPLOY_JSON=$(mktemp)
trap 'rm -f "$DEPLOY_JSON"' EXIT
cat > "$DEPLOY_JSON" <<JSON
{
  "serviceName": "${SERVICE_NAME}",
  "containers": {
    "app": {
      "image": "${IMAGE}",
      "environment": {
        "NUXT_ANTHROPIC_API_KEY": "${NUXT_ANTHROPIC_API_KEY}",
        "NUXT_SUPABASE_URL": "${NUXT_SUPABASE_URL}",
        "NUXT_SUPABASE_SERVICE_KEY": "${NUXT_SUPABASE_SERVICE_KEY}",
        "NUXT_PUBLIC_SITE_URL": "${NUXT_PUBLIC_SITE_URL}",
        "NUXT_PUBLIC_ADSENSE_CLIENT_ID": "${NUXT_PUBLIC_ADSENSE_CLIENT_ID:-}",
        "NUXT_PUBLIC_AMAZON_ASSOCIATE_TAG": "${NUXT_PUBLIC_AMAZON_ASSOCIATE_TAG:-}",
        "NUXT_X_API_KEY": "${NUXT_X_API_KEY:-}",
        "NUXT_X_API_SECRET": "${NUXT_X_API_SECRET:-}",
        "NUXT_X_ACCESS_TOKEN": "${NUXT_X_ACCESS_TOKEN:-}",
        "NUXT_X_ACCESS_SECRET": "${NUXT_X_ACCESS_SECRET:-}",
        "NUXT_TASK_SECRET": "${NUXT_TASK_SECRET:-}",
        "NUXT_MAX_CONCURRENT_ASKS": "${CONCURRENT}"
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

aws lightsail create-container-service-deployment --cli-input-json "file://${DEPLOY_JSON}" > /dev/null

echo "==> 受付完了。反映まで数分かかります。"
echo "    確認: ./scripts/scale.sh status"
[ "$MODE" = "up" ] && echo "    ※ 落ち着いたら ./scripts/scale.sh down で戻すこと（medium は micro の4倍の料金）"
exit 0
