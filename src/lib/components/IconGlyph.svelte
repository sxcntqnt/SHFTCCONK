<script lang="ts">
  import type { IconKey } from "./../../lib/types"

  export let key: IconKey
</script>

{#if key === "tracking"}

  <svg viewBox="0 0 32 32" class="glyph pin">
    <circle class="ring" cx="16" cy="13" r="7" />
    <path
      d="M16 4c-4.97 0-9 4.03-9 9 0 6.5 9 15 9 15s9-8.5 9-15c0-4.97-4.03-9-9-9z"
    />
    <circle cx="16" cy="13" r="3" />
  </svg>

{:else if key === "routes"}

  <svg viewBox="0 0 32 32" class="glyph route">
    <path
      class="path-line"
      pathLength="1"
      d="M6 25c4 0 4-9 10-9s6-9 10-9"
    />
    <circle cx="6" cy="25" r="2" />
    <circle cx="26" cy="7" r="2" />
  </svg>

{:else if key === "notifications"}

  <svg viewBox="0 0 32 32" class="glyph bell">
    <g class="bell-body">
      <path
        d="M11 21c0-.5.3-1 .6-1.4C12.6 18.3 13 16.6 13 15v-2.5a3 3 0 016 0V15c0 1.6.4 3.3 1.4 4.6.3.4.6.9.6 1.4H11z"
      />
      <path d="M14.3 23.5a1.8 1.8 0 003.4 0" />
    </g>
  </svg>

{:else if key === "analytics"}

  <svg viewBox="0 0 32 32" class="glyph bars">
    <rect class="bar bar-1" x="7" y="18" width="4" height="8" rx="1.4" />
    <rect class="bar bar-2" x="14" y="12" width="4" height="14" rx="1.4" />
    <rect class="bar bar-3" x="21" y="6" width="4" height="20" rx="1.4" />
  </svg>

{:else if key === "getting-started"}

  <svg viewBox="0 0 32 32" class="glyph start">
    <path
      class="path-line"
      pathLength="1"
      d="M6 16h16"
    />
    <path
      class="arrow-head"
      d="M17 10l6 6-6 6"
    />
  </svg>

{:else if key === "billing"}

  <svg viewBox="0 0 32 32" class="glyph card">
    <rect class="card-body" x="5" y="9" width="22" height="15" rx="2.4" />
    <rect class="card-stripe" x="5" y="13.5" width="22" height="3.4" />
    <circle class="card-dot" cx="21" cy="20" r="1.6" />
  </svg>

{/if}

<style>

.glyph{

    width:100%;

    height:100%;

    fill:none;

    stroke:var(--orange);

    stroke-width:1.6;

    stroke-linecap:round;

    stroke-linejoin:round;

    overflow:visible;

}

/* Live tracking — pin with an expanding pulse ring */

.pin .ring{

    fill:none;

    stroke-width:1;

    opacity:0;

    transform-origin:16px 13px;

}

:global(.step-icon-ring:hover) .pin .ring,
:global(.feature-card:hover) .pin .ring,
:global(.qs-card:hover) .pin .ring{

    animation:pulseRing 1.8s ease-out infinite;

}

.pin path,
.pin circle:last-child{

    fill:rgba(242,101,34,.14);

}

@keyframes pulseRing{

    0%{ transform:scale(.55); opacity:.65; }

    100%{ transform:scale(1.6); opacity:0; }

}

/* Smart routes — path draws itself in */

.route .path-line{

    stroke-dasharray:1;

    stroke-dashoffset:1;

    transition:stroke-dashoffset .9s cubic-bezier(.22,1,.36,1);

}

:global(.step-icon-ring:hover) .route .path-line,
:global(.feature-card:hover) .route .path-line,
:global(.qs-card:hover) .route .path-line{

    stroke-dashoffset:0;

}

.route circle{

    fill:var(--orange);

    stroke:none;

}

/* Arrival alerts — bell oscillates */

.bell .bell-body{

    transform-origin:16px 12px;

    fill:rgba(242,101,34,.14);

}

:global(.step-icon-ring:hover) .bell .bell-body,
:global(.feature-card:hover) .bell .bell-body,
:global(.qs-card:hover) .bell .bell-body{

    animation:ring 1s ease-in-out;

}

@keyframes ring{

    0%,100%{ transform:rotate(0deg); }

    20%{ transform:rotate(14deg); }

    40%{ transform:rotate(-12deg); }

    60%{ transform:rotate(8deg); }

    80%{ transform:rotate(-4deg); }

}

/* Fleet analytics — bars rise like a growth readout */

.bars .bar{

    fill:var(--orange);

    stroke:none;

    transform:scaleY(0);

    transform-origin:bottom;

    transition:transform .5s cubic-bezier(.22,1,.36,1);

}

.bars .bar-2{ transition-delay:.08s; }

.bars .bar-3{ transition-delay:.16s; }

:global(.step-icon-ring:hover) .bars .bar,
:global(.feature-card:hover) .bars .bar,
:global(.qs-card:hover) .bars .bar{

    transform:scaleY(1);

}

/* Getting started — arrow draws in and nudges forward */

.start .path-line{

    stroke-dasharray:1;

    stroke-dashoffset:1;

    transition:stroke-dashoffset .6s cubic-bezier(.22,1,.36,1);

}

.start .arrow-head{

    transition:transform .3s cubic-bezier(.22,1,.36,1) .3s;

}

:global(.step-icon-ring:hover) .start .path-line,
:global(.feature-card:hover) .start .path-line,
:global(.qs-card:hover) .start .path-line{

    stroke-dashoffset:0;

}

:global(.step-icon-ring:hover) .start .arrow-head,
:global(.feature-card:hover) .start .arrow-head,
:global(.qs-card:hover) .start .arrow-head{

    transform:translateX(3px);

}

/* Billing — card stripe slides, coin pulses */

.card .card-body{

    fill:rgba(242,101,34,.1);

}

.card .card-stripe{

    fill:var(--orange);

    stroke:none;

    transform:scaleX(0);

    transform-origin:left;

    transition:transform .5s cubic-bezier(.22,1,.36,1);

}

.card .card-dot{

    fill:var(--orange);

    stroke:none;

    opacity:0;

    transition:opacity .3s ease .2s;

}

:global(.step-icon-ring:hover) .card .card-stripe,
:global(.feature-card:hover) .card .card-stripe,
:global(.qs-card:hover) .card .card-stripe{

    transform:scaleX(1);

}

:global(.step-icon-ring:hover) .card .card-dot,
:global(.feature-card:hover) .card .card-dot,
:global(.qs-card:hover) .card .card-dot{

    opacity:1;

}

@media(prefers-reduced-motion:reduce){

.pin .ring,
.bell .bell-body{

animation:none !important;

}

}

</style>
