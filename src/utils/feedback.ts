export const VOTED_KEY_PREFIX = 'voted:';

export interface FeedbackCounts {
  thumbsUp: number;
  thumbsDown: number;
}

export interface Comment {
  id: string;
  name: string;
  body: string;
  createdAt: string;
}

export async function loadFeedbackCounts(contentType: string, slug: string): Promise<FeedbackCounts> {
  const res = await fetch(`/api/feedback?contentType=${contentType}&slug=${slug}`);
  if (!res.ok) throw new Error(`Failed to load feedback counts: ${res.status}`);
  return res.json() as Promise<FeedbackCounts>;
}

export async function submitRating(contentType: string, slug: string, rating: 'up' | 'down'): Promise<FeedbackCounts> {
  const res = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType, slug, rating }),
  });
  if (!res.ok) throw new Error(`Failed to submit rating: ${res.status}`);
  return res.json() as Promise<FeedbackCounts>;
}

export async function loadComments(contentType: string, slug: string): Promise<Comment[]> {
  const res = await fetch(`/api/comments?contentType=${contentType}&slug=${slug}`);
  if (!res.ok) throw new Error(`Failed to load comments: ${res.status}`);
  const data = (await res.json()) as { comments: Comment[] };
  return data.comments;
}

export async function submitComment(contentType: string, slug: string, name: string, body: string): Promise<Comment> {
  const res = await fetch('/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contentType, slug, name, body }),
  });
  if (!res.ok) throw new Error(`Failed to submit comment: ${res.status}`);
  return res.json() as Promise<Comment>;
}

export function hasVoted(slug: string): boolean {
  return localStorage.getItem(`${VOTED_KEY_PREFIX}${slug}`) === '1';
}

export function markVoted(slug: string): void {
  localStorage.setItem(`${VOTED_KEY_PREFIX}${slug}`, '1');
}
