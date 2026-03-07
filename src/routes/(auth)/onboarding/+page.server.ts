// src/routes/(auth)/onboarding/+page.server.ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { ROLE } from '$lib/features/auth/stores/roles';

export const actions: Actions = {
  completeOnboarding: async ({ request, locals }) => {
    const { supabase, user } = locals;

    if (!user) throw redirect(303, '/login');

    const formData = await request.formData();
    const role = formData.get('role')?.toString();
    const sacco = formData.get('sacco')?.toString() || null;

    if (!role) return fail(400, { message: 'Role is required' });

    const { error } = await supabase
      .from('profiles')
      .update({ role, sacco_id: sacco })
      .eq('id', user.id);

    if (error) return fail(500, { message: error.message });

    throw redirect(303, '/select-plan');
  }
};