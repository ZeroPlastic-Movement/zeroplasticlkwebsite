import rss from '@astrojs/rss';
import type { APIContext } from 'astro';

import { SITE } from '../consts';
import { getAllPosts } from '../lib/wp';

export async function GET(context: APIContext) {
  const posts = await getAllPosts();

  return rss({
    title: `${SITE.name} Projects`,
    description: SITE.description,
    site: context.site ?? SITE.url,
    items: posts.slice(0, 50).map((post) => ({
      title: post.title,
      description: post.excerpt,
      pubDate: new Date(post.date),
      link: `/${post.slug}/`,
    })),
    customData: `<language>en-lk</language>`,
  });
}
