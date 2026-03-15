import type { PageLoad } from './$types';
import { fetchWeather } from '$lib/features/weather/services/weatherApi';

export const load: PageLoad = async () => {
  // Nairobi, Kenya — latitude is south of equator, so negative
  const lat = -1.2921;
  const lng = 36.8219;

  try {
    const weather = await fetchWeather(lat, lng, 'Nairobi', 'default');
    return { weather };
  } catch {
    return { weather: null };
  }
};