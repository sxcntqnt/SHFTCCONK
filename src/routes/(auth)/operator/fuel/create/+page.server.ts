import type { Actions } from "./$types"
import { fail } from "@sveltejs/kit"

export const actions: Actions = {
  addFuel: async ({ request, locals }) => {
    const formData = await request.formData()

    const entry = {
      date: formData.get("date") as string,
      vehicleId: formData.get("vehicleId") as string,
      odometer: Number(formData.get("odometer")),
      liters: Number(formData.get("liters")),
      pricePerLiter: Number(formData.get("pricePerLiter")),
      totalCost: Number(formData.get("totalCost")),
      notes: (formData.get("notes") as string) || null,
      // Add real user/organization context from session/auth
      // userId: locals.user?.id,
      // organizationId: locals.user?.organizationId,
    }

    // Basic validation
    if (!entry.date || !entry.vehicleId || !entry.liters || entry.liters <= 0) {
      return fail(400, { message: "Required fields missing or invalid" })
    }

    try {
      // await prisma.fuelEntry.create({ data: entry });
      console.log("Fuel entry would be saved:", entry)

      return { success: true }
    } catch (err) {
      console.error("Save error:", err)
      return fail(500, { message: "Failed to save fuel entry" })
    }
  },
}
