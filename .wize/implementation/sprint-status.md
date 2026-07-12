# Sprint Status

## Post-0.6.0 maintenance — 2026-06-21 → 2026-07-04 — **shipped via `wize-quick-dev`**

Releases após o fechamento do sprint security-overlay rodaram como quick-dev
(sem sprint formal). Registro em `.wize/implementation/quick-dev-log.md`:

- **v0.7.3** (2026-06-27) — codex adapter volta ao path público `.agents/skills/`.
- **v0.8.0** (2026-07-04) — OpenCode native wiring (`agent:`/`subtask:`), reuse-before-write
  ladder da Shuri + fan-out pattern do Wizer, installer sugere comando inicial por estado
  do repo, e `docs/harnesses/*` (9 adapters, en+pt-BR). Suite verde (246), validate verde.

**Aberto:** RETRO-1 (testes de contrato real por ferramenta) — ver `backlog.md`.

---

## Sprint security-overlay — 2026-06-17 → 2026-06-21 — **CLOSED**

**Goal:** Entregar o `security-overlay` (AI Pentester) — pipeline file-first completo + report executivo, instalável como profile.

**Result:** ✅ Shipped. 8 epics / 27 stories, todas done. **v0.6.0** no npm. Validado end-to-end contra `sabia/starterkit-sabia`.

- Epics E01–E08 — all stories shipped, suite verde (246 testes), validate verde.
- Release v0.6.0 (Trusted Publishing + provenance + GitHub Release).
- Retrospectiva: `.wize/implementation/retrospective/2026-06-21.md`.

**Carry-over:** 0. **Próximo:** feature de auto-sugestão de sprint pós-scan (entregue — `_shared/backlog.js`) e, a partir de 2026-07-11, o épico E09 (UX/intent) aberto no review. Ver `backlog.md`.

---

## Sprint 4 — 2026-06-17

**Capacity:** 1 person-day (focused burst)
**Goal:** Implement P3 backlog (edge-case-hunter + index-docs + editorial-review-* + customize).

**Pulled:**
- E06-S01 — M — owner: Shuri + Hawkeye — gate: PASS
- E06-S02 — M — owner: Wizer + Peggy — gate: PASS
- E06-S03 — M — owner: Peggy — gate: PASS (covers both editorial-review-prose and editorial-review-structure)
- E06-S04 — M — owner: Wizer + Tony — gate: PASS

**Out (deferred):**
- None.

**Risks flagged:**
- None — all 4 stories shipped clean.

### Final day (2026-06-17)
**Trend:** Closed. P3 backlog shipped. Backlog fully drained.

**Blockers:**
- (none)

**Stories:**
- E06-S01 — gate-PASS — shipped (wize-review-edge-case-hunter; 4 hunt areas).
- E06-S02 — gate-PASS — shipped (wize-index-docs; rebuilds .wize/knowledge/index.md).
- E06-S03 — gate-PASS — shipped (wize-editorial-review-prose + wize-editorial-review-structure).
- E06-S04 — gate-PASS — shipped (wize-customize; guided override of built-ins).

**Decisions:**
- Backlog P1+P2+P3 all done. Total: 10 stories / 5 skills+workflows this cycle.
- Next: plan a new epic based on real usage (vs. parity with BMAD).

## Sprint 3 — 2026-06-16

**Capacity:** 1 person-day (focused burst)
**Goal:** Implement P2 backlog (project-context + checkpoint + investigate + qa-e2e).

**Pulled:**
- E05-S01 — M — owner: Tony — gate: PASS
- E05-S02 — M — owner: Shuri + Tony — gate: PASS
- E05-S03 — M — owner: Shuri + Hawkeye — gate: PASS
- E05-S04 — M — owner: Hawkeye — gate: PASS

**Out (deferred):**
- None.

**Risks flagged:**
- None — all 4 stories shipped clean.

### Final day (2026-06-16)
**Trend:** Closed. P2 backlog shipped.

**Blockers:**
- (none)

**Stories:**
- E05-S01 — gate-PASS — shipped (wize-project-context consolidates 5 artifacts).
- E05-S02 — gate-PASS — shipped (wize-checkpoint-preview records snapshot + decision).
- E05-S03 — gate-PASS — shipped (wize-investigate with 5-section RCA template).
- E05-S04 — gate-PASS — shipped (wize-qa-generate-e2e-tests with 3-10 cases per screen).

