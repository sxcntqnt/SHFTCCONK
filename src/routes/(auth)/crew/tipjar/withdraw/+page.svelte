<script lang="ts">
  import { onMount } from "svelte"
  import { browser } from "$app/environment"
  import { page } from "$app/stores"
  import { authStore } from "$lib/features/auth/stores/auth"

  let user = $derived($authStore)
  let loading = $state(true)
  let mobileOpen = $state(false)
  let currentPath = $derived($page.url.pathname)

  // ── Types ──────────────────────────────────────────────────────────────────
  type WdrStatus = "completed" | "processing" | "failed"
  interface Withdrawal {
    id: string
    amount: number
    phone: string
    time: string
    date: string
    status: WdrStatus
    reference: string
  }

  // ── Balance (would come from $page.data in production) ─────────────────────
  let availableBalance = $state(450) // totalReceived - totalWithdrawn

  // ── Withdrawal history ─────────────────────────────────────────────────────
  let withdrawals = $state<Withdrawal[]>([
    {
      id: "WDR-001",
      amount: 500,
      phone: "07** *** 412",
      time: "14:00",
      date: "Last week",
      status: "completed",
      reference: "MPESABC12345",
    },
    {
      id: "WDR-002",
      amount: 800,
      phone: "07** *** 412",
      time: "09:30",
      date: "2 wks ago",
      status: "completed",
      reference: "MPESAXYZ98765",
    },
    {
      id: "WDR-003",
      amount: 200,
      phone: "07** *** 412",
      time: "11:00",
      date: "3 wks ago",
      status: "failed",
      reference: "MPESAERR00000",
    },
  ])

  // ── Step machine ───────────────────────────────────────────────────────────
  type Step = "form" | "confirm" | "processing" | "success" | "error"
  let step = $state<Step>("form")

  // ── Form state ─────────────────────────────────────────────────────────────
  let wAmount = $state("")
  let wPhone = $state(user?.phone ?? "")
  let wAmountErr = $state("")
  let wPhoneErr = $state("")

  const MPESA_MIN = 10
  const mpesaFee = (amt: number) =>
    amt <= 100 ? 0 : amt <= 500 ? 6 : amt <= 1000 ? 11 : amt <= 1500 ? 15 : 20

  let parsedAmt = $derived(Number(wAmount) || 0)
  let fee = $derived(parsedAmt >= MPESA_MIN ? mpesaFee(parsedAmt) : 0)
  let netAmt = $derived(Math.max(0, parsedAmt - fee))
  let latestRef = $state("")

  function setQuick(amt: number) {
    wAmount = String(Math.min(amt, availableBalance))
    wAmountErr = ""
  }

  function validate(): boolean {
    let ok = true
    wAmountErr = ""
    wPhoneErr = ""
    if (!wAmount || parsedAmt < MPESA_MIN) {
      wAmountErr = `Minimum withdrawal is KES ${MPESA_MIN}`
      ok = false
    } else if (parsedAmt > availableBalance) {
      wAmountErr = `Exceeds available balance (KES ${availableBalance.toLocaleString()})`
      ok = false
    }
    const clean = wPhone.replace(/\s/g, "")
    if (!clean || !/^0[17]\d{8}$/.test(clean)) {
      wPhoneErr = "Enter a valid Safaricom number (07xxxxxxxx or 01xxxxxxxx)"
      ok = false
    }
    return ok
  }

  function goConfirm() {
    if (validate()) step = "confirm"
  }

  async function executeWithdraw() {
    step = "processing"
    await new Promise((r) => setTimeout(r, 2200))
    const ref = "MPESA" + Math.random().toString(36).slice(2, 10).toUpperCase()
    latestRef = ref
    const maskedPhone = wPhone.replace(/(\d{4})\d{3}(\d{3})/, "$1***$2")
    withdrawals = [
      {
        id: `WDR-00${withdrawals.length + 1}`,
        amount: parsedAmt,
        phone: maskedPhone,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        date: "Today",
        status: "completed",
        reference: ref,
      },
      ...withdrawals,
    ]
    availableBalance = Math.max(0, availableBalance - parsedAmt)
    step = "success"
  }

  function reset() {
    wAmount = ""
    wPhone = user?.phone ?? ""
    wAmountErr = ""
    wPhoneErr = ""
    step = "form"
  }

  // ── Nav ────────────────────────────────────────────────────────────────────
  let openIncidents = $state(1)
  let newTips = $state(3)
  const navItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      href: "/dashboard",
      badge: () => 0,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    },
    {
      key: "incidents",
      label: "Incidents",
      href: "/incidents",
      badge: () => openIncidents,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    },
    {
      key: "tipjar",
      label: "Tip Jar",
      href: "/tipjar",
      badge: () => newTips,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
    },
  ]
  function isActive(href: string) {
    return href === "/tipjar"
      ? currentPath.startsWith("/tipjar")
      : currentPath === href
  }
  function initials(n?: string | null) {
    return !n
      ? "?"
      : n
          .split(" ")
          .map((w: string) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
  }

  onMount(() => {
    if (browser) setTimeout(() => (loading = false), 300)
  })
</script>

<svelte:head><title>Withdraw Funds — Matatu Pulse</title></svelte:head>

<!-- Mobile overlay -->
<div
  class="m-overlay {mobileOpen ? 'open' : ''}"
  onclick={() => (mobileOpen = false)}
>
  <div class="m-panel" onclick={(e) => e.stopPropagation()}>
    <div class="m-head">
      <div class="sb-logo" style="padding:0;border:none">
        <div class="logo-mark">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            stroke-width="2.5"
            ><rect x="1" y="3" width="15" height="13" /><path
              d="M16 8h4l3 3v5h-7z"
            /></svg
          >
        </div>
        <span class="logo-text">Matatu<span>PL</span></span>
      </div>
      <button class="close-x" onclick={() => (mobileOpen = false)}>✕</button>
    </div>
    <span class="role-badge" style="margin:14px 14px 0"
      ><span class="role-dot"></span>Crew</span
    >
    <p class="sec-label">Navigation</p>
    <nav class="sb-nav">
      {#each navItems as item}
        <a
          href={item.href}
          class="nav-link {isActive(item.href) ? 'active' : ''}"
          onclick={() => (mobileOpen = false)}
        >
          {@html item.icon}{item.label}
          {#if item.badge()}<span class="nav-badge">{item.badge()}</span>{/if}
        </a>
      {/each}
    </nav>
  </div>
</div>

<div class="shell">
  <aside class="sidebar">
    <div class="sb-logo">
      <div class="logo-mark">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          stroke-width="2.5"
          ><rect x="1" y="3" width="15" height="13" /><path
            d="M16 8h4l3 3v5h-7z"
          /></svg
        >
      </div>
      <span class="logo-text">Matatu<span>PL</span></span>
    </div>
    <span class="role-badge"><span class="role-dot"></span>Crew</span>
    <p class="sec-label">Navigation</p>
    <nav class="sb-nav">
      {#each navItems as item}
        <a
          href={item.href}
          class="nav-link {isActive(item.href) ? 'active' : ''}"
        >
          {@html item.icon}{item.label}
          {#if item.badge()}<span class="nav-badge">{item.badge()}</span>{/if}
        </a>
      {/each}
    </nav>
    <div class="sb-footer">
      {#if user}
        <div class="user-card">
          <div class="user-av">{initials(user.fullName)}</div>
          <div>
            <div class="user-name">{user.fullName ?? "Crew Member"}</div>
            <div class="user-role-lbl">Driver / Conductor</div>
          </div>
        </div>
      {/if}
      <a href="/account/sign_out" class="sign-out">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          ><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline
            points="16 17 21 12 16 7"
          /><line x1="21" y1="12" x2="9" y2="12" /></svg
        >
        Sign Out
      </a>
    </div>
  </aside>

  <div class="main">
    <div class="topbar">
      <div class="tb-left">
        <button class="hamburger" onclick={() => (mobileOpen = true)}>
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            ><line x1="3" y1="6" x2="21" y2="6" /><line
              x1="3"
              y1="12"
              x2="21"
              y2="12"
            /><line x1="3" y1="18" x2="21" y2="18" /></svg
          >
        </button>
        <nav class="breadcrumb">
          <a href="/dashboard">Dashboard</a><span class="bc-sep">›</span>
          <a href="/tipjar">Tip Jar</a><span class="bc-sep">›</span>
          <span class="bc-cur">Withdraw</span>
        </nav>
      </div>
      <div class="shift-pill"><span class="shift-dot"></span>On Shift</div>
    </div>

    <div class="content">
      {#if loading}
        <div class="loading"><span class="spinner"></span>Loading…</div>
      {:else}
        <a href="/tipjar" class="back-link">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"><polyline points="15 18 9 12 15 6" /></svg
          >
          Back to Tip Jar
        </a>

        <div class="page-hd">
          <div class="eyebrow">
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              ><line x1="12" y1="5" x2="12" y2="19" /><polyline
                points="19 12 12 19 5 12"
              /></svg
            >
            M-Pesa Withdrawal
          </div>
          <h1 class="page-title">Withdraw <em>Funds</em></h1>
          <p class="page-sub">
            Transfer your tip balance to M-Pesa. Funds arrive within 5 minutes.
          </p>
        </div>

        <!-- Summary strip -->
        <div class="summary-strip">
          <div class="sum-chip">
            <div class="sum-label">Available</div>
            <div class="sum-val" style="color:var(--teal)">
              KES {availableBalance.toLocaleString()}
            </div>
          </div>
          <div class="sum-chip">
            <div class="sum-label">Total Withdrawn</div>
            <div class="sum-val">
              KES {withdrawals
                .filter((w) => w.status === "completed")
                .reduce((s, w) => s + w.amount, 0)
                .toLocaleString()}
            </div>
          </div>
          <div class="sum-chip">
            <div class="sum-label">Transactions</div>
            <div class="sum-val">{withdrawals.length}</div>
          </div>
        </div>

        <div class="page-layout">
          <!-- Left: step flow -->
          <div>
            <!-- Step progress bar -->
            {#if step !== "processing"}
              <div class="step-bar">
                {#each [{ id: "form", label: "Amount" }, { id: "confirm", label: "Confirm" }, { id: "success", label: "Done" }] as s, i}
                  {@const state =
                    step === s.id
                      ? "active"
                      : (step === "success" && i < 2) ||
                          (step === "confirm" && i < 1)
                        ? "done"
                        : "idle"}
                  {#if i > 0}<div
                      class="step-connector {state === 'done' ||
                      (step === 'confirm' && i === 1) ||
                      step === 'success'
                        ? 'done'
                        : ''}"
                    ></div>{/if}
                  <div class="step-item {state}">
                    <div class="step-num">
                      {#if state === "done"}<svg
                          width="10"
                          height="10"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="3"
                          ><polyline points="20 6 9 17 4 12" /></svg
                        >
                      {:else}{i + 1}{/if}
                    </div>
                    <span class="step-label">{s.label}</span>
                  </div>
                {/each}
              </div>
            {/if}

            <!-- ── STEP: FORM ── -->
            {#if step === "form"}
              <div class="wdr-card">
                <div class="form-body">
                  <div class="avail-chip">
                    <span class="avail-label">Available Balance</span>
                    <span class="avail-val"
                      >KES {availableBalance.toLocaleString()}</span
                    >
                  </div>

                  <!-- Quick amounts -->
                  <div class="field">
                    <span class="field-label">Quick Select</span>
                    <div class="quick-row">
                      {#each [50, 100, 250, 500] as amt}
                        <button
                          class="quick-btn"
                          disabled={amt > availableBalance}
                          onclick={() => setQuick(amt)}>KES {amt}</button
                        >
                      {/each}
                      <button
                        class="quick-btn"
                        disabled={availableBalance < 10}
                        onclick={() => setQuick(availableBalance)}>All</button
                      >
                    </div>
                  </div>

                  <!-- Amount input -->
                  <div class="field">
                    <label class="field-label" for="w-amount"
                      >Withdrawal Amount (KES)</label
                    >
                    <input
                      id="w-amount"
                      type="number"
                      class="field-input {wAmountErr ? 'err' : ''}"
                      placeholder="Enter amount"
                      min={10}
                      max={availableBalance}
                      bind:value={wAmount}
                    />
                    {#if wAmountErr}<span class="field-err">{wAmountErr}</span
                      >{/if}

                    {#if parsedAmt >= MPESA_MIN}
                      <div class="fee-box">
                        <div class="fee-row">
                          <span>Withdrawal amount</span><span class="fee-val"
                            >KES {parsedAmt.toLocaleString()}</span
                          >
                        </div>
                        <div class="fee-row">
                          <span>M-Pesa transaction fee</span><span
                            class="fee-val">− KES {fee}</span
                          >
                        </div>
                        <div class="fee-row total">
                          <span>You will receive</span><span
                            class="fee-val"
                            style="color:var(--teal)"
                            >KES {netAmt.toLocaleString()}</span
                          >
                        </div>
                      </div>
                    {/if}
                  </div>

                  <!-- Phone -->
                  <div class="field">
                    <label class="field-label" for="w-phone"
                      >M-Pesa Phone Number</label
                    >
                    <input
                      id="w-phone"
                      type="tel"
                      class="field-input {wPhoneErr ? 'err' : ''}"
                      placeholder="e.g. 0712345678"
                      bind:value={wPhone}
                    />
                    {#if wPhoneErr}<span class="field-err">{wPhoneErr}</span
                      >{/if}
                  </div>

                  <!-- Info note -->
                  <div
                    style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:11px;padding:11px 13px;font-size:0.76rem;color:var(--text-3);line-height:1.6;display:flex;align-items:flex-start;gap:8px"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      style="flex-shrink:0;margin-top:1px;color:var(--teal)"
                      ><circle cx="12" cy="12" r="10" /><line
                        x1="12"
                        y1="8"
                        x2="12"
                        y2="12"
                      /><line x1="12" y1="16" x2="12.01" y2="16" /></svg
                    >
                    Withdrawals are processed instantly via M-Pesa. The transaction
                    fee is charged by Safaricom and deducted from your amount.
                  </div>
                </div>
                <div class="form-footer">
                  <a href="/tipjar" class="btn-back">
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      ><polyline points="15 18 9 12 15 6" /></svg
                    >
                    Cancel
                  </a>
                  <button
                    class="btn-primary"
                    onclick={goConfirm}
                    disabled={availableBalance < 10}
                  >
                    Continue
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      ><polyline points="9 18 15 12 9 6" /></svg
                    >
                  </button>
                </div>
              </div>

              <!-- ── STEP: CONFIRM ── -->
            {:else if step === "confirm"}
              <div class="wdr-card">
                <div class="form-body">
                  <div style="margin-bottom:18px">
                    <div
                      style="font-size:0.6rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-3);margin-bottom:5px"
                    >
                      Review your withdrawal
                    </div>
                    <div
                      style="font-size:0.84rem;color:var(--text-3);line-height:1.6"
                    >
                      Please confirm the details below before proceeding. This
                      action cannot be reversed once M-Pesa processes the
                      transaction.
                    </div>
                  </div>

                  <div class="confirm-table">
                    <div class="ctr">
                      <span class="ct-key">Withdrawal amount</span><span
                        class="ct-val">KES {parsedAmt.toLocaleString()}</span
                      >
                    </div>
                    <div class="ctr">
                      <span class="ct-key">M-Pesa fee</span><span class="ct-val"
                        >KES {fee}</span
                      >
                    </div>
                    <div class="ctr" style="background:rgba(0,176,155,0.04)">
                      <span class="ct-key">You will receive</span><span
                        class="ct-val hi">KES {netAmt.toLocaleString()}</span
                      >
                    </div>
                    <div class="ctr">
                      <span class="ct-key">Send to</span><span class="ct-val"
                        >{wPhone}</span
                      >
                    </div>
                    <div class="ctr">
                      <span class="ct-key">Remaining balance</span><span
                        class="ct-val"
                        >KES {(
                          availableBalance - parsedAmt
                        ).toLocaleString()}</span
                      >
                    </div>
                  </div>

                  <p class="confirm-note">
                    By tapping "Confirm & Send" you authorise this withdrawal to
                    the number shown above. Matatu Pulse is not responsible for
                    funds sent to an incorrect number.
                  </p>
                </div>
                <div class="form-footer">
                  <button class="btn-back" onclick={() => (step = "form")}>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      ><polyline points="15 18 9 12 15 6" /></svg
                    >
                    Edit
                  </button>
                  <button class="btn-primary" onclick={executeWithdraw}>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      ><polyline points="20 6 9 17 4 12" /></svg
                    >
                    Confirm & Send
                  </button>
                </div>
              </div>

              <!-- ── STEP: PROCESSING ── -->
            {:else if step === "processing"}
              <div class="wdr-card">
                <div class="center-state">
                  <div class="mpesa-orb">M</div>
                  <div class="cs-title">Processing your withdrawal…</div>
                  <div class="cs-sub">
                    Sending KES {parsedAmt.toLocaleString()} to {wPhone} via M-Pesa.
                    Please do not close this page.
                  </div>
                  <div class="big-spin"></div>
                </div>
              </div>

              <!-- ── STEP: SUCCESS ── -->
            {:else if step === "success"}
              <div class="wdr-card">
                <div class="center-state">
                  <div class="success-orb">
                    <svg
                      width="30"
                      height="30"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#4ade80"
                      stroke-width="2.5"
                      ><polyline points="20 6 9 17 4 12" /></svg
                    >
                  </div>
                  <div class="success-title">Withdrawal Successful!</div>
                  <div class="success-amt">KES {netAmt.toLocaleString()}</div>
                  <div class="success-ref">{latestRef}</div>
                  <div class="success-sub">
                    Sent to {wPhone}. You should receive an M-Pesa confirmation
                    SMS within a few seconds.
                  </div>
                  <div class="success-actions">
                    <button class="btn-back" onclick={reset}>
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        ><line x1="12" y1="5" x2="12" y2="19" /><polyline
                          points="19 12 12 19 5 12"
                        /></svg
                      >
                      Withdraw Again
                    </button>
                    <a
                      href="/tipjar"
                      class="btn-primary"
                      style="text-decoration:none"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        ><path
                          d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"
                        /></svg
                      >
                      Back to Tip Jar
                    </a>
                  </div>
                </div>
              </div>
            {/if}
          </div>

          <!-- Right: withdrawal history -->
          <div>
            <div class="hist-card">
              <div class="hist-hd">
                <div class="hist-ey">M-Pesa</div>
                <div class="hist-ti">Withdrawal History</div>
              </div>
              {#if withdrawals.length === 0}
                <div
                  style="text-align:center;padding:32px 20px;color:var(--text-3)"
                >
                  <svg
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.5"
                    style="opacity:0.15;margin-bottom:10px"
                    ><line x1="12" y1="5" x2="12" y2="19" /><polyline
                      points="19 12 12 19 5 12"
                    /></svg
                  >
                  <div
                    style="font-size:0.85rem;font-weight:600;color:var(--text-2);margin-bottom:4px"
                  >
                    No withdrawals yet
                  </div>
                  <div style="font-size:0.75rem">
                    Your first withdrawal will appear here.
                  </div>
                </div>
              {:else}
                <div class="hist-list">
                  {#each withdrawals as wdr}
                    {@const isOk = wdr.status === "completed"}
                    {@const isFail = wdr.status === "failed"}
                    {@const col = isOk
                      ? "#4ade80"
                      : isFail
                        ? "#f87171"
                        : "#facc15"}
                    <div class="wdr-row">
                      <div
                        class="wdr-icon"
                        style="background:color-mix(in srgb,{col} 12%,transparent);border:1px solid color-mix(in srgb,{col} 28%,transparent)"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={col}
                          stroke-width="2.5"
                        >
                          {#if isOk}<polyline points="20 6 9 17 4 12" />
                          {:else if isFail}<line
                              x1="18"
                              y1="6"
                              x2="6"
                              y2="18"
                            /><line x1="6" y1="6" x2="18" y2="18" />
                          {:else}<circle cx="12" cy="12" r="10" /><line
                              x1="12"
                              y1="8"
                              x2="12"
                              y2="12"
                            /><line x1="12" y1="16" x2="12.01" y2="16" />{/if}
                        </svg>
                      </div>
                      <div class="wdr-info">
                        <div class="wdr-ref">{wdr.reference}</div>
                        <div class="wdr-meta">
                          {wdr.phone} · {wdr.date} at {wdr.time}
                        </div>
                      </div>
                      <div class="wdr-right">
                        <div class="wdr-amt">
                          KES {wdr.amount.toLocaleString()}
                        </div>
                        <div class="wdr-status" style="color:{col}">
                          {wdr.status}
                        </div>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  /* ── Shell / Sidebar (shared pattern) ── */
  .shell {
    display: flex;
    min-height: 100vh;
    background: var(--ink);
    font-family: var(--font-body);
  }
  .sidebar {
    width: 228px;
    flex-shrink: 0;
    background: var(--ink-2);
    border-right: 1px solid var(--rim);
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
    scrollbar-width: none;
  }
  .sidebar::-webkit-scrollbar {
    display: none;
  }
  .sb-logo {
    padding: 22px 20px 16px;
    border-bottom: 1px solid var(--rim);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .logo-mark {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: linear-gradient(135deg, var(--teal), #005c52);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .logo-text {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }
  .logo-text span {
    color: var(--orange);
  }
  .role-badge {
    margin: 14px 14px 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: rgba(0, 176, 155, 0.09);
    border: 1px solid rgba(0, 176, 155, 0.2);
    border-radius: 100px;
    font-size: 0.58rem;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--teal);
  }
  .role-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--teal);
    animation: blink 2s infinite;
  }
  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.3;
    }
  }
  .sec-label {
    padding: 18px 20px 7px;
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-3);
  }
  .sb-nav {
    padding: 2px 10px;
    flex: 1;
  }
  .nav-link {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-2);
    text-decoration: none;
    margin-bottom: 2px;
    border: 1px solid transparent;
    transition:
      background 0.15s,
      color 0.15s,
      border-color 0.15s;
    position: relative;
  }
  .nav-link :global(svg) {
    flex-shrink: 0;
    opacity: 0.5;
    transition: opacity 0.15s;
  }
  .nav-link:hover {
    background: var(--rim);
    color: var(--text-1);
  }
  .nav-link:hover :global(svg) {
    opacity: 0.9;
  }
  .nav-link.active {
    background: rgba(0, 176, 155, 0.09);
    border-color: rgba(0, 176, 155, 0.2);
    color: var(--teal);
    font-weight: 600;
  }
  .nav-link.active :global(svg) {
    opacity: 1;
  }
  .nav-link.active::before {
    content: "";
    position: absolute;
    left: -10px;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 18px;
    border-radius: 0 3px 3px 0;
    background: var(--teal);
  }
  .nav-badge {
    margin-left: auto;
    min-width: 18px;
    height: 18px;
    border-radius: 9px;
    background: var(--orange);
    font-size: 0.6rem;
    font-weight: 800;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
  }
  .sb-footer {
    padding: 12px 10px;
    border-top: 1px solid var(--rim);
    flex-shrink: 0;
  }
  .user-card {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 9px 11px;
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    margin-bottom: 6px;
  }
  .user-av {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    flex-shrink: 0;
    background: linear-gradient(135deg, var(--teal), #005c52);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.68rem;
    font-weight: 800;
    color: #fff;
  }
  .user-name {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--text-1);
  }
  .user-role-lbl {
    font-size: 0.6rem;
    color: var(--text-3);
  }
  .sign-out {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 11px;
    border-radius: 9px;
    background: none;
    border: none;
    font-family: var(--font-body);
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--text-3);
    cursor: pointer;
    text-decoration: none;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .sign-out:hover {
    background: rgba(239, 68, 68, 0.08);
    color: #f87171;
  }
  .m-overlay {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.72);
    backdrop-filter: blur(6px);
  }
  .m-overlay.open {
    display: block;
  }
  .m-panel {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 228px;
    background: var(--ink-2);
    border-right: 1px solid var(--rim);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }
  .m-head {
    padding: 18px;
    border-bottom: 1px solid var(--rim);
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
  }
  .close-x {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--rim);
    border: none;
    cursor: pointer;
    color: var(--text-2);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
  }
  .close-x:hover {
    background: var(--rim-2);
  }
  .main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }
  .topbar {
    height: 52px;
    padding: 0 32px;
    border-bottom: 1px solid var(--rim);
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(10, 10, 12, 0.75);
    backdrop-filter: blur(16px);
    position: sticky;
    top: 0;
    z-index: 10;
    flex-shrink: 0;
  }
  .tb-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .hamburger {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-2);
    padding: 5px;
    border-radius: 8px;
    transition:
      background 0.15s,
      color 0.15s;
  }
  .hamburger:hover {
    background: var(--rim);
    color: var(--text-1);
  }
  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.78rem;
    color: var(--text-3);
  }
  .breadcrumb a {
    color: var(--text-3);
    text-decoration: none;
    transition: color 0.15s;
  }
  .breadcrumb a:hover {
    color: var(--text-2);
  }
  .bc-sep {
    opacity: 0.35;
  }
  .bc-cur {
    color: var(--text-1);
    font-weight: 500;
  }
  .shift-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 11px;
    background: rgba(0, 176, 155, 0.08);
    border: 1px solid rgba(0, 176, 155, 0.15);
    border-radius: 100px;
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--teal);
  }
  .shift-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--teal);
    animation: pulse-s 2s ease-out infinite;
  }
  @keyframes pulse-s {
    0% {
      box-shadow: 0 0 0 0 rgba(0, 176, 155, 0.5);
    }
    70% {
      box-shadow: 0 0 0 5px rgba(0, 176, 155, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(0, 176, 155, 0);
    }
  }
  .content {
    flex: 1;
    padding: 36px 40px;
  }

  /* ── Page chrome ── */
  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-3);
    text-decoration: none;
    margin-bottom: 22px;
    transition: color 0.15s;
  }
  .back-link:hover {
    color: var(--text-1);
  }
  .page-hd {
    margin-bottom: 28px;
  }
  .eyebrow {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--teal);
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 7px;
  }
  .page-title {
    font-family: var(--font-display);
    font-size: clamp(1.5rem, 2.5vw, 2rem);
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1.1;
    color: var(--text-1);
    margin-bottom: 5px;
  }
  .page-title em {
    font-style: normal;
    color: var(--teal);
  }
  .page-sub {
    font-size: 0.875rem;
    color: var(--text-3);
    line-height: 1.6;
  }

  /* ── Layout ── */
  .page-layout {
    display: grid;
    grid-template-columns: 480px 1fr;
    gap: 24px;
    align-items: start;
  }

  /* ── Step progress ── */
  .step-bar {
    display: flex;
    align-items: center;
    gap: 0;
    margin-bottom: 28px;
  }
  .step-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.72rem;
    font-weight: 600;
  }
  .step-num {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.62rem;
    font-weight: 800;
    flex-shrink: 0;
    transition: all 0.3s;
  }
  .step-item.done .step-num {
    background: var(--teal);
    color: #fff;
    border: none;
  }
  .step-item.active .step-num {
    background: rgba(0, 176, 155, 0.15);
    color: var(--teal);
    border: 2px solid var(--teal);
  }
  .step-item.idle .step-num {
    background: rgba(255, 255, 255, 0.04);
    color: var(--text-3);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .step-item.done .step-label {
    color: var(--teal);
  }
  .step-item.active .step-label {
    color: var(--text-1);
    font-weight: 700;
  }
  .step-item.idle .step-label {
    color: var(--text-3);
  }
  .step-connector {
    flex: 1;
    height: 1px;
    background: rgba(255, 255, 255, 0.08);
    margin: 0 10px;
  }
  .step-connector.done {
    background: var(--teal);
    opacity: 0.5;
  }

  /* ── Card shell ── */
  .wdr-card {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 20px;
    overflow: hidden;
  }
  .wdr-card::before {
    content: "";
    display: block;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.06),
      transparent
    );
  }

  /* ── Balance chip ── */
  .avail-chip {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: rgba(0, 176, 155, 0.07);
    border: 1px solid rgba(0, 176, 155, 0.18);
    border-radius: 12px;
    margin-bottom: 20px;
  }
  .avail-label {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--teal);
  }
  .avail-val {
    font-family: var(--font-display);
    font-size: 1.3rem;
    font-weight: 800;
    color: var(--teal);
    letter-spacing: -0.03em;
  }

  /* ── Form fields ── */
  .form-body {
    padding: 24px;
  }
  .field {
    margin-bottom: 18px;
  }
  .field-label {
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 8px;
    display: block;
  }
  .field-input {
    width: 100%;
    padding: 11px 14px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 11px;
    font-family: var(--font-body);
    font-size: 0.9rem;
    color: var(--text-1);
    transition:
      border-color 0.15s,
      background 0.15s;
    box-sizing: border-box;
  }
  .field-input:focus {
    outline: none;
    border-color: rgba(0, 176, 155, 0.45);
    background: rgba(255, 255, 255, 0.06);
  }
  .field-input.err {
    border-color: rgba(248, 113, 113, 0.5);
  }
  .field-err {
    font-size: 0.66rem;
    color: #f87171;
    margin-top: 4px;
    display: block;
  }

  /* Quick amounts */
  .quick-row {
    display: flex;
    gap: 8px;
    margin-bottom: 6px;
    flex-wrap: wrap;
  }
  .quick-btn {
    padding: 5px 13px;
    border-radius: 9px;
    font-size: 0.72rem;
    font-weight: 700;
    border: 1px solid rgba(0, 176, 155, 0.22);
    background: rgba(0, 176, 155, 0.06);
    color: var(--teal);
    cursor: pointer;
    transition: all 0.15s;
    font-family: var(--font-body);
  }
  .quick-btn:hover:not(:disabled) {
    background: rgba(0, 176, 155, 0.14);
  }
  .quick-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }

  /* Fee breakdown */
  .fee-box {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 12px;
    padding: 13px 15px;
    margin-top: 10px;
  }
  .fee-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.78rem;
    color: var(--text-3);
    padding: 3px 0;
  }
  .fee-row.total {
    border-top: 1px solid rgba(255, 255, 255, 0.07);
    margin-top: 5px;
    padding-top: 8px;
    color: var(--text-1);
    font-weight: 700;
  }
  .fee-val {
    font-weight: 600;
  }

  /* Form footer buttons */
  .form-footer {
    padding: 0 24px 24px;
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }
  .btn-back {
    padding: 10px 18px;
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-family: var(--font-body);
    font-size: 0.84rem;
    font-weight: 600;
    color: var(--text-2);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    text-decoration: none;
    transition: all 0.15s;
  }
  .btn-back:hover {
    background: rgba(255, 255, 255, 0.09);
  }
  .btn-primary {
    padding: 10px 24px;
    border-radius: 11px;
    background: var(--teal);
    border: none;
    font-family: var(--font-body);
    font-size: 0.84rem;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 7px;
    transition: all 0.15s;
    box-shadow: 0 3px 16px rgba(0, 176, 155, 0.28);
  }
  .btn-primary:hover:not(:disabled) {
    background: #009a88;
    transform: translateY(-1px);
  }
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: default;
    transform: none;
    box-shadow: none;
  }

  /* ── Confirm step ── */
  .confirm-table {
    background: rgba(0, 176, 155, 0.05);
    border: 1px solid rgba(0, 176, 155, 0.15);
    border-radius: 14px;
    overflow: hidden;
    margin-bottom: 16px;
  }
  .ctr {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    font-size: 0.84rem;
  }
  .ctr:last-child {
    border-bottom: none;
  }
  .ct-key {
    color: var(--text-3);
    font-weight: 500;
  }
  .ct-val {
    color: var(--text-1);
    font-weight: 700;
  }
  .ct-val.hi {
    color: var(--teal);
    font-size: 1rem;
    font-family: var(--font-display);
    letter-spacing: -0.02em;
  }
  .confirm-note {
    font-size: 0.75rem;
    color: var(--text-3);
    line-height: 1.65;
  }

  /* ── Processing step ── */
  .center-state {
    text-align: center;
    padding: 44px 24px;
  }
  .mpesa-orb {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: linear-gradient(135deg, #00a651, #007a3d);
    margin: 0 auto 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 900;
    font-size: 1rem;
    color: #fff;
    letter-spacing: -0.03em;
    box-shadow: 0 6px 28px rgba(0, 166, 81, 0.35);
  }
  .cs-title {
    font-family: var(--font-display);
    font-size: 1.2rem;
    font-weight: 800;
    color: var(--text-1);
    margin-bottom: 7px;
  }
  .cs-sub {
    font-size: 0.82rem;
    color: var(--text-3);
    line-height: 1.6;
    max-width: 300px;
    margin: 0 auto;
  }
  .big-spin {
    width: 44px;
    height: 44px;
    border: 3px solid rgba(0, 176, 155, 0.2);
    border-top-color: var(--teal);
    border-radius: 50%;
    animation: spin 0.85s linear infinite;
    margin: 22px auto 0;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* ── Success step ── */
  .success-orb {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    background: linear-gradient(
      135deg,
      rgba(74, 222, 128, 0.15),
      rgba(74, 222, 128, 0.04)
    );
    border: 2px solid rgba(74, 222, 128, 0.35);
    margin: 0 auto 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .success-amt {
    font-family: var(--font-display);
    font-size: 2.4rem;
    font-weight: 900;
    letter-spacing: -0.06em;
    color: var(--text-1);
    margin-bottom: 4px;
  }
  .success-ref {
    font-size: 0.72rem;
    font-family: monospace;
    color: var(--text-3);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 5px 12px;
    border-radius: 8px;
    display: inline-block;
    margin-bottom: 10px;
  }
  .success-title {
    font-family: var(--font-display);
    font-size: 1.15rem;
    font-weight: 800;
    color: #4ade80;
    margin-bottom: 6px;
  }
  .success-sub {
    font-size: 0.8rem;
    color: var(--text-3);
    line-height: 1.65;
    max-width: 280px;
    margin: 0 auto 22px;
  }
  .success-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
    flex-wrap: wrap;
  }

  /* ── Withdrawal history ── */
  .hist-card {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    overflow: hidden;
  }
  .hist-card::before {
    content: "";
    display: block;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.05),
      transparent
    );
  }
  .hist-hd {
    padding: 16px 20px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  .hist-ey {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 3px;
  }
  .hist-ti {
    font-family: var(--font-display);
    font-size: 0.92rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }
  .hist-list {
    padding: 10px 12px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .wdr-row {
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 12px 10px;
    border-radius: 11px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
  }
  .wdr-icon {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .wdr-info {
    flex: 1;
    min-width: 0;
  }
  .wdr-ref {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--text-1);
    font-family: monospace;
  }
  .wdr-meta {
    font-size: 0.62rem;
    color: var(--text-3);
    margin-top: 2px;
  }
  .wdr-right {
    text-align: right;
    flex-shrink: 0;
  }
  .wdr-amt {
    font-family: var(--font-display);
    font-size: 0.95rem;
    font-weight: 800;
    color: var(--text-1);
  }
  .wdr-status {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    margin-top: 2px;
  }

  /* ── Summary chips below hero ── */
  .summary-strip {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 10px;
    margin-bottom: 24px;
  }
  .sum-chip {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 13px;
    padding: 13px 15px;
  }
  .sum-label {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 5px;
  }
  .sum-val {
    font-family: var(--font-display);
    font-size: 1.4rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1;
    color: var(--text-1);
  }

  /* ── Loading ── */
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    gap: 10px;
    color: var(--text-3);
    font-size: 0.82rem;
  }
  .spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255, 255, 255, 0.07);
    border-top-color: var(--teal);
    border-radius: 50%;
    animation: spin 0.65s linear infinite;
  }

  @media (max-width: 1100px) {
    .page-layout {
      grid-template-columns: 1fr;
    }
  }
  @media (max-width: 1024px) {
    .sidebar {
      display: none;
    }
    .hamburger {
      display: flex;
    }
    .topbar {
      padding: 0 20px;
    }
    .content {
      padding: 26px 20px;
    }
  }
  @media (max-width: 640px) {
    .summary-strip {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
