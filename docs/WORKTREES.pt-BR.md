# Worktrees e atualizações automáticas

🌐 **Idiomas:** [English](WORKTREES.md) · **Português (pt-BR)**

← [Voltar ao README](../README.pt-BR.md)

Um `git worktree` novo só tem os arquivos que o git rastreia. As skills geradas pelo kit não são rastreadas, então um worktree novo começa sem `/wize` e companhia. Este guia explica como o kit resolve isso sozinho e o que cada comando faz no seu repo enquanto isso acontece.

## O que fica onde

| Tipo | Arquivos | No git? | Quem escreve |
|---|---|---|---|
| Rastreado, compartilhado | `.wize/config/project.toml` (guarda o pin `kit_version`), `.wize/config/tea.toml`, `.wize/custom/`, artefatos de planning, solutioning, implementation e knowledge, `AGENTS.md`, o bloco gerenciado do `.gitignore`, `.wize/hooks/hydrate.sh` e as configs de hook do `hooks install` | sim | `install`, `update` e você |
| Gerado | entradas `wize-*` por target (`.claude/skills/`, `.cursor/rules/`, `.github/skills/`, `.agents/skills/`, `.opencode/`, `.wize/agents/` e os demais), mais o alias `wize` ao lado | não, no `.gitignore` | `hydrate`, `sync` |
| Por desenvolvedor | `.wize/config/user.toml`, `.wize/scratch/`, `.wize/.local/` (o marcador `hydrated.json`), `.wize/implementation/quick-dev-log.md` | não, no `.gitignore` | `hydrate` (user.toml), você |

`.claude/worktrees/` também está no `.gitignore`, então worktrees que o Claude Code cria dentro do repo não aparecem no `git status`.

## O pin

`kit_version` em `.wize/config/project.toml` é a única fonte de verdade sobre qual kit renderiza o repo. Todo o time renderiza exatamente essa versão, qualquer que seja o `npx` que cada um rodou.

- `hydrate` renderiza o pin. Para pin 0.27.0 ou superior ele se reexecuta como `npx wize-dev-kit@<pin> hydrate` quando o binário é diferente, com uma trava (`WIZE_HYDRATE_DELEGATED`) contra recursão. Se isso falhar (offline, registry fora do ar; cada tentativa tem teto de 45 s e uma tentativa que estoura o tempo não é repetida), renderiza com o binário que tem e avisa. Esse render de fallback vale como atual por uma hora; depois disso o próximo `hydrate --if-needed` tenta o pin exato de novo.
- Pins anteriores à 0.27.0 não têm `hydrate`. Nesses casos o `version-check` indica `sync` como comando e nunca entra em loop.
- Pin mais novo que o binário significa cache do `npx` desatualizado. O `update` não rebaixa o pin, a menos que você passe `--allow-downgrade`.

## Checklist de um worktree novo

```bash
npx wize-dev-kit hydrate
```

É o checklist inteiro. O `hydrate`:

- acha a raiz do projeto a partir de qualquer subdiretório ou worktree linkado (`--root <dir>` ou `WIZE_PROJECT_ROOT` sobrescrevem);
- copia `.wize/config/user.toml` do checkout primário, ou deriva um de `git config user.name`, e nunca sobrescreve um existente;
- renderiza os adapters dos targets configurados, pulando arquivos cujo conteúdo não mudou;
- grava o marcador `.wize/.local/hydrated.json`;
- nunca pergunta nada, nunca lê stdin, nunca roda o baseline do document-project e nunca escreve em arquivo rastreado.

Antes de renderizar ele registra o `git ls-files`; uma renderização que sobrescreveria um arquivo rastreado é bloqueada, inclusive quando chegaria a ele por um diretório que é symlink. Se o git não consegue listar os arquivos rastreados (git ausente, ou repositório que o git recusa por segurança), o hydrate não toca em nenhum arquivo existente e avisa. Depois compara o `git status` e avisa se surgiram entradas novas, o que em geral indica um `.gitignore` anterior à 0.27.0.

Para automatizar, instale um hook (próxima seção).

## O ciclo automático

1. **Início de sessão.** Uma skill (`/wize`, `/wize-help`) roda `version-check --json` e segue o campo `action`: `hydrate` e `update` rodam sem perguntar; a única confirmação vem antes do `update --pr`, porque ele faz push. O bloco de bootstrap do `AGENTS.md` leva a mesma instrução para harnesses que não carregam skills primeiro.
2. **Criação de worktree.** Orca, Cursor e Claude Code podem rodar `.wize/hooks/hydrate.sh` quando um worktree ou sessão começa (veja a matriz de harnesses).
3. **Toda semana.** Uma GitHub Action abre um PR que atualiza o pin (`hooks install --github-action`).
4. **Depois do merge.** Cada worktree puxa o pin novo, vê que o marcador está velho e se hidrata sozinho na versão nova.

