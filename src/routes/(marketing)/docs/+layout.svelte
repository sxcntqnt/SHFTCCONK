<script lang="ts">
  import { page } from '$app/stores';
  import { docsNav } from '$lib/docs/docs-nav';
</script>

<div class="docs-layout">
  <nav class="docs-sidebar">
    {#each docsNav as section}
      <div class="sidebar-section">
        <span class="sidebar-section-label">{section.label}</span>

        {#each section.links as link}
          <a
            href={link.href}
            class="sidebar-link"
            class:active={$page.url.pathname === link.href}
          >
            {link.label}

            {#if link.badge}
              <span class="sidebar-badge badge-{link.badge}">
                {link.badge}
              </span>
            {/if}
          </a>
        {/each}
      </div>
    {/each}
  </nav>

  <main class="docs-main">
    <slot />
  </main>
</div>

<style>
  .docs-layout {
    display: grid;
    grid-template-columns: 240px 1fr;
    max-width: 1200px;
    margin: 0 auto;
    min-height: 70vh;
    border-left: 1px solid var(--rim);
    border-right: 1px solid var(--rim);
  }

  .docs-sidebar {
    border-right: 1px solid var(--rim);
    padding: 36px 0;
    position: sticky;
    top: 0;
    height: calc(100vh - 54px);
    overflow-y: auto;
    scrollbar-width: none;
  }

  .docs-sidebar::-webkit-scrollbar {
    display: none;
  }

  .sidebar-section {
    margin-bottom: 28px;
  }

  .sidebar-section-label {
    padding: 0 20px 8px;
    font-size: 0.64rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-3);
    display: block;
  }

  .sidebar-link {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 20px;
    font-size: 0.845rem;
    color: var(--text-2);
    text-decoration: none;
    border-left: 2px solid transparent;
    transition:
      color 0.15s,
      border-color 0.15s,
      background 0.15s;
  }

  .sidebar-link:hover {
    color: var(--text-1);
    background: rgba(255, 255, 255, 0.02);
  }

  .sidebar-link.active {
    color: var(--orange);
    border-left-color: var(--orange);
    background: rgba(242, 101, 34, 0.05);
  }

  .sidebar-badge {
    margin-left: auto;
    padding: 1px 7px;
    border-radius: 100px;
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  .badge-new {
    background: rgba(0, 176, 155, 0.15);
    color: var(--teal);
    border: 1px solid rgba(0, 176, 155, 0.25);
  }

  .badge-beta {
    background: rgba(242, 101, 34, 0.1);
    color: var(--orange);
    border: 1px solid rgba(242, 101, 34, 0.2);
  }

  .docs-main {
    padding: 48px 56px;
  }

  @media (max-width: 900px) {
    .docs-layout {
      grid-template-columns: 1fr;
    }

    .docs-sidebar {
      display: none;
    }

    .docs-main {
      padding: 36px 24px;
    }
  }

  @media (max-width: 600px) {
    .docs-main {
      padding: 28px 16px;
    }
  }
</style>
