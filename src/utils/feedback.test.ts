import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loadFeedbackCounts,
  submitRating,
  loadComments,
  submitComment,
  hasVoted,
  markVoted,
  VOTED_KEY_PREFIX,
} from './feedback.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const mockLocalStorage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => mockLocalStorage[key] ?? null,
  setItem: (key: string, value: string) => { mockLocalStorage[key] = value; },
  removeItem: (key: string) => { delete mockLocalStorage[key]; },
  clear: () => { for (const key in mockLocalStorage) delete mockLocalStorage[key]; },
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadFeedbackCounts', () => {
  it('fetches counts for the given content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ thumbsUp: 5, thumbsDown: 2 }),
    });

    const result = await loadFeedbackCounts('blog', 'my-post');

    expect(mockFetch).toHaveBeenCalledWith('/api/feedback?contentType=blog&slug=my-post');
    expect(result).toEqual({ thumbsUp: 5, thumbsDown: 2 });
  });

  it('throws when the request fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(loadFeedbackCounts('blog', 'my-post')).rejects.toThrow();
  });
});

describe('submitRating', () => {
  it('posts the rating and returns updated counts', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ thumbsUp: 6, thumbsDown: 2 }),
    });

    const result = await submitRating('blog', 'my-post', 'up');

    expect(mockFetch).toHaveBeenCalledWith('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType: 'blog', slug: 'my-post', rating: 'up' }),
    });
    expect(result).toEqual({ thumbsUp: 6, thumbsDown: 2 });
  });

  it('throws when the request fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });

    await expect(submitRating('blog', 'my-post', 'down')).rejects.toThrow();
  });
});

describe('loadComments', () => {
  it('fetches comments for the given content', async () => {
    const comments = [{ id: '1', name: 'Alice', body: 'Great', createdAt: '2026-01-01T00:00:00Z' }];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ comments }),
    });

    const result = await loadComments('article', 'my-article');

    expect(mockFetch).toHaveBeenCalledWith('/api/comments?contentType=article&slug=my-article');
    expect(result).toEqual(comments);
  });

  it('throws when the request fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    await expect(loadComments('blog', 'my-post')).rejects.toThrow();
  });
});

describe('submitComment', () => {
  it('posts the comment and returns the created comment', async () => {
    const created = { id: 'abc', name: 'Bob', body: 'Helpful!', createdAt: '2026-01-01T00:00:00Z' };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(created),
    });

    const result = await submitComment('blog', 'my-post', 'Bob', 'Helpful!');

    expect(mockFetch).toHaveBeenCalledWith('/api/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType: 'blog', slug: 'my-post', name: 'Bob', body: 'Helpful!' }),
    });
    expect(result).toEqual(created);
  });

  it('throws when the request fails', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });

    await expect(submitComment('blog', 'my-post', '', '')).rejects.toThrow();
  });
});

describe('hasVoted / markVoted', () => {
  it('returns false when no vote recorded', () => {
    expect(hasVoted('my-post')).toBe(false);
  });

  it('returns true after markVoted is called', () => {
    markVoted('my-post');
    expect(hasVoted('my-post')).toBe(true);
  });

  it('uses the correct localStorage key', () => {
    markVoted('test-slug');
    expect(localStorage.getItem(`${VOTED_KEY_PREFIX}test-slug`)).toBe('1');
  });

  it('does not bleed between different slugs', () => {
    markVoted('post-a');
    expect(hasVoted('post-b')).toBe(false);
  });
});
