---
status: baseline
owner: Pepper Potts + Tony Stark
created: {{date}}
last_refreshed: {{date}}
---

# {{project_name}} — Architecture{{#if part_id}} — {{part_id}}{{/if}}

**Date:** {{date}}
**Type:** {{project_type}}
**Architecture Pattern:** {{architecture_pattern}}

## Executive Summary

{{architecture_summary}}

## Entry Points

{{#each entry_points}}
- **`{{path}}`** — {{description}}
{{/each}}

## Components

{{#each components}}
### {{name}}
- **Responsibility:** {{responsibility}}
- **Location:** `{{location}}`
- **Depends on:** {{dependencies}}
- **Used by:** {{dependents}}
{{/each}}

## Data Flow

{{data_flow_description}}

## Integrations

{{#each integrations}}
- **{{name}}** — {{description}}
- **Type:** {{integration_type}}
- **Boundary:** {{boundary}}
{{/each}}

## Decisions & Trade-offs

{{#each decisions}}
- {{description}}
{{/each}}

---

_Generated using Wize Dev Kit `document-project` workflow_
