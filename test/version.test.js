import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateVersionStatus } from '../js/version.js';
import { APP_VERSION, CURRENT_COMMIT_SHORT } from '../js/constants.js';

test('Version: constants are properly defined', () => {
  assert.ok(APP_VERSION.startsWith('v'), 'APP_VERSION should start with v');
  assert.equal(CURRENT_COMMIT_SHORT.length, 7, 'CURRENT_COMMIT_SHORT should be 7-char git hash prefix');
});

test('Version: evaluateVersionStatus detects exact and prefix matches as LATEST', () => {
  // Full sha starting with local prefix
  const result = evaluateVersionStatus('a0b1b14ea3d2087b0e7ae6862870006b26af3a33', 'v1.5.2', 'a0b1b14');
  assert.equal(result.isLatest, true);
  assert.equal(result.status, 'LATEST');
  assert.equal(result.label, 'LATEST');

  // Exact 7-char match
  const exact = evaluateVersionStatus('a0b1b14', 'v1.5.2', 'a0b1b14');
  assert.equal(exact.isLatest, true);
  assert.equal(exact.status, 'LATEST');
});

test('Version: evaluateVersionStatus detects commit message containing current version', () => {
  const commitInfo = {
    sha: 'newcommit9999999999999999999999999999999',
    message: 'feat: add awesome feature (v1.5.1)'
  };
  const result = evaluateVersionStatus(commitInfo, 'v1.5.1', 'a0b1b14');
  assert.equal(result.isLatest, true, 'Message containing current version tag should be evaluated as LATEST');
  assert.equal(result.status, 'LATEST');
});

test('Version: evaluateVersionStatus detects update when sha and message differ', () => {
  const commitInfo = {
    sha: 'b999999ea3d2087b0e7ae6862870006b26af3a33',
    message: 'feat: new future release (v1.6.0)'
  };
  const result = evaluateVersionStatus(commitInfo, 'v1.5.1', 'a0b1b14');
  assert.equal(result.isLatest, false);
  assert.equal(result.status, 'UPDATE_AVAILABLE');
  assert.equal(result.label, 'UPDATE AVAIL');
});

test('Version: evaluateVersionStatus gracefully handles invalid or empty inputs', () => {
  const resNull = evaluateVersionStatus(null);
  assert.equal(resNull.isLatest, false);
  assert.equal(resNull.status, 'UNKNOWN');

  const resEmpty = evaluateVersionStatus('');
  assert.equal(resEmpty.isLatest, false);
  assert.equal(resEmpty.status, 'UNKNOWN');
});
