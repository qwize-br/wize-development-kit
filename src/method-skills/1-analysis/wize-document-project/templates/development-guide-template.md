---
status: baseline
owner: Pepper Potts + Peggy Carter
created: {{date}}
last_refreshed: {{date}}
---

# {{project_name}} — Development Guide{{#if part_id}} — {{part_id}}{{/if}}

**Date:** {{date}}
**Type:** {{project_type}}

## Local Setup

{{setup_instructions}}

### Prerequisites

{{prerequisites}}

### Install

```bash
{{install_command}}
```

### Run

```bash
{{run_command}}
```

### Test

```bash
{{test_command}}
```

## Development Workflow

{{workflow_description}}

## Conventions

{{conventions_summary}}

## Common Commands

{{#each commands}}
- `{{command}}` — {{description}}
{{/each}}

## Troubleshooting

{{#each troubleshooting_notes}}
- {{issue}}: {{solution}}
{{/each}}

---

_Generated using Wize Dev Kit `document-project` workflow_
