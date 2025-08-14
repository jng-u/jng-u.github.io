import type { Post } from '$lib/types'
import { getPosts } from '$lib/server/posts' // 이전에 만든 getPosts 함수 경로

// ✅ 본인의 블로그 주소로 변경하세요.
const siteURL = 'https://jng-u.github.io'
const siteTitle = "JNG-U"
const siteDescription = 'A blog about SLAM, C++, and more.'

export const prerender = true;

export async function GET() {
  const posts: Post[] = await getPosts()
  
  const body = render(posts)
  const options = {
    headers: {
      'Cache-Control': 'max-age=0, s-maxage=3600',
      'Content-Type': 'application/xml',
    }
  }

  return new Response(body, options)
}

const render = (posts: Post[]) => `<?xml version="1.0" encoding="UTF-8" ?>
<urlset
  xmlns="https://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:news="https://www.google.com/schemas/sitemap-news/0.9"
  xmlns:xhtml="https://www.w3.org/1999/xhtml"
  xmlns:mobile="https://www.google.com/schemas/sitemap-mobile/1.0"
  xmlns:image="https://www.google.com/schemas/sitemap-image/1.1"
  xmlns:video="https://www.google.com/schemas/sitemap-video/1.1"
>
  <url>
    <loc>${siteURL}</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${siteURL}/posts</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${siteURL}/publications</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>

  ${posts
    .map(
      (post) => `
  <url>
    <loc>${siteURL}/posts/${post.slug}</loc>
    <changefreq>weekly</changefreq>
    <lastmod>${new Date(post.date).toISOString()}</lastmod>
    <priority>0.5</priority>
  </url>
  `
    )
    .join('')}
</urlset>
`