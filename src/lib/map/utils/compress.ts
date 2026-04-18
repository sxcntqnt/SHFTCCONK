// src/lib/map/utils/compress.ts
import { json } from '@sveltejs/kit';  // ← top, before use
import snappy from 'snappy';

export { json };

export async function compressedJsonResponse(
  data: unknown,
  options: {
    contentType?: string;
    cacheSeconds?: number;
    compress?: boolean;
  } = {}
): Promise<Response> {
  const {
    contentType = 'application/json',
    cacheSeconds = 60,
    compress = true,
  } = options;

  const cacheHeader = `public, max-age=${cacheSeconds}`;

  if (!compress) {
    return json(data, {
      headers: { 'Content-Type': contentType, 'Cache-Control': cacheHeader },
    });
  }

  try {
    const jsonString = JSON.stringify(data);
    const compressed = await snappy.compress(Buffer.from(jsonString));

    // NOTE: Snappy is not a browser-native Content-Encoding.
    // Only use this endpoint for server-to-server consumers that
    // explicitly request snappy. For browser clients, drop the
    // compress flag and let the SvelteKit adapter handle gzip/br.
    return new Response(compressed, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheHeader,
        'X-Content-Encoding': 'snappy', // custom header — signals codec without
        'Vary': 'Accept-Encoding',       // tricking browsers into decompressing
      },
    });
  } catch (err) {
    console.warn('[compress] Snappy failed, falling back to JSON:', err);
    return json(data, {
      headers: { 'Content-Type': contentType, 'Cache-Control': cacheHeader },
    });
  }
}