---
code: wize-web-deploy
name: Web Deploy Playbook
overlay: web
owner: wize-agent-architect   # Tony
status: stub
---

# Web Deploy Playbook

**Goal.** Document the deploy path: provider, environments, secrets, rollback.

## Inputs
- `.wize/solutioning/architecture.md`
- `.wize/planning/nfr-principles.md` (cost, reliability)

## Output
- `.wize/solutioning/deploy/web-deploy.md`

## Sections
- Provider (Vercel / Cloudflare / Fly / self-hosted Coolify / etc.)
- Environments (dev / preview / prod)
- Secrets management
- Build/deploy commands
- Smoke checks
- Rollback procedure
