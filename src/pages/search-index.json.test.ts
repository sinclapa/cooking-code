import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('astro:content', () => ({
  getCollection: vi.fn(),
}));

import { GET } from './search-index.json';
import { getCollection } from 'astro:content';

const mockGetCollection = vi.mocked(getCollection);

const stubArticle = {
  slug: 'ccdiary/architecture-overview',
  data: {
    title: 'Architecture Overview',
    description: 'An overview of the system.',
    tags: ['Azure', 'Architecture'],
    difficulty: 'intermediate',
  },
};

const stubPost = {
  slug: 'getting-started-with-claude',
  data: {
    title: 'Getting Started with Claude',
    description: 'How to get started with Claude.',
    tags: ['Claude', 'AI'],
  },
};

describe('GET /search-index.json', () => {
  beforeEach(() => {
    mockGetCollection.mockReset();
  });

  it('returns application/json content type', async () => {
    mockGetCollection
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any);

    const res = await GET({} as any);
    expect(res.headers.get('Content-Type')).toBe('application/json');
  });

  it('returns empty array when no content exists', async () => {
    mockGetCollection
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any);

    const res = await GET({} as any);
    expect(await res.json()).toEqual([]);
  });

  it('maps articles with correct shape', async () => {
    mockGetCollection
      .mockResolvedValueOnce([stubArticle] as any)
      .mockResolvedValueOnce([] as any);

    const body = await (await GET({} as any)).json();

    expect(body).toContainEqual({
      title: 'Architecture Overview',
      description: 'An overview of the system.',
      tags: ['Azure', 'Architecture'],
      type: 'article',
      difficulty: 'intermediate',
      url: '/articles/ccdiary/architecture-overview',
    });
  });

  it('maps blog posts with null difficulty', async () => {
    mockGetCollection
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([stubPost] as any);

    const body = await (await GET({} as any)).json();

    expect(body).toContainEqual({
      title: 'Getting Started with Claude',
      description: 'How to get started with Claude.',
      tags: ['Claude', 'AI'],
      type: 'blog',
      difficulty: null,
      url: '/blog/getting-started-with-claude',
    });
  });

  it('combines articles before blog posts in output', async () => {
    mockGetCollection
      .mockResolvedValueOnce([stubArticle] as any)
      .mockResolvedValueOnce([stubPost] as any);

    const body = await (await GET({} as any)).json();

    expect(body).toHaveLength(2);
    expect(body[0].type).toBe('article');
    expect(body[1].type).toBe('blog');
  });

  it('maps multiple articles correctly', async () => {
    const second = {
      slug: 'ccdiary/bicep-deep-dive',
      data: {
        title: 'Bicep Deep Dive',
        description: 'Deep dive into Bicep.',
        tags: ['Bicep', 'IaC'],
        difficulty: 'advanced',
      },
    };

    mockGetCollection
      .mockResolvedValueOnce([stubArticle, second] as any)
      .mockResolvedValueOnce([] as any);

    const body = await (await GET({} as any)).json();

    expect(body).toHaveLength(2);
    expect(body[1].url).toBe('/articles/ccdiary/bicep-deep-dive');
    expect(body[1].difficulty).toBe('advanced');
  });
});
