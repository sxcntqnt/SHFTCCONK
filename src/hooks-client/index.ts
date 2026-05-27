/**
 * src/hooks-client/index.ts
 *
 * Re-exports from every client hooks module so hooks.client.ts
 * stays a thin composition file with no implementation details.
 */

export { initSentry, getPosthog, isSentryReady } from './Analytics'

export {
  initMapBootstrap,
  prefetchHexesForViewport,
  downloadCityForOffline,
} from './MapBootstrap'

export { onSWMessage }      from './sw_messages'
export type { SWMessage }   from './sw_messages'

// csrf-client already lives here — re-export for convenience
export { getCsrfToken, withCsrfHeader, csrfFetch } from './csrf_client'
