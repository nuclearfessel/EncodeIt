import assert from 'node:assert/strict'
import test from 'node:test'
import { isNewerVersion, parseVersion } from './semverCompare'

test('parseVersion strips v prefix', () => {
  assert.deepEqual(parseVersion('v0.1.5'), [0, 1, 5])
  assert.deepEqual(parseVersion('1.2.3'), [1, 2, 3])
})

test('isNewerVersion compares semver-ish tags', () => {
  assert.equal(isNewerVersion('0.1.6', '0.1.5'), true)
  assert.equal(isNewerVersion('v0.2.0', '0.1.9'), true)
  assert.equal(isNewerVersion('0.1.5', '0.1.5'), false)
  assert.equal(isNewerVersion('0.1.4', '0.1.5'), false)
  assert.equal(isNewerVersion('1.0.0', '0.9.9'), true)
})
