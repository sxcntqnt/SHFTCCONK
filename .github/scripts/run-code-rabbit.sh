
#!/usr/bin/env bash
set -euo pipefail

echo "Starting CodeRabbit helper script"

if [ -z "${CODE_RABBIT_API_KEY:-}" ]; then
  echo "CODE_RABBIT_API_KEY not set; skipping CodeRabbit scan"
  echo '{}' > code-rabbit-report.json
  exit 0
fi

# Prefer pnpm dlx (pnpm is available in the workflow); fall back to npx if needed.
if command -v pnpm >/dev/null 2>&1; then
  echo "Running CodeRabbit via pnpm dlx (pinned latest)"
  pnpm dlx code-rabbit@latest scan --api-key "$CODE_RABBIT_API_KEY" --format json -o code-rabbit-report.json || echo '{}' > code-rabbit-report.json
else
  echo "pnpm not found; falling back to npx"
  npx --yes code-rabbit@latest scan --api-key "$CODE_RABBIT_API_KEY" --format json -o code-rabbit-report.json || echo '{}' > code-rabbit-report.json
fi

echo "CodeRabbit helper script finished"
