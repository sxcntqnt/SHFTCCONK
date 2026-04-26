// src/lib/map/utils/compress.server.ts
import { json } from '@sveltejs/kit';
import { brotliCompress, gzip } from 'node:zlib';

export { json };

export async function compressedJsonResponse(
  data: unknown,
  options: {
    contentType?: string;
    cacheSeconds?: number;
    compress?: boolean;
    encoding?: 'gzip' | 'br';
  } = {}
): Promise<Response> {
  const {
    contentType = 'application/json',
    cacheSeconds = 60,
    compress = true,
    encoding = 'br',
  } = options;

  const cacheHeader = `public, max-age=${cacheSeconds}`;

  if (!compress) {
    return json(data, {
      headers: { 'Content-Type': contentType, 'Cache-Control': cacheHeader },
    });
  }

  try {
    const jsonBytes = Buffer.from(JSON.stringify(data));
    const compressed = encoding === 'br'
      ? await brotliCompress(jsonBytes)
      : await gzip(jsonBytes);

    return new Response(compressed, {
      headers: {
        'Content-Type': contentType,
        'Content-Encoding': encoding,
        'Cache-Control': cacheHeader,
        'Vary': 'Accept-Encoding',
      },
    });
  } catch (err) {
    console.warn('[compress] Compression failed, falling back to JSON:', err);
    return json(data, {
      headers: { 'Content-Type': contentType, 'Cache-Control': cacheHeader },
    });
  }
}