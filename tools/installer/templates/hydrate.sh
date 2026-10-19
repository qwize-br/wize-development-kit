#!/bin/sh
# wize-dev-kit managed hook v1
# Hydrates this checkout from .wize/config/project.toml without touching tracked
# files. `wize-dev-kit update` refreshes this file; local edits are overwritten.
# Always exits 0 so a failure never blocks worktree creation or a session start.
# Messages go to stderr: a Claude Code SessionStart hook adds stdout to the context.

# Same precedence as the CLI's resolveRoot: CLAUDE_PROJECT_DIR (the Claude session's
# own checkout), then the project found from the current directory (up to the git
# boundary), and only then ORCA_WORKTREE_PATH, which may be inherited from an Orca
# terminal of another worktree. The child hydrates this directory whatever else the
# environment says.
root=""
if [ -n "$CLAUDE_PROJECT_DIR" ]; then
  root=$CLAUDE_PROJECT_DIR
else
  # The walk ends at the first directory holding .git; with none above, only $PWD counts.
  boundary=""
  d=$PWD
  while :; do
    if [ -e "$d/.git" ]; then boundary=$d; break; fi
    parent=$(dirname "$d")
    [ "$parent" = "$d" ] && break
    d=$parent
  done
  d=$PWD
  while :; do
    if [ -f "$d/.wize/config/project.toml" ]; then root=$d; break; fi
    { [ -z "$boundary" ] || [ "$d" = "$boundary" ]; } && break
    d=$(dirname "$d")
  done
  [ -n "$root" ] || root=${ORCA_WORKTREE_PATH:-$PWD}
fi
cd "$root" || exit 0
WIZE_PROJECT_ROOT=$PWD
export WIZE_PROJECT_ROOT
toml=.wize/config/project.toml
[ -f "$toml" ] || { echo "wize: no $toml here, skipping" >&2; exit 0; }

pin=$(sed -n 's/^kit_version *= *"\([^"]*\)".*/\1/p' "$toml" | head -1)
# Anchored: a glob would let "1.2.3.4:host/repo" through, which npm reads as a git spec.
printf '%s' "$pin" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$' || pin=""
pkg="wize-dev-kit@${pin:-latest}"

# Where the first configured target keeps its wize-* entries and its `wize`
# entrypoint (mirrors ALIAS_BY_TARGET in setup-helpers.js).
target=$(sed -n 's/^ide_targets *= *\[ *"\([^"]*\)".*/\1/p' "$toml" | head -1)
case "${target:-claude-code}" in
  claude-code) dir=.claude/skills;     alias=.claude/skills/wize ;;
  copilot)     dir=.github/skills;     alias=.github/skills/wize ;;
  antigravity) dir=.agent/skills;      alias=.agent/skills/wize ;;
  codex)       dir=.agents/skills;     alias=.agents/skills/wize ;;
  kimi-code)   dir=.kimi/skills;       alias=.kimi/skills/wize ;;
  hermes)      dir=.hermes/skills;     alias=.hermes/skills/wize ;;
  kiro)        dir=.kiro/skills;       alias=.kiro/skills/wize ;;
  cursor)      dir=.cursor/rules;      alias=.cursor/rules/wize.mdc ;;
  windsurf)    dir=.windsurf/rules;    alias=.windsurf/rules/wize.md ;;
  continue)    dir=.continue/prompts;  alias=.continue/prompts/wize.prompt ;;
  opencode)    dir=.opencode/agents;   alias=.opencode/commands/wize.md ;;
  generic)     dir=.wize/agents;       alias=.wize/agents/wize.md ;;
  *)           dir="";                 alias="" ;;
esac

# True when `dir` holds wize-* entries and the `wize` entrypoint exists.
has_wize() {
  [ -n "$dir" ] && [ -n "$alias" ] && [ -e "$alias" ] || return 1
  for f in "$dir"/wize-*; do [ -e "$f" ] && return 0; done
  return 1
}

# hydrate ships in 0.27.0; older pins only know sync.
legacy=0
if [ -n "$pin" ] && [ "$(printf '%s\n' 0.27.0 "$pin" | sort -V | head -1)" != 0.27.0 ]; then legacy=1; fi
# sort -V ranks 0.27.0-rc.1 after 0.27.0; semver ranks it before.
case "$pin" in 0.27.0-*) legacy=1 ;; esac

