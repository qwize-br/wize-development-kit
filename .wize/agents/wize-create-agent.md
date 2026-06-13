# Create Agent

> workflow: Create Agent

# Create Agent

**Goal.** Scaffold and register a new custom agent under `.wize/custom/agents/{code}/`.

## Inputs (interactive)
- `code` (must match `^wize-agent-[a-z0-9-]+$` or `^wize-{anything}-[a-z0-9-]+$`)
- `name` (display)
- `title`
- `team`
- `module` (which module hosts it: orchestrator | method | tea | builder | custom)
- `description` (one paragraph)
- `style` (voice, brevity, motto)
- `skills[]`
- `inputs[]`, `outputs[]`

## Outputs
- `.wize/custom/agents/{code}/agent.yaml`
- `.wize/custom/agents/{code}/persona.md`
- Auto-regen of IDE adapter entries for all active targets.

## Validation
1. **Schema** — `agent.yaml` against `schemas/agent.schema.json`.
2. **Lint** — `persona.md` markdownlint.
3. **Dry-run** — invoke the agent with a synthetic prompt; assert response shape.

Any failure → registration aborted, errors printed to stderr.

## Override of a built-in
To override an existing built-in (e.g. tweak Pepper's tone), use:
```
wize-dev-kit agent edit wize-agent-analyst --override
```
This writes `.wize/custom/agents/wize-agent-analyst/customize.toml` instead of redefining the agent.
