import { TableClient } from '@azure/data-tables';

const tablePrefix = process.env.TABLE_ENV === 'preview' ? 'preview' : '';

export function getTableClient(tableName: string): TableClient {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING ?? '';
  return TableClient.fromConnectionString(connectionString, `${tablePrefix}${tableName}`);
}
