import { describe, it, expect, vi, afterEach } from 'vitest';

const mockFromConnectionString = vi.fn((connStr: string, tableName: string) => ({ connStr, tableName }));

vi.mock('@azure/data-tables', () => ({
  TableClient: { fromConnectionString: mockFromConnectionString },
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  mockFromConnectionString.mockClear();
});

describe('getTableClient', () => {
  it('uses no prefix when TABLE_ENV is production', async () => {
    vi.stubEnv('AZURE_STORAGE_CONNECTION_STRING', 'conn-str');
    vi.stubEnv('TABLE_ENV', 'production');

    const { getTableClient } = await import('./tableClient.js');
    getTableClient('ratings');

    expect(mockFromConnectionString).toHaveBeenCalledWith('conn-str', 'ratings');
  });

  it('uses no prefix when TABLE_ENV is unset', async () => {
    vi.stubEnv('AZURE_STORAGE_CONNECTION_STRING', 'conn-str');

    vi.resetModules();
    const { getTableClient } = await import('./tableClient.js');
    getTableClient('comments');

    expect(mockFromConnectionString).toHaveBeenCalledWith('conn-str', 'comments');
  });

  it('prefixes table name with "preview_" when TABLE_ENV is preview', async () => {
    vi.stubEnv('AZURE_STORAGE_CONNECTION_STRING', 'UseDevelopmentStorage=true');
    vi.stubEnv('TABLE_ENV', 'preview');

    vi.resetModules();
    const { getTableClient } = await import('./tableClient.js');
    getTableClient('ratings');

    expect(mockFromConnectionString).toHaveBeenCalledWith('UseDevelopmentStorage=true', 'preview_ratings');
  });
});
