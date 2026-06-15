---
epic_id: E02
status: done
owner: Tony Stark + Peggy Carter
linked_prd: document-project-expansion
priority: 2
estimate: M
---

# Epic 02: Add BMAD-equivalent templates and output files

## Outcome

The kit can produce the same family of docs BMAD generates: project overview, source tree analysis, architecture, component inventory, development guide, API contracts, data models, deployment guide, contribution guide, integration architecture, and deep-dive.

## Stories

- E02-S01: Add markdown templates for index, project-overview, source-tree-analysis
- E02-S02: Add markdown templates for architecture, component-inventory, development-guide
- E02-S03: Add conditional templates for api-contracts, data-models, deployment-guide, contribution-guide
- E02-S04: Add deep-dive template
- E02-S05: Add JSON Schema for project-scan-report state file
- E02-S06: Add validation tests for template completeness

## Dependencies

- E01-S03 (state file schema)
- E01-S05 (initial_scan conditional scan data)

## Success

- Every template has a test asserting required placeholders/sections exist.
- Templates render without breaking frontmatter parsing.
