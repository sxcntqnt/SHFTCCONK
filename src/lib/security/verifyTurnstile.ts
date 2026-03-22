import { logSecurityEvent } from '$lib/utils/logger';

interface TurnstileResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

export async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  if (!token) return false;

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET!,
      response: token,
      remoteip: ip,
    }),
  });

  const data: TurnstileResponse = await response.json();

  if (!data.success) {
    logSecurityEvent('INVALID_RECAPTCHA', {
      provider: 'turnstile',
      ip,
      errors: data['error-codes'],
    });
  }

  return data.success === true;
}