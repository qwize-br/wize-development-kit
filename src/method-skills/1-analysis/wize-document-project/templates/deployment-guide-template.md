---
status: baseline
owner: Pepper Potts + Tony Stark
created: {{date}}
last_refreshed: {{date}}
---

# {{project_name}} — Deployment Guide{{#if part_id}} — {{part_id}}{{/if}}

**Date:** {{date}}

## CI/CD

{{cicd_description}}

{{#each pipelines}}
- **{{name}}** — {{description}}
{{/each}}

## Infrastructure

{{infrastructure_description}}

{{#each resources}}
- **{{name}}** — {{description}}
{{/each}}

## Environments

{{#each environments}}
### {{name}}
- **URL:** {{url}}
- **Config:** {{config_notes}}
{{/each}}

## Release Process

{{release_process}}

---

_Generated using Wize Dev Kit `document-project` workflow_
