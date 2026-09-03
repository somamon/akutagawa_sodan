/**
 * resvg の WASM を server/assets/ へ複製する。
 * Nitro は node_modules 内の .wasm を .output へ運ばないため、
 * サーバーアセットとして同梱して useStorage('assets:server') から読む。
 * postinstall で走るので、node_modules と常に同じ版が置かれる。
 */
import { copyFile, mkdir } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dest = join(root, 'server', 'assets', 'wasm', 'resvg.wasm')

const require = createRequire(import.meta.url)
const src = require.resolve('@resvg/resvg-wasm/index_bg.wasm')

await mkdir(dirname(dest), { recursive: true })
await copyFile(src, dest)
console.log('resvg.wasm を server/assets/wasm/ に配置しました')
