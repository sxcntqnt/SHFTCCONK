import type { RequestHandler } from '@sveltejs/kit'
import { json, redirect } from '@sveltejs/kit'

export const POST: RequestHandler = async ({ request, locals }) => {
  const form = await request.formData()
  const name = form.get('name') as string
  const license = form.get('license') as string
  const vehicle_id = (form.get('vehicle_id') as string) || null

  try {
    // Attempt insert to 'drivers' table; if table missing, quietly return
    await (locals.supabase as any).from('drivers').insert({ name, license, vehicle_id })
  } catch (e) {
    console.error('drivers add error', e)
  }

  throw redirect(303, '/drivers')
}
