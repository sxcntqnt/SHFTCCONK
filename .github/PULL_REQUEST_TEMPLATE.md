**What changed**
- Brief description of the change (dependencies, overrides, tests added)

**Checklist for dependency overrides and audits**
- [ ] Explain why an override is required and list specific packages/versions changed
- [ ] Link to CVE/advisory or upstream issue that motivated the override
- [ ] Attach `pnpm-audit.json` artifact from CI (or paste relevant findings)
- [ ] Attach `gitleaks-report.json` (if secrets found, rotate and re-run)
- [ ] List integration/acceptance tests run and their results
- [ ] Plan for revert/remediation (date or condition to remove override)

**Security & Secrets**
- [ ] No secrets committed in PR diff
- [ ] If secrets were found, they are rotated and incident documented

**Testing**
- [ ] Unit tests pass
- [ ] Integration tests pass (describe environment)

**Release notes / follow up**
- [ ] Documented in release notes if behavior or dependencies changed
- [ ] Add follow-up ticket for dependency upgrades or removal of overrides