**Decisions:**
- P2 backlog shipped; P3 (review-edge-case-hunter, index-docs, editorial-review, customize) remains queued.

## Sprint 2 — 2026-06-15 → 2026-06-15

**Capacity:** 1 person-day (focused burst)
**Goal:** Implement P1 backlog (onboarding real + correct-course + edit-prd).

**Pulled:**
- E04-S01 — M — owner: Shuri — gate: PASS
- E04-S02 — M — owner: Shuri + Hill — gate: PASS
- E04-S03 — M — owner: Hill — gate: PASS

**Out (deferred):**
- None.

**Risks flagged:**
- None — all 3 stories shipped clean.

### Final day (2026-06-15)
**Trend:** Closed. P1 backlog shipped.

**Blockers:**
- (none)

**Stories:**
- E04-S01 — gate-PASS — shipped (wize-onboarding now `status: ready`, not stub).
- E04-S02 — gate-PASS — shipped (wize-correct-course created with 5 sections).
- E04-S03 — gate-PASS — shipped (wize-edit-prd created with 4 edit types + changelog).

**Decisions:**
- Installer name prompt: always ask, never silently accept OS username.
- Backlog P2 remains queued (project-context, checkpoint-preview, investigate, qa-generate-e2e-tests).

## Sprint 1 — 2026-06-11 → 2026-06-14

**Capacity:** 3 person-days (1 engineer × 3 days focused burst)
**Goal:** Land document-project engine expansion (v0.3.1) and BMAD steps import (v0.4.0/v0.4.1).

**Pulled:**
- E01-S01 — S — owner: Shuri — gate: PASS
- E01-S02 — M — owner: Shuri — gate: PASS
- E01-S03 — M — owner: Shuri — gate: PASS
- E01-S04 — M — owner: Shuri — gate: PASS
- E01-S05 — M — owner: Shuri — gate: PASS
- E01-S06 — M — owner: Shuri — gate: PASS
- E01-S07 — S — owner: Shuri — gate: PASS
- E01-S08 — S — owner: Shuri — gate: PASS
- E01-S09 — S — owner: Shuri — gate: PASS
- E01-S10 — S — owner: Shuri — gate: PASS
- E02-S01 — S — owner: Shuri — gate: PASS
- E02-S02 — S — owner: Shuri — gate: PASS
- E02-S03 — S — owner: Shuri — gate: PASS
- E02-S04 — S — owner: Shuri — gate: PASS
- E02-S05 — S — owner: Shuri — gate: PASS
- E02-S06 — S — owner: Shuri — gate: PASS
- E03-S01 — S — owner: Shuri — gate: PASS
- E03-S02 — S — owner: Shuri — gate: PASS
- E03-S03 — S — owner: Shuri — gate: PASS
- E03-S04 — S — owner: Shuri — gate: PASS
- E03-S05 — S — owner: Shuri — gate: PASS
- E03-S06 — S — owner: Shuri — gate: PASS

**Out (deferred):**
- None.

**Risks flagged:**
- Brownfield installer prompt residual input — mitigated in v0.4.1.

### Final day (2026-06-14)
**Trend:** Closed. All 22 stories shipped with TEA gate PASS.

**Blockers:**
- (none)

**Stories:**
- E01-S01 — gate-PASS — shipped.
- E01-S02 — gate-PASS — shipped.
- E01-S03 — gate-PASS — shipped.
- E01-S04 — gate-PASS — shipped.
- E01-S05 — gate-PASS — shipped.
- E01-S06 — gate-PASS — shipped.
- E01-S07 — gate-PASS — shipped.
- E01-S08 — gate-PASS — shipped.
- E01-S09 — gate-PASS — shipped.
- E01-S10 — gate-PASS — shipped.
- E02-S01 — gate-PASS — shipped.
- E02-S02 — gate-PASS — shipped.
- E02-S03 — gate-PASS — shipped.
- E02-S04 — gate-PASS — shipped.
- E02-S05 — gate-PASS — shipped.
- E02-S06 — gate-PASS — shipped.
- E03-S01 — gate-PASS — shipped.
- E03-S02 — gate-PASS — shipped.
- E03-S03 — gate-PASS — shipped.
- E03-S04 — gate-PASS — shipped.
- E03-S05 — gate-PASS — shipped.
- E03-S06 — gate-PASS — shipped.

**Decisions:**
- Updated kit version to 0.4.1.
- All E01–E03 stories marked done and gated PASS retroactively.
