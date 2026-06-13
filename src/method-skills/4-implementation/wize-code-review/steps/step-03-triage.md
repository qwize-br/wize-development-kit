# Step 3: Triage

## Rules

- Speak in `{communication_language}`.
- Be precise. When uncertain between categories, prefer the more conservative classification.

## Instructions

1. **Normalize** findings into a common format. Expected input formats:
   - Blind Hunter: Markdown list of descriptions.
   - Edge Case Hunter: JSON array with `location`, `trigger_condition`, `guard_snippet`, `potential_consequence`.
   - Acceptance Auditor: Markdown list with title, AC/constraint reference, and evidence.

   Convert all to a unified list with:
   - `id` — sequential integer
   - `source` — `blind`, `edge`, `auditor`, or merged (`blind+edge`, etc.)
   - `title` — one-line summary
   - `detail` — full description
   - `location` — file and line reference if available

2. **Deduplicate.** Merge findings that describe the same issue:
   - Use the most specific finding as the base (prefer Edge Case Hunter JSON with location).
   - Append unique detail, reasoning, or locations from other findings.
   - Set `source` to merged sources.

3. **Classify** each finding into exactly one bucket:
   - **decision_needed** — ambiguous choice requiring human input. Only possible if `{review_mode}` = `"full"`.
   - **patch** — code issue fixable without human input.
   - **defer** — pre-existing issue not caused by this change.
   - **dismiss** — noise, false positive, or handled elsewhere.

   If `{review_mode}` = `"no-spec"` and a finding would be `decision_needed`, reclassify as `patch` or `defer`.

4. **Drop** all `dismiss` findings. Record the dismiss count.

5. If `{failed_layers}` is non-empty, report which layers failed. If zero findings remain and layers failed, warn the user that the review may be incomplete.

6. If zero findings remain after triage, state: "✅ Clean review — all layers passed."

## Next

Read fully and follow `./step-04-present.md`.
