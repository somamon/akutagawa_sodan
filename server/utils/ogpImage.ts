import satori from 'satori'
import { initWasm, Resvg } from '@resvg/resvg-wasm'

/**
 * 相談の回答を「原稿用紙に印字された一枚」としてPNGに描き起こす。
 * Xのタイムラインで指を止めるのは画像なので、全ページ共通のアイコンではなく
 * 回答そのものをカードに載せる。
 *
 * satori(SVG化) + resvg-wasm(PNG化) の構成。WASMなのでネイティブ依存がなく、
 * Dockerでもそのまま動く。フォントとWASMは初回だけ読み、以降は使い回す。
 */

const WIDTH = 1200
const HEIGHT = 630

let fontPromise: Promise<ArrayBuffer> | null = null
let wasmReady: Promise<void> | null = null

/** server/assets/ に同梱したバイナリを読む（Nitroが.outputへ運んでくれる） */
async function readServerAsset(key: string): Promise<ArrayBuffer> {
  const data = await useStorage('assets:server').getItemRaw<Buffer | Uint8Array>(key)
  if (!data) throw new Error(`サーバーアセットが見つかりません: ${key}`)
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayBuffer)
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

async function loadFont(): Promise<ArrayBuffer> {
  if (!fontPromise) fontPromise = readServerAsset('fonts/ShipporiMincho-Regular.ttf')
  return fontPromise
}

async function ensureWasm(): Promise<void> {
  if (!wasmReady) {
    wasmReady = (async () => {
      await initWasm(await readServerAsset('wasm/resvg.wasm'))
    })()
  }
  return wasmReady
}

/** 回答から、カードに載せる抜粋を作る（長すぎると字が潰れるため頭から詰める） */
function excerpt(answer: string, max = 150): string {
  const body = answer.replace(/\s+/g, ' ').trim()
  return body.length > max ? `${body.slice(0, max)}……` : body
}

export async function renderConsultationOgp(params: {
  nickname: string
  query: string
  answer: string
}): Promise<Uint8Array> {
  const [font] = await Promise.all([loadFont(), ensureWasm()])

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#f5f2eb',
          padding: '56px 64px',
          // 原稿用紙の朱色の枠を思わせる縁取り
          border: '14px solid #1a2233',
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                fontSize: 26,
                color: '#8a7a5c',
                marginBottom: 18,
              },
              children: `${params.nickname} の悩み`,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                fontSize: 30,
                color: '#2b2b2b',
                lineHeight: 1.5,
                marginBottom: 26,
              },
              children: excerpt(params.query, 52),
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexGrow: 1,
                borderLeft: '5px solid #b23c33',
                paddingLeft: 26,
                fontSize: 32,
                color: '#2b2b2b',
                lineHeight: 1.65,
              },
              children: excerpt(params.answer, 145),
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                justifyContent: 'flex-end',
                fontSize: 24,
                color: '#8a7a5c',
                marginTop: 14,
              },
              children: '― AI芥川龍之介の人生相談 ―',
            },
          },
        ],
      },
    },
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [{ name: 'Shippori Mincho', data: font, weight: 400, style: 'normal' }],
    },
  )

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } })
  return resvg.render().asPng()
}
