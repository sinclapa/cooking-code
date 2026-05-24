import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockListEntities = vi.fn();
const mockCreateEntity = vi.fn();
const mockTableClient = { listEntities: mockListEntities, createEntity: mockCreateEntity };

vi.mock('@azure/data-tables', () => ({
  TableClient: { fromConnectionString: vi.fn(() => mockTableClient) },
}));

vi.mock('@azure/functions', () => ({
  app: { http: vi.fn() },
}));

import { commentsHandler } from './comments.js';

function makeRequest(method: string, options: { query?: Record<string, string>; body?: unknown } = {}) {
  return {
    method,
    query: new URLSearchParams(options.query ?? {}),
    json: () => Promise.resolve(options.body ?? {}),
  } as unknown as import('@azure/functions').HttpRequest;
}

function makeContext() {
  return { log: vi.fn() } as unknown as import('@azure/functions').InvocationContext;
}

function makeEntityIterator(entities: object[]) {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const e of entities) yield e;
    },
  };
}

describe('commentsHandler - GET', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when contentType is missing', async () => {
    const res = await commentsHandler(makeRequest('GET', { query: { slug: 'my-post' } }), makeContext());
    expect(res.status).toBe(400);
  });

  it('returns 400 when slug is missing', async () => {
    const res = await commentsHandler(makeRequest('GET', { query: { contentType: 'blog' } }), makeContext());
    expect(res.status).toBe(400);
  });

  it('returns 400 when contentType is invalid', async () => {
    const res = await commentsHandler(makeRequest('GET', { query: { contentType: 'video', slug: 'my-post' } }), makeContext());
    expect(res.status).toBe(400);
  });

  it('returns 200 with approved comments sorted newest first', async () => {
    const now = new Date();
    const older = new Date(now.getTime() - 60000);

    mockListEntities.mockReturnValue(
      makeEntityIterator([
        { rowKey: 'older_abc', name: 'Alice', body: 'Great post', approved: true, timestamp: older },
        { rowKey: 'newer_xyz', name: 'Bob', body: 'Very helpful', approved: true, timestamp: now },
        { rowKey: 'hidden_123', name: 'Spammer', body: 'Buy now', approved: false, timestamp: now },
      ])
    );

    const res = await commentsHandler(makeRequest('GET', { query: { contentType: 'blog', slug: 'my-post' } }), makeContext());

    expect(res.status).toBe(200);
    const body = res.jsonBody as { comments: Array<{ id: string; name: string; body: string }> };
    expect(body.comments).toHaveLength(2);
    expect(body.comments[0].name).toBe('Bob');
    expect(body.comments[1].name).toBe('Alice');
    expect(body.comments[0]).toMatchObject({ id: 'newer_xyz', name: 'Bob', body: 'Very helpful' });
  });

  it('returns 200 with empty comments array when none exist', async () => {
    mockListEntities.mockReturnValue(makeEntityIterator([]));

    const res = await commentsHandler(makeRequest('GET', { query: { contentType: 'article', slug: 'my-article' } }), makeContext());

    expect(res.status).toBe(200);
    expect((res.jsonBody as { comments: unknown[] }).comments).toHaveLength(0);
  });
});

describe('commentsHandler - POST', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when contentType is missing', async () => {
    const res = await commentsHandler(makeRequest('POST', { body: { slug: 'my-post', name: 'Alice', body: 'Great' } }), makeContext());
    expect(res.status).toBe(400);
  });

  it('returns 400 when slug is missing', async () => {
    const res = await commentsHandler(makeRequest('POST', { body: { contentType: 'blog', name: 'Alice', body: 'Great' } }), makeContext());
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is empty', async () => {
    const res = await commentsHandler(makeRequest('POST', { body: { contentType: 'blog', slug: 'my-post', name: '', body: 'Great' } }), makeContext());
    expect(res.status).toBe(400);
  });

  it('returns 400 when body is empty', async () => {
    const res = await commentsHandler(makeRequest('POST', { body: { contentType: 'blog', slug: 'my-post', name: 'Alice', body: '' } }), makeContext());
    expect(res.status).toBe(400);
  });

  it('returns 400 when name exceeds 60 characters', async () => {
    const res = await commentsHandler(
      makeRequest('POST', { body: { contentType: 'blog', slug: 'my-post', name: 'A'.repeat(61), body: 'Great' } }),
      makeContext()
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when body exceeds 1000 characters', async () => {
    const res = await commentsHandler(
      makeRequest('POST', { body: { contentType: 'blog', slug: 'my-post', name: 'Alice', body: 'B'.repeat(1001) } }),
      makeContext()
    );
    expect(res.status).toBe(400);
  });

  it('creates entity and returns 201 with the new comment', async () => {
    mockCreateEntity.mockResolvedValue({});

    const res = await commentsHandler(
      makeRequest('POST', { body: { contentType: 'blog', slug: 'my-post', name: 'Alice', body: 'Great post!' } }),
      makeContext()
    );

    expect(res.status).toBe(201);
    const comment = res.jsonBody as { id: string; name: string; body: string; createdAt: string };
    expect(comment.name).toBe('Alice');
    expect(comment.body).toBe('Great post!');
    expect(comment.id).toBeDefined();
    expect(comment.createdAt).toBeDefined();
    expect(mockCreateEntity).toHaveBeenCalledWith(
      expect.objectContaining({ partitionKey: 'blog:my-post', name: 'Alice', body: 'Great post!', approved: true })
    );
  });

  it('strips HTML tags from name and body', async () => {
    mockCreateEntity.mockResolvedValue({});

    const res = await commentsHandler(
      makeRequest('POST', { body: { contentType: 'blog', slug: 'my-post', name: '<b>Alice</b>', body: '<script>alert(1)</script>Nice post' } }),
      makeContext()
    );

    expect(res.status).toBe(201);
    const comment = res.jsonBody as { name: string; body: string };
    expect(comment.name).toBe('Alice');
    expect(comment.body).toBe('alert(1)Nice post');
  });
});

describe('commentsHandler - unsupported method', () => {
  it('returns 405', async () => {
    const res = await commentsHandler(makeRequest('DELETE'), makeContext());
    expect(res.status).toBe(405);
  });
});
