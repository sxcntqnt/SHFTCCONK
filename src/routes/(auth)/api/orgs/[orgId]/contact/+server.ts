// src/routes/api/contact/+server.ts
import type { RequestHandler } from "@sveltejs/kit"
import { verifyTurnstile } from "$lib/security/verifyTurnstile"

export const POST: RequestHandler = async ({ request, clientAddress, ip }) => {
  let token: string | null = null
  let formData: Record<string, any> = {}

  // Handle both JSON and FormData submissions
  const contentType = request.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    formData = await request.json()
    token = formData.token ?? null // frontend should send { token, ...formData }
  } else if (contentType.includes("multipart/form-data")) {
    const data = await request.formData()
    token = data.get("cf-turnstile-response")?.toString() ?? null
    // convert formData to plain object
    formData = Object.fromEntries(data.entries())
  }

  if (!token) {
    return new Response(JSON.stringify({ error: "Turnstile token missing" }), {
      status: 400,
    })
  }

  const valid = await verifyTurnstile(token, clientAddress ?? ip ?? "unknown")
  if (!valid) {
    return new Response(
      JSON.stringify({ error: "Turnstile verification failed" }),
      { status: 400 },
    )
  }

  // Process your form data here
  console.log("Contact form submitted:", formData)

  return new Response(JSON.stringify({ success: true }), { status: 200 })
}
