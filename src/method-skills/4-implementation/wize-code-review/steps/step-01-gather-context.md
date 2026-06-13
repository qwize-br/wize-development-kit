---
diff_output: ''
spec_file: ''
review_mode: ''
story_key: ''
---

# Step 1: Gather Context

## Rules

- Speak in `{communication_language}`.
- The prompt that triggered this workflow IS the intent.
- Do not modify any files in this step. Read-only.

## Instructions

1. **Find the review target.** Check in this order and stop as soon as the target is identified:

   **Tier 1 — Explicit argument.**
   Did the user pass a PR, commit SHA, branch, spec file, or diff source?
   - PR reference → resolve to branch/commit via `gh pr view`.
   - Commit or branch → use directly.
   - Spec file → set `{spec_file}` to the path. Check its frontmatter for `baseline_commit`.
   - Diff-mode keywords: `staged`, `uncommitted`, `branch diff`, `commit range`, `this diff`.

   **Tier 2 — Recent conversation.**
   Look for refs in the last few messages.

   **Tier 3 — Sprint tracking.**
   Look for `*sprint-status*` files and find stories with status `review`.

   **Tier 4 — Current git state.**
   If not on the default branch, confirm whether to review the current branch.

   **Tier 5 — Ask.**
   Present options: uncommitted changes, staged changes, branch diff, commit range, provided diff.

2. **Construct `{diff_output}`.**
   - Staged only: `git diff --cached`
   - Uncommitted: `git diff HEAD`
   - Branch diff: `git diff <base>..<branch>`
   - Commit range: `git diff <from>..<to>`
   - Provided diff: validate and use verbatim
   - File list: `git diff HEAD -- <files...>`, with untracked files included via `git diff --no-index /dev/null <path>`

   If `{diff_output}` is empty, halt and say so.

3. **Set the spec context.**
   - If `{spec_file}` is set and readable, set `{review_mode}` = `"full"`.
   - Otherwise ask: "Is there a spec or story file that provides context for these changes?"
     - Yes → set `{spec_file}`, verify it, set `{review_mode}` = `"full"`.
     - No → set `{review_mode}` = `"no-spec"`.

4. **Sanity check.**
   If the diff exceeds ~3000 lines, warn and offer to chunk.

### Checkpoint

Present a summary: diff stats, `{review_mode}`, loaded spec/context docs. Halt and wait for confirmation to proceed.

## Next

Read fully and follow `./step-02-review.md`.
