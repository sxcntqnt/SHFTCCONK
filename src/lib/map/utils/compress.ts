// src/lib/map/utils/compress.ts
import snappy from 'snappy';

export async function compressedJsonResponse(
  data: any, 
  options: {
    contentType?: string;
    cacheSeconds?: number;
    compress?: boolean;        // Allow forcing compression
  } = {}
) {
  const { 
    contentType = 'application/json', 
    cacheSeconds = 60,
    compress = true 
  } = options;

  // If compression is disabled, return normal JSON
  if (!compress) {
    return json(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': `public, max-age=${cacheSeconds}`
      }
    });
  }

  try {
    const jsonString = JSON.stringify(data);
    const compressed = await snappy.compress(Buffer.from(jsonString));

    return new Response(compressed, {
      headers: {
        'Content-Type': contentType,
        'Content-Encoding': 'snappy',
        'Cache-Control': `public, max-age=${cacheSeconds}`,
        'Vary': 'Accept-Encoding'
      }
    });
  } catch (err) {
    // Fallback to uncompressed if snappy fails
    console.warn('Snappy compression failed, falling back to JSON', err);
    return json(data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': `public, max-age=${cacheSeconds}`
      }
    });
  }
}

// Also export json for convenience
import { json } from '@sveltejs/kit';
export { json };