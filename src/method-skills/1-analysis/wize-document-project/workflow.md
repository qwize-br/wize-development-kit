---
code: wize-document-project
name: Document Project (brownfield baseline)
phase: 1-analysis
owner: wize-agent-analyst   # Pepper Potts (paired with Peggy Carter)
status: stub
---

# Document Project — Brownfield Baseline

**Goal.** When the kit is installed in an existing codebase, baseline the current state so subsequent planning isn't blind. Produces an "as-is" snapshot that Tony reads before drawing the "to-be."

## When to run
- Installer detected `package.json` / `pubspec.yaml` / `Cargo.toml` / `go.mod` + non-trivial `src/` history.
- User explicitly requests `/wize-document-project`.

## Inputs
- The target repo (root)
- `git log --oneline -50`
- Existing READMEs / ARCHITECTURE / docs

## Outputs
- `.wize/knowledge/document-project/overview.md`
- `.wize/knowledge/document-project/architecture-snapshot.md`
- `.wize/knowledge/document-project/conventions.md`
- `.wize/knowledge/document-project/open-questions.md`

## Steps
1. **Inventory.** List packages, top-level modules, infra files, entry points.
2. **Architecture snapshot.** Components and integrations as currently exist. Diagrams welcome.
3. **Conventions.** Coding/test/folder conventions surfaced from a sample of files.
4. **Open questions.** Things the code doesn't answer; route to humans.
5. **Hand off.** Pepper to Wizer: "baseline ready." Then Wizer decides next agent.

## Pairing
Peggy Carter edits prose for clarity and structure. Tony Stark may be looped in to confirm architecture interpretation.
