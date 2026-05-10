import { getWebInstrumentations, initializeFaro } from '@grafana/faro-web-sdk';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';

const hostname = globalThis.location.hostname;
let environment: string;
if (hostname === 'localhost' || hostname === '127.0.0.1') {
  environment = 'local';
} else if (hostname.endsWith('.azurestaticapps.net')) {
  environment = 'preview';
} else {
  environment = 'production';
}

const faroInstance = initializeFaro({
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

if (localStorage.getItem('cc-consent') === 'accepted') {
  faroInstance.unpause();
}

document.addEventListener('cc-consent-accepted', () => {
  faroInstance.unpause();
});
