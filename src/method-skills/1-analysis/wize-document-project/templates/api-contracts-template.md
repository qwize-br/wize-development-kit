---
status: baseline
owner: Pepper Potts + Tony Stark
created: {{date}}
last_refreshed: {{date}}
---

# {{project_name}} — API Contracts{{#if part_id}} — {{part_id}}{{/if}}

**Date:** {{date}}

## Overview

{{api_overview}}

## Endpoints

{{#each endpoints}}
### {{name}}
- **Method:** {{method}}
- **Path:** `{{path}}`
- **Description:** {{description}}

#### Request
{{request_schema}}

#### Response
{{response_schema}}

#### Errors
{{#each errors}}
- **{{status}}** — {{description}}
{{/each}}
{{/each}}

---

_Generated using Wize Dev Kit `document-project` workflow_
