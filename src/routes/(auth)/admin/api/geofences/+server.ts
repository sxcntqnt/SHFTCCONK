import type { RequestHandler } from './$types';
import redis from '$lib/server/redis';
import { supabaseAdmin } from '$lib/server/supabase';

/* =========================
   AUTH HELPER
========================= */
async function getUser(request: Request) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;

  return data.user;
}

/* =========================
   CREATE GEOFENCE
========================= */
export const POST: RequestHandler = async ({ request }) => {
  try {
    const user = await getUser(request);
    if (!user) return new Response('Unauthorized', { status: 401 });

    const { id, name, color, coords } = await request.json();

    if (!id || !name || !coords) {
      return new Response('Invalid payload', { status: 400 });
    }

    // 1️⃣ Insert metadata FIRST (source of truth)
    const { error: insertError } = await supabaseAdmin
      .from('geofences')
      .insert({
        id,
        name,
        color,
        owner_id: user.id
      });

    if (insertError) throw insertError;

    // 2️⃣ Store geometry in Tile38
    try {
      await redis.call(
        'SET',
        `geofences:${user.id}`,
        id,
        'OBJECT',
        JSON.stringify({
          type: 'Polygon',
          coordinates: [coords]
        })
      );
    } catch (tileError) {
      // rollback metadata if Tile38 fails
      await supabaseAdmin
        .from('geofences')
        .delete()
        .eq('id', id)
        .eq('owner_id', user.id);

      throw tileError;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 201
    });

  } catch (err) {
    console.error('POST /geofences error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
};

/* =========================
   DELETE GEOFENCE
========================= */
export const DELETE: RequestHandler = async ({ request, url }) => {
  try {
    const user = await getUser(request);
    if (!user) return new Response('Unauthorized', { status: 401 });

    const id = url.searchParams.get('id');
    if (!id) return new Response('Missing id', { status: 400 });

    // 1️⃣ Delete geometry from Tile38
    await redis.call(
      'DEL',
      `geofences:${user.id}`,
      id
    );

    // 2️⃣ Delete metadata from Supabase
    const { error } = await supabaseAdmin
      .from('geofences')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }));

  } catch (err) {
    console.error('DELETE /geofences error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
};

/* =========================
   LOAD USER GEOFENCES
========================= */
export const GET: RequestHandler = async ({ request }) => {
  try {
    const user = await getUser(request);
    if (!user) return new Response('Unauthorized', { status: 401 });

    // 1️⃣ Get metadata from Supabase
    const { data: rows, error } = await supabaseAdmin
      .from('geofences')
      .select('*')
      .eq('owner_id', user.id);

    if (error) throw error;

    if (!rows || rows.length === 0) {
      return new Response(JSON.stringify([]));
    }

    // 2️⃣ Fetch geometry per fence (scales better than SCAN)
    const merged = await Promise.all(
      rows.map(async (row) => {
        const geo: any = await redis.call(
          'GET',
          `geofences:${user.id}`,
          row.id
        );

        let coords: any[] = [];

        if (geo?.object?.coordinates?.[0]) {
          coords = geo.object.coordinates[0];
        }

        return {
          ...row,
          coords
        };
      })
    );

    return new Response(JSON.stringify(merged));

  } catch (err) {
    console.error('GET /geofences error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
};