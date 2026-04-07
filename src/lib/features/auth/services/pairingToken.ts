import { SignJWT, jwtVerify } from "jose"
import { PAIRING_TOKEN_SECRET } from "$env/static/private"
import { DRIVER_SESSION_SECRET } from "$env/static/private"

const driver_secret = new TextEncoder().encode(DRIVER_SESSION_SECRET)

const pairing_secret = new TextEncoder().encode(PAIRING_TOKEN_SECRET)


export interface PairingTokenPayload {
  vehicle_id: string
  org_id: string
  operator_id: string
  plate_number: string
  issued_at: string
  purpose: "DRIVER_PAIRING"
}

export async function generatePairingToken(
  payload: PairingTokenPayload,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("72h")
    .sign(pairing_secret)
}

export async function verifyPairingToken(
  token: string,
): Promise<PairingTokenPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload as unknown as PairingTokenPayload
}



export interface DriverSessionPayload {
  vehicle_id: string
  org_id: string
  operator_id: string
  // You can add more fields later if needed (e.g. role, permissions, etc.)
}

export async function generateDriverSessionToken(
  payload: DriverSessionPayload,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")        // 30 days is common for driver sessions
    .sign(driver_secret)
}