---
status: baseline
owner: Pepper Potts + Tony Stark
created: {{date}}
last_refreshed: {{date}}
---

# {{project_name}} — Data Models{{#if part_id}} — {{part_id}}{{/if}}

**Date:** {{date}}

## Overview

{{data_model_overview}}

## Entities

{{#each entities}}
### {{name}}
- **Purpose:** {{purpose}}
- **Source:** `{{source_file}}`

#### Fields
{{#each fields}}
- `{{name}}` ({{type}}) — {{description}}
{{/each}}

#### Relationships
{{#each relationships}}
- {{description}}
{{/each}}
{{/each}}

---

_Generated using Wize Dev Kit `document-project` workflow_
