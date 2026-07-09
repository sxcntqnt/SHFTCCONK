// Single source of truth for the Help Centre taxonomy.
// Mirrors the pattern used by community-categories.ts — the sidebar,
// the index page's quick-links grid, and the [...slug] breadcrumbs
// all derive from this one file instead of being hand-authored per page.
//
// `icon` must be a valid IconKey handled by IconGlyph.svelte
// (src/lib/components/IconGlyph.svelte + src/lib/types.ts).

export type HelpGroupId = 'riders' | 'operators' | 'account' | 'support';

export interface HelpGroup {
	id: HelpGroupId;
	label: string;
}

export interface HelpCategory {
	id: string; // used in article frontmatter (folder name) + as the sidebar link slug
	group: HelpGroupId;
	label: string;
	description: string;
	icon: string; // an IconKey from $lib/types — resolved by IconGlyph.svelte
}

export const helpGroups: HelpGroup[] = [
	{ id: 'riders', label: 'For Riders' },
	{ id: 'operators', label: 'For Operators' },
	{ id: 'account', label: 'Account' },
	{ id: 'support', label: 'Support Channels' }
];

export const helpCategories: HelpCategory[] = [
	{
		id: 'getting-started',
		group: 'riders',
		label: 'Getting Started',
		description: "Download the app, create an account, and find your first route.",
		icon: 'getting-started'
	},
	{
		id: 'tracking',
		group: 'riders',
		label: 'Live Tracking',
		description: "How GPS tracking works and what to do when a vehicle isn't showing.",
		icon: 'tracking'
	},
	{
		id: 'alerts',
		group: 'riders',
		label: 'Arrival Alerts',
		description: "Setting up alerts and fixing notifications that aren't arriving.",
		icon: 'notifications'
	},
	{
		id: 'routes',
		group: 'riders',
		label: 'Route Planner',
		description: 'Comparing routes, multi-hop trips, and ETA accuracy questions.',
		icon: 'routes'
	},
	{
		id: 'operators',
		group: 'operators',
		label: 'Operator Dashboard',
		description: 'Fleet map setup, analytics, delay alerts, and billing for operators.',
		icon: 'analytics'
	},
	{
		id: 'billing',
		group: 'account',
		label: 'Account & Billing',
		description: 'Manage your subscription, payment details, and invoices.',
		icon: 'billing'
	}
];

export function categoriesByGroup(group: HelpGroupId): HelpCategory[] {
	return helpCategories.filter((c) => c.group === group);
}

export function getCategory(id: string): HelpCategory | undefined {
	return helpCategories.find((c) => c.id === id);
}
