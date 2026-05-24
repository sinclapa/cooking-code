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

import { feedbackHandler } from './feedback.js';

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

describe('feedbackHandler - GET', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when contentType is missing', async () => {
    const res = await feedbackHandler(makeRequest('GET', { query: { slug: 'my-post' } }), makeContext());
    expect(res.status).toBe(400);
  });

  it('returns 400 when slug is missing', async () => {
    const res = await feedbackHandler(makeRequest('GET', { query: { contentType: 'blog' } }), makeContext());
    expect(res.status).toBe(400);
  });

  it('returns 400 when contentType is invalid', async () => {
    const res = await feedbackHandler(makeRequest('GET', { query: { contentType: 'invalid', slug: 'my-post' } }), makeContext());
    expect(res.status).toBe(400);
  });

  it('returns 200 with thumbsUp and thumbsDown counts', async () => {
    mockListEntities.mockReturnValue(makeEntityIterator([{ rating: 'up' }, { rating: 'up' }, { rating: 'down' }]));

    const res = await feedbackHandler(makeRequest('GET', { query: { contentType: 'blog', slug: 'my-post' } }), makeContext());

    expect(res.status).toBe(200);
    expect(res.jsonBody).toEqual({ thumbsUp: 2, thumbsDown: 1 });
  });

  it('returns 200 with zero counts when no ratings exist', async () => {
    mockListEntities.mockReturnValue(makeEntityIterator([]));

    const res = await feedbackHandler(makeRequest('GET', { query: { contentType: 'article', slug: 'my-article' } }), makeContext());

    expect(res.status).toBe(200);
    expect(res.jsonBody).toEqual({ thumbsUp: 0, thumbsDown: 0 });
  });
});

describe('feedbackHandler - POST', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when contentType is missing', async () => {
    const res = await feedbackHandler(makeRequest('POST', { body: { slug: 'my-post', rating: 'up' } }), makeContext());
    expect(res.status).toBe(400);
  });

  it('returns 400 when slug is missing', async () => {
    const res = await feedbackHandler(makeRequest('POST', { body: { contentType: 'blog', rating: 'up' } }), makeContext());
    expect(res.status).toBe(400);
  });

  it('returns 400 when rating is invalid', async () => {
    const res = await feedbackHandler(makeRequest('POST', { body: { contentType: 'blog', slug: 'my-post', rating: 'meh' } }), makeContext());
    expect(res.status).toBe(400);
  });

  it('returns 400 when contentType is invalid', async () => {
    const res = await feedbackHandler(makeRequest('POST', { body: { contentType: 'video', slug: 'my-post', rating: 'up' } }), makeContext());
    expect(res.status).toBe(400);
  });

  it('creates entity and returns 201 with updated counts', async () => {
    mockCreateEntity.mockResolvedValue({});
    mockListEntities.mockReturnValue(makeEntityIterator([{ rating: 'up' }, { rating: 'up' }]));

    const res = await feedbackHandler(
      makeRequest('POST', { body: { contentType: 'blog', slug: 'my-post', rating: 'up' } }),
      makeContext()
    );

    expect(res.status).toBe(201);
    expect(res.jsonBody).toEqual({ thumbsUp: 2, thumbsDown: 0 });
    expect(mockCreateEntity).toHaveBeenCalledWith(
      expect.objectContaining({ partitionKey: 'blog:my-post', rating: 'up' })
    );
  });
});

describe('feedbackHandler - unsupported method', () => {
  it('returns 405', async () => {
    const res = await feedbackHandler(makeRequest('DELETE'), makeContext());
    expect(res.status).toBe(405);
  });
});
