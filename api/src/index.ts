import './functions/ping.js';
import './functions/feedback.js';
import './functions/comments.js';
import { TableClient } from '@azure/data-tables';

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING ?? '';
const tablePrefix = process.env.TABLE_ENV === 'preview' ? 'preview' : '';

async function ensureTables() {
  for (const name of ['ratings', 'comments']) {
    const client = TableClient.fromConnectionString(connectionString, `${tablePrefix}${name}`);
    try {
      await client.createTable();
    } catch (err: any) {
      if (err?.statusCode !== 409) throw err;
    }
  }
}

ensureTables().catch(console.error);
