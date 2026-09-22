import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPlan, resolveProjectPaths } from '../dist/workflow.js'

const baseOptions = {
  projectName: 'inventory',
  parentDirectory: '/tmp/projects',
  developmentDatabase: 'inventory_dev',
  testDatabase: 'inventory_test',
  installNuxt: false,
  skillsRepository: '/Users/dinko/agent-skills',
  dryRun: true,
}

test('uses the project root as backend root for regular API apps', () => {
  const paths = resolveProjectPaths({ ...baseOptions, kit: 'api' })

  assert.equal(paths.projectRoot, '/tmp/projects/inventory')
  assert.equal(paths.backendRoot, '/tmp/projects/inventory')
  assert.equal(paths.backendPrefix, '')
})

test('moves all backend work into apps/backend for monorepos', () => {
  const options = { ...baseOptions, kit: 'api-monorepo' }
  const paths = resolveProjectPaths(options)
  const plan = buildPlan(options, paths)

  assert.equal(paths.backendRoot, '/tmp/projects/inventory/apps/backend')
  assert.equal(paths.backendPrefix, 'apps/backend')
  assert.equal(paths.frontendRoot, '/tmp/projects/inventory/apps/frontend')
  assert.equal(paths.frontendPrefix, 'apps/frontend')
  assert.ok(plan.includes('Install and configure @adonisjs/bouncer'))
  assert.ok(plan.includes('Configure the user model with withAuthFinder(() => hash.use())'))
  assert.ok(plan.includes('Leave apps/frontend without a configured framework'))
})

test('adds Nuxt and its frontend context to the monorepo plan', () => {
  const options = { ...baseOptions, kit: 'api-monorepo', installNuxt: true }
  const plan = buildPlan(options)

  assert.ok(plan.includes('Install Nuxt in /tmp/projects/inventory/apps/frontend'))
  assert.ok(plan.includes('Create frontend agent context and add both nuxt-frontend skill subtrees'))
})
