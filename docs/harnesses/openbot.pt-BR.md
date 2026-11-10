# OpenBot — Wize Development Kit

🌐 **Idiomas:** [English](openbot.md) · **Português (pt-BR)**

← [Voltar ao README](../../README.pt-BR.md)

O OpenBot roda agentes no seu computador, cada um com seu workspace. O kit entrega o time inteiro: um agente por persona (Wizer, Pepper Potts, Maria Hill, Mantis, Nick Fury, Tony Stark, Hawkeye, Shuri, Peggy Carter e, com o overlay de segurança, Natasha Romanoff), cada um com a persona, as skills e as regras do time.

O OpenBot é um app de agentes, não um alvo de IDE. Nada é escrito no seu repositório e o `project.toml` não tem entrada `openbot`. Os agentes trabalham num repositório alvo que você indica e gravam os artefatos do método na pasta `.wize/` dele.

## Export: primeira importação

```bash
npx wize-dev-kit openbot export [--profiles a,b] [--lang pt-BR] [--out <dir>] [--json]
```

Grava `wize-dev-kit-openbot-<AAAA-MM-DD>.zip` em `~/Downloads` (ou em `--out`). O zip é montado numa pasta temporária, escrito como `.zip.part` e renomeado quando completo (o arquivo parcial tem nome único e é criado de forma exclusiva, então um symlink ou uma segunda exportação no mesmo dia não o faz gravar em outro lugar), então o OpenBot nunca lê um arquivo pela metade. No OpenBot, abra **Server settings → Import** e escolha o arquivo.

- **Perfis.** `--profiles`, senão `.wize/config/project.toml` quando roda dentro de um projeto instalado, senão `core,method,tea`. Uma flag explícita vence o `project.toml`. Os módulos core, method, tea, orchestrator e builder estão sempre ligados; cite um overlay (`web-overlay`, `app-overlay`, `security-overlay`) para somar as skills dele. A Natasha só é exportada com `security-overlay`.
- **Idioma.** `--lang`, senão o idioma de comunicação do projeto, senão `pt-BR`. Define o idioma das regras de trabalho e das memórias. As skills mantêm o idioma em que foram escritas. `pt-BR` e `en` têm texto próprio; qualquer outro código recebe o texto em inglês com a regra de responder nesse idioma.
- **Campos do agente.** `key` é o código da persona sem `wize-agent-` (`dev`, `orchestrator`, `pm`), `name` é o nome da persona, `title` é o papel. A descrição é um resumo curto da persona mais as regras de trabalho, com no máximo 2000 caracteres. A persona completa vai sempre em `agents/<key>/files/SOUL.md`, que o OpenBot copia para `imported/SOUL.md` no workspace do agente.
- **Skills.** Por agente: a skill da própria persona, as skills do `agent.yaml`, as skills de que ele é dono e o conjunto comum `wize-grill`, `wize-no-ai-slop`, `wize-subtract`, `wize-help`. O Wizer recebe `wize-help`, `wize-orchestrator`, `wize-party-mode`, `wize-check` e as skills para onde a tabela de intenções mais roteia. São renderizadas pelo mesmo emissor das outras harnesses, com os arquivos complementares, e cada pasta de skill leva um marcador `.wize-managed.json` para o primeiro `sync` depois da importação reconhecê-la. Se o OpenBot descartar arquivos ocultos na importação, as skills chegam sem marcador e o primeiro sync precisa de `--adopt`. O OpenBot aceita no máximo 32 por agente; quando há mais, as skills próprias ficam e o resto é descartado e listado, nunca em silêncio.
- **Memórias.** Roster do time com as chaves, a cadeia de handoff (Pepper Potts → Maria Hill → Mantis/Nick Fury → Tony Stark → Hawkeye risco → Shuri → Hawkeye trace, review e gate → Maria Hill status), a regra de que os artefatos vivem no `.wize/` do repositório alvo e de que o agente pergunta qual é o repositório alvo antes de escrever, e como delegar com o `openbot-cli`.
- **Verificações.** Antes de zipar, o manifesto é conferido contra os limites do OpenBot (nome 80, título 120, descrição 2000, 32 skills, 64 memórias de 500 caracteres, 200 arquivos e 10 MB por skill, sem `.env`, chaves privadas ou arquivos compactados aninhados). Uma violação sai com código 1 e diz qual.

`--json` imprime um objeto: `path`, `version`, `profiles`, `agents` (com `skills` e `dropped`), `dropped`, `skippedPersonas`, `import`.

## Sync: depois de cada atualização do kit

Os agentes importados guardam as skills da época da importação. Depois de cada atualização do kit, renove-os no lugar:

```bash
npx wize-dev-kit@latest openbot sync [--team <arquivo>] [--agents-dir <dir>] [--dry-run] [--adopt] [--allow-outside] [--strict] [--json] [--profiles a,b] [--lang pt-BR]
```

Para cada workspace mapeado, grava as skills do agente em `.agents/skills/<nome>/` e em `.claude/skills/<nome>/`, cada pasta com um marcador `.wize-managed.json` (`{"managedBy":"wize-dev-kit","version":"<kit>"}`), e mantém um bloco no `AGENTS.md` entre `<!-- wize-dev-kit:begin -->` e `<!-- wize-dev-kit:end -->` (persona, regras de trabalho, ponteiros do kit). Cria o `AGENTS.md` quando não existe; quando o arquivo existe sem o bloco, acrescenta um no fim. O texto fora do bloco nunca é reescrito. O sync nunca chama o OpenBot para alterar um agente; rode `--dry-run` antes para ver o que mudaria. O resumo conta pastas de skill e, separado, os arquivos gravados ou inalterados dentro delas (`skills.folders`, `skills.written`, `skills.unchanged` no `--json`). Um workspace que falha (permissão, arquivo no lugar de pasta) é reportado como erro e os outros continuam; o código de saída é 1 só com `--strict` ou quando todos os agentes falharam.

