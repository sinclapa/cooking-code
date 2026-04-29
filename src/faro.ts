import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

initializeFaro({
  url: 'https://faro-collector-prod-gb-south-1.grafana.net/collect/79209a4e27e1814360531191874e54dc',
  app: {
    name: 'cooking-code',
    version: '0.0.1',
    environment: import.meta.env.MODE,
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
