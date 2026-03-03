Backend Pseudocode (SvelteKit Actions + Prisma-like)
src/routes/join-sacco/+page.server.ts
-------------------------------------------------------------------------------------------------------------------------------------------------------
import { fail, redirect } from '@sveltejs/kit';
import { prisma } from '$lib/server/prisma'; // or supabase
import { hashPassword } from '$lib/auth'; // hypothetical

export const actions = {
  default: async ({ request }) => {
    const form = await request.formData();
    const joinCode = form.get('joinCode')?.toString().trim();
    const fullName = form.get('fullName')?.toString().trim();
    const nationalId = form.get('nationalId')?.toString().trim();
    const phone = form.get('phone')?.toString().trim();
    const email = form.get('email')?.toString().trim() || null;
    const vehicleReg = form.get('vehicleReg')?.toString().trim() || null;
    // ...

    if (!joinCode || !fullName || !nationalId || !phone) {
      return fail(400, { error: 'Missing required fields' });
    }

    // 1. Validate join code → find SACCO
    const sacco = await prisma.sacco.findFirst({
      where: { joinCode: joinCode.toUpperCase(), isActive: true }
    });

    if (!sacco) {
      return fail(400, { error: 'Invalid or expired SACCO join code' });
    }

    // 2. Check if nationalId / phone already registered (avoid duplicates)
    const existing = await prisma.owner.findFirst({
      where: { OR: [{ nationalId }, { phone }] }
    });
    if (existing) {
      return fail(409, { error: 'This ID or phone is already registered' });
    }

    // 3. Create owner (pending approval)
    const owner = await prisma.owner.create({
      data: {
        fullName,
        nationalId,
        phone,
        email,
        saccoId: sacco.id,
        status: 'PENDING',           // SACCO admin approves later
        createdAt: new Date()
      }
    });

    // 4. Optional: create vehicle if provided
    if (vehicleReg) {
      await prisma.vehicle.create({
        data: {
          regNumber: vehicleReg.toUpperCase(),
          capacity: form.get('vehicleCapacity') ? Number(form.get('vehicleCapacity')) : null,
          ownerId: owner.id,
          saccoId: sacco.id,
          status: 'PENDING_VERIFICATION' // needs logbook upload/approval
        }
      });
    }

    // 5. Send email/SMS notification to owner & SACCO admin
    // await sendWelcomeEmail(owner, sacco);
    // await notifyAdminNewOwner(sacco.adminEmail, owner);

    // 6. Redirect or return success
    throw redirect(303, `/join-success?sacco=${encodeURIComponent(sacco.name)}&code=${encodeURIComponent(joinCode)}`);
  }
};
----------------------------------------------------------------------------------------------------------------------------------------------------------
RBAC Enforcement Reminder (in hooks or middleware)
// Every protected route: check current user → attach saccoId & role
if (user.role === 'owner' && requestedResource.ownerId !== user.ownerId) {
  throw error(403, 'You can only access your own vehicles/revenue');
}


//Backend Pairing Flow (Pseudocode – SvelteKit Action)
// +page.server.ts or api/pair/+server.ts
export const actions = {
  default: async ({ request, locals }) => {
    const form = await request.formData();
    const deviceId = form.get('deviceId');
    const plate = form.get('plateNumber')?.toString().toUpperCase().replace(/\s/g, '');
    const attestation = form.get('attestation'); // e.g. signed JWT or cert chain from device

    // 1. Verify device attestation (anti-spoof)
    const verified = await verifyDeviceAttestation(deviceId, attestation); // crypto lib
    if (!verified) throw error(403, 'Device spoof detected');

    // 2. Find or create vehicle by plate (SACCO-scoped)
    let vehicle = await prisma.vehicle.findUnique({ where: { plateNumber: plate } });
    if (!vehicle) {
      vehicle = await prisma.vehicle.create({
        data: { plateNumber: plate, saccoId: locals.user.saccoId, status: 'ACTIVE' }
      });
    }

    // 3. Bind tracker → vehicle (one-to-one)
    await prisma.tracker.upsert({
      where: { hardwareId: deviceId },
      update: { vehicleId: vehicle.id, status: 'PAIRED', lastPairedAt: new Date() },
      create: { hardwareId: deviceId, vehicleId: vehicle.id, secret: generateSecret() }
    });

    // 4. Subscribe device to MQTT topic: vehicles/{plate}/commands
    // Emit welcome telemetry config via MQTT

    return { success: true, plate, deviceId };
  }
};
++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
src/
├── routes/
│   ├── devices/                  ← group related device flows
│   │   ├── pair/                 ← pairing wizard
│   │   │   └── +page.svelte      ← ← ← put your full code here
│   │   ├── list/                 (future: list of paired trackers)
│   │   │   └── +page.svelte
│   │   └── [id]/                 (future: view single tracker details)
│   │       └── +page.svelte
│   ├── dashboard/
│   │   └── +page.svelte
│   ├── join-sacco/
│   │   └── +page.svelte          (from earlier join flow)
│   └── +page.svelte              (home / landing)
├── lib/
│   ├── components/               ← reusable small pieces (Button, Card, etc.)
│   └── server/                   ← server-only utils
└── app.html