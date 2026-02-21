// routes/api/invite/+server.ts
import { json } from '@sveltejs/kit';
import { v4 as uuidv4 } from 'uuid';
import { sendEmail } from '$lib/utils/email';
import { db } from '$lib/db'; // your database helper
import { requirePermission } from '$lib/security/permissionGuard';

/* ============================================================
   POST /api/invite
   Create a new invitation for a user in the tenant
============================================================ */
export async function POST({ request, locals }) {
  try {
    // Enforce tenant-level permission
    requirePermission('INVITE_OPERATOR');

    const { email, role } = await request.json();

    if (!email || !role) {
      return json({ error: 'Email and role are required' }, { status: 400 });
    }

    const token = uuidv4();
    const createdAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // expires in 7 days

    // Save invitation in DB
    await db.insert('operator_invitations', {
      organization_id: locals.user.organization_id,
      email,
      role,
      token,
      status: 'PENDING',
      created_at: createdAt,
      expires_at: expiresAt
    });

    // Send invitation email
    await sendEmail(
      email,
      'Invitation to join Mobility OS',
      `Hello,

You have been invited to join your organization on Mobility OS.
Click the link to accept: ${process.env.APP_URL}/accept-invite?token=${token}

This invitation expires on ${expiresAt}.`
    );

    return json({ status: 'SENT', token });
  } catch (err) {
    console.error('Invite error:', err);
    return json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

/* ============================================================
   POST /api/accept-invite
   Accept an invitation and create the user
============================================================ */
export async function POST_accept({ request }) {
  try {
    const { token, fullName, password } = await request.json();

    if (!token || !fullName || !password) {
      return json({ error: 'Token, fullName, and password are required' }, { status: 400 });
    }

    // Fetch invitation
    const invite = await db.get('operator_invitations', { token });

    if (!invite) {
      return json({ error: 'Invitation not found' }, { status: 404 });
    }

    if (invite.status !== 'PENDING') {
      return json({ error: 'Invitation already used or revoked' }, { status: 400 });
    }

    if (new Date() > new Date(invite.expires_at)) {
      return json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Create user
    await db.insert('users', {
      organization_id: invite.organization_id,
      full_name: fullName,
      email: invite.email,
      password_hash: hashPassword(password),
      role: invite.role,
      permissions: getPermissionsForRole(invite.role),
      created_at: new Date().toISOString()
    });

    // Mark invitation as accepted
    await db.update(
      'operator_invitations',
      { status: 'ACCEPTED', accepted_at: new Date().toISOString() },
      { token }
    );

    return json({ status: 'ACCEPTED' });
  } catch (err) {
    console.error('Accept invite error:', err);
    return json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

/* ============================================================
   UTILITY FUNCTIONS
============================================================ */

function hashPassword(password: string) {
  // Implement bcrypt or argon2 hashing
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(password).digest('hex');
}

function getPermissionsForRole(role: string): string[] {
  // Define a simple role -> permission mapping
  const mapping: Record<string, string[]> = {
    ADMIN: ['INVITE_OPERATOR', 'MANAGE_FLEET', 'VIEW_REPORTS'],
    OPERATOR: ['VIEW_FLEET', 'VIEW_REPORTS'],
    DRIVER: ['VIEW_OWN_VEHICLE']
  };
  return mapping[role.toUpperCase()] || [];
}