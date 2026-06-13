---
status: baseline
owner: Pepper Potts + Mantis
created: {{date}}
last_refreshed: {{date}}
---

# {{project_name}} — Component Inventory{{#if part_id}} — {{part_id}}{{/if}}

**Date:** {{date}}
**Type:** {{project_type}}

## Categorization

{{#each categories}}
### {{name}}
{{#each components}}
- **{{name}}** (`{{location}}`) — {{purpose}}
{{/each}}
{{/each}}

## Reuse

{{#each reusable_components}}
- **{{name}}** — {{usage_guidance}}
{{/each}}

## Design System

{{design_system_notes}}

## Component Dependencies

{{#each dependency_notes}}
- {{description}}
{{/each}}

---

_Generated using Wize Dev Kit `document-project` workflow_
