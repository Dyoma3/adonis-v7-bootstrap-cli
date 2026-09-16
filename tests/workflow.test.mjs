import assert from 'node:assert/strict'
import test from 'node:test'
import { buildPlan, resolveProjectPaths } from '../dist/workflow.js'

const baseOptions = {
  projectName: 'inventory',
  parentDirectory: '/tmp/projects',
  developmentDatabase: 'inventory_dev',
  testDatabase: 'inventory_test',
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
  assert.ok(plan.includes('Install and configure @adonisjs/bouncer'))
})
