{route.pickup_point.pickup_point}
          </div>
          <div class="text-xs text-zinc-500 dark:text-zinc-400 truncate">
            {route.destinations.map(d => d.destination).join(', ')}
          </div>
        </div>
      </button>
      <div use:melt={$separator} class="my-1 h-px bg-zinc-200 dark:bg-zinc-800" />
    {/each}
    <div use:melt={$arrow} class="fill-white dark:fill-zinc-900" />
  </div>
</div>

<style>
  .route-switcher { width: 100%; max-width: 350px; }

  .hex-icon, .hex-icon-small {
    width: 32px; height: 32px;
    clip-path: polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .hex-icon-small { width: 24px; height: 24px; }

  .hex-item { transition: transform 0.15s ease; }
  .hex-item:hover { transform: translateY(-2px) scale(1.02); }
</style>