---
code: wize-create-skill
name: Create Skill
owner: builder
status: stub
---

# Create Skill

**Goal.** Scaffold a single-step skill in `.wize/custom/skills/{code}/`.

## Inputs (interactive)
- `code`, `name`, `description`
- `owner` (which agent owns this skill)
- `inputs[]`, `outputs[]`
- `body` (the actual skill content / prompt template)

## Outputs
- `.wize/custom/skills/{code}/skill.md`
- IDE adapter regeneration.

## Validation
- Schema (`schemas/skill.schema.json`).
- Markdown lint.
- Dry-run with stub input.
