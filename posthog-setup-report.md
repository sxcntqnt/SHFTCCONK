# PostHog Integration Setup Report — Matatu Pulse

## Overview

PostHog has been fully integrated into the Matatu Pulse SvelteKit application. Both client-side (`posthog-js`) and server-side (`posthog-node`) SDKs are installed and configured, with a reverse-proxy, error tracking, user identification, and 10 custom product analytics events.

---

## Files Created or Modified

### New files

| File                        | Purpose                                                                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/server/posthog.ts` | Server-side PostHog singleton using `posthog-node`. Shared by all server routes.                                                         |
| `src/hooks.client.ts`       | Client-side PostHog init (EU host, `/ingest` proxy, `capture_exceptions: true`). Also exports `handleError` for unhandled client errors. |
| `.posthog-events.json`      | Event plan — all 10 events with descriptions, files, and rationale.                                                                      |

### Modified files

| File                                                          | Change                                                                                                                  |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `src/hooks.server.ts`                                         | Added `posthogProxy` handle (routes `/ingest/*` to `eu.i.posthog.com`) and `handleError` for server-side error capture. |
| `svelte.config.js`                                            | Added `paths.relative: false` — required for PostHog session replay with SSR.                                           |
| `src/routes/(marketing)/login/sign_in/+page.svelte`           | `posthog.identify()` + `posthog.capture('user_signed_in')` after successful bootstrap.                                  |
| `src/routes/(marketing)/login/sign_up/+page.svelte`           | `posthog.identify()` + `posthog.capture('user_signed_up')` on `SIGNED_UP` auth event.                                   |
| `src/routes/(admin)/account/sign_out/+page.svelte`            | `posthog.capture('user_signed_out')` + `posthog.reset()` before Supabase sign-out.                                      |
| `src/routes/(marketing)/login/invite/[token]/+page.svelte`    | `posthog.identify()` + `posthog.capture('invite_redeemed')` after successful invite redemption.                         |
| `src/routes/feed/+page.svelte`                                | `posthog.capture('matatu_selected_from_feed')` when a passenger clicks Reserve.                                         |
| `src/routes/reserve/[matatuId]/+page.svelte`                  | `posthog.capture('seat_reservation_initiated')` when the M-Pesa modal opens.                                            |
| `src/routes/reserve/pay/+server.ts`                           | `posthog.capture('seat_reservation_completed')` on success; `posthog.capture('seat_reservation_failed')` on error.      |
| `src/routes/(marketing)/contact_us/+page.server.ts`           | `posthog.capture('contact_form_submitted')` after successful DB insert.                                                 |
| `src/routes/(admin)/account/subscribe/[slug]/+page.server.ts` | `posthog.capture('subscription_checkout_started')` before Stripe redirect.                                              |

---

## Environment Variables

Set in `.env` (gitignored):

```
PUBLIC_POSTHOG_KEY=phc_ElWdto1FZL8FwFhevCuZRVzvtqx1p2NRojI3SnpDqfl
PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

Referenced via `$env/static/public` — never hardcoded in source files.

---

## Reverse Proxy

All PostHog requests are routed server-side through `/ingest` to avoid ad-blockers:

- `/ingest/static/*` → `eu-assets.i.posthog.com`
- `/ingest/*` → `eu.i.posthog.com`

Implemented in `src/hooks.server.ts` as `posthogProxy` handle, inserted before the Supabase handle in the `sequence()` chain.

---

## Events Captured

| Event                           | Where  | Trigger                               | Key Properties                                                                        |
| ------------------------------- | ------ | ------------------------------------- | ------------------------------------------------------------------------------------- |
| `user_signed_in`                | Client | Supabase `SIGNED_IN` + bootstrap RPC  | `role`, `sacco`                                                                       |
| `user_signed_up`                | Client | Supabase `SIGNED_UP`                  | `email`, `provider`                                                                   |
| `user_signed_out`               | Client | `onMount` before Supabase `signOut()` | —                                                                                     |
| `invite_redeemed`               | Client | After `redeem_invite` RPC succeeds    | `role`, `organization`                                                                |
| `matatu_selected_from_feed`     | Client | Passenger clicks "Reserve a Seat"     | `matatu_id`, `route`, `sacco`, `status`, `eta_minutes`, `occupancy`, `price_per_seat` |
| `seat_reservation_initiated`    | Client | M-Pesa payment modal opens            | `matatu_id`, `route`, `sacco`, `seat_count`, `amount`                                 |
| `seat_reservation_completed`    | Server | `/reserve/pay` API succeeds           | `seat_count`, `amount`, `matatu_id`, `mpesa_request_id`                               |
| `seat_reservation_failed`       | Server | `/reserve/pay` API errors             | `reason`, `amount`, `expected`, `seat_count`                                          |
| `contact_form_submitted`        | Server | Contact form DB insert succeeds       | `contact_type`, `has_org`, `has_phone`                                                |
| `subscription_checkout_started` | Server | Stripe checkout session created       | `plan_id`, `stripe_customer_id`                                                       |

---

## User Identification

`posthog.identify()` is called at three points:

1. **Sign In** — with `profile_id`, `email`, `name`, `role`, `sacco` from the bootstrap RPC
2. **Sign Up** — with `user.id` and `email` from the Supabase session
3. **Invite Redemption** — with `profile_id`, `email`, `role`, `organization` from bootstrap + invite data

`posthog.reset()` is called before sign-out to disassociate the browser session from the identity.

---

## Error Tracking

- **Client errors**: Captured via `capture_exceptions: true` in `posthog.init()` and `handleError` in `src/hooks.client.ts`
- **Server errors**: Captured via `handleError` in `src/hooks.server.ts` using `posthog-node`

---

## PostHog Dashboard

**Dashboard**: [Matatu Pulse — Product Analytics](https://eu.posthog.com/project/133646/dashboard/546290)

### Insights

| Insight                                            | Type                    | URL                                                                 |
| -------------------------------------------------- | ----------------------- | ------------------------------------------------------------------- |
| User Acquisition — Sign Ups & Sign Ins             | Trends (line)           | [SkSEe8dI](https://eu.posthog.com/project/133646/insights/SkSEe8dI) |
| Seat Reservation Funnel — Feed → Modal → Completed | Funnel (3-step, 30 min) | [JlnWJmIp](https://eu.posthog.com/project/133646/insights/JlnWJmIp) |
| Seat Reservation Outcomes — Completed vs Failed    | Trends (bar)            | [QbuasTFn](https://eu.posthog.com/project/133646/insights/QbuasTFn) |
| Daily Active Users — Sign Outs                     | Trends (line, DAU)      | [xaKAu9iy](https://eu.posthog.com/project/133646/insights/xaKAu9iy) |
