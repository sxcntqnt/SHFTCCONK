// Single source of truth for the Help Centre taxonomy.
// Mirrors the pattern used by community-categories.ts — the sidebar,
// the index page's quick-links grid, and the [...slug] breadcrumbs
// all derive from this one file instead of being hand-authored per page.

export type HelpGroupId = 'riders' | 'operators' | 'account' | 'support';

export interface HelpGroup {
	id: HelpGroupId;
	label: string;
}

export interface HelpCategory {
	id: string; // used in article frontmatter + as the sidebar link slug
	group: HelpGroupId;
	label: string;
	description: string;
	icon: string; // key into $lib/icons — resolved by IconGlyph.svelte
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
		icon: 'arrow-right'
	},
	{
		id: 'tracking',
		group: 'riders',
		label: 'Live Tracking',
		description: "How GPS tracking works and what to do when a vehicle isn't showing.",
		icon: 'map-pin'
	},
	{
		id: 'alerts',
		group: 'riders',
		label: 'Arrival Alerts',
		description: "Setting up alerts and fixing notifications that aren't arriving.",
		icon: 'bell'
	},
	{
		id: 'routes',
		group: 'riders',
		label: 'Route Planner',
		description: 'Comparing routes, multi-hop trips, and ETA accuracy questions.',
		icon: 'route'
	},
	{
		id: 'operators',
		group: 'operators',
		label: 'Operator Dashboard',
		description: 'Fleet map setup, analytics, delay alerts, and billing for operators.',
		icon: 'grid'
	},
	{
		id: 'billing',
		group: 'account',
		label: 'Account & Billing',
		description: 'Manage your subscription, payment details, and invoices.',
		icon: 'user'
	}
];

export function categoriesByGroup(group: HelpGroupId): HelpCategory[] {
	return helpCategories.filter((c) => c.group === group);
}

export function getCategory(id: string): HelpCategory | undefined {
	return helpCategories.find((c) => c.id === id);
}
