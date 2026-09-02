/**
 * GET /robots.txt
 * クローラーの巡回を許可し、sitemap の場所を伝える。
 */
export default defineEventHandler((event) => {
  const { siteUrl } = useRuntimeConfig().public

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`
})
