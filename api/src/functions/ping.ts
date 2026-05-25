import { app } from '@azure/functions';

app.http('ping', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: () => ({
    status: 200,
    jsonBody: {
      ok: true,
      node: process.version,
      tableEnv: process.env.TABLE_ENV ?? '(unset)',
      hasConnString: Boolean(process.env.AZURE_STORAGE_CONNECTION_STRING),
    },
  }),
});
