'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

const KIT = path.resolve(__dirname, '..');
const { parse, compareVersions, semverGreater } = require(path.join(KIT, 'tools/installer/semver.js'));

test('parse reads versions, strips a leading v and rejects garbage', () => {
  assert.deepStrictEqual(parse('v1.2.3'), { major: 1, minor: 2, patch: 3, pre: [] });
  assert.deepStrictEqual(parse('0.27.0-rc.1'), { major: 0, minor: 27, patch: 0, pre: ['rc', 1] });
  assert.strictEqual(parse('1.2'), null);
  assert.strictEqual(parse('unknown'), null);
  assert.strictEqual(parse(undefined), null);
  assert.strictEqual(parse(''), null);
});

test('compareVersions orders prereleases below the release', () => {
  assert.strictEqual(compareVersions('0.27.0-rc.1', '0.27.0'), -1);
  assert.strictEqual(compareVersions('0.27.0', '0.27.0-rc.1'), 1);
  assert.strictEqual(compareVersions('0.27.0-rc.2', '0.27.0-rc.10'), -1);
  assert.strictEqual(compareVersions('0.27.0-alpha', '0.27.0-1'), 1);
  assert.strictEqual(compareVersions('0.27.0-rc', '0.27.0-rc.1'), -1);
  assert.strictEqual(compareVersions('1.0.0+build5', '1.0.0'), 0);
  assert.strictEqual(compareVersions('0.10.0', '0.9.9'), 1);
});

test('invalid input never outranks a real version', () => {
  assert.strictEqual(semverGreater('garbage', '0.0.1'), false);
  assert.strictEqual(semverGreater('0.0.1', 'garbage'), true);
  assert.strictEqual(compareVersions('garbage', 'also-garbage'), 0);
});

test('semverGreater is strict', () => {
  assert.strictEqual(semverGreater('0.27.0', '0.26.1'), true);
  assert.strictEqual(semverGreater('0.27.0', '0.27.0'), false);
  assert.strictEqual(semverGreater('0.27.0-rc.1', '0.27.0'), false);
});

test('version-check keeps exporting semverGreater from the shared module', () => {
  const vc = require(path.join(KIT, 'tools/installer/version-check.js'));
  assert.strictEqual(vc.semverGreater, semverGreater);
});
