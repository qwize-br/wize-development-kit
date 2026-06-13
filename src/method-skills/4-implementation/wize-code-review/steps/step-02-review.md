---
failed_layers: ''
---

# Step 2: Review

## Rules

- Speak in `{communication_language}`.
- The Blind Hunter subagent receives **only** the diff — no project context.
- The Edge Case Hunter subagent receives the diff and project read access.
- The Acceptance Auditor subagent receives the diff, spec, and context docs.
- All review subagents run at the same model capability as the current session.

## Instructions

1. If `{review_mode}` = `"no-spec"`, note: "Acceptance Auditor skipped — no spec file provided."

2. Launch parallel subagents without conversation context:

   - **Blind Hunter** — receives `{diff_output}` only. Invoke via `wize-review-adversarial`.
     Prompt: "Review this diff cynically. Assume problems exist. Find at least ten issues. Output as a Markdown list with one-line titles."

   - **Edge Case Hunter** — receives `{diff_output}` and read access to the project. Invoke via `wize-review-edge-case-hunter`.
     Prompt: "Walk every branching path and boundary condition in this diff. Report only unhandled edge cases as a JSON array."

   - **Acceptance Auditor** (only if `{review_mode}` = `"full"`) — receives `{diff_output}`, `{spec_file}` content, and context docs.
     Prompt: "Review this diff against the spec. Check for violations of acceptance criteria, deviations from spec intent, and missing behavior. Output findings as a Markdown list with AC/constraint reference and evidence."

3. If subagents are unavailable, generate prompt files in `{implementation_artifacts}` and halt, asking the user to run each in a separate session.

4. If any subagent fails, times out, or returns empty, append the layer name to `{failed_layers}` and proceed with findings from the remaining layers.

5. Collect all findings from completed layers.

## Next

Read fully and follow `./step-03-triage.md`.
