// src/routes/commute/+page.server.ts
import type { PageServerLoad, Actions } from "./$types"
import { fail } from "@sveltejs/kit"
import { calendarAddSchema } from "$lib/security/app.schema"

type Activity = {
  id: string
  date: string // YYYY-MM-DD
  time: string
  from: string
  to: string
  mode: "Car" | "Train" | "Bike" | "Walk"
  notes: string
}

// In-memory demo store (perfect for local development)
// In production replace with your database (Prisma, Supabase, etc.)
let activities: Activity[] = [
  {
    id: "1",
    date: "2026-03-14",
    time: "07:45",
    from: "Home",
    to: "Downtown Office",
    mode: "Train",
    notes: "Express line – grab coffee first",
  },
  {
    id: "2",
    date: "2026-03-14",
    time: "17:30",
    from: "Downtown Office",
    to: "Home",
    mode: "Car",
    notes: "Avoid rush hour via ring road",
  },
  {
    id: "3",
    date: "2026-03-15",
    time: "08:00",
    from: "Home",
    to: "Downtown Office",
    mode: "Bike",
    notes: "",
  },
]

export const load: PageServerLoad = async () => {
  return {
    activities,
  }
}

export const actions: Actions = {
  add: async ({ request }) => {
    const formData = await request.formData()
    const raw = {
      date: formData.get("date"),
      time: formData.get("time"),
      from: formData.get("from"),
      to: formData.get("to"),
      mode: formData.get("mode"),
      notes: formData.get("notes"),
    }

    const parsed = calendarAddSchema.safeParse(raw)
    if (!parsed.success) return fail(400, { errors: parsed.error.flatten().fieldErrors })

    const newActivity: Activity = {
      id: Date.now().toString(),
      date: parsed.data.date,
      time: parsed.data.time,
      from: parsed.data.from,
      to: parsed.data.to,
      mode: parsed.data.mode,
      notes: parsed.data.notes,
    }

    activities = [...activities, newActivity]
    return { success: true }
  },
}
