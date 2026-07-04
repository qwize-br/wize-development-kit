# OpenCode — Wize Development Kit

🌐 **Idiomas:** [English](opencode.md) · **Português (pt-BR)**

← [Voltar ao README](../../README.pt-BR.md)

OpenCode é a harness onde a divisão persona/workflow do kit mapeia para uma primitiva **nativa**, em vez de ser achatada num único tipo de arquivo. Em todo o resto, "agente" e "workflow" viram o mesmo tipo de arquivo; no OpenCode eles viram duas coisas diferentes que o próprio OpenCode entende.

## Saída

`npx wize-dev-kit sync` (ou `install`) grava duas árvores:

- `.opencode/agents/wize-{code}.md` — as 10 personas (Wizer, Pepper, Shuri, Hawkeye...).
- `.opencode/commands/wize-{code}.md` — os workflows e skills (`/wize-dev-story`, `/wize-code-review`, ...).

## Destaques

- **`mode: primary | subagent`.** Só o `wize-orchestrator` (Wizer) é `primary`. Toda outra persona é `subagent` — endereçável direto com `@wize-agent-dev`, ou delegada automaticamente com base na `description`.
- **`agent:` nos commands.** O campo `owner:` de cada workflow/skill (ex.: `owner: wize-agent-dev # Shuri`) é resolvido contra as personas instaladas, então `/wize-dev-story` roda sob o system prompt da Shuri em vez do agente que estava ativo. Commands sem um dono claro (as skills do Agent Builder) ficam sem vínculo.
- **`subtask: true` nos workers de fan-out.** `wize-review-adversarial` e `wize-review-edge-case-hunter` — os dois workers nomeados que o `wize-code-review` dispara em paralelo — vêm marcados como `subtask: true`, então o OpenCode os isola do contexto de quem invocou, não importa quem seja.

Esta também é a harness contra a qual o padrão de fan-out de subagentes do kit (documentado na persona da Wizer) foi escrito: nomear cada worker, escopar seu contexto, despachar via `mode: subagent` / `subtask: true`, tolerar falha parcial.

## Como ativar

Escolha **OpenCode** como alvo de IDE em `npx wize-dev-kit install` (ou adicione depois e rode `npx wize-dev-kit sync`). Reinicie o OpenCode e diga *"Ative o Wizer e dê o briefing do projeto a ele"* ou rode `/wize-orchestrator`.

## Referência

- [opencode.ai/docs/agents](https://opencode.ai/docs/agents/)
- [opencode.ai/docs/commands](https://opencode.ai/docs/commands/)
