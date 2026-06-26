// src/routes/healthz/+server.ts

import { json } from '@sveltejs/kit';

export async function GET() {
  return json({
    status: 'ok',
    service: 'root',
    message: 'ongeza mpaka...',
    timestamp: new Date().toISOString()
  });
}
