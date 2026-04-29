import { defineConfig } from 'astro/config';
import faroUploader from '@grafana/faro-rollup-plugin';

if (!process.env.PUBLIC_BUILD_VERSION) {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  process.env.PUBLIC_BUILD_VERSION = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}.${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

export default defineConfig({
  site: 'https://cooking-code.dev',
  vite: {
    plugins: [
      process.env.NODE_ENV === 'production' && faroUploader({
        appName: 'cooking-code',
        endpoint: 'https://faro-api-prod-gb-south-1.grafana.net/faro/api/v1',
        appId: '741',
        stackId: '1575076',
        verbose: true,
        apiKey: process.env.FARO_API_KEY,
        gzipContents: true,
      }),
    ].filter(Boolean),
  },
});
