// src/lib/content/community-categories.ts
export interface Category {
  slug: string;
  name: string;
  desc: string;
  icon: string;
  count?: number;
}

export const categories: Category[] = [
  {
    slug: 'route-tips-and-tricks',
    name: 'Route Tips & Tricks',
    desc: 'Share what you know — best boarding stages, fastest times of day, shortcuts operators use.',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="10" r="3"/>
      <path d="M12 2a8 8 0 00-8 8c0 5.4 7.05 11.5 7.7 12.06a.5.5 0 00.6 0C12.95 21.5 20 15.4 20 10a8 8 0 00-8-8z"/>
    </svg>`
  },
  {
    slug: 'live-alerts-and-ground-reports',
    name: 'Live Alerts & Ground Reports',
    desc: 'Real-time reports from riders and drivers — diversions, blockages, accidents, protests.',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>`
  },
  {
    slug: 'questions-and-support',
    name: 'Questions & Support',
    desc: 'Ask anything about the platform, your route, or Nairobi transit. Community and team both respond.',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>`
  },
  {
    slug: 'operator-corner',
    name: 'Operator Corner',
    desc: 'A dedicated space for sacco managers, fleet owners, and drivers to discuss operations.',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="1"/>
      <path d="M16 8h4l3 3v5h-7V8z"/>
      <circle cx="5.5" cy="18.5" r="2.5"/>
      <circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>`
  },
  {
    slug: 'feature-requests',
    name: 'Feature Requests',
    desc: 'Suggest and vote on features. Our product team reviews the top-voted requests every month.',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>`
  },
  {
    slug: 'nairobi-transit-discussion',
    name: 'Nairobi Transit Discussion',
    desc: 'Big-picture conversations about Nairobi mobility, city planning, BRT, and the future of transport.',
    icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
    </svg>`
  }
];
