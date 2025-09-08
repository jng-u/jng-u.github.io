import type { Post } from '$lib/types';
import { getPosts } from '$lib/server/posts';
import { resolve } from '$app/paths';

const siteOrigin = 'https://jng-u.github.io';
export const prerender = true;

export async function GET() {
  const posts = await getPosts();
  const prefix = siteOrigin; // base는 resolve로 자동 처리

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${prefix}${resolve('/')}</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${prefix}${resolve('/posts')}</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${prefix}${resolve('/publications')}</loc>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>

  ${posts.map(post => `
  <url><loc>${prefix}${resolve('/posts/' + post.slug)}</loc><lastmod>${new Date(post.date).toISOString()}</lastmod><changefreq>weekly</changefreq><priority>0.5</priority></url>`).join('')}
</urlset>`;

  return new Response(body, {
    headers: {
      'Cache-Control': 'max-age=0, s-maxage=3600',
      'Content-Type': 'application/xml; charset=UTF-8'
    }
  });
}
