import type { PageServerLoad } from './$types';

// For demo purposes — in reality fetch from your DB
export const load: PageServerLoad = async () => {
  // Mock monthly data (replace with real aggregation query)
  const monthlyFuelData = [
    { month: 'Jan 2026', liters: 3850, cost: 728000, efficiency: 11.4 },
    { month: 'Feb 2026', liters: 4120, cost: 781000, efficiency: 10.9 },
    { month: 'Mar 2026', liters: 3590, cost: 680000, efficiency: 12.1 },
    { month: 'Apr 2026', liters: 4670, cost: 885000, efficiency: 9.8  },
    { month: 'May 2026', liters: 3980, cost: 754000, efficiency: 11.6 },
    { month: 'Jun 2026', liters: 4310, cost: 816000, efficiency: 10.5 }
  ];

  // You can add more datasets here (per vehicle, per driver, etc.)
  return {
    monthlyData: monthlyFuelData
  };
};