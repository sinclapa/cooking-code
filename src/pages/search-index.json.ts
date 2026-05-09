import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
  const [articles, posts] = await Promise.all([
    getCollection('articles'),
    getCollection('blog'),
  ]);

  const index = [
    ...articles.map((a) => ({
      title: a.data.title,
      description: a.data.description,
      tags: a.data.tags,
      type: 'article',
      difficulty: a.data.difficulty,
      url: `/articles/${a.slug}`,
    })),
    ...posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      tags: p.data.tags,
      type: 'blog',
      difficulty: null,
      url: `/blog/${p.slug}`,
    })),
  ];

  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  });
};
