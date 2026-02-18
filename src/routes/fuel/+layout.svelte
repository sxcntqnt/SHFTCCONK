<script lang="ts">
  import { page } from '$app/stores';
  import { user } from '$lib/auth';
</script>

<div class="fuel-bg min-h-screen w-full flex flex-col items-center px-5 pb-20 pt-[env(safe-area-inset-top)]">
  <h1 class="title mb-8">Fuel Tracking & Monitoring</h1>

  <!-- Mini navigation between views -->
  <nav class="mb-10 flex flex-wrap justify-center gap-6 text-lg font-medium">
    <a href="/fuel" class:active={$page.url.pathname === '/fuel'}>Overview</a>
    <a href="/fuel/create" class:active={$page.url.pathname === '/fuel/create'}>Add Entry</a>
    <a href="/fuel/entries" class:active={$page.url.pathname.startsWith('/fuel/entries')}>Entries</a>
  </nav>

  <main class="w-full flex flex-col items-center">
    <slot />
  </main>

  <p class="footer-info mt-16">
    {$user.name || 'User'} • {$user.role}
    {#if $user.organization} • {$user.organization}{/if}
    • Updated {new Date().toLocaleDateString()}
  </p>
</div>

<style>
  .fuel-bg {
    background:
      radial-gradient(1400px 800px at 50% -20%, rgba(255, 255, 255, 0.12), transparent),
      linear-gradient(180deg, #1e40af 0%, #1e3a8a 30%, #0f172a 100%);
    color: white;
  }

  @media (prefers-color-scheme: light) {
    .fuel-bg {
      background:
        radial-gradient(1400px 800px at 50% -20%, rgba(0, 0, 0, 0.06), transparent),
        linear-gradient(180deg, #60a5fa 0%, #3b82f6 40%, #1e40af 100%);
    }
  }

  .title {
    font-size: 3rem;
    font-weight: 700;
    text-align: center;
    letter-spacing: -0.03em;
    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.35);
    background: linear-gradient(to bottom, #ffffff, #e0f2fe);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  nav a {
    color: rgba(255, 255, 255, 0.7);
    transition: all 0.2s;
  }

  nav a:hover {
    color: white;
  }

  nav a.active {
    color: white;
    text-decoration: underline;
    text-underline-offset: 8px;
  }

  .footer-info {
    font-size: 0.9rem;
    margin-top: 3rem;
    color: rgba(255, 255, 255, 0.6);
    text-align: center;
  }

  /* Shared card styles */
  .card {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
    padding: 2rem;
  }

  .error {
    color: #ffdddd;
    font-weight: 500;
  }

  .success {
    color: #a7f3d0;
    font-weight: 500;
  }
</style>