<div class="cong-visual">
  <span class="cong-label">Congestion Heatmap</span>
</div>

<style>
  .cong-visual {
    background: var(--surface);
    border: 1px solid var(--rim);
    border-radius: 20px;
    overflow: hidden;
    aspect-ratio: 4/3;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }
  .cong-visual::before {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at 40% 40%,
      rgba(242, 101, 34, 0.07),
      transparent 70%
    );
  }
  .cong-label {
    position: relative;
    font-family: var(--font-display);
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-3);
  }
</style>
