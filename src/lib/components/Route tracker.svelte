  }

  .route-stats {
    display: flex;
    gap: 20px;
  }

  .route-stat-val {
    font-weight: 800;
    font-size: 1.2rem;
  }

  .route-stat-lbl {
    font-size: 0.7rem;
    color: var(--text-3);
  }

  .route-badge {
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 0.7rem;
    font-weight: 700;
  }

  .badge-live {
    background: rgba(0,176,155,0.12);
    color: var(--teal);
  }

  .badge-busy {
    background: rgba(242,101,34,0.12);
    color: var(--orange);
  }

  mark {
    background: rgba(242,101,34,0.25);
    color: inherit;
    padding: 0 2px;
    border-radius: 3px;
  }

  @media (max-width: 900px) {
    .routes-grid {
      grid-template-columns: 1fr;
    }
  }
</style>