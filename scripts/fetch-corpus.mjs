/**
 * 青空文庫から芥川龍之介の全作品を取得し、corpus/ に格納する。
 *
 *   node scripts/fetch-corpus.mjs
 *
 * - 作品リストは青空文庫の公式インデックスCSV（list_person_all_extended_utf8.zip）から取得
 * - corpus/raw/       : 展開したテキストを入手したまま（Shift_JIS・ルビ付き）保存
 * - corpus/processed/ : UTF-8変換 + ルビ《》・注記［＃］・書誌情報を除去した本文のみ
 * - corpus/manifest.json : 取得した作品の一覧
 *
 * 依存パッケージなし（unzip コマンドと Node 18+ の fetch / TextDecoder を使用）。
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const RAW_DIR = join(ROOT, 'corpus', 'raw')
const PROCESSED_DIR = join(ROOT, 'corpus', 'processed')
const INDEX_URL = 'https://www.aozora.gr.jp/index_pages/list_person_all_extended_utf8.zip'
const AKUTAGAWA_PERSON_ID = '000879'
const DOWNLOAD_INTERVAL_MS = 150 // 青空文庫サーバーへの配慮

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function download(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`)
  return Buffer.from(await response.arrayBuffer())
}

/** zipバッファを一時ディレクトリに展開し、中の .txt のバイト列を返す */
function extractTxtFromZip(zipBuffer, label) {
  const workDir = join(tmpdir(), `aozora_${process.pid}_${label}`)
  mkdirSync(workDir, { recursive: true })
  try {
    const zipPath = join(workDir, 'work.zip')
    writeFileSync(zipPath, zipBuffer)
    execFileSync('unzip', ['-o', '-q', zipPath, '-d', workDir])
    const txtName = readdirSync(workDir).find((name) => name.toLowerCase().endsWith('.txt'))
    if (!txtName) throw new Error('zip内に .txt が見つからない')
    return { name: txtName, bytes: readFileSync(join(workDir, txtName)) }
  } finally {
    rmSync(workDir, { recursive: true, force: true })
  }
}

/** 引用符・カンマ入りに対応した素朴なCSVパーサ */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field)
      field = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

/** 青空文庫注記入りテキストを本文のみに整形する */
function cleanAozoraText(text) {
  let lines = text.replace(/\r\n/g, '\n').split('\n')

  // 冒頭の凡例ブロック（---- で挟まれた【テキスト中に現れる記号について】）を除去
  const separatorIndexes = []
  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    if (/^-{10,}\s*$/.test(lines[i])) separatorIndexes.push(i)
  }
  if (separatorIndexes.length >= 2) {
    lines = [...lines.slice(0, separatorIndexes[0]), ...lines.slice(separatorIndexes[1] + 1)]
  }

  // 末尾の書誌情報（底本：以降）を除去
  const colophonIndex = lines.findIndex((line) => /^底本[：:]/.test(line))
  if (colophonIndex !== -1) {
    lines = lines.slice(0, colophonIndex)
  }

  return lines
    .join('\n')
    .replace(/※［＃[^］]*］/g, '') // 外字注記（※ごと）
    .replace(/［＃[^］]*］/g, '') // 入力者注
    .replace(/《[^》]*》/g, '') // ルビ
    .replace(/｜/g, '') // ルビ開始位置指定
    .replace(/\n{3,}/g, '\n\n') // 空行の圧縮
    .trim()
}

/** ファイル名に使えない文字を置換 */
function sanitizeFilename(name) {
  return name.replace(/[\/\\:*?"<>|]/g, '＿').trim()
}

async function main() {
  mkdirSync(RAW_DIR, { recursive: true })
  mkdirSync(PROCESSED_DIR, { recursive: true })

  console.log('作品リストを取得中…')
  const indexZip = await download(INDEX_URL)
  // インデックスzipの中身は .csv なので専用に展開する
  const indexDir = join(tmpdir(), `aozora_index_${process.pid}`)
  mkdirSync(indexDir, { recursive: true })
  writeFileSync(join(indexDir, 'index.zip'), indexZip)
  execFileSync('unzip', ['-o', '-q', join(indexDir, 'index.zip'), '-d', indexDir])
  const csvName = readdirSync(indexDir).find((name) => name.endsWith('.csv'))
  const csvText = readFileSync(join(indexDir, csvName), 'utf-8').replace(/^﻿/, '')
  rmSync(indexDir, { recursive: true, force: true })

  const rows = parseCsv(csvText)
  const header = rows[0]
  const col = (name) => {
    const index = header.indexOf(name)
    if (index === -1) throw new Error(`CSVに列「${name}」が見つからない`)
    return index
  }
  const COL = {
    workId: col('作品ID'),
    title: col('作品名'),
    subtitle: col('副題'),
    personId: col('人物ID'),
    role: col('役割フラグ'),
    textUrl: col('テキストファイルURL'),
  }

  const seenWorkIds = new Set()
  const works = rows
    .slice(1)
    .filter((row) => row[COL.personId] === AKUTAGAWA_PERSON_ID && row[COL.role] === '著者')
    .filter((row) => row[COL.textUrl]?.endsWith('.zip'))
    .filter((row) => {
      if (seenWorkIds.has(row[COL.workId])) return false
      seenWorkIds.add(row[COL.workId])
      return true
    })
    .map((row) => ({
      id: row[COL.workId],
      title: row[COL.title],
      subtitle: row[COL.subtitle],
      url: row[COL.textUrl],
    }))

  console.log(`芥川龍之介（著者）の作品: ${works.length} 件。ダウンロードを開始…`)

  const decoder = new TextDecoder('shift_jis')
  const manifest = []
  const failed = []
  const usedFilenames = new Set()

  for (const [index, work] of works.entries()) {
    try {
      const zipBuffer = await download(work.url)
      const { name: originalName, bytes } = extractTxtFromZip(zipBuffer, work.id)

      // raw: 入手したままのバイト列（Shift_JIS）を作品IDプレフィックス付きで保存
      const rawName = `${work.id}_${originalName}`
      writeFileSync(join(RAW_DIR, rawName), bytes)

      // processed: UTF-8化 + 整形
      const cleaned = cleanAozoraText(decoder.decode(bytes))
      let processedName = `${sanitizeFilename(work.title)}.txt`
      if (usedFilenames.has(processedName)) {
        processedName = `${sanitizeFilename(work.title)}_${work.id}.txt`
      }
      usedFilenames.add(processedName)
      writeFileSync(join(PROCESSED_DIR, processedName), cleaned + '\n')

      manifest.push({
        id: work.id,
        title: work.title,
        subtitle: work.subtitle || undefined,
        raw: `raw/${rawName}`,
        processed: `processed/${processedName}`,
        chars: cleaned.length,
      })
      console.log(`[${index + 1}/${works.length}] ${work.title}（${cleaned.length}字）`)
    } catch (error) {
      failed.push({ ...work, error: String(error) })
      console.error(`[${index + 1}/${works.length}] 失敗: ${work.title} — ${error}`)
    }
    await sleep(DOWNLOAD_INTERVAL_MS)
  }

  writeFileSync(
    join(ROOT, 'corpus', 'manifest.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), source: INDEX_URL, works: manifest, failed }, null, 2),
  )

  const totalChars = manifest.reduce((sum, w) => sum + w.chars, 0)
  console.log(`\n完了: ${manifest.length} 件（合計 ${totalChars.toLocaleString()} 字）/ 失敗 ${failed.length} 件`)
  console.log('一覧: corpus/manifest.json')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
