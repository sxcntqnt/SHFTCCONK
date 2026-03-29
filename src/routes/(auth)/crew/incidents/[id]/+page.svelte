<script lang="ts">
  import { onMount } from "svelte"
  import { browser } from "$app/environment"
  import { page } from "$app/stores"
  import { goto } from "$app/navigation"
  import { authStore } from "$lib/features/auth/stores/auth"

  let user = $derived($authStore)
  let loading = $state(true)
  let mobileOpen = $state(false)
  let currentPath = $derived($page.url.pathname)
  let incidentId = $derived($page.params.id)

  // ── Types ──────────────────────────────────────────────────────────────────
  type IncidentStatus = "open" | "pending" | "resolved" | "escalated"
  type IncidentSeverity = "low" | "medium" | "high" | "critical"
  type UpdateRole = "crew" | "dispatcher" | "system"

  interface IncidentUpdate {
    time: string
    author: string
    role: UpdateRole
    message: string
  }
  interface Incident {
    id: string
    type: string
    category: string
    route: string
    vehicle: string
    location: string
    time: string
    date: string
    status: IncidentStatus
    severity: IncidentSeverity
    description: string
    updates: IncidentUpdate[]
    isNew?: boolean
  }

  // ── Mock store (in production this would be a $page.data load) ────────────
  const ALL_INCIDENTS: Incident[] = [
    {
      id: "INC-2024-001",
      type: "Passenger Dispute",
      category: "passenger",
      route: "58 Buru Buru → CBD",
      vehicle: "KCA 812G",
      location: "Near Kencom Stage",
      time: "09:14",
      date: "Today",
      status: "open",
      severity: "medium",
      isNew: true,
      description:
        "Passenger refused to pay the full fare and became verbally aggressive when asked to disembark. Several other passengers witnessed the altercation near Kencom stage. The individual was eventually removed by a bystander.",
      updates: [
        {
          time: "09:14",
          author: "James M.",
          role: "crew",
          message:
            "Incident reported — passenger dispute at Kencom stage. Passenger refused to pay and was verbally abusive.",
        },
        {
          time: "09:22",
          author: "Dispatch",
          role: "dispatcher",
          message:
            "Noted. Please proceed to next stage. AP officer has been alerted to the Kencom area.",
        },
      ],
    },
    {
      id: "INC-2024-002",
      type: "Vehicle Breakdown",
      category: "mechanical",
      route: "23 Ngong Rd → CBD",
      vehicle: "KBZ 045T",
      location: "Ngong Rd, near Prestige Plaza",
      time: "07:55",
      date: "Yesterday",
      status: "resolved",
      severity: "high",
      description:
        "Right front tyre blowout at speed on Ngong Road. Vehicle was safely brought to a halt at the roadside. No passenger injuries were reported. Recovery vehicle was dispatched from Westlands depot.",
      updates: [
        {
          time: "07:55",
          author: "Mary W.",
          role: "crew",
          message:
            "Tyre blowout — right front. Pulled over safely on Ngong Rd, no injuries.",
        },
        {
          time: "08:03",
          author: "Dispatch",
          role: "dispatcher",
          message:
            "Recovery unit dispatched from Westlands depot. ETA 20 minutes.",
        },
        {
          time: "08:28",
          author: "System",
          role: "system",
          message:
            "Recovery confirmed on scene. 18 passengers transferred to KBP 220K.",
        },
        {
          time: "09:15",
          author: "Dispatch",
          role: "dispatcher",
          message:
            "Vehicle towed to Westlands garage. Mechanic assessment scheduled for 14:00. Incident closed.",
        },
      ],
    },
    {
      id: "INC-2024-003",
      type: "Fare Discrepancy",
      category: "financial",
      route: "46 Rongai → CBD",
      vehicle: "KDA 317F",
      location: "Rongai Stage",
      time: "15:30",
      date: "Mon",
      status: "pending",
      severity: "low",
      description:
        "Cashless payment system double-charged two passengers at Rongai Stage. Both passengers provided M-Pesa confirmation screenshots clearly showing duplicate transactions of KES 80 each. Total discrepancy: KES 160.",
      updates: [
        {
          time: "15:30",
          author: "David K.",
          role: "crew",
          message:
            "Double charge reported — M-Pesa confirmations obtained from 2 passengers. Total overcharge KES 160.",
        },
        {
          time: "16:05",
          author: "Finance",
          role: "dispatcher",
          message:
            "Logged ticket #FIN-2024-089. Refunds will be processed to both numbers within 24 hours.",
        },
      ],
    },
    {
      id: "INC-2024-004",
      type: "Road Accident",
      category: "safety",
      route: "12 Eastleigh → City Hall",
      vehicle: "KCE 501M",
      location: "Moi Avenue / Haile Selassie Junction",
      time: "11:42",
      date: "Mon",
      status: "escalated",
      severity: "critical",
      description:
        "Side-swipe collision with a private Nissan X-Trail (KBX 441P) at the Moi Avenue / Haile Selassie junction. Minor damage to the left rear panel of our vehicle. No passenger injuries reported. Police arrived within 15 minutes. OB number: 045/2024.",
      updates: [
        {
          time: "11:42",
          author: "Peter O.",
          role: "crew",
          message:
            "Collision at Moi Ave junction with private vehicle KBX 441P. Stopped safely — police called.",
        },
        {
          time: "11:50",
          author: "Dispatch",
          role: "dispatcher",
          message:
            "Management alerted. Stay at scene until police have recorded all statements.",
        },
        {
          time: "12:15",
          author: "System",
          role: "system",
          message: "Police OB recorded: 045/2024. Scene cleared at 12:08.",
        },
        {
          time: "13:00",
          author: "Management",
          role: "dispatcher",
          message:
            "Escalated to Jubilee Insurance. Adjuster will visit Eastleigh depot tomorrow at 10:00.",
        },
        {
          time: "15:30",
          author: "Legal Dept",
          role: "dispatcher",
          message:
            "Driver and conductor to retain copies of OB. Do not speak to third-party insurers without legal sign-off.",
        },
      ],
    },
    {
      id: "INC-2024-005",
      type: "Overloading Report",
      category: "safety",
      route: "58 Buru Buru → CBD",
      vehicle: "KCA 812G",
      location: "Buru Buru Stage",
      time: "06:30",
      date: "Sun",
      status: "resolved",
      severity: "medium",
      description:
        "Vehicle was flagged by NTSA officers at Buru Buru Stage for carrying passengers beyond the licensed 14-seat capacity. Fine of KES 5,000 was issued. Excess passengers (3) offloaded safely before proceeding.",
      updates: [
        {
          time: "06:30",
          author: "James M.",
          role: "crew",
          message:
            "NTSA stop at Buru Buru — overloading flag. 3 excess passengers. Fine KES 5,000.",
        },
        {
          time: "07:15",
          author: "Dispatch",
          role: "dispatcher",
          message:
            "Fine noted. Operations to deduct from float and submit receipt. Warning issued re capacity compliance.",
        },
        {
          time: "07:45",
          author: "System",
          role: "system",
          message: "Fine receipt uploaded by crew. Incident marked resolved.",
        },
      ],
    },
    {
      id: "INC-2024-006",
      type: "Harassment Complaint",
      category: "passenger",
      route: "46 Rongai → CBD",
      vehicle: "KDA 317F",
      location: "Lang'ata Rd, near Junction Mall",
      time: "18:55",
      date: "Sun",
      status: "pending",
      severity: "high",
      description:
        "A female passenger lodged a formal complaint against the conductor regarding inappropriate comments made during the journey. The passenger has provided her contact details and is willing to make a formal statement. The incident occurred between Junction Mall and Karen roundabout.",
      updates: [
        {
          time: "18:55",
          author: "David K.",
          role: "crew",
          message:
            "Passenger complaint received regarding conductor behaviour. Contact details obtained — passenger willing to give statement.",
        },
        {
          time: "19:30",
          author: "HR Dept",
          role: "dispatcher",
          message:
            "Logged for formal review under Code of Conduct policy 4.3. Conductor suspended pending investigation.",
        },
      ],
    },
  ]

  let incident = $state<Incident | null>(null)
  let replyText = $state("")
  let replying = $state(false)
  let replyDone = $state(false)
  let replyErr = $state("")

  async function sendReply() {
    if (!replyText.trim()) {
      replyErr = "Please enter a message"
      return
    }
    replyErr = ""
    replying = true
    await new Promise((r) => setTimeout(r, 900))
    if (incident) {
      const now = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
      incident = {
        ...incident,
        updates: [
          ...incident.updates,
          {
            time: now,
            author: user?.fullName ?? "Crew Member",
            role: "crew",
            message: replyText.trim(),
          },
        ],
      }
    }
    replyText = ""
    replying = false
    replyDone = true
    setTimeout(() => (replyDone = false), 2000)
  }

  // ── Config ─────────────────────────────────────────────────────────────────
  const STATUS_CFG: Record<
    IncidentStatus,
    { color: string; bg: string; border: string; label: string }
  > = {
    open: {
      color: "#f87171",
      bg: "rgba(248,113,113,0.1)",
      border: "rgba(248,113,113,0.22)",
      label: "Open",
    },
    pending: {
      color: "#facc15",
      bg: "rgba(250,204,21,0.1)",
      border: "rgba(250,204,21,0.22)",
      label: "Pending",
    },
    resolved: {
      color: "#4ade80",
      bg: "rgba(74,222,128,0.1)",
      border: "rgba(74,222,128,0.22)",
      label: "Resolved",
    },
    escalated: {
      color: "#fb923c",
      bg: "rgba(251,146,60,0.1)",
      border: "rgba(251,146,60,0.22)",
      label: "Escalated",
    },
  }
  const SEV_CFG: Record<IncidentSeverity, { color: string; dot: string }> = {
    low: { color: "rgba(255,255,255,0.4)", dot: "rgba(255,255,255,0.22)" },
    medium: { color: "#facc15", dot: "#facc15" },
    high: { color: "#fb923c", dot: "#fb923c" },
    critical: { color: "#f87171", dot: "#f87171" },
  }
  const SEVERITY_BARS: Record<IncidentSeverity, number> = {
    low: 25,
    medium: 50,
    high: 75,
    critical: 100,
  }

  // ── Nav ────────────────────────────────────────────────────────────────────
  let openCount = $state(
    ALL_INCIDENTS.filter((i) => i.status === "open").length,
  )
  let pendingTips = $state(3)
  const navItems = [
    {
      key: "dashboard",
      label: "Dashboard",
      href: "/crew/dashboard",
      badge: () => 0,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    },
    {
      key: "incidents",
      label: "Incidents",
      href: "/crew/incidents",
      badge: () => openCount,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    },
    {
      key: "tipjar",
      label: "Tip Jar",
      href: "/crew/tipjar",
      badge: () => pendingTips,
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>`,
    },
  ]
  function isActive(href: string) {
    return href === "/incidents"
      ? currentPath.startsWith("/incidents")
      : currentPath === href
  }
  function initials(name?: string | null) {
    return !name
      ? "?"
      : name
          .split(" ")
          .map((w: string) => w[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
  }

  onMount(() => {
    if (browser) {
      incident = ALL_INCIDENTS.find((i) => i.id === incidentId) ?? null
      setTimeout(() => (loading = false), 300)
    }
  })
</script>

<svelte:head>
  <title
    >{incident ? `${incident.id} — ${incident.type}` : "Incident"} — Matatu Pulse</title
  >
</svelte:head>

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
      <a href="/account/sign_out" class="sign-out"
        ><svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          ><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline
            points="16 17 21 12 16 7"
          /><line x1="21" y1="12" x2="9" y2="12" /></svg
        >Sign Out</a
      >
    </div>
  </aside>

  <div class="main">
    <div class="topbar">
      <div class="tb-left">
        <button class="hamburger" onclick={() => (mobileOpen = true)}
          ><svg
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
          ></button
        >
        <nav class="breadcrumb">
          <a href="/crew/dashboard">Dashboard</a><span class="bc-sep">›</span>
          <a href="/crew/incidents">Incidents</a><span class="bc-sep">›</span>
          <span class="bc-cur">{incidentId}</span>
        </nav>
      </div>
      <div class="shift-pill"><span class="shift-dot"></span>On Shift</div>
    </div>

    <div class="content">
      {#if loading}
        <div class="loading">
          <span class="spinner"></span>Loading incident…
        </div>
      {:else if !incident}
        <div class="not-found">
          <svg
            width="52"
            height="52"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            ><path
              d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            /><line x1="12" y1="9" x2="12" y2="13" /><line
              x1="12"
              y1="17"
              x2="12.01"
              y2="17"
            /></svg
          >
          <h2>Incident not found</h2>
          <p>We couldn't find incident <strong>{incidentId}</strong>.</p>
          <a href="/incidents">← Back to incidents</a>
        </div>
      {:else}
        {@const s = STATUS_CFG[incident.status]}
        {@const sv = SEV_CFG[incident.severity]}

        <a href="/incidents" class="back-link">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"><polyline points="15 18 9 12 15 6" /></svg
          >
          All Incidents
        </a>

        <!-- Header -->
        <div class="inc-header">
          <div class="ih-left">
            <div class="inc-eyebrow">{incident.id} · {incident.category}</div>
            <h1 class="inc-title">{incident.type}</h1>
            <div class="badge-row">
              <span
                class="s-pill"
                style="color:{s.color};background:{s.bg};border:1px solid {s.border}"
                >{s.label}</span
              >
              <span
                class="s-pill"
                style="color:{sv.color};background:rgba(0,0,0,0.18);border:1px solid {sv.dot}40"
                >{incident.severity} severity</span
              >
              {#if incident.isNew}<span
                  class="s-pill"
                  style="color:var(--orange);background:rgba(242,101,34,0.1);border:1px solid rgba(242,101,34,0.25)"
                  >New</span
                >{/if}
            </div>
          </div>
        </div>

        <div class="detail-layout">
          <!-- Left: description + activity -->
          <div>
            <!-- Description -->
            <div class="card">
              <div class="card-hd">
                <div class="card-ey">What happened</div>
                <div class="card-ti">Incident Description</div>
              </div>
              <div class="card-body">
                <p class="inc-desc">{incident.description}</p>
              </div>
            </div>

            <!-- Activity timeline -->
            <div class="card">
              <div class="card-hd">
                <div class="card-ey">Live thread</div>
                <div class="card-ti">
                  Activity · {incident.updates.length} update{incident.updates
                    .length !== 1
                    ? "s"
                    : ""}
                </div>
              </div>
              <div class="card-body">
                <div class="timeline">
                  {#each incident.updates as upd, i}
                    {@const isCrew = upd.role === "crew"}
                    {@const isSystem = upd.role === "system"}
                    {@const dotColor = isCrew
                      ? "var(--teal)"
                      : isSystem
                        ? "rgba(255,255,255,0.25)"
                        : "var(--orange)"}
                    {@const bgColor = isCrew
                      ? "rgba(0,176,155,0.18)"
                      : isSystem
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(242,101,34,0.18)"}
                    <div class="tl-item">
                      <div class="tl-spine">
                        <div
                          class="tl-dot"
                          style="background:{dotColor};border-color:{dotColor}"
                        ></div>
                        <div class="tl-connector"></div>
                      </div>
                      <div class="tl-content">
                        <div class="tl-header">
                          <div class="tl-avatar" style="background:{bgColor}">
                            {upd.author.slice(0, 1)}
                          </div>
                          <span class="tl-author">{upd.author}</span>
                          <span class="tl-role role-{upd.role}">{upd.role}</span
                          >
                          <span class="tl-time">{upd.time}</span>
                        </div>
                        <div class="tl-msg">{upd.message}</div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Reply box (only if not resolved) -->
              {#if incident.status !== "resolved"}
                <div class="reply-area">
                  <div class="reply-label">Add update</div>
                  <textarea
                    class="reply-input {replyErr ? 'err' : ''}"
                    placeholder="Provide a follow-up or additional information…"
                    bind:value={replyText}
                  ></textarea>
                  <div class="reply-footer">
                    <span class="reply-err">{replyErr}</span>
                    <button
                      class="reply-btn {replyDone ? 'done' : ''}"
                      onclick={sendReply}
                      disabled={replying || replyDone}
                    >
                      {#if replying}<span
                          class="spinner"
                          style="width:12px;height:12px;border-width:2px;border-top-color:var(--teal)"
                        ></span>Sending…
                      {:else if replyDone}<svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2.5"
                          ><polyline points="20 6 9 17 4 12" /></svg
                        >Sent!
                      {:else}<svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2.5"
                          ><line x1="22" y1="2" x2="11" y2="13" /><polygon
                            points="22 2 15 22 11 13 2 9 22 2"
                          /></svg
                        >Send Update{/if}
                    </button>
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <!-- Right: metadata sidebar -->
          <div class="sidebar-col">
            <div class="info-card">
              <div class="info-hd">
                <div class="info-ey">Incident Details</div>
              </div>
              <div class="info-body">
                <div class="meta-grid">
                  <div class="meta-row">
                    <div class="meta-key">ID</div>
                    <div class="meta-val mono">{incident.id}</div>
                  </div>
                  <div class="meta-row">
                    <div class="meta-key">Status</div>
                    <div class="meta-val">
                      <span
                        class="s-pill"
                        style="color:{s.color};background:{s.bg};border:1px solid {s.border};font-size:0.6rem;padding:3px 9px"
                        >{s.label}</span
                      >
                    </div>
                  </div>
                  <div class="meta-row">
                    <div class="meta-key">Severity</div>
                    <div class="meta-val" style="color:{sv.color}">
                      {incident.severity}
                    </div>
                    <div class="sev-bar-wrap">
                      <div class="sev-bar-track">
                        <div
                          class="sev-bar-fill"
                          style="width:{SEVERITY_BARS[
                            incident.severity
                          ]}%;background:{sv.dot}"
                        ></div>
                      </div>
                    </div>
                  </div>
                  <div class="meta-row">
                    <div class="meta-key">Route</div>
                    <div class="meta-val">{incident.route}</div>
                  </div>
                  <div class="meta-row">
                    <div class="meta-key">Vehicle</div>
                    <div class="meta-val mono">{incident.vehicle}</div>
                  </div>
                  <div class="meta-row">
                    <div class="meta-key">Location</div>
                    <div class="meta-val">{incident.location}</div>
                  </div>
                  <div class="meta-row">
                    <div class="meta-key">Reported</div>
                    <div class="meta-val">
                      {incident.date} at {incident.time}
                    </div>
                  </div>
                  <div class="meta-row">
                    <div class="meta-key">Category</div>
                    <div class="meta-val" style="text-transform:capitalize">
                      {incident.category}
                    </div>
                  </div>
                  <div class="meta-row">
                    <div class="meta-key">Updates</div>
                    <div class="meta-val">
                      {incident.updates.length} message{incident.updates
                        .length !== 1
                        ? "s"
                        : ""}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Escalation info for critical -->
            {#if incident.status === "escalated" || incident.severity === "critical"}
              <div
                style="background:rgba(248,113,113,0.06);border:1px solid rgba(248,113,113,0.18);border-radius:14px;padding:14px 16px"
              >
                <div
                  style="font-size:0.6rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#f87171;margin-bottom:8px;display:flex;align-items:center;gap:6px"
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    ><path
                      d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
                    /></svg
                  >Escalation Notice
                </div>
                <p
                  style="font-size:0.78rem;color:rgba(255,255,255,0.6);line-height:1.6;margin:0"
                >
                  This incident has been escalated to management. Do not discuss
                  with third parties without authorisation. Await further
                  instructions.
                </p>
              </div>
            {/if}

            <!-- Quick actions -->
            <div
              style="background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:14px 16px"
            >
              <div
                style="font-size:0.6rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--text-3);margin-bottom:10px"
              >
                Quick Actions
              </div>
              <div style="display:flex;flex-direction:column;gap:7px">
                <a
                  href="/incidents"
                  style="display:flex;align-items:center;gap:8px;padding:8px 11px;border-radius:9px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);font-size:0.78rem;font-weight:600;color:var(--text-2);text-decoration:none;transition:all 0.15s"
                  onmouseenter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "rgba(255,255,255,0.07)")}
                  onmouseleave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "rgba(255,255,255,0.04)")}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"><polyline points="15 18 9 12 15 6" /></svg
                  >All Incidents
                </a>
                <a
                  href="/incidents/new"
                  style="display:flex;align-items:center;gap:8px;padding:8px 11px;border-radius:9px;background:rgba(248,113,113,0.07);border:1px solid rgba(248,113,113,0.18);font-size:0.78rem;font-weight:600;color:#f87171;text-decoration:none;transition:all 0.15s"
                  onmouseenter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "rgba(248,113,113,0.12)")}
                  onmouseleave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      "rgba(248,113,113,0.07)")}
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    ><line x1="12" y1="5" x2="12" y2="19" /><line
                      x1="5"
                      y1="12"
                      x2="19"
                      y2="12"
                    /></svg
                  >Report New
                </a>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  /* ── Shell / Sidebar (shared) ── */
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

  /* ── Page ── */
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
  .back-link svg {
    opacity: 0.7;
  }

  .inc-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
    margin-bottom: 28px;
  }
  .ih-left {
  }
  .inc-eyebrow {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
    font-family: monospace;
    margin-bottom: 6px;
  }
  .inc-title {
    font-family: var(--font-display);
    font-size: clamp(1.4rem, 2.5vw, 2rem);
    font-weight: 900;
    letter-spacing: -0.05em;
    line-height: 1.1;
    color: var(--text-1);
    margin-bottom: 10px;
  }
  .badge-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .s-pill {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 100px;
    white-space: nowrap;
  }

  /* ── Layout ── */
  .detail-layout {
    display: grid;
    grid-template-columns: 1fr 320px;
    gap: 18px;
    align-items: start;
  }

  /* ── Left column ── */
  .card {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 18px;
    overflow: hidden;
    margin-bottom: 14px;
  }
  .card::before {
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
  .card-hd {
    padding: 16px 20px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  .card-ey {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 3px;
  }
  .card-ti {
    font-family: var(--font-display);
    font-size: 0.92rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
  }
  .card-body {
    padding: 18px 20px;
  }

  /* Description */
  .inc-desc {
    font-size: 0.9rem;
    color: var(--text-2);
    line-height: 1.75;
  }

  /* Timeline */
  .timeline {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .tl-item {
    display: flex;
    gap: 13px;
    padding-bottom: 18px;
  }
  .tl-item:last-child {
    padding-bottom: 0;
  }
  .tl-spine {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    width: 10px;
  }
  .tl-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 3px;
    border: 2px solid;
  }
  .tl-connector {
    width: 1px;
    flex: 1;
    background: rgba(255, 255, 255, 0.07);
    margin-top: 4px;
  }
  .tl-item:last-child .tl-connector {
    display: none;
  }
  .tl-content {
    flex: 1;
    min-width: 0;
    padding-top: 1px;
  }
  .tl-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 5px;
    flex-wrap: wrap;
  }
  .tl-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.55rem;
    font-weight: 800;
    color: #fff;
    flex-shrink: 0;
  }
  .tl-author {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--text-1);
  }
  .tl-role {
    font-size: 0.55rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 2px 7px;
    border-radius: 100px;
  }
  .role-crew {
    background: rgba(0, 176, 155, 0.12);
    color: var(--teal);
  }
  .role-dispatcher {
    background: rgba(242, 101, 34, 0.12);
    color: var(--orange);
  }
  .role-system {
    background: rgba(255, 255, 255, 0.06);
    color: var(--text-3);
  }
  .tl-time {
    font-size: 0.62rem;
    color: var(--text-3);
    margin-left: auto;
  }
  .tl-msg {
    font-size: 0.84rem;
    color: var(--text-2);
    line-height: 1.6;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    padding: 10px 13px;
  }

  /* Reply box */
  .reply-area {
    padding: 16px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }
  .reply-label {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 8px;
  }
  .reply-input {
    width: 100%;
    padding: 10px 13px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    font-family: var(--font-body);
    font-size: 0.84rem;
    color: var(--text-1);
    resize: vertical;
    min-height: 72px;
    line-height: 1.6;
    box-sizing: border-box;
    transition:
      border-color 0.15s,
      background 0.15s;
  }
  .reply-input:focus {
    outline: none;
    border-color: rgba(0, 176, 155, 0.4);
    background: rgba(255, 255, 255, 0.06);
  }
  .reply-input.err {
    border-color: rgba(248, 113, 113, 0.45);
  }
  .reply-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 8px;
  }
  .reply-err {
    font-size: 0.66rem;
    color: #f87171;
  }
  .reply-btn {
    padding: 8px 18px;
    border-radius: 10px;
    background: rgba(0, 176, 155, 0.12);
    border: 1px solid rgba(0, 176, 155, 0.25);
    font-family: var(--font-body);
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--teal);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.15s;
  }
  .reply-btn:hover:not(:disabled) {
    background: rgba(0, 176, 155, 0.2);
    transform: translateY(-1px);
  }
  .reply-btn:disabled {
    opacity: 0.55;
    cursor: default;
    transform: none;
  }
  .reply-btn.done {
    background: rgba(74, 222, 128, 0.1);
    border-color: rgba(74, 222, 128, 0.25);
    color: #4ade80;
  }

  /* ── Right column ── */
  .sidebar-col {
    display: flex;
    flex-direction: column;
    gap: 14px;
    position: sticky;
    top: 68px;
  }
  .info-card {
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 16px;
    overflow: hidden;
  }
  .info-card::before {
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
  .info-hd {
    padding: 14px 16px 11px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }
  .info-ey {
    font-size: 0.58rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-3);
  }
  .info-body {
    padding: 14px 16px;
  }

  .meta-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .meta-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 9px 10px;
    background: rgba(255, 255, 255, 0.025);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 9px;
  }
  .meta-key {
    font-size: 0.56rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
  }
  .meta-val {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-1);
  }
  .meta-val.mono {
    font-family: monospace;
    font-size: 0.75rem;
  }

  /* Severity bar */
  .sev-bar-wrap {
    margin-top: 6px;
  }
  .sev-bar-track {
    height: 5px;
    background: rgba(255, 255, 255, 0.07);
    border-radius: 3px;
    overflow: hidden;
  }
  .sev-bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s ease;
  }

  /* ── Loading / not found ── */
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
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .not-found {
    text-align: center;
    padding: 60px 20px;
    color: var(--text-3);
  }
  .not-found svg {
    opacity: 0.15;
    margin-bottom: 14px;
  }
  .not-found h2 {
    font-family: var(--font-display);
    font-size: 1.4rem;
    font-weight: 800;
    color: var(--text-2);
    margin-bottom: 8px;
  }
  .not-found p {
    font-size: 0.85rem;
    margin-bottom: 18px;
  }
  .not-found a {
    color: var(--orange);
    text-decoration: none;
    font-weight: 600;
  }

  @media (max-width: 1100px) {
    .detail-layout {
      grid-template-columns: 1fr;
    }
    .sidebar-col {
      position: static;
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
</style>
