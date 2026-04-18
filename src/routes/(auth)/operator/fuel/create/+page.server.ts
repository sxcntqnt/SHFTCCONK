import type { Actions } from "./$types"
import { fail } from "@sveltejs/kit"
import { fuelAddSchema } from "$lib/security/wallet.schema"

export const actions: Actions = {
  addFuel: async ({ request, locals }) => {
    const formData = await request.formData()
    const raw = {
      date: formData.get("date"),
      vehicleId: formData.get("vehicleId"),
      odometer: formData.get("odometer"),
      liters: formData.get("liters"),
      pricePerLiter: formData.get("pricePerLiter"),
      totalCost: formData.get("totalCost"),
      notes: formData.get("notes"),
    }

    const parsed = fuelAddSchema.safeParse(raw)
    if (!parsed.success) return fail(400, { errors: parsed.error.flatten().fieldErrors })

    const entry = {
      date: parsed.data.date,
      vehicleId: parsed.data.vehicleId,
      odometer: parsed.data.odometer,
      liters: parsed.data.liters,
      pricePerLiter: parsed.data.pricePerLiter,
      totalCost: parsed.data.totalCost,
      notes: parsed.data.notes,
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
