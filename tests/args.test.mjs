import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCliArgs } from '../dist/args.js'

test('parses a fully non-interactive invocation', () => {
  const options = parseCliArgs([
    'billing-api',
    '--parent',
    '/tmp/projects',
    '--kit',
    'api-monorepo',
    '--dev-db',
    'billing_dev',
    '--test-db',
    'billing_test',
    '--nuxt',
    '--dry-run',
  ])

  assert.equal(options.projectName, 'billing-api')
  assert.equal(options.parentDirectory, '/tmp/projects')
  assert.equal(options.kit, 'api-monorepo')
  assert.equal(options.developmentDatabase, 'billing_dev')
  assert.equal(options.testDatabase, 'billing_test')
  assert.equal(options.installNuxt, true)
  assert.equal(options.dryRun, true)
})

test('supports explicitly skipping Nuxt', () => {
  const options = parseCliArgs(['billing-api', '--kit', 'api-monorepo', '--no-nuxt'])

  assert.equal(options.installNuxt, false)
})

test('rejects conflicting Nuxt flags', () => {
  assert.throws(
    () => parseCliArgs(['billing-api', '--nuxt', '--no-nuxt']),
    /either --nuxt or --no-nuxt/
  )
})

test('rejects an unknown starter kit', () => {
  assert.throws(() => parseCliArgs(['demo', '--kit', 'unknown']), /Invalid kit/)
})

test('rejects multiple project names', () => {
  assert.throws(() => parseCliArgs(['one', 'two']), /at most one positional argument/)
})
