<script>
  import { currentTrip, tripScore } from '$lib/stores/trips';

  $: trip = $currentTrip;
  $: hasTrip = !!trip && trip.from && trip.to; // safer check
</script>

{#if hasTrip}
  <div class="card">
    <div class="header">
      <h2 class="departure">{trip.departure || 'Upcoming'}</h2>
      <div class="route">
        {trip.from || '?'} → {trip.to || '?'}
      </div>
    </div>

    <div class="details">
      <span class="duration">{trip.duration || '—'}</span>
      {#if trip.transfers != null}
        <span class="transfers">• {trip.transfers} transfer{trip.transfers === 1 ? '' : 's'}</span>
      {/if}
    </div>

    {#if trip.delay > 0}
      <div class="delay">
        ⚠ {trip.delay} min delay
      </div>
    {/if}

    {#if $tripScore != null}
      <div class="score">
        Trip Score: <strong>{$tripScore}</strong>
        {#if $tripScore >= 80}
          <span class="score-badge excellent">Excellent</span>
        {:else if $tripScore >= 60}
          <span class="score-badge good">Good</span>
        {:else}
          <span class="score-badge fair">Fair</span>
        {/if}
      </div>
    {/if}
  </div>
{:else}
  <div class="card empty">
    <p class="placeholder">No trip planned yet</p>
  </div>
{/if}

<style>
  .card {
    background: white;
    padding: 1.25rem;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
    max-width: 400px;
    margin: 0 auto;
  }

  .card.empty {
    background: #f8fafc;
    text-align: center;
    color: #64748b;
  }

  .placeholder {
    margin: 0.5rem 0;
    font-style: italic;
  }

  .header {
    margin-bottom: 0.75rem;
  }

  .departure {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
    line-height: 1.2;
  }

  .route {
    font-size: 1.1rem;
    font-weight: 500;
    color: #334155;
    margin-top: 0.25rem;
  }

  .details {
    font-size: 1rem;
    color: #475569;
    margin: 0.75rem 0;
  }

  .duration {
    font-weight: 600;
    color: #1e293b;
  }

  .transfers {
    color: #64748b;
  }

  .delay {
    display: inline-block;
    background: #fee2e2;
    color: #dc2626;
    font-weight: 600;
    font-size: 0.95rem;
    padding: 0.35rem 0.75rem;
    border-radius: 6px;
    margin: 0.75rem 0;
  }

  .score {
    margin-top: 1rem;
    font-size: 1rem;
    color: #475569;
  }

  .score strong {
    font-size: 1.25rem;
    color: #1e293b;
  }

  .score-badge {
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0.25rem 0.6rem;
    border-radius: 999px;
    margin-left: 0.6rem;
    vertical-align: middle;
  }

  .excellent {
    background: #dcfce7;
    color: #15803d;
  }

  .good {
    background: #fef3c7;
    color: #92400e;
  }

  .fair {
    background: #f3f4f6;
    color: #4b5563;
  }
</style>