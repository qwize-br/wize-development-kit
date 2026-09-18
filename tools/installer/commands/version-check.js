// `wize-dev-kit version-check` — explicit, agent-friendly version check.
//
// The other CLI commands print an opportunistic hint (version-check.js's
// printUpdateHintIfAny) that stays silent on a non-TTY stdout so it never
// spams a pipe. This command is the opposite: it was asked for by name —
// by a human, or by an AI agent shelling out from a skill instruction where
// stdout is never a TTY — so it always answers, in `--json` when a caller
// needs to parse it.

'use strict';

const { getVersionCheckResult } = require('../version-check.js');

async function cmdVersionCheck({ currentVersion, json = false, log = console.log } = {}) {
  const result = await getVersionCheckResult(currentVersion);

  if (json) {
    log(JSON.stringify(result));
    return result;
  }

  if (result.disabled) {
    log('Update check disabled (WIZE_DISABLE_UPDATE_CHECK=1).');
    return result;
  }
  if (!result.latest) {
    log(`wize-dev-kit ${result.installed} (could not reach the registry — offline or timed out).`);
    return result;
  }
  if (result.updateAvailable) {
    log(`↑ Update available: wize-dev-kit ${result.installed} → ${result.latest}`);
    log('  Run `npx wize-dev-kit@latest update` in your project to refresh adapters — or `/wize-update` from inside your AI harness.');
  } else {
    log(`wize-dev-kit ${result.installed} is up to date.`);
  }
  return result;
}

module.exports = { cmdVersionCheck };