Perfis e idioma se resolvem como no `export`, e nada é lembrado entre execuções: a flag, senão o `project.toml`, senão os padrões (`core,method,tea`, `pt-BR`). Fora de um projeto, passe os mesmos `--profiles` e `--lang` do `export` em todo sync. Sem uma lista explícita de perfis, o sync nunca remove skills do kit: pastas fora do conjunto padrão ficam como estão e um aviso diz isso. Skills obsoletas do kit só são removidas quando os perfis vêm de `--profiles` ou do `project.toml`. A linha de resumo mostra de onde veio cada valor. O texto da persona mantém o idioma em que foi escrito (o resumo no `agent.yaml` é em inglês); só as regras de trabalho e as memórias seguem o `--lang`. Uma persona mapeada cujo módulo não está ativo (a Natasha sem `security-overlay`) é pulada com aviso.

### team.json

O mapa de chave da persona para workspace fica em `~/OpenBot/Shared/wize-dev-kit/team.json` (`--team`):

```json
{ "version": 1, "agents": { "dev": "agent-e6eed6e5-ec65-47c2-9a2a-5244275667e9", "pm": "/home/eu/OpenBot/Agents/agent-5bd7d7c0" } }
```

O valor é um id de agente (o workspace é `<agents-dir>/<id>`, padrão `~/OpenBot/Agents`), um caminho relativo à pasta de agentes que fique dentro dela, ou um caminho absoluto. Um caminho absoluto fora da pasta de agentes é recusado, a menos que você passe `--allow-outside` (e então ele precisa ter `AGENTS.md` ou `.agents/`), para que um erro de digitação no arquivo não aponte o sync para um repositório comum. Um workspace para o qual duas chaves resolvem é pulado para ambas, com aviso, até o `team.json` apontar uma persona por workspace. A pasta pessoal, `/`, `.`, `..` e qualquer pasta acima da pasta de agentes são recusados com aviso. Quando o arquivo não existe, o sync o monta: roda `openbot-cli list --json` (o caminho em `OPENBOT_CLI`, senão `openbot-cli` no `PATH`) e casa os agentes pelo nome da persona; depois casa as personas restantes com o primeiro título do `AGENTS.md` de cada workspace (`# Shuri — ...`). Grava só o `team.json` e imprime os casamentos. Persona sem casamento ou com vários é reportada e pulada; o código de saída continua 0 com avisos, e `--strict` o torna 1. Um `team.json` existente não é redescoberto: agentes importados depois da primeira execução continuam sem mapa ("not in team.json; skipped") até você adicioná-los ao arquivo ou apagá-lo para a próxima execução remontá-lo. O sync nunca edita um `team.json` existente; só grava o arquivo quando ele não existe, e não grava nada quando nenhum agente foi encontrado.

### O que o sync nunca toca

- Pastas de skill com `.openbot-managed.json`.
- Pastas de skill sem o marcador do kit. Uma pasta `wize-*` de instalação manual fica como está, com aviso; `--adopt` a substitui (e ainda assim nunca uma pasta gerenciada pelo OpenBot).
- Qualquer coisa fora das pastas de skill e do bloco do `AGENTS.md`. Pastas gerenciadas pelo kit que saíram do conjunto do agente são removidas, mas só quando o nome é um código de skill que o kit distribui (em qualquer perfil) e é igual ao `name` do `SKILL.md`; uma cópia feita com `cp -r` e renomeada é mantida (com aviso), mesmo com o `name` ajustado; arquivos dentro de uma pasta gerenciada que saíram da origem são podados.
- Symlinks que saem do workspace: uma pasta de skills ou um `AGENTS.md` que resolve para fora do workspace é recusado, assim como um workspace que é ele mesmo um symlink. Uma pasta de skill gerenciada pelo kit que contém um symlink em qualquer nível, ou uma skill do kit obsoleta que é ela mesma um symlink, é pulada com aviso. Um `AGENTS.md` que é symlink para dentro do workspace é gravado no arquivo de destino.

## Delegação entre agentes

Com **Local scripts** ligado num agente, outro agente (normalmente o Wizer) pode passar trabalho para ele:

```bash
echo "<tarefa>" | openbot-cli run <id-ou-nome-do-agente> - --wait
```

A mensagem traz o repositório alvo, o artefato de entrada (um caminho em `.wize/`), o que entregar e o critério de pronto. Códigos de saída: 0 concluído, 1 falhou, 3 espera uma pessoa, 4 estourou o tempo, 5 OpenBot inacessível ou agente não encontrado.

## Limites

- 32 skills, 64 memórias e 2000 caracteres de descrição por agente (limites do OpenBot).
- `export` e `sync` leem o kit instalado pelo `npx`; rode `npx wize-dev-kit@latest` para ter as personas e skills mais novas.
- Um zip comporta no máximo 65535 arquivos; o gerador recusa mais que isso e não escreve zip64.
- Avatares e rotinas dos agentes não entram no export.
