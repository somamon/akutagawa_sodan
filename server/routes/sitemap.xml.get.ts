import { REPORT_HIDE_THRESHOLD } from '../utils/moderation'
import { useSupabase } from '../utils/supabase'

/**
 * GET /sitemap.xml
 * 固定ページと公開中の相談ページを列挙する。
 */
export default defineEventHandler(async (event) => {
  const { siteUrl } = useRuntimeConfig().public

  const staticPaths = ['/', '/about', '/privacy']
  let entries = staticPaths.map((path) => ({ loc: `${siteUrl}${path}`, lastmod: null as string | null }))

  try {
    const supabase = useSupabase()
    const { data, error } = await supabase
      .from('consultations')
      .select('id, created_at')
      .eq('is_public', true)
      .lt('reports', REPORT_HIDE_THRESHOLD)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) throw error

    entries = entries.concat(
      (data ?? []).map((row) => ({
        loc: `${siteUrl}/result/${row.id}`,
        lastmod: new Date(row.created_at).toISOString(),
      })),
    )
  } catch (e) {
    // DBが落ちていても固定ページ分のsitemapは返す
    console.error('[sitemap] 相談の取得に失敗:', e)
  }

  const urls = entries
    .map(({ loc, lastmod }) =>
      lastmod ? `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>` : `  <url><loc>${loc}</loc></url>`,
    )
    .join('\n')

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
})
