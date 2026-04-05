import { SignJWT, jwtVerify } from "jose"
import { PAIRING_TOKEN_SECRET } from "$env/static/private"

const secret = new TextEncoder().encode(PAIRING_TOKEN_SECRET)

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
    .sign(secret)
}

export async function verifyPairingToken(
  token: string,
): Promise<PairingTokenPayload> {
  const { payload } = await jwtVerify(token, secret)
  return payload as unknown as PairingTokenPayload
}
