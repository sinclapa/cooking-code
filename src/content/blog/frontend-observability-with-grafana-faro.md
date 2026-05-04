---
title: "Frontend Observability on an Astro Site with Grafana Faro"
description: "How we wired up Grafana Faro Web SDK on Cooking Code — error capture, Web Vitals, distributed tracing, source maps, and environment-aware build versioning."
pubDate: "2025-04-29"
tags: ["observability", "Grafana", "Faro", "Astro", "DevOps"]
author: "Cooking Code Team"
---

You can't improve what you can't see. Today we cooked up a full frontend observability stack for Cooking Code using [Grafana Faro](https://grafana.com/docs/grafana-cloud/monitor-applications/frontend-observability/) — error capture, Web Vitals, distributed tracing, source map upload, and a build versioning system that knows where it's running. Here's everything we did and why.

## What Is Grafana Faro?

Grafana Faro is an open-source browser SDK that ships signals — JavaScript errors, console logs, Web Vitals, network traces, and custom events — to a Grafana Cloud collector. Once the data is flowing, you can query it in Grafana, build dashboards, and set up alerts on things like error rate spikes or Core Web Vitals regressions.

It's one SDK call and you get a lot for free.

## Installing the SDK

```bash
npm install @grafana/faro-web-sdk @grafana/faro-web-tracing
```

We keep `@grafana/faro-web-tracing` separate because distributed tracing is optional — you add `TracingInstrumentation` to the `instrumentations` array and Faro starts attaching W3C `traceparent` headers to every fetch and XHR request, linking frontend spans to backend traces.

## Initialising Faro

We created `src/faro.ts` as a standalone module — one concern, one file.

```typescript
import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

const hostname = window.location.hostname;
const environment =
  hostname === 'localhost' || hostname === '127.0.0.1' ? 'local' :
  hostname.endsWith('.azurestaticapps.net') ? 'preview' :
  'production';

initializeFaro({
  url: 'https://faro-collector-prod-gb-south-1.grafana.net/collect/...',
  app: {
    name: 'cooking-code',
    version: import.meta.env.PUBLIC_BUILD_VERSION,
    environment,
  },
  instrumentations: [...getWebInstrumentations(), new TracingInstrumentation()],
  sessionTracking: {
    persistent: true,
    maxSessionPersistenceTime: 30 * 60 * 1000,
  },
  experimental: {
    trackNavigation: true,
  },
  ignoreErrors: [
    /^ResizeObserver loop limit exceeded$/,
    /^ResizeObserver loop completed with undelivered notifications$/,
    /^Script error\.$/,
    /chrome-extension:\/\//,
    /moz-extension:\/\//,
  ],
});
```

A few things worth calling out here.

**Environment detection** is done at runtime via `window.location.hostname`. This matters because we deploy the same built artifact to both preview and production — we can't bake the environment in at compile time and have it be correct in both places. Every signal Faro emits is tagged with `environment`, so you can filter dashboards by `local`, `preview`, or `production` without the data mixing together.

**`ignoreErrors`** filters out harmless browser noise before it ever reaches Grafana. `ResizeObserver loop limit exceeded` is a Chrome quirk that fires constantly on pages with complex layouts. `Script error.` with an empty stack is what you get when a cross-origin script throws and the browser strips the details for security reasons. Browser extension errors pollute error dashboards on every site. None of these are your bugs — filter them out on day one.

**`sessionTracking.persistent: true`** uses `localStorage` to keep the same session ID across tab closes and browser restarts. With a 30-minute inactivity timeout, a reader who stops mid-article and comes back later is still the same session.

**`trackNavigation`** captures client-side URL changes even without a router. Cooking Code is a multi-page Astro site (each navigation is a full page load), so Faro already sees each page as a distinct load. The flag is there as a safety net for any future client-side navigation.

## Wiring It Into Astro

Astro doesn't have a `src/main.ts` entry point. Every page uses `src/layouts/BaseLayout.astro` as its shell, so that's where the import lives:

```astro
<!-- Inside <head> in BaseLayout.astro -->
<script>import '../faro';</script>
```

Astro processes `<script>` tags with Vite — the import is resolved, bundled, and included in the page's JS output. Because `BaseLayout.astro` wraps every page, Faro is initialised on every page load automatically.

## Filtering Noise

`getWebInstrumentations()` includes a network instrumentation that captures every fetch and XHR request. If you have third-party analytics, session recording tools, or tag managers on the page, their requests will show up in your Faro data as noise. We didn't have any on this site, but the `ignoreUrls` option is where you'd suppress them — one regex per domain.

## Source Map Upload

Minified JavaScript makes stack traces useless. Grafana has a Rollup/Vite plugin that uploads source maps to Grafana Cloud during production builds so that raw stack frames like `at o (main.abc123.js:1:4892)` resolve to the actual file and line in Grafana.

```bash
npm install --save-dev @grafana/faro-rollup-plugin
```

In `astro.config.mjs`:

```javascript
import faroUploader from '@grafana/faro-rollup-plugin';

export default defineConfig({
  vite: {
    plugins: [
      process.env.NODE_ENV === 'production' && faroUploader({
        appName: 'cooking-code',
        endpoint: 'https://faro-api-prod-gb-south-1.grafana.net/faro/api/v1',
        appId: '741',
        stackId: '1575076',
        apiKey: process.env.FARO_API_KEY,
        gzipContents: true,
      }),
    ].filter(Boolean),
  },
});
```

The `process.env.NODE_ENV === 'production'` guard ensures source maps are only uploaded during `astro build`, never during `astro dev`. The API key lives in `.env` (gitignored) locally and as a GitHub Actions secret in CI.

In the workflow:

```yaml
- name: Build
  run: npm run build
  env:
    FARO_API_KEY: ${{ secrets.FARO_API_KEY }}
    PUBLIC_BUILD_VERSION: ${{ steps.version.outputs.value }}
```

## Build Versioning

We wanted a version on every build — visible in the footer, tagged in Faro, and consistent regardless of where the artifact is deployed. The format we settled on is `YYYYMMDD.HHmmss`.

The version is generated in two places:

**On CI**, from the git commit timestamp:

```yaml
- name: Set build version
  id: version
  run: echo "value=$(TZ=UTC git log -1 --format="%cd" --date=format:"%Y%m%d.%H%M%S")" >> $GITHUB_OUTPUT
```

Using the commit timestamp rather than the build timestamp means the same commit always produces the same version string, regardless of when the CI job runs.

**Locally**, in `astro.config.mjs`, at dev server startup:

```javascript
if (!process.env.PUBLIC_BUILD_VERSION) {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  process.env.PUBLIC_BUILD_VERSION = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}.${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}
```

`astro.config.mjs` runs in Node.js when `astro dev` or `astro build` starts — before Vite compiles anything. Setting `process.env.PUBLIC_BUILD_VERSION` here is equivalent to passing it as a shell environment variable. Vite then bakes `import.meta.env.PUBLIC_BUILD_VERSION` into the output as a static string. It's never computed in the browser.

The version appears in the footer:

```astro
---
const buildVersion = import.meta.env.PUBLIC_BUILD_VERSION;
---
<p class="footer-version">{buildVersion}</p>
```

No JavaScript required — it's a build-time constant rendered server-side by Astro.

## Environment Badges

For local and preview deployments, we added a small pill badge to the header so it's always obvious which environment you're looking at. It's hidden on production — users don't need to see it, but it's still set in Faro.

```javascript
// In Header.astro <script>
const hostname = window.location.hostname;
const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
const isPreview = hostname.endsWith('.azurestaticapps.net');

if (isLocal || isPreview) {
  const badge = document.getElementById('header-env-badge');
  badge.textContent = isLocal ? 'local' : 'preview';
  badge.classList.add(isLocal ? 'env-badge--local' : 'env-badge--preview');
  badge.style.display = 'inline';
}
```

Local gets cyan (`#22d3ee`), preview gets green (`#4ade80`) — easy to tell apart at a glance.

## What You Get Out of the Box

Once Faro is running, the following are captured automatically with no extra code:

- **JavaScript errors** — unhandled exceptions, promise rejections, and thrown errors, with stack traces resolved to source lines via the uploaded maps
- **Core Web Vitals** — LCP, FID/INP, CLS, measured in real user sessions
- **Network requests** — fetch and XHR timing, status codes, and response sizes
- **Console output** — `console.log`, `console.warn`, `console.error`
- **Distributed traces** — W3C `traceparent` headers on same-origin requests
- **Navigation events** — page loads and client-side URL changes

Every signal is tagged with `app.name`, `app.version`, `app.environment`, and the session ID. You can filter by any of them in Grafana.

## What's Next

The roadmap from here:

- **Custom events** — instrument meaningful user interactions: `faro.api?.pushEvent('article_read', { slug: 'faro-setup' })`
- **Alerting** — set up alerts on error rate or Web Vitals degradation from the Grafana Cloud Frontend Observability panel

Observability isn't a one-time setup — it's a habit. Start with the defaults, watch what comes in, and add instrumentation where the data is thin.
