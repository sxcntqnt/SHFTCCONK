// src/routes/api/driver/pair/+server.ts
import type { RequestHandler } from "./$types";
import { json, error } from "@sveltejs/kit";
import {
  verifyPairingToken,
  generateDriverSessionToken,
} from "$lib/features/auth/services/pairingToken";
import { sql } from "$lib/server/pg";
import { streamClient } from "$lib/server/redis";

export const POST: RequestHandler = async ({ request }) => {
  const { pairing_token } = await request.json();

  if (!pairing_token) {
    throw error(400, "Pairing token is required");
  }

  let payload;
  try {
    payload = await verifyPairingToken(pairing_token);
  } catch {
    throw error(401, {
      code: "TOKEN_EXPIRED",
      message:
        "Pairing link has expired. Request a new one from your operator.",
    });
  }

  // Fetch and validate token record (atomic check + mark as consumed)
  const tokenRows = await sql`
    SELECT *
    FROM vehicle_pairing_tokens
    WHERE id = ${payload.token_id || payload.id}
      AND vehicle_id = ${payload.vehicle_id}
      AND consumed_at IS NULL
    LIMIT 1
  `;

  const tokenRecord = tokenRows[0];

  if (!tokenRecord) {
    throw error(409, {
      code: "TOKEN_CONSUMED",
      message: "This pairing link has already been used.",
    });
  }

  // Mark token as consumed
  try {
    await sql`
      UPDATE vehicle_pairing_tokens
      SET consumed_at = NOW()
      WHERE id = ${tokenRecord.id}
    `;
  } catch (err) {
    throw new Error(
      `Failed to consume token: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // Generate driver session token
  const sessionToken = await generateDriverSessionToken({
    vehicle_id: payload.vehicle_id,
    org_id: payload.org_id,
    operator_id: payload.operator_id,
  });

  // Cache driver session in Redis (30 days)
  await streamClient.set(
    `driver_session:${payload.vehicle_id}`,
    JSON.stringify({
      vehicle_id: payload.vehicle_id,
      org_id: payload.org_id,
      operator_id: payload.operator_id,
    }),
    "EX",
    30 * 24 * 60 * 60 // 30 days in seconds
  );

  return json({
    vehicle_id: payload.vehicle_id,
    org_id: payload.org_id,
    operator_id: payload.operator_id,
    plate_number: payload.plate_number,
    paired_at: new Date().toISOString(),
    session_token: sessionToken,
  });
};
