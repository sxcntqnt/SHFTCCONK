// src/routes/commute/+page.server.ts
import type { PageServerLoad, Actions } from './$types';

type Activity = {
	id: string;
	date: string;      // YYYY-MM-DD
	time: string;
	from: string;
	to: string;
	mode: 'Car' | 'Train' | 'Bike' | 'Walk';
	notes: string;
};

// In-memory demo store (perfect for local development)
// In production replace with your database (Prisma, Supabase, etc.)
let activities: Activity[] = [
	{
		id: '1',
		date: '2026-03-14',
		time: '07:45',
		from: 'Home',
		to: 'Downtown Office',
		mode: 'Train',
		notes: 'Express line – grab coffee first'
	},
	{
		id: '2',
		date: '2026-03-14',
		time: '17:30',
		from: 'Downtown Office',
		to: 'Home',
		mode: 'Car',
		notes: 'Avoid rush hour via ring road'
	},
	{
		id: '3',
		date: '2026-03-15',
		time: '08:00',
		from: 'Home',
		to: 'Downtown Office',
		mode: 'Bike',
		notes: ''
	}
];

export const load: PageServerLoad = async () => {
	return {
		activities
	};
};

export const actions: Actions = {
	add: async ({ request }) => {
		const formData = await request.formData();

		const newActivity: Activity = {
			id: Date.now().toString(),
			date: formData.get('date') as string,
			time: formData.get('time') as string,
			from: formData.get('from') as string,
			to: formData.get('to') as string,
			mode: formData.get('mode') as 'Car' | 'Train' | 'Bike' | 'Walk',
			notes: (formData.get('notes') as string) || ''
		};

		activities = [...activities, newActivity];

		// Return success so the page re-renders with updated data
		return { success: true };
	}
};