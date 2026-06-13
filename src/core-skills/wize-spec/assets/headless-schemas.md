# Headless response schemas for wize-spec

Used when `wize-spec` is invoked non-interactively (headless).

## Create / Update

```json
{
  "error_code": null,
  "spec_path": "{project-root}/.wize/specs/spec-{slug}/SPEC.md",
  "slug": "{slug}",
  "capabilities": ["CAP-1", "CAP-2"],
  "companions": ["glossary.md"],
  "assumptions": [],
  "open_questions": [],
  "verdict": "Coherence: pass. Preservation: pass."
}
```

## Error codes

- `missing_slug` — headless caller did not provide a slug and it could not be derived.
- `insufficient_intent` — no input content provided.
- `too_sparse` — input too thin to distill; suggest `wize-product-brief` or `wize-create-prd`.

## Validate

```json
{
  "error_code": null,
  "violations": [
    {
      "rule": "4",
      "message": "No explicit non-goals found."
    }
  ],
  "verdict": "Coherence: 1 issue. Preservation: pass."
}
```
