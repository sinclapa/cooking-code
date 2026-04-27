import { describe, it, expect } from 'vitest';
import { calculateReadingTime, formatReadingTime } from './readingTime';

// ---------------------------------------------------------------------------
// formatReadingTime
// ---------------------------------------------------------------------------
describe('formatReadingTime', () => {
  it('formats 1 minute correctly', () => {
    expect(formatReadingTime(1)).toBe('1 min read');
  });

  it('formats multiple minutes correctly', () => {
    expect(formatReadingTime(5)).toBe('5 min read');
    expect(formatReadingTime(12)).toBe('12 min read');
  });
});

// ---------------------------------------------------------------------------
// calculateReadingTime — edge cases (returns 1)
// ---------------------------------------------------------------------------
describe('calculateReadingTime — empty / blank input', () => {
  it('returns 1 for an empty string', () => {
    expect(calculateReadingTime('')).toBe(1);
  });

  it('returns 1 for a whitespace-only string', () => {
    expect(calculateReadingTime('   \n\t  ')).toBe(1);
  });

  it('returns 1 for markdown that reduces to nothing', () => {
    // A string made entirely of stripped markdown characters
    expect(calculateReadingTime('# ## ### * _ ~ - > !')).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// calculateReadingTime — reading-time arithmetic
// ---------------------------------------------------------------------------
describe('calculateReadingTime — word count → minutes', () => {
  const makeWords = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(' ');

  it('returns 1 for a single word', () => {
    expect(calculateReadingTime('hello')).toBe(1);
  });

  it('returns 1 for exactly 200 words', () => {
    expect(calculateReadingTime(makeWords(200))).toBe(1);
  });

  it('returns 2 for 201 words', () => {
    expect(calculateReadingTime(makeWords(201))).toBe(2);
  });

  it('returns 2 for exactly 400 words', () => {
    expect(calculateReadingTime(makeWords(400))).toBe(2);
  });

  it('returns 3 for 401 words', () => {
    expect(calculateReadingTime(makeWords(401))).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// calculateReadingTime — markdown normalisation (via normalizeMarkdown)
// ---------------------------------------------------------------------------
describe('calculateReadingTime — fenced code blocks are stripped', () => {
  it('strips single-line fenced code block', () => {
    // Content inside the block should not count as words
    const withBlock = '```js\nconst x = 1;\n``` hello';
    const withoutBlock = 'hello';
    expect(calculateReadingTime(withBlock)).toBe(calculateReadingTime(withoutBlock));
  });

  it('strips multi-line fenced code block', () => {
    const content = 'intro\n```\nfoo bar baz\nqux\n```\nconclusion';
    // Only "intro" and "conclusion" remain → 2 words → 1 min
    expect(calculateReadingTime(content)).toBe(1);
  });
});

describe('calculateReadingTime — inline code is stripped', () => {
  it('strips inline code', () => {
    const content = 'use `const x = 1` here';
    // Inline code replaced by a space: "use   here" → 2 words
    expect(calculateReadingTime(content)).toBe(1);
  });
});

describe('calculateReadingTime — images are stripped', () => {
  it('strips image markdown', () => {
    const content = '![alt text](https://example.com/img.png) hello';
    // Image replaced by a space: " hello" → 1 word
    expect(calculateReadingTime(content)).toBe(1);
  });

  it('strips image with empty alt', () => {
    const content = '![](https://example.com/img.png) world';
    expect(calculateReadingTime(content)).toBe(1);
  });
});

describe('calculateReadingTime — links keep their visible text', () => {
  it('replaces link with its label text', () => {
    const content = '[Click here](https://example.com) to read more';
    // "Click here to read more" → 5 words
    expect(calculateReadingTime(content)).toBe(1);
  });

  it('includes link label words in word count', () => {
    // Build a 201-word body using a link whose label accounts for some words
    // 199 plain words + 2-word link label = 201 total words → 2 min
    const plainWords = Array.from({ length: 199 }, (_, i) => `word${i}`).join(' ');
    const content = `${plainWords} [alpha beta](https://example.com)`;
    expect(calculateReadingTime(content)).toBe(2);
  });
});

describe('calculateReadingTime — HTML tags are stripped', () => {
  it('strips HTML tags, keeping inner text', () => {
    const content = '<p>Hello world</p>';
    // Tags stripped → "Hello world" → 2 words → 1 min
    expect(calculateReadingTime(content)).toBe(1);
  });

  it('strips self-closing HTML tags', () => {
    const content = 'before <br /> after';
    expect(calculateReadingTime(content)).toBe(1);
  });
});

describe('calculateReadingTime — markdown formatting characters are stripped', () => {
  it('strips heading hashes', () => {
    const content = '## Heading Title';
    // "#" removed → "Heading Title" → 2 words → 1 min
    expect(calculateReadingTime(content)).toBe(1);
  });

  it('strips bold/italic asterisks and underscores', () => {
    const content = '**bold** and _italic_ text';
    expect(calculateReadingTime(content)).toBe(1);
  });

  it('strips blockquote and strikethrough characters', () => {
    const content = '> quote ~strikethrough~ end';
    expect(calculateReadingTime(content)).toBe(1);
  });

  it('strips standalone hyphen characters', () => {
    const content = 'item - another - last';
    expect(calculateReadingTime(content)).toBe(1);
  });
});