# The pin a marker records: its "pin" when present, else "kit_version".
marker=.wize/.local/hydrated.json
marker_matches() {
  [ -f "$marker" ] || return 1
  # A fallback render (the pinned kit could not be run) is current for an hour only.
  if grep -q '"fallback": *true' "$marker" 2>/dev/null && [ -z "$(find "$marker" -mmin -60 2>/dev/null)" ]; then return 1; fi
  if grep -q '"pin": *"' "$marker" 2>/dev/null; then
    grep -Fq "\"pin\": \"$pin\"" "$marker"
  else
    grep -Fq "\"kit_version\": \"$pin\"" "$marker"
  fi
}

# Fast path: already hydrated for this pin. No npx, no network. A legacy pin's
# own `sync` writes no marker and no user.toml, and an exact pin is immutable,
# so its files being present is enough (a marker, when there is one, must match).
if [ -n "$pin" ] && has_wize; then
  if [ "$legacy" = 1 ]; then
    if [ ! -f "$marker" ] || marker_matches; then exit 0; fi
  elif [ -f .wize/config/user.toml ] && marker_matches; then
    exit 0
  fi
fi

# user.toml is per developer and git-ignored: copy it from the primary checkout.
common_dir() { (cd "$1" 2>/dev/null && d=$(git rev-parse --git-common-dir 2>/dev/null) && cd "$d" 2>/dev/null && pwd -P); }
primary=""
if [ -n "$ORCA_ROOT_PATH" ] && [ -n "$(common_dir .)" ] && [ "$(common_dir "$ORCA_ROOT_PATH")" = "$(common_dir .)" ]; then
  primary=$ORCA_ROOT_PATH
fi
[ -n "$primary" ] || primary=$(git worktree list --porcelain 2>/dev/null | sed -n '1s/^worktree //p')
if [ ! -f .wize/config/user.toml ] && [ -n "$primary" ] && [ -f "$primary/.wize/config/user.toml" ]; then
  cp "$primary/.wize/config/user.toml" .wize/config/user.toml && echo "wize: user.toml copied from $primary" >&2
fi

if [ "$legacy" = 1 ]; then
  cmd=sync
  quiet=""
else
  cmd=hydrate
  quiet="--quiet"
fi

# Offline, npx spends about 70 s revalidating the packument even for a cached
# version, which would outlast the 180 s SessionStart timeout over 3 attempts.
# An exact pin is immutable, so use the cache as is; npm's own retries are off
# because this loop retries, and each attempt is capped by `timeout` when it
# exists. Without `timeout`, npm's fetch timeout (20 s per request) bounds a
# refused or slow answer, but not a registry that silently drops packets.
offline=""
[ -n "$pin" ] && offline="--prefer-offline"
cap=""
command -v timeout >/dev/null 2>&1 && cap="timeout 55"

backoff="${WIZE_HOOK_BACKOFF_S:-2}"
errf=$(mktemp 2>/dev/null) || errf=""
ok=0
i=1
while [ "$i" -le 3 ]; do
  # shellcheck disable=SC2086
  if [ -n "$errf" ]; then
    WIZE_SKIP_BASELINE=1 npm_config_fetch_retries=0 npm_config_fetch_timeout=20000 $cap npx --yes $offline "$pkg" "$cmd" $quiet >&2 2>"$errf"
    rc=$?
    cat "$errf" >&2
  else
    WIZE_SKIP_BASELINE=1 npm_config_fetch_retries=0 npm_config_fetch_timeout=20000 $cap npx --yes $offline "$pkg" "$cmd" $quiet >&2
    rc=$?
  fi
  if [ "$rc" = 0 ]; then ok=1; break; fi
  # ETARGET / notarget: the pin is not on the registry; retrying gets the same answer.
  if [ -n "$errf" ] && grep -Eq 'ETARGET|notarget' "$errf" 2>/dev/null; then break; fi
  # 124: `timeout` killed the attempt (a network that drops packets); retrying only waits again.
  [ "$rc" = 124 ] && break
  [ "$i" -lt 3 ] && sleep $((i * backoff))
  i=$((i + 1))
done
[ -z "$errf" ] || rm -f "$errf"
[ "$ok" = 1 ] || echo "wize: $cmd failed; run: npx $pkg $cmd" >&2

# hydrate prints its own update notice; older pins get one from the registry.
if [ "$cmd" = sync ] && [ "$WIZE_DISABLE_UPDATE_CHECK" != 1 ] && command -v npm >/dev/null 2>&1; then
  if command -v timeout >/dev/null 2>&1; then latest=$(timeout 5 npm view wize-dev-kit version 2>/dev/null); else latest=""; fi
  if [ -n "$latest" ] && [ "$latest" != "$pin" ]; then
    echo "wize: project pinned to $pin, latest is $latest (update on the default branch: npx wize-dev-kit@latest update)" >&2
  fi
fi
exit 0
