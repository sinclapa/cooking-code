const WORDS_PER_MINUTE = 200;

function normalizeMarkdown(markdown: string): string {
  return markdown
    .replaceAll(/```[\s\S]*?```/g, ' ')
    .replaceAll(/`[^`]*`/g, ' ')
    .replaceAll(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replaceAll(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replaceAll(/<[^>]+>/g, ' ')
    .replaceAll(/[#>*_~-]/g, ' ');
}

export function calculateReadingTime(content: string): number {
  const normalized = normalizeMarkdown(content).trim();
  if (!normalized) {
    return 1;
  }

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

export function formatReadingTime(minutes: number): string {
  return `${minutes} min read`;
}