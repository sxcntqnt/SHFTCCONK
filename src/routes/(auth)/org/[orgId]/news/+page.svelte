<script lang="ts">
  import { enhance } from "$app/forms"
  import {
    Newspaper,
    Plus,
    Pin,
    PinOff,
    Eye,
    EyeOff,
    Trash2,
    Edit3,
    AlertCircle,
    Bell,
    MapPin,
    Route,
    ChevronDown,
    X,
    CheckCircle,
    Send,
    FileText,
    Users,
    Link2,
    ExternalLink,
  } from "@lucide/svelte"

  type NewsItem = {
    id: string
    title: string
    body: string
    category: string
    severity: string
    pinned: boolean
    published: boolean
    route_ids: string[]
    author_id: string | null
    created_at: string
    updated_at: string
    profiles?: { full_name: string | null; avatar_url: string | null }
  }

  type Data = {
    org: any
    news: NewsItem[]
    routes: any[]
    subscriberCount: number
    profile: any
    orgId: string
    error?: string
    created?: boolean
    updated?: boolean
    deleted?: boolean
  }

  let { data, form: formResult }: { data: Data; form: any } = $props()

  let showComposer = $state(false)
  let editingId: string | null = $state(null)
  let confirmDeleteId: string | null = $state(null)
  let isSubmitting = $state(false)
  let filterCategory = $state("all")
  let showRouteLinker = $state(false)

  // Composer state
  let newTitle = $state("")
  let newBody = $state("")
  let newCategory = $state("general")
  let newSeverity = $state("info")
  let newPinned = $state(false)
  let newPublished = $state(true)
  let selectedRouteIds: Set<string> = $state(new Set())

  const categories = [
    { id: "general", label: "General" },
    { id: "route_change", label: "Route Change" },
    { id: "fare_update", label: "Fare Update" },
    { id: "service_alert", label: "Service Alert" },
    { id: "compliance", label: "Compliance" },
    { id: "fleet", label: "Fleet Update" },
    { id: "announcement", label: "Announcement" },
  ]

  const severities = [
    { id: "info", label: "Info", color: "#60a5fa" },
    { id: "notice", label: "Notice", color: "#a78bfa" },
    { id: "warning", label: "Warning", color: "#fbbf24" },
    { id: "critical", label: "Critical", color: "#f87171" },
  ]

  function categoryLabel(id: string): string {
    return (
      categories.find((c) => c.id === id)?.label ||
      id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    )
  }

  function categoryColor(cat: string): string {
    const colors: Record<string, string> = {
      route_change: "#34d399",
      fare_update: "#fbbf24",
      service_alert: "#f87171",
      compliance: "#a78bfa",
      fleet: "#2dd4bf",
      announcement: "#f472b6",
      general: "#60a5fa",
    }
    return colors[cat] || "#8b8fa3"
  }

  function formatDate(dateStr: string): string {
    if (!dateStr) return ""
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return "Just now"
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  }

  function initials(name: string | null): string {
    if (!name) return "?"
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  function routeLabel(rid: string): string {
    const r = data.routes.find((r) => r.id === rid)
    return r ? r.stage_name : rid.slice(0, 8) + "…"
  }

  function truncate(str: string, len: number): string {
    return str.length > len ? str.slice(0, len) + "…" : str
  }

  function resetComposer() {
    newTitle = ""
    newBody = ""
    newCategory = "general"
    newSeverity = "info"
    newPinned = false
    newPublished = true
    selectedRouteIds = new Set()
    showComposer = false
    showRouteLinker = false
  }

  function startEdit(item: NewsItem) {
    editingId = item.id
    newTitle = item.title
    newBody = item.body
    newCategory = item.category
    newSeverity = item.severity
    newPinned = item.pinned
    newPublished = item.published
    selectedRouteIds = new Set(item.route_ids || [])
  }

  function cancelEdit() {
    editingId = null
    newTitle = ""
    newBody = ""
    selectedRouteIds = new Set()
  }

  function toggleRouteId(id: string) {
    const next = new Set(selectedRouteIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    selectedRouteIds = next
  }

  let filtered = $derived(
    filterCategory === "all"
      ? data.news
      : data.news.filter((n) => n.category === filterCategory),
  )

  let publishedCount = $derived(data.news.filter((n) => n.published).length)
  let draftCount = $derived(data.news.filter((n) => !n.published).length)

  $effect(() => {
    if (formResult?.created) resetComposer()
    if (formResult?.updated) cancelEdit()
  })
</script>

<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    rel="preconnect"
    href="https://fonts.gstatic.com"
    crossorigin="anonymous"
  />
  <link
    href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=JetBrains+Mono:wght@400;500&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<div class="nx-root">
  <div class="nx-bg-glow"></div>
  <div class="nx-container">
    <!-- Header -->
    <header class="nx-header">
      <div class="nx-header-top">
        <div class="nx-header-left">
          <div class="nx-org-icon">
            <Newspaper size={22} strokeWidth={2} />
          </div>
          <div>
            <h1 class="nx-title">{data.org.name}</h1>
            <p class="nx-subtitle">
              Publish news and route updates for your subscribers
            </p>
          </div>
        </div>
        <button
          class="nx-btn-compose"
          onclick={() => {
            showComposer = !showComposer
            editingId = null
          }}
        >
          {#if showComposer}
            <X size={16} strokeWidth={2.5} /> Close
          {:else}
            <Plus size={16} strokeWidth={2.5} /> New Update
          {/if}
        </button>
      </div>

      <!-- Org context bar -->
      <div class="nx-context-bar">
        <div class="nx-ctx-item">
          <Users size={13} strokeWidth={2} />
          <span class="nx-ctx-val">{data.subscriberCount}</span>
          <span class="nx-ctx-lbl">Subscribers</span>
        </div>
        <div class="nx-ctx-sep"></div>
        <div class="nx-ctx-item">
          <FileText size={13} strokeWidth={2} />
          <span class="nx-ctx-val">{publishedCount}</span>
          <span class="nx-ctx-lbl">Published</span>
        </div>
        {#if draftCount > 0}
          <div class="nx-ctx-sep"></div>
          <div class="nx-ctx-item nx-ctx-draft">
            <EyeOff size={13} strokeWidth={2} />
            <span class="nx-ctx-val">{draftCount}</span>
            <span class="nx-ctx-lbl">Drafts</span>
          </div>
        {/if}
        <div class="nx-ctx-sep"></div>
        <div class="nx-ctx-item">
          <Route size={13} strokeWidth={2} />
          <span class="nx-ctx-val">{data.routes.length}</span>
          <span class="nx-ctx-lbl">Routes</span>
        </div>
        <a href="/app/subscribe/{data.org.id}/news" class="nx-ctx-link">
          <ExternalLink size={12} strokeWidth={2} />
          View public feed
        </a>
      </div>

      <!-- Posting as -->
      {#if data.profile}
        <div class="nx-posting-as">
          Posting as <strong>{data.profile.full_name || "you"}</strong>
        </div>
      {/if}
    </header>

    {#if formResult?.error}
      <div class="nx-error nx-slide-in">
        <AlertCircle size={15} strokeWidth={2} />
        <span>{formResult.error}</span>
      </div>
    {/if}

    <!-- ═══ Composer ═══ -->
    {#if showComposer}
      <div class="nx-composer nx-slide-in">
        <div class="nx-composer-label">
          <Send size={14} strokeWidth={2.5} />
          <span>Compose Update</span>
        </div>
        <form
          method="POST"
          action="?/create"
          use:enhance={() => {
            isSubmitting = true
            return async ({ update }) => {
              isSubmitting = false
              await update()
            }
          }}
          class="nx-form"
        >
          <input
            name="title"
            bind:value={newTitle}
            placeholder="What's happening? — Keep it clear and scannable"
            required
            class="nx-input nx-input-title"
          />

          <textarea
            name="body"
            bind:value={newBody}
            placeholder="Give your subscribers the details. What changed, when does it take effect, and what should they do about it?"
            required
            rows="6"
            class="nx-textarea"
          ></textarea>

          <!-- Meta row -->
          <div class="nx-meta-row">
            <div class="nx-meta-group">
              <label class="nx-label">Category</label>
              <div class="nx-select-wrap">
                <select
                  name="category"
                  bind:value={newCategory}
                  class="nx-select"
                >
                  {#each categories as cat}
                    <option value={cat.id}>{cat.label}</option>
                  {/each}
                </select>
                <ChevronDown size={14} class="nx-select-icon" />
              </div>
            </div>

            <div class="nx-meta-group">
              <label class="nx-label">Severity</label>
              <div class="nx-sev-row">
                {#each severities as sev}
                  <label
                    class="nx-sev-opt"
                    class:nx-sev-active={newSeverity === sev.id}
                  >
                    <input
                      type="radio"
                      name="severity"
                      value={sev.id}
                      bind:group={newSeverity}
                      class="nx-hidden"
                    />
                    <span class="nx-sev-dot" style="background: {sev.color}"
                    ></span>
                    {sev.label}
                  </label>
                {/each}
              </div>
            </div>
          </div>

          <!-- Route linker -->
          {#if data.routes.length > 0}
            <button
              type="button"
              class="nx-route-toggle"
              onclick={() => (showRouteLinker = !showRouteLinker)}
            >
              <Link2 size={13} strokeWidth={2} />
              {selectedRouteIds.size > 0
                ? `${selectedRouteIds.size} route${selectedRouteIds.size > 1 ? "s" : ""} linked`
                : "Link to specific routes"}
              <ChevronDown
                size={13}
                strokeWidth={2}
                class={showRouteLinker ? "nx-rotated" : ""}
              />
            </button>

            {#if showRouteLinker}
              <div class="nx-route-picker nx-slide-in">
                {#each data.routes as route}
                  <button
                    type="button"
                    class="nx-route-opt"
                    class:nx-route-on={selectedRouteIds.has(route.id)}
                    onclick={() => toggleRouteId(route.id)}
                  >
                    <div
                      class="nx-check-box"
                      class:nx-check-on={selectedRouteIds.has(route.id)}
                    >
                      {#if selectedRouteIds.has(route.id)}<CheckCircle
                          size={12}
                          strokeWidth={2.5}
                        />{/if}
                    </div>
                    <MapPin size={12} strokeWidth={2} />
                    <span>{route.stage_name}</span>
                  </button>
                {/each}
              </div>
              {#each [...selectedRouteIds] as rid}
                <input type="hidden" name="route_ids" value={rid} />
              {/each}
            {/if}
          {/if}

          <!-- Toggles + submit -->
          <div class="nx-bottom-row">
            <div class="nx-toggles">
              <label class="nx-tog">
                <input
                  type="checkbox"
                  bind:checked={newPinned}
                  class="nx-hidden"
                />
                <input
                  type="hidden"
                  name="pinned"
                  value={newPinned ? "true" : "false"}
                />
                <Pin
                  size={13}
                  strokeWidth={2}
                  class={newPinned ? "nx-tog-active-icon" : ""}
                />
                Pin
              </label>
              <label class="nx-tog">
                <input
                  type="checkbox"
                  bind:checked={newPublished}
                  class="nx-hidden"
                />
                <input
                  type="hidden"
                  name="published"
                  value={newPublished ? "true" : "false"}
                />
                <Eye
                  size={13}
                  strokeWidth={2}
                  class={newPublished ? "nx-tog-active-icon" : ""}
                />
                {newPublished ? "Public" : "Draft"}
              </label>
            </div>
            <div class="nx-submit-row">
              <button
                type="button"
                class="nx-btn-cancel"
                onclick={resetComposer}>Cancel</button
              >
              <button
                type="submit"
                class="nx-btn-publish"
                disabled={isSubmitting || !newTitle.trim() || !newBody.trim()}
              >
                {#if isSubmitting}
                  <span class="nx-spinner"></span> Publishing…
                {:else}
                  <Send size={14} strokeWidth={2.5} />
                  {newPublished
                    ? "Publish to " +
                      data.subscriberCount +
                      " subscriber" +
                      (data.subscriberCount !== 1 ? "s" : "")
                    : "Save Draft"}
                {/if}
              </button>
            </div>
          </div>
        </form>
      </div>
    {/if}

    <!-- Category filter -->
    <div class="nx-filters">
      <button
        class="nx-chip"
        class:nx-chip-on={filterCategory === "all"}
        onclick={() => (filterCategory = "all")}>All</button
      >
      {#each categories as cat}
        {@const count = data.news.filter((n) => n.category === cat.id).length}
        {#if count > 0}
          <button
            class="nx-chip"
            class:nx-chip-on={filterCategory === cat.id}
            onclick={() => (filterCategory = cat.id)}
          >
            <span
              class="nx-chip-dot"
              style="background: {categoryColor(cat.id)}"
            ></span>
            {cat.label}
            <span class="nx-chip-num">{count}</span>
          </button>
        {/if}
      {/each}
    </div>

    <!-- News list -->
    {#if filtered.length === 0}
      <div class="nx-empty">
        <Newspaper size={40} strokeWidth={1.5} />
        <h2>
          {data.news.length === 0
            ? "No updates published yet"
            : "No updates in this category"}
        </h2>
        <p>
          {data.news.length === 0
            ? "Your subscribers are waiting. Compose your first update above."
            : "Try a different filter."}
        </p>
      </div>
    {:else}
      <div class="nx-list">
        {#each filtered as item, i}
          <div
            class="nx-card"
            class:nx-card-pinned={item.pinned}
            class:nx-card-draft={!item.published}
            style="animation-delay: {i * 40}ms"
          >
            {#if editingId === item.id}
              <!-- Inline edit form -->
              <form
                method="POST"
                action="?/update"
                use:enhance={() => {
                  isSubmitting = true
                  return async ({ update }) => {
                    isSubmitting = false
                    await update()
                  }
                }}
                class="nx-form nx-slide-in"
              >
                <input type="hidden" name="id" value={item.id} />
                <input
                  name="title"
                  bind:value={newTitle}
                  required
                  class="nx-input nx-input-title"
                />
                <textarea
                  name="body"
                  bind:value={newBody}
                  required
                  rows="4"
                  class="nx-textarea"
                ></textarea>
                <div class="nx-meta-row">
                  <div class="nx-meta-group">
                    <div class="nx-select-wrap">
                      <select
                        name="category"
                        bind:value={newCategory}
                        class="nx-select"
                      >
                        {#each categories as cat}<option value={cat.id}
                            >{cat.label}</option
                          >{/each}
                      </select>
                      <ChevronDown size={14} class="nx-select-icon" />
                    </div>
                  </div>
                  <div class="nx-sev-row">
                    {#each severities as sev}
                      <label
                        class="nx-sev-opt"
                        class:nx-sev-active={newSeverity === sev.id}
                      >
                        <input
                          type="radio"
                          name="severity"
                          value={sev.id}
                          bind:group={newSeverity}
                          class="nx-hidden"
                        />
                        <span class="nx-sev-dot" style="background: {sev.color}"
                        ></span>
                        {sev.label}
                      </label>
                    {/each}
                  </div>
                </div>
                <input
                  type="hidden"
                  name="pinned"
                  value={newPinned ? "true" : "false"}
                />
                <input
                  type="hidden"
                  name="published"
                  value={newPublished ? "true" : "false"}
                />
                <div class="nx-submit-row">
                  <button
                    type="button"
                    class="nx-btn-cancel"
                    onclick={cancelEdit}>Cancel</button
                  >
                  <button
                    type="submit"
                    class="nx-btn-publish"
                    disabled={isSubmitting}
                  >
                    {#if isSubmitting}<span class="nx-spinner"></span>{/if} Save Changes
                  </button>
                </div>
              </form>
            {:else}
              <!-- Card display -->
              <div class="nx-card-top">
                <div class="nx-card-tags">
                  <span
                    class="nx-cat-tag"
                    style="color: {categoryColor(
                      item.category,
                    )}; background: {categoryColor(item.category)}12"
                    >{categoryLabel(item.category)}</span
                  >
                  {#if item.severity !== "info"}
                    <span class="nx-sev-tag nx-sev-{item.severity}"
                      >{item.severity}</span
                    >
                  {/if}
                  {#if item.pinned}<span class="nx-pin-tag"
                      ><Pin size={10} strokeWidth={2.5} /> Pinned</span
                    >{/if}
                  {#if !item.published}<span class="nx-draft-tag"
                      ><EyeOff size={10} strokeWidth={2} /> Draft</span
                    >{/if}
                </div>
                <span class="nx-card-time">{formatDate(item.created_at)}</span>
              </div>

              <h3 class="nx-card-title">{item.title}</h3>
              <p class="nx-card-body">{truncate(item.body, 240)}</p>

              {#if item.route_ids && item.route_ids.length > 0}
                <div class="nx-card-routes">
                  {#each item.route_ids as rid}
                    <span class="nx-route-tag"
                      ><MapPin size={10} strokeWidth={2} />
                      {routeLabel(rid)}</span
                    >
                  {/each}
                </div>
              {/if}

              <!-- Author + actions -->
              <div class="nx-card-footer">
                <div class="nx-card-author">
                  {#if item.profiles?.full_name}
                    {#if item.profiles.avatar_url}
                      <img
                        src={item.profiles.avatar_url}
                        alt=""
                        class="nx-author-img"
                      />
                    {:else}
                      <span class="nx-author-init"
                        >{initials(item.profiles.full_name)}</span
                      >
                    {/if}
                    <span class="nx-author-name">{item.profiles.full_name}</span
                    >
                  {/if}
                </div>
                <div class="nx-card-btns">
                  <form
                    method="POST"
                    action="?/toggle_pin"
                    use:enhance
                    class="nx-inline"
                  >
                    <input type="hidden" name="id" value={item.id} />
                    <input
                      type="hidden"
                      name="pinned"
                      value={item.pinned ? "true" : "false"}
                    />
                    <button
                      type="submit"
                      class="nx-act-btn"
                      title={item.pinned ? "Unpin" : "Pin to top"}
                    >
                      {#if item.pinned}<PinOff
                          size={14}
                          strokeWidth={2}
                        />{:else}<Pin size={14} strokeWidth={2} />{/if}
                    </button>
                  </form>
                  <form
                    method="POST"
                    action="?/toggle_publish"
                    use:enhance
                    class="nx-inline"
                  >
                    <input type="hidden" name="id" value={item.id} />
                    <input
                      type="hidden"
                      name="published"
                      value={item.published ? "true" : "false"}
                    />
                    <button
                      type="submit"
                      class="nx-act-btn"
                      title={item.published ? "Unpublish" : "Publish"}
                    >
                      {#if item.published}<EyeOff
                          size={14}
                          strokeWidth={2}
                        />{:else}<Eye size={14} strokeWidth={2} />{/if}
                    </button>
                  </form>
                  <button
                    class="nx-act-btn"
                    onclick={() => startEdit(item)}
                    title="Edit"
                  >
                    <Edit3 size={14} strokeWidth={2} />
                  </button>
                  {#if confirmDeleteId === item.id}
                    <form
                      method="POST"
                      action="?/delete"
                      use:enhance
                      class="nx-inline nx-del-row nx-slide-in"
                    >
                      <input type="hidden" name="id" value={item.id} />
                      <button type="submit" class="nx-btn-del-yes"
                        >Delete</button
                      >
                      <button
                        type="button"
                        class="nx-btn-del-no"
                        onclick={() => (confirmDeleteId = null)}>No</button
                      >
                    </form>
                  {:else}
                    <button
                      class="nx-act-btn nx-act-danger"
                      onclick={() => (confirmDeleteId = item.id)}
                      title="Delete"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  :global(body) {
    font-family: "DM Sans", system-ui, sans-serif;
  }

  .nx-root {
    --accent: #e45a3b;
    --accent-soft: rgba(228, 90, 59, 0.08);
    --accent-border: rgba(228, 90, 59, 0.18);
    --surface: #0c0e13;
    --raised: rgba(255, 255, 255, 0.025);
    --border: rgba(255, 255, 255, 0.06);
    --t1: #f0f1f4;
    --t2: #c8cbd3;
    --t3: #6b7084;
    --t4: #44475a;
    position: relative;
    min-height: 100vh;
    background: var(--surface);
    color: #e2e4e9;
    padding: 2rem 1rem 4rem;
    overflow: hidden;
  }
  .nx-bg-glow {
    position: fixed;
    top: -15%;
    left: 40%;
    width: 700px;
    height: 600px;
    background: radial-gradient(
      ellipse,
      rgba(228, 90, 59, 0.04) 0%,
      transparent 65%
    );
    pointer-events: none;
    z-index: 0;
  }
  .nx-container {
    position: relative;
    z-index: 1;
    max-width: 720px;
    margin: 0 auto;
  }

  /* Header */
  .nx-header {
    margin-bottom: 1.5rem;
    animation: nx-f 0.5s ease-out both;
  }
  @keyframes nx-f {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .nx-header-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 0.85rem;
    flex-wrap: wrap;
  }
  .nx-header-left {
    display: flex;
    align-items: center;
    gap: 0.85rem;
  }
  .nx-org-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(
      135deg,
      var(--accent-soft),
      rgba(228, 90, 59, 0.03)
    );
    border: 1px solid var(--accent-border);
    color: var(--accent);
    flex-shrink: 0;
  }
  .nx-title {
    font-family: "Instrument Serif", Georgia, serif;
    font-size: 1.5rem;
    font-weight: 400;
    color: var(--t1);
    margin: 0;
    line-height: 1.2;
  }
  .nx-subtitle {
    font-size: 0.82rem;
    color: var(--t3);
    margin: 0.15rem 0 0;
  }

  .nx-btn-compose {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    font-size: 0.82rem;
    font-weight: 600;
    font-family: inherit;
    color: #fff;
    background: linear-gradient(135deg, #e45a3b, #c9432a);
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition:
      transform 0.12s ease,
      box-shadow 0.2s ease;
  }
  .nx-btn-compose:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 20px rgba(228, 90, 59, 0.3);
  }

  /* Context bar */
  .nx-context-bar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
    padding: 0.65rem 1rem;
    background: var(--raised);
    border: 1px solid var(--border);
    border-radius: 12px;
    margin-bottom: 0.5rem;
  }
  .nx-ctx-item {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    color: var(--t4);
  }
  .nx-ctx-val {
    font-size: 0.88rem;
    font-weight: 700;
    color: var(--t1);
  }
  .nx-ctx-lbl {
    font-size: 0.72rem;
    color: var(--t4);
  }
  .nx-ctx-draft {
    color: #fbbf24;
  }
  .nx-ctx-draft .nx-ctx-val {
    color: #fbbf24;
  }
  .nx-ctx-sep {
    width: 1px;
    height: 16px;
    background: var(--border);
  }
  .nx-ctx-link {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    margin-left: auto;
    font-size: 0.72rem;
    color: var(--t4);
    text-decoration: none;
    transition: color 0.15s ease;
  }
  .nx-ctx-link:hover {
    color: var(--accent);
  }

  .nx-posting-as {
    font-size: 0.75rem;
    color: var(--t4);
    padding: 0.35rem 0;
  }
  .nx-posting-as strong {
    color: var(--t2);
    font-weight: 600;
  }

  /* Error */
  .nx-error {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.7rem 1rem;
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.15);
    border-radius: 10px;
    color: #f87171;
    font-size: 0.82rem;
    margin-bottom: 1rem;
  }

  /* Composer */
  .nx-composer {
    background: var(--raised);
    border: 1px solid var(--accent-border);
    border-radius: 18px;
    padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
  .nx-composer-label {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--accent);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 0.85rem;
  }
  .nx-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .nx-input {
    width: 100%;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.65rem 0.9rem;
    font-size: 0.88rem;
    color: var(--t2);
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s ease;
  }
  .nx-input-title {
    font-family: "Instrument Serif", Georgia, serif;
    font-size: 1.1rem;
    color: var(--t1);
  }
  .nx-input:focus,
  .nx-textarea:focus {
    border-color: var(--accent-border);
    box-shadow: 0 0 0 3px var(--accent-soft);
  }
  .nx-input::placeholder,
  .nx-textarea::placeholder {
    color: var(--t4);
  }
  .nx-textarea {
    width: 100%;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 0.65rem 0.9rem;
    font-size: 0.85rem;
    line-height: 1.6;
    color: var(--t2);
    font-family: inherit;
    outline: none;
    resize: vertical;
    min-height: 100px;
    box-sizing: border-box;
    transition: border-color 0.15s ease;
  }

  .nx-meta-row {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: flex-end;
  }
  .nx-meta-group {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  .nx-label {
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--t3);
  }
  .nx-select-wrap {
    position: relative;
  }
  .nx-select {
    appearance: none;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 0.45rem 2rem 0.45rem 0.7rem;
    font-size: 0.82rem;
    color: var(--t2);
    font-family: inherit;
    cursor: pointer;
    outline: none;
  }
  .nx-select option {
    background: #1a1d26;
  }
  :global(.nx-select-icon) {
    position: absolute;
    right: 0.6rem;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    color: var(--t4);
  }

  .nx-sev-row {
    display: flex;
    gap: 0.3rem;
  }
  .nx-sev-opt {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.35rem 0.55rem;
    border-radius: 7px;
    font-size: 0.75rem;
    color: var(--t3);
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.15s ease;
  }
  .nx-sev-opt:hover {
    background: rgba(255, 255, 255, 0.02);
  }
  .nx-sev-active {
    background: rgba(255, 255, 255, 0.04);
    border-color: var(--border);
    color: var(--t2);
  }
  .nx-sev-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .nx-hidden {
    display: none;
  }

  /* Route linker */
  .nx-route-toggle {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.78rem;
    color: var(--t3);
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    padding: 0;
    transition: color 0.15s ease;
  }
  .nx-route-toggle:hover {
    color: var(--t2);
  }
  :global(.nx-rotated) {
    transform: rotate(180deg);
  }
  .nx-route-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    padding: 0.6rem;
    background: rgba(255, 255, 255, 0.015);
    border: 1px solid var(--border);
    border-radius: 10px;
  }
  .nx-route-opt {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.6rem;
    font-size: 0.75rem;
    color: var(--t3);
    background: none;
    border: 1px solid transparent;
    border-radius: 7px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s ease;
  }
  .nx-route-opt:hover {
    background: rgba(255, 255, 255, 0.02);
    border-color: var(--border);
  }
  .nx-route-on {
    background: rgba(52, 211, 153, 0.06);
    border-color: rgba(52, 211, 153, 0.12);
    color: #34d399;
  }
  .nx-check-box {
    width: 16px;
    height: 16px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1.5px solid rgba(255, 255, 255, 0.1);
    color: transparent;
    transition: all 0.15s ease;
  }
  .nx-check-on {
    border-color: #34d399;
    color: #34d399;
    background: rgba(52, 211, 153, 0.08);
  }

  /* Bottom row */
  .nx-bottom-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--border);
  }
  .nx-toggles {
    display: flex;
    gap: 0.75rem;
  }
  .nx-tog {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: var(--t4);
    cursor: pointer;
    transition: color 0.15s ease;
  }
  .nx-tog:has(.nx-hidden:checked) {
    color: var(--t1);
  }
  :global(.nx-tog-active-icon) {
    color: var(--accent);
  }
  .nx-submit-row {
    display: flex;
    gap: 0.5rem;
  }
  .nx-btn-cancel {
    padding: 0.5rem 0.85rem;
    font-size: 0.8rem;
    font-weight: 500;
    font-family: inherit;
    color: var(--t3);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border);
    border-radius: 10px;
    cursor: pointer;
  }
  .nx-btn-publish {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    font-size: 0.8rem;
    font-weight: 600;
    font-family: inherit;
    color: #fff;
    background: linear-gradient(135deg, #e45a3b, #c9432a);
    border: none;
    border-radius: 10px;
    cursor: pointer;
    transition:
      transform 0.12s ease,
      box-shadow 0.2s ease;
  }
  .nx-btn-publish:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 16px rgba(228, 90, 59, 0.25);
  }
  .nx-btn-publish:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Filters */
  .nx-filters {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
    margin-bottom: 1.25rem;
    animation: nx-f 0.5s ease-out both;
    animation-delay: 60ms;
  }
  .nx-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.3rem 0.65rem;
    font-size: 0.75rem;
    font-weight: 500;
    font-family: inherit;
    color: var(--t3);
    background: var(--raised);
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .nx-chip:hover {
    border-color: rgba(255, 255, 255, 0.1);
    color: var(--t2);
  }
  .nx-chip-on {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
    color: var(--t1);
  }
  .nx-chip-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .nx-chip-num {
    font-size: 0.65rem;
    color: var(--t4);
    font-family: "JetBrains Mono", monospace;
  }

  /* Empty */
  .nx-empty {
    text-align: center;
    padding: 4rem 2rem;
    color: var(--t4);
  }
  .nx-empty h2 {
    font-family: "Instrument Serif", Georgia, serif;
    font-size: 1.2rem;
    color: var(--t2);
    margin: 1rem 0 0.3rem;
    font-weight: 400;
  }
  .nx-empty p {
    font-size: 0.85rem;
    margin: 0;
  }

  /* Cards */
  .nx-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }
  .nx-card {
    background: var(--raised);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 1.25rem 1.4rem;
    animation: nx-f 0.4s ease-out both;
    transition: border-color 0.2s ease;
  }
  .nx-card:hover {
    border-color: rgba(255, 255, 255, 0.08);
  }
  .nx-card-pinned {
    border-left: 3px solid #a78bfa;
  }
  .nx-card-draft {
    opacity: 0.65;
    border-style: dashed;
  }

  .nx-card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.5rem;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  .nx-card-tags {
    display: flex;
    gap: 0.3rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .nx-card-time {
    font-size: 0.7rem;
    color: var(--t4);
    font-family: "JetBrains Mono", monospace;
  }

  .nx-cat-tag {
    font-size: 0.66rem;
    font-weight: 600;
    padding: 0.12rem 0.45rem;
    border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .nx-sev-tag {
    font-size: 0.63rem;
    font-weight: 500;
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
    text-transform: capitalize;
  }
  .nx-sev-notice {
    color: #a78bfa;
    background: rgba(167, 139, 250, 0.06);
  }
  .nx-sev-warning {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.06);
  }
  .nx-sev-critical {
    color: #f87171;
    background: rgba(248, 113, 113, 0.08);
  }
  .nx-pin-tag,
  .nx-draft-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.63rem;
    font-weight: 500;
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
  }
  .nx-pin-tag {
    color: #a78bfa;
    background: rgba(167, 139, 250, 0.06);
  }
  .nx-draft-tag {
    color: #fbbf24;
    background: rgba(251, 191, 36, 0.06);
  }

  .nx-card-title {
    font-family: "Instrument Serif", Georgia, serif;
    font-size: 1.1rem;
    font-weight: 400;
    color: var(--t1);
    margin: 0 0 0.3rem;
    line-height: 1.3;
  }
  .nx-card-body {
    font-size: 0.82rem;
    line-height: 1.6;
    color: var(--t3);
    margin: 0 0 0.5rem;
  }

  .nx-card-routes {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
    margin-bottom: 0.6rem;
  }
  .nx-route-tag {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    font-size: 0.68rem;
    color: #34d399;
    background: rgba(52, 211, 153, 0.06);
    padding: 0.15rem 0.4rem;
    border-radius: 4px;
  }

  .nx-card-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 0.6rem;
    border-top: 1px solid var(--border);
  }
  .nx-card-author {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .nx-author-img {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid var(--border);
  }
  .nx-author-init {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.58rem;
    font-weight: 700;
    color: var(--t3);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border);
  }
  .nx-author-name {
    font-size: 0.75rem;
    color: var(--t4);
  }
  .nx-card-btns {
    display: flex;
    gap: 0.25rem;
    align-items: center;
  }
  .nx-inline {
    display: inline;
  }
  .nx-act-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: none;
    border: 1px solid transparent;
    color: var(--t4);
    cursor: pointer;
    transition: all 0.15s ease;
  }
  .nx-act-btn:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: var(--border);
    color: var(--t2);
  }
  .nx-act-danger:hover {
    color: #f87171;
    border-color: rgba(248, 113, 113, 0.15);
    background: rgba(248, 113, 113, 0.05);
  }
  .nx-del-row {
    display: flex;
    gap: 0.3rem;
    align-items: center;
  }
  .nx-btn-del-yes {
    padding: 0.25rem 0.55rem;
    font-size: 0.72rem;
    font-weight: 600;
    font-family: inherit;
    color: #fff;
    background: #dc2626;
    border: none;
    border-radius: 5px;
    cursor: pointer;
  }
  .nx-btn-del-no {
    padding: 0.25rem 0.55rem;
    font-size: 0.72rem;
    font-weight: 500;
    font-family: inherit;
    color: var(--t3);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border);
    border-radius: 5px;
    cursor: pointer;
  }

  .nx-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: nx-spin 0.6s linear infinite;
  }
  @keyframes nx-spin {
    to {
      transform: rotate(360deg);
    }
  }
  .nx-slide-in {
    animation: nx-sl 0.3s ease-out;
  }
  @keyframes nx-sl {
    from {
      opacity: 0;
      transform: translateY(-6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (max-width: 600px) {
    .nx-root {
      padding: 1.25rem 0.75rem 3rem;
    }
    .nx-header-top {
      flex-direction: column;
    }
    .nx-meta-row {
      flex-direction: column;
    }
    .nx-bottom-row {
      flex-direction: column;
      align-items: stretch;
    }
    .nx-submit-row {
      justify-content: flex-end;
    }
    .nx-card {
      padding: 1rem;
    }
  }
</style>