O `version-check` lê o registry por um cache stale-while-revalidate em `$XDG_CACHE_HOME` (ou `~/.cache`): a resposta em cache volta em qualquer idade, e uma entrada velha dispara um único refresh em segundo plano, no máximo a cada 10 minutos. Nenhum refresh começa em CI, com `WIZE_DISABLE_UPDATE_CHECK=1` ou com `WIZE_NO_BG_REFRESH=1`; a dica de uma linha ao fim de um comando também fica em silêncio sem TTY. As dicas de comando e o `hydrate` nunca esperam pela rede; um `version-check` explícito espera no máximo cerca de 1,5 s pelo registry quando o cache está velho.

### Desligar

`WIZE_DISABLE_UPDATE_CHECK=1` desliga a consulta ao registry e rebaixa a action `update` para `none`. A hidratação continua acontecendo. Ainda não existe chave em nível de time no `project.toml`.

## Atualizando o kit

```bash
npx wize-dev-kit@latest update          # prepara a branch do bump localmente
npx wize-dev-kit@latest update --pr     # também faz push e abre o PR
```

Em um repo git o `update` trabalha num worktree descartável:

1. Faz fetch e cria a branch a partir de `origin/<default>` (ou da branch default local se o fetch falhar, e avisa).
2. Nesse worktree ele atualiza o `kit_version`, renova o bloco gerenciado do `.gitignore` e o bloco de bootstrap do `AGENTS.md` (só num `AGENTS.md` gerado pelo kit), renova o `hydrate.sh` quando está instalado e gerenciado, e remove do índice os arquivos rastreados sob os 12 caminhos de alias gerados.
3. Faz o commit em `chore/wize-kit-<versão>` e remove o worktree.

Seu checkout, branch, índice e arquivos não commitados nunca são tocados, e o `update` nunca commita na branch default, então dá para rodar com a árvore suja ou HEAD destacado. O `--pr` faz push sem force (push rejeitado sai com 1 e avisa que a branch remota divergiu) e abre o PR com `gh`, ou imprime a URL de compare do GitHub quando não há `gh`.

| Flag | Efeito |
|---|---|
| `--pr` | Faz push da branch e abre um PR. Vale como consentimento para o push. |
| `--in-place` | Edita o checkout atual, re-renderiza, nunca commita. Sempre o modo fora de um repo git. |
| `--no-render` | Com `--in-place`: pula a re-renderização dos adapters. |
| `--check` | Só reporta. Sai com 0 convergido, 11 mudanças pendentes, 12 pin à frente do binário. |
| `--dry-run` | Imprime o plano, não escreve nada, sai com 0. |
| `--base <ref>` | Cria a branch a partir desta ref em vez da branch default. |
| `--allow-downgrade` | Deixa o pin ir para uma versão mais antiga. |
| `--json` | Um objeto JSON no stdout. |

### Migrando um repo existente

Rode `npx wize-dev-kit@latest update --pr` uma vez por repo e faça o merge do PR. Uma pegadinha: o PR remove do índice os arquivos de alias antigos (por exemplo `.cursor/rules/wize.mdc`) que versões anteriores commitaram sem querer. Quando outro worktree puxa o merge, o git apaga esses arquivos lá. Rode o `hydrate` nesse worktree, ou deixe o ciclo da sessão fazer isso, e eles voltam como arquivos não rastreados e ignorados.

## Matriz de harnesses

`npx wize-dev-kit hooks print <target>` imprime os trechos do Orca, Claude Code, Cursor, Codex e da Action semanal abaixo sem escrever nada (o Copilot cloud agent não tem alvo de print). `hooks install` grava o `.wize/hooks/hydrate.sh` gerenciado (POSIX sh, sempre sai com 0, escreve no stderr) mais a config pedida com `--claude`, `--cursor` ou `--github-action`; exige ao menos uma dessas flags.

| Harness | Configuração |
|---|---|
| Orca | No `orca.yaml`: `scripts.setup: sh .wize/hooks/hydrate.sh` e `setupAgentStartupPolicy: wait-for-setup`. Liste `.wize/config/user.toml` no `.worktreeinclude`. Um hook de setup não vazio salvo localmente no Orca sobrescreve o `orca.yaml`, então limpe-o nas configurações do repo. |
| Claude Code | `hooks install --claude` adiciona uma entrada `SessionStart` (matcher `startup`) ao `.claude/settings.json`, mesclada com seus hooks existentes. Adicione `.wize/config/user.toml` ao `.worktreeinclude` para copiá-lo para os worktrees. |
| Cursor | `hooks install --cursor` grava `.cursor/worktrees.json` com `setup-worktree: ["sh .wize/hooks/hydrate.sh"]`. |
| Codex | Defina o script de setup do ambiente local como `sh .wize/hooks/hydrate.sh`. O Codex guarda isso na config própria, então o kit só imprime. |
| GitHub Copilot cloud agent | Adicione `npx --yes wize-dev-kit hydrate` como um passo em `.github/workflows/copilot-setup-steps.yml`. |
| PR semanal de bump | `hooks install --github-action` grava `.github/workflows/wize-kit-update.yml`. Habilite "Allow GitHub Actions to create and approve pull requests" nas configurações do repo. PRs abertos com `GITHUB_TOKEN` não disparam outros workflows, então os checks obrigatórios esperam até alguém fazer push na branch. |

