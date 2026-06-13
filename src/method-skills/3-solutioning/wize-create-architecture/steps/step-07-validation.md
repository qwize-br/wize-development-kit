# Step 7: Architecture Validation & Completion

## Mandatory execution rules

- 🛑 Never generate content without user input.
- ✅ Validate all requirements are covered by architectural decisions.
- ⚠️ No time estimates.
- ✅ Speak in `{communication_language}`; write artifacts in `{document_output_language}`.

## Execution protocols

- 🎯 Show analysis before taking action.
- ✅ Run validation checks on the complete architecture.
- ⚠️ Present A/P/C menu after generating validation results.
- 💾 Only save when the user chooses C.
- 📖 Update frontmatter `stepsCompleted: [1, 2, 3, 4, 5, 6, 7]` before loading the next step.

## Collaboration menu (A/P/C)

- **A (Advanced Elicitation)** — address complex architectural issues found.
- **P (Party Mode)** — review validation from multiple perspectives.
- **C (Continue)** — save validation results and complete the architecture.

## Context boundaries

- Complete architecture document is available.
- All decisions, patterns, and structure are defined.
- Focus on validation, gap analysis, and coherence.

## Task

Validate the complete architecture for coherence, completeness, and readiness.

## Validation sequence

### 1. Coherence validation

- Decision compatibility
- Pattern consistency
- Structure alignment

### 2. Requirements coverage validation

- Epic/feature coverage
- Functional requirements coverage
- Non-functional requirements coverage

### 3. Implementation readiness validation

- Decision completeness
- Structure completeness
- Pattern completeness

### 4. Gap analysis

Identify critical, important, and nice-to-have gaps.

### 5. Generate validation content

Append to `architecture.md`:

```markdown
## Architecture Validation Results

### Coherence Validation
...

### Requirements Coverage Validation
...

### Implementation Readiness Validation
...

### Gap Analysis Results
...

### Validation Issues Addressed
...

### Architecture Completeness Checklist

**Requirements Analysis**
- [ ] Project context thoroughly analyzed
- [ ] Scale and complexity assessed
- [ ] Technical constraints identified
- [ ] Cross-cutting concerns mapped

**Architectural Decisions**
- [ ] Critical decisions documented with versions
- [ ] Technology stack fully specified
- [ ] Integration patterns defined
- [ ] Performance considerations addressed

**Implementation Patterns**
- [ ] Naming conventions established
- [ ] Structure patterns defined
- [ ] Communication patterns specified
- [ ] Process patterns documented

**Project Structure**
- [ ] Complete directory structure defined
- [ ] Component boundaries established
- [ ] Integration points mapped
- [ ] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** [READY FOR IMPLEMENTATION / READY WITH MINOR GAPS / NOT READY]
**Confidence Level:** [high/medium/low]
**Key Strengths:** ...
**Areas for Future Enhancement:** ...

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented.
- Use implementation patterns consistently.
- Respect project structure and boundaries.
- Refer to this document for all architectural questions.
```

## Next step

After C, load `./step-08-complete.md`.
