<!-- src/routes/(auth)/crew/wallet/+page.svelte -->
<script lang="ts">
  import WalletView from "$lib/components/WalletView.svelte"
  import { WALLET_CONFIGS, fmtKes } from "$lib/features/wallet/wallet.types"

  let { data, form } = $props()
  const {
    transactions,
    summary,
    crewType,
    perSeatShare,
    mpesaPhone,
    vehiclePlate,
  } = data

  const tipTotal = transactions
    .filter((t: any) => t.type === "tip_share" && t.status === "completed")
    .reduce((s: number, t: any) => s + t.amountKes, 0)

  const resTotal = transactions
    .filter((t: any) => t.type === "reservation_share")
    .reduce((s: number, t: any) => s + t.amountKes, 0)

  const bookingsServed = transactions.filter(
    (t: any) => t.type === "reservation_share",
  ).length

  const kpis = [
    {
      label: "From Tips",
      value: fmtKes(tipTotal),
      sub: `10% share per tip`,
    },
    {
      label: "Reservation Shares",
      value: fmtKes(resTotal),
      sub: `KES ${perSeatShare} per seat`,
    },
    {
      label: "Bookings Served",
      value: String(bookingsServed),
      sub: vehiclePlate ?? "No vehicle assigned",
    },
    {
      label: "Role",
      value: crewType === "DRIVER" ? "Driver" : "Conductor",
      sub: "Your crew position",
    },
  ]
</script>

<svelte:head>
  <title
    >{crewType === "DRIVER" ? "Driver" : "Conductor"} Wallet — Matatu Pulse</title
  >
</svelte:head>

<WalletView
  config={WALLET_CONFIGS.crew}
  {summary}
  {transactions}
  formResult={form}
  {kpis}
  {mpesaPhone}
/>
