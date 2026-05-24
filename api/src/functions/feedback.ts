import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { getTableClient } from '../tableClient.js';

const VALID_CONTENT_TYPES = new Set(['blog', 'article']);
const VALID_RATINGS = new Set(['up', 'down']);

async function getCounts(contentType: string, slug: string): Promise<{ thumbsUp: number; thumbsDown: number }> {
  const client = getTableClient('ratings');
  let thumbsUp = 0;
  let thumbsDown = 0;

  for await (const entity of client.listEntities({ queryOptions: { filter: `PartitionKey eq '${contentType}:${slug}'` } })) {
    if (entity.rating === 'up') thumbsUp++;
    else if (entity.rating === 'down') thumbsDown++;
  }

  return { thumbsUp, thumbsDown };
}

export async function feedbackHandler(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  if (req.method === 'GET') {
    const contentType = req.query.get('contentType') ?? '';
    const slug = req.query.get('slug') ?? '';

    if (!VALID_CONTENT_TYPES.has(contentType) || !slug) {
      return { status: 400, jsonBody: { error: 'Invalid parameters' } };
    }

    return { status: 200, jsonBody: await getCounts(contentType, slug) };
  }

  if (req.method === 'POST') {
    const body = (await req.json()) as Record<string, string>;
    const { contentType, slug, rating } = body;

    if (!VALID_CONTENT_TYPES.has(contentType) || !slug || !VALID_RATINGS.has(rating)) {
      return { status: 400, jsonBody: { error: 'Invalid parameters' } };
    }

    const client = getTableClient('ratings');
    const rowKey = `${new Date().toISOString()}_${crypto.randomUUID().slice(0, 8)}`;

    await client.createEntity({ partitionKey: `${contentType}:${slug}`, rowKey, rating });

    return { status: 201, jsonBody: await getCounts(contentType, slug) };
  }

  return { status: 405 };
}

app.http('feedback', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: feedbackHandler,
});
