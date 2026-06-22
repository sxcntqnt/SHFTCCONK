export interface DocLink {
  href: string;
  label: string;
  badge?: 'new' | 'beta';
}

export interface DocSection {
  label: string;
  links: DocLink[];
}

export const docsNav: DocSection[] = [
  {
    label: 'Getting Started',
    links: [
      { href: '/docs/introduction', label: 'Introduction' },
      { href: '/docs/quickstart', label: 'Quickstart Guide' },
      { href: '/docs/authentication', label: 'Authentication' },
      { href: '/docs/rate-limits', label: 'Rate Limits' }
    ]
  },
  {
    label: 'Core API',
    links: [
      { href: '/docs/api/vehicles', label: 'Vehicles' },
      { href: '/docs/api/routes', label: 'Routes' },
      { href: '/docs/api/stops', label: 'Stops & Stages' },
      { href: '/docs/api/eta', label: 'ETA Predictions' },
      { href: '/docs/api/fares', label: 'Fares', badge: 'new' }
    ]
  },
  {
    label: 'Real-Time',
    links: [
      { href: '/docs/websocket', label: 'WebSocket Feed' },
      { href: '/docs/websocket/events', label: 'Event Types' },
      { href: '/docs/webhooks', label: 'Webhooks', badge: 'beta' }
    ]
  },
  {
    label: 'Historical Data',
    links: [
      { href: '/docs/historical/trips', label: 'Trip History' },
      { href: '/docs/historical/congestion', label: 'Congestion Data' },
      { href: '/docs/historical/export', label: 'Data Export' }
    ]
  },
  {
    label: 'SDKs & Tools',
    links: [
      { href: '/docs/sdk/javascript', label: 'JavaScript SDK' },
      { href: '/docs/sdk/python', label: 'Python SDK', badge: 'beta' },
      { href: '/docs/sdk/android', label: 'Android SDK' },
      { href: '/docs/postman', label: 'Postman Collection' }
    ]
  },
  {
    label: 'Reference',
    links: [
      { href: '/docs/changelog', label: 'Changelog' },
      { href: '/docs/status', label: 'API Status' },
      { href: '/docs/errors', label: 'Error Codes' },
      { href: '/docs/glossary', label: 'Glossary' }
    ]
  }
];

export function flatLinks(): DocLink[] {
  return docsNav.flatMap((s) => s.links);
}

export function findLink(pathname: string): DocLink | undefined {
  return flatLinks().find((l) => l.href === pathname);
}
