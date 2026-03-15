<script lang="ts">
  let { className = "" }: { className?: string } = $props()
</script>

<div class={`glass-card ${className}`}>
  <slot />
</div>

<style>
  .glass-card {
    /* Dark-tinted base — reads as deep navy glass, not milky white */
    background: linear-gradient(
      135deg,
      rgba(20, 35, 80, 0.55) 0%,
      rgba(10, 20, 55, 0.7) 100%
    );

    /* Frosted depth */
    backdrop-filter: blur(28px) saturate(1.6) brightness(0.95);
    -webkit-backdrop-filter: blur(28px) saturate(1.6) brightness(0.95);

    /* Thin luminous rim — bright top-left edge, dark bottom-right */
    border-top: 1px solid rgba(140, 180, 255, 0.22);
    border-left: 1px solid rgba(140, 180, 255, 0.15);
    border-right: 1px solid rgba(10, 20, 60, 0.6);
    border-bottom: 1px solid rgba(10, 20, 60, 0.6);

    border-radius: 24px;
    padding: 24px;

    /* Layered shadows: diffuse depth + faint blue inner glow */
    box-shadow:
      0 2px 0 0 rgba(160, 200, 255, 0.08) inset,
      /* top inner highlight */ 0 32px 64px rgba(0, 0, 0, 0.45),
      /* deep ambient shadow */ 0 8px 24px rgba(0, 10, 40, 0.5),
      /* mid shadow */ 0 0 0 1px rgba(255, 255, 255, 0.04) inset; /* overall rim */

    transition:
      transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
      box-shadow 0.22s ease,
      border-color 0.22s ease;

    position: relative;
    overflow: hidden;
  }

  /* Subtle top-edge sheen — one static highlight line */
  .glass-card::before {
    content: "";
    position: absolute;
    top: 0;
    left: 12%;
    right: 12%;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(180, 220, 255, 0.35),
      transparent
    );
    pointer-events: none;
  }

  .glass-card:hover {
    transform: translateY(-3px);
    box-shadow:
      0 2px 0 0 rgba(160, 200, 255, 0.12) inset,
      0 40px 80px rgba(0, 0, 0, 0.5),
      0 12px 32px rgba(0, 10, 40, 0.55),
      0 0 0 1px rgba(100, 160, 255, 0.1) inset,
      0 0 40px rgba(40, 100, 220, 0.08); /* faint blue aura on hover */
    border-top-color: rgba(160, 210, 255, 0.3);
    border-left-color: rgba(140, 190, 255, 0.2);
  }
</style>
