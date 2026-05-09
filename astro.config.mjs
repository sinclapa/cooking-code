import { defineConfig } from 'astro/config';
import faroUploader from '@grafana/faro-rollup-plugin';

if (!process.env.PUBLIC_BUILD_VERSION) {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  process.env.PUBLIC_BUILD_VERSION = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}.${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

function remarkMermaid() {
  return (tree) => {
    function visit(node) {
      if (node.type === 'code' && node.lang === 'mermaid') {
        const escaped = node.value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        node.type = 'html';
        node.value = `<pre class="mermaid">${escaped}</pre>`;
      }
      if (node.children) node.children.forEach(visit);
    }
    visit(tree);
  };
}

export default defineConfig({
  site: 'https://cooking-code.dev',
  markdown: {
    remarkPlugins: [remarkMermaid],
  },
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
