/*
 * Onboarding handoff — Wizer-driven triage after install.
 *
 * Returns a clean, minimal message (≤3 lines) that always ends with "→ /wize".
 * The message adapts to brownfield detection and active profiles without
 * turning into a wall of text.
 */
'use strict';

function compose(detection, profiles) {
  const lines = [];
  const profileCodes = new Set(profiles.map(p => p.code));

  if (detection && detection.brownfield) {
    lines.push('Brownfield detected — baseline ready.');
  }

  if (profileCodes.has('security-overlay')) {
    lines.push('Security pentest available (/wize-sec-recon).');
  }

  lines.push('→ /wize');
  return lines.join('\n');
}

module.exports = { compose };
