import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

const hostname = window.location.hostname;
const environment =
  hostname === 'localhost' || hostname === '127.0.0.1' ? 'local' :
  hostname.endsWith('.azurestaticapps.net') ? 'preview' :
  'production';

initializeFaro({
  paused: true,
  url: 'https://faro-collector-prod-gb-south-1.grafana.net/collect/79209a4e27e1814360531191874e54dc',
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
