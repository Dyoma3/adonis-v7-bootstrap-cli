import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveOptions } from '../dist/prompts.js'

const parsedOptions = {
  projectName: 'inventory',
  parentDirectory: '/tmp/projects',
  developmentDatabase: 'inventory_dev',
  testDatabase: 'inventory_test',
  skillsRepository: '/Users/dinko/agent-skills',
  dryRun: true,
  help: false,
  version: false,
}

test('resolves an explicit Nuxt choice for API monorepos without prompting', async () => {
  const options = await resolveOptions({
    ...parsedOptions,
    kit: 'api-monorepo',
    installNuxt: true,
  })

  assert.equal(options.installNuxt, true)
})

test('rejects Nuxt for non-monorepo starter kits', async () => {
  await assert.rejects(
    resolveOptions({ ...parsedOptions, kit: 'api', installNuxt: true }),
    /only valid with the api-monorepo kit/
  )
})
