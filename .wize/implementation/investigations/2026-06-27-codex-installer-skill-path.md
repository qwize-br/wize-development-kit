---
date: 2026-06-27
author: Shuri
severity: high
status: concluded
---

# Investigation — codex-installer-skill-path

## Frame
Codex install no projeto de exemplo estava gerando artefatos, mas o harness não carregava as skills Wize. O problema foi notado após comparar o comportamento com Claude Code, onde as skills apareciam normalmente. Impacto alto: a promessa multi-harness do instalador falha no target `codex`.

## Reproduce
1. Criar um repo temporário.
2. Rodar `node tools/installer/wize-cli.js install` escolhendo `codex` + `generic`.
3. Inspecionar os arquivos gerados.
**Expected:** skills em `.codex/skills/` para o Codex carregar no startup.
**Actual:** skills em `.agents/skills/`, diretório que o Codex não usa neste harness.

## Hypotheses
1. **Path do adapter Codex está errado** — Confidence: high. Test: inspecionar `adapters/codex/render.js` e `adapter.yaml`. Result: confirmed.
2. **Doctor/smoke/testes estão validados contra o path errado** — Confidence: high. Test: buscar `.agents/skills` em `test/` e `tools/installer/commands/doctor.js`. Result: confirmed.
3. **Falha é no conteúdo das skills, não no path** — Confidence: low. Test: comparar estrutura gerada com Claude/Antigravity. Result: refuted.

## Conclude
- **Root cause:** o target `codex` foi implementado e testado contra `.agents/skills/`, enquanto o harness Codex usado pelo projeto carrega skills de `.codex/skills/`.
- **Fix path:** alinhar o adapter Codex, o doctor, o bloco de `.gitignore`, os smoke tests e a documentação para `.codex/skills/`; depois validar com um install real.
- **Effort:** S
- **Risk of fix:** low
- **Next:** /wize-quick-dev
