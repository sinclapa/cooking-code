import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from '@azure/functions';
import { getTableClient } from '../tableClient.js';

const VALID_CONTENT_TYPES = new Set(['blog', 'article']);

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

export async function commentsHandler(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  if (req.method === 'GET') {
    const contentType = req.query.get('contentType') ?? '';
    const slug = req.query.get('slug') ?? '';

    if (!VALID_CONTENT_TYPES.has(contentType) || !slug) {
      return { status: 400, jsonBody: { error: 'Invalid parameters' } };
    }

    const client = getTableClient('comments');
    const comments: Array<{ id: string; name: string; body: string; createdAt: string }> = [];

    for await (const entity of client.listEntities({ queryOptions: { filter: `PartitionKey eq '${contentType}:${slug}'` } })) {
      if (!entity.approved) continue;
      comments.push({
        id: entity.rowKey as string,
        name: entity.name as string,
        body: entity.body as string,
        createdAt: new Date(entity.timestamp as string).toISOString(),
      });
    }

    comments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { status: 200, jsonBody: { comments } };
  }

  if (req.method === 'POST') {
    const raw = (await req.json()) as Record<string, string>;
    const { contentType, slug } = raw;
    const name = stripHtml(raw.name ?? '');
    const body = stripHtml(raw.body ?? '');

    if (!VALID_CONTENT_TYPES.has(contentType) || !slug) {
      return { status: 400, jsonBody: { error: 'Invalid parameters' } };
    }

    if (!name || name.length > 60) {
      return { status: 400, jsonBody: { error: 'Name must be 1–60 characters' } };
    }

    if (!body || body.length > 1000) {
      return { status: 400, jsonBody: { error: 'Body must be 1–1000 characters' } };
    }

    const client = getTableClient('comments');
    const rowKey = `${new Date().toISOString()}_${crypto.randomUUID().slice(0, 8)}`;
    const createdAt = new Date().toISOString();

    await client.createEntity({
      partitionKey: `${contentType}:${slug}`,
      rowKey,
      name,
      body,
      approved: true,
    });

    return { status: 201, jsonBody: { id: rowKey, name, body, createdAt } };
  }

  return { status: 405 };
}

app.http('comments', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: commentsHandler,
});
