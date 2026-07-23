import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import {
  PRIVATE_R2_ACCOUNT_ID,
  PRIVATE_R2_ACCESS_KEY_ID,
  PRIVATE_R2_SECRET_ACCESS_KEY,
  PRIVATE_R2_BUCKET,
} from "$env/static/private"

console.log("R2 accCount id:", JSON.stringify(PRIVATE_R2_ACCOUNT_ID))
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${PRIVATE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: PRIVATE_R2_ACCESS_KEY_ID,
    secretAccessKey: PRIVATE_R2_SECRET_ACCESS_KEY,
  },
})

/** Uploads a File to R2 under `key`. Throws on failure — caller decides how to surface it. */
export async function putKycObject(file: File, key: string): Promise<void> {
  const body = Buffer.from(await file.arrayBuffer())

  await r2.send(
    new PutObjectCommand({
      Bucket: PRIVATE_R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: file.type || "application/octet-stream",
    }),
  )
}

/**
 * Presigned GET so gatebill's worker can fetch the object without R2 creds
 * of its own. Bucket stays private since these are ID photos + selfies.
 *
 * expiresIn is a real constraint here: submit is async (202 + job_id), so
 * the worker may not fetch immediately. If gatebill's queue can lag more
 * than an hour under load, bump this — or better, have gatebill re-request
 * a fresh URL via a small internal endpoint instead of trusting a long TTL.
 */
export async function getKycObjectUrl(key: string, expiresInSeconds = 3600): Promise<string> {
  return getSignedUrl(
    r2,
    new GetObjectCommand({ Bucket: PRIVATE_R2_BUCKET, Key: key }),
    { expiresIn: expiresInSeconds },
  )
}
