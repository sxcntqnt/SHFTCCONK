// src/routes/(auth)/api/app/createProfile/+server.ts
import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import {
  loadProfileFormData,
  saveProfile,
} from '$lib/features/profile/profile.service'

export const POST: RequestHandler = async ({ request, locals }) => {
  const { session } = await locals.safeGetSession()
  if (!session) error(401, 'Unauthorised')

  let body: {
    fullName:     string
    phone:        string
    companyName?: string
    website?:     string
    orgIds?:      string[]
  }

  try {
    body = await request.json()
  } catch {
    error(400, 'Invalid JSON body')
  }

  const result = await saveProfile(locals.supabase, session.user.id, {
    fullName:    body.fullName,
    phone:       body.phone,
    companyName: body.companyName,
    website:     body.website,
    orgIds:      body.orgIds ?? [],
  })

  if (result && 'fields' in result) {
    return json({ error: result.message, fields: result.fields }, { status: 400 })
  }

  if (result && 'serverError' in result) {
    return json({ error: result.serverError }, { status: 500 })
  }

  return json({ success: true })
}

export const GET: RequestHandler = async ({ locals }) => {
  const { session } = await locals.safeGetSession()
  if (!session) error(401, 'Unauthorised')

  const data = await loadProfileFormData(locals.supabase, session.user.id)
  return json(data)
}