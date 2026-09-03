/**
 * 同時に走る生成の本数を制限する。
 * Lightsail micro は 0.25 vCPU / 512MB しかなく、SSE は1本あたり数十秒
 * 接続を保持するため、無制限に受けると全員の応答が遅くなる。
 * 溢れた分は待たせずに断り、混雑を伝えたほうが体験がよい。
 *
 * 単一プロセス前提。スケールアウトする場合は共有ストアに置き換えること。
 */
const MAX_CONCURRENT = Number(process.env.NUXT_MAX_CONCURRENT_ASKS) || 8

let running = 0

export function currentLoad(): { running: number; max: number } {
  return { running, max: MAX_CONCURRENT }
}

/**
 * 生成の枠を1つ確保する。空きがなければ null を返す。
 * 確保できた場合は、必ず戻り値の release() を finally で呼ぶこと。
 */
export function acquireGenerationSlot(): { release: () => void } | null {
  if (running >= MAX_CONCURRENT) return null

  running++
  let released = false
  return {
    release() {
      // 二重解放でカウンタが壊れないようにする
      if (released) return
      released = true
      running--
    },
  }
}
