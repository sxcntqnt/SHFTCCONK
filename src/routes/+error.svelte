<script>
  import "../app.css"
  import { page } from "$app/stores"
</script>

<style>
  .error-root {
    background: var(--ink);
    min-height: 100vh;
    display: flex; align-items: center; justify-content: center;
    padding: 2rem;
    position: relative; overflow: hidden;
  }

  /* Ambient glow */
  .error-root::before {
    content: '';
    position: absolute; inset: 0;
    background:
      radial-gradient(ellipse 50% 50% at 50% 40%, rgba(242,101,34,0.08), transparent 65%);
    pointer-events: none;
  }

  /* Subtle grid texture */
  .error-root::after {
    content: '';
    position: absolute; inset: 0;
    background-image:
      linear-gradient(var(--rim) 1px, transparent 1px),
      linear-gradient(90deg, var(--rim) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 80%);
    pointer-events: none;
  }

  .error-inner {
    position: relative; z-index: 1;
    text-align: center;
    max-width: 520px;
  }

  /* Error code */
  .error-code {
    font-family: var(--font-display);
    font-size: clamp(6rem, 20vw, 10rem);
    font-weight: 800;
    letter-spacing: -0.06em;
    line-height: 1;
    margin-bottom: 8px;
    background: linear-gradient(135deg, rgba(242,101,34,0.9) 0%, rgba(242,101,34,0.25) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    user-select: none;
  }

  .error-divider {
    width: 40px; height: 2px;
    background: linear-gradient(90deg, var(--orange), transparent);
    margin: 24px auto;
    border-radius: 2px;
  }

  .error-title {
    font-family: var(--font-display);
    font-size: clamp(1.4rem, 4vw, 2rem);
    font-weight: 800;
    letter-spacing: -0.03em;
    color: var(--text-1);
    margin-bottom: 14px;
    line-height: 1.2;
  }

  .error-message {
    font-size: 0.95rem;
    line-height: 1.7;
    color: var(--text-2);
    margin-bottom: 12px;
  }

  .error-detail {
    display: inline-block;
    padding: 6px 14px;
    background: var(--surface);
    border: 1px solid var(--rim-2);
    border-radius: 8px;
    font-size: 0.78rem;
    font-family: monospace;
    color: var(--orange);
    margin-bottom: 40px;
    max-width: 100%;
    word-break: break-word;
  }

  .error-actions {
    display: flex; flex-wrap: wrap;
    gap: 12px; justify-content: center;
  }

  .btn-home {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 13px 28px;
    background: var(--orange); color: #fff;
    font-family: var(--font-body);
    font-size: 0.9rem; font-weight: 700;
    border-radius: 100px; text-decoration: none;
    box-shadow: 0 4px 20px rgba(242,101,34,0.3);
    transition: background 0.2s, box-shadow 0.2s, transform 0.15s;
  }
  .btn-home:hover {
    background: #d95618;
    box-shadow: 0 8px 32px rgba(242,101,34,0.45);
    transform: translateY(-1px);
  }

  .btn-back {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 12px 24px;
    background: transparent; color: var(--text-2);
    font-size: 0.9rem; font-weight: 600;
    border: 1px solid var(--rim-2);
    border-radius: 100px; text-decoration: none;
    transition: color 0.2s, border-color 0.2s, transform 0.15s;
  }
  .btn-back:hover {
    color: var(--text-1);
    border-color: var(--rim);
    transform: translateY(-1px);
  }
</style>

<div class="error-root">
  <div class="error-inner">

    <!-- Big error code -->
    <div class="error-code">{$page?.status ?? "Err"}</div>

    <div class="error-divider"></div>

    <h1 class="error-title">
      {$page?.status === 404
        ? "Page Not Found"
        : $page?.status === 403
        ? "Access Denied"
        : $page?.status === 500
        ? "Server Error"
        : "Something Went Wrong"}
    </h1>

    <p class="error-message">
      {$page?.status === 404
        ? "This page doesn't exist or has been moved. Check the URL or head back home."
        : "We hit an unexpected issue. Our team has been notified — sorry for the interruption."}
    </p>

    {#if $page?.error?.message}
      <div class="error-detail">{$page.error.message}</div>
    {/if}

    <div class="error-actions">
      <a href="/" class="btn-home">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        Back to Home
      </a>
      <button class="btn-back" onclick={() => history.back()}>
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
    <path d="M19 12H5M12 5l-7 7 7 7"/>
  </svg>
  Go Back
</button>
    </div>

  </div>
</div>