Nenhum desses caminhos foi verificado de ponta a ponta em cada produto; veja a última seção.

## O que o `git worktree remove` perde

Tudo que não é rastreado naquele worktree: `user.toml`, `.wize/scratch/`, `.wize/.local/`, `quick-dev-log.md` e os adapters gerados. Tudo isso se regenera com `hydrate`, exceto as notas de scratch e o quick-dev-log, que só existem naquele worktree. Faça commit ou copie antes. Os artefatos de `.wize/` (PRD, stories, knowledge) são rastreados, então viajam com a branch.

## Concorrência

Vários worktrees, ou vários agentes no mesmo worktree, podem renderizar ao mesmo tempo. Toda escrita passa por write-if-changed mais um rename atômico de arquivo temporário, então quem lê nunca vê uma skill pela metade e uma segunda execução reporta todos os arquivos como inalterados. A trava de arquivos rastreados impede que o `hydrate` sobrescreva algo que você commitou. `sync` e `update --in-place` escrevem de forma atômica, mas sem a trava: são os comandos explícitos de regeneração.

## Variáveis de ambiente

| Variável | Efeito |
|---|---|
| `WIZE_PROJECT_ROOT` | Raiz do projeto quando você roda um comando fora dela. `--root` tem precedência. |
| `ORCA_WORKTREE_PATH`, `ORCA_ROOT_PATH` | Lidas só pelo `hydrate`: o worktree a renderizar (usado só quando o diretório atual não está dentro de um projeto) e uma origem para o `user.toml` (usada só se pertencer ao mesmo repositório). |
| `WIZE_SKIP_BASELINE=1` | Pula o baseline do document-project durante o `install` e faz o `document-project quick` não fazer nada. |
| `WIZE_HYDRATE_DELEGATED` | Definida pelo `hydrate` ao delegar para o kit do pin. Não defina você mesmo. |
| `WIZE_DISABLE_UPDATE_CHECK=1` | Sem consulta ao registry; a action `update` vira `none`. |
| `WIZE_NO_BG_REFRESH=1` | Nunca inicia o refresh do cache em segundo plano. |
| `WIZE_VERBOSE=1` | Mostra a saída crua do `npx` de um `hydrate` delegado que falhou (normalmente uma linha de fallback). |
| `CI` | Suprime avisos de update e o refresh em segundo plano. |

## Códigos de saída

Os padrões continuam 0 para não quebrar scripts existentes. As formas estritas são opt-in.

| Comando | Códigos |
|---|---|
| `hydrate` | Sempre 0. `--strict` retorna 1 quando não conseguiu hidratar. |
| `version-check --exit-code` | 0 nada a fazer, 10 `hydrate`, 11 `update`, 12 `use-pin`, 13 `install`. |
| `update --check` | 0 convergido, 11 mudanças pendentes, 12 pin à frente do binário. |
| `doctor --strict` | 1 quando existe alguma sugestão de nível erro. |

`doctor --json` e `version-check --json` imprimem um objeto JSON, sem banner.

## Fora da 0.27.0

- Estado `.wize` compartilhado entre worktrees (symlink ou branch de estado); manifestos de sprint, alocação de IDs de ADRs e stories, fragmentos por story do document-project, fragmentos de changelog, um `index.md` determinístico, um gatilho de NFR por epic, e referências a `sprint-status.md` fora do `doctor`.
- Caminhos relativos no `project-scan-report.json` (ele ainda guarda caminhos absolutos).
- `wize-release` a partir de um worktree linkado, ou release via PR.
- Uma política para `.wize/security/` (ignorar ou commitar).
- Regenerar o `AGENTS.md` além do bloco de bootstrap; um marcador de versão no `AGENTS.md`.
- Remover skills geradas que um kit mais novo retirou.
- `update` se reexecutar como `@latest` a partir de um binário antigo fixado pelo pin. A trava de downgrade e o `@latest` nas skills e na Action cobrem isso.
- Uma chave `[update] auto = false` em nível de time. Só existe a variável de ambiente.
- Escrever o `orca.yaml` ou a config do Codex. Ambos só imprimem. Sem variante de `hydrate.sh` para Windows.
- Pin por Renovate ou Dependabot, que criaria uma segunda fonte de verdade para o pin.
- Recusa dura do `sync` em caso de skew de versão, e saída não zero quando um adapter falha.
- Verificações de ponta a ponta no Orca (falha de setup, prompt de trust), no timing do `SessionStart` do Claude Code contra o carregamento de skills, e na leitura de rules em worktrees pelo Cursor ou Windsurf.
