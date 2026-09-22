import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  configureUserAuthFinder,
  configureProjectFiles,
  databaseConfigTemplate,
  ensureLines,
  requestValidatorSource,
  setEnvValues,
} from '../dist/files.js'

test('generates an active PostgreSQL connection and commented inactive connections', () => {
  const config = databaseConfigTemplate()

  assert.match(config, /connection: 'pg'/)
  assert.match(config, /\n    pg: \{/)
  assert.match(config, /\/\/ sqlite: \{/)
  assert.match(config, /\/\/ mysql: \{/)
  assert.match(config, /\/\/ mssql: \{/)
  assert.match(config, /\/\/ libsql: \{/)
  assert.match(config, /schemaGeneration:/)
})

test('sets the requested databases and a truly empty password', () => {
  const development = setEnvValues('APP_KEY=secret\nDB_USER=old\nDB_PASSWORD=old\n', {
    DB_USER: 'dinko',
    DB_PASSWORD: '',
    DB_DATABASE: 'orders_dev',
  })
  const testing = setEnvValues(development, {
    NODE_ENV: 'test',
    DB_DATABASE: 'orders_test',
  })

  assert.match(development, /^DB_USER=dinko$/m)
  assert.match(development, /^DB_PASSWORD=$/m)
  assert.match(development, /^DB_DATABASE=orders_dev$/m)
  assert.match(testing, /^DB_DATABASE=orders_test$/m)
})

test('adds ignore entries without duplicating them', () => {
  assert.equal(ensureLines('node_modules\n.env\n', ['.env', '.env.test']), 'node_modules\n.env\n.env.test\n')
})

test('uses a type-only import and the current Zod schema base type', () => {
  assert.match(requestValidatorSource, /import type \{ z \} from 'zod'/)
  assert.match(requestValidatorSource, /T extends z\.ZodType>/)
  assert.doesNotMatch(requestValidatorSource, /ZodTypeAny/)
  assert.match(requestValidatorSource, /schema\.safeParse\(data\)/)
  assert.match(requestValidatorSource, /E_HTTP_EXCEPTION\.invoke\(\{ errors: parse\.error\.issues \}, 422\)/)
})

test('configures the generated user model to resolve the active hash driver', () => {
  const generated = 'export default class User extends compose(UserSchema, withAuthFinder(hash)) {}\n'
  const expected =
    'export default class User extends compose(UserSchema, withAuthFinder(() => hash.use())) {}\n'

  assert.equal(configureUserAuthFinder(generated), expected)
  assert.equal(configureUserAuthFinder(expected), expected)
})

test('rejects an unexpected user model instead of modifying unrelated code', () => {
  assert.throws(
    () => configureUserAuthFinder('export default class User {}\n'),
    /exactly one withAuthFinder\(hash\) call/
  )
})

test('creates scoped Nuxt context for both agents in a monorepo', async (context) => {
  const projectRoot = await mkdtemp(join(tmpdir(), 'adonis-bootstrap-files-'))
  context.after(() => rm(projectRoot, { recursive: true, force: true }))

  const backendRoot = join(projectRoot, 'apps/backend')
  const frontendRoot = join(projectRoot, 'apps/frontend')
  await mkdir(join(backendRoot, 'config'), { recursive: true })
  await mkdir(join(backendRoot, 'app/models'), { recursive: true })
  await mkdir(frontendRoot, { recursive: true })
  await writeFile(join(projectRoot, '.gitignore'), 'node_modules\n')
  await writeFile(join(backendRoot, '.env'), 'APP_KEY=secret\n')
  await writeFile(join(backendRoot, '.prettierignore'), 'build\n')
  await writeFile(join(backendRoot, 'package.json'), '{"imports":{}}\n')
  await writeFile(
    join(backendRoot, 'app/models/user.ts'),
    'export default class User extends compose(UserSchema, withAuthFinder(hash)) {}\n'
  )

  const options = {
    projectName: 'inventory',
    parentDirectory: tmpdir(),
    kit: 'api-monorepo',
    developmentDatabase: 'inventory_dev',
    testDatabase: 'inventory_test',
    installNuxt: true,
    skillsRepository: '/Users/dinko/agent-skills',
    dryRun: true,
  }
  const paths = {
    projectRoot,
    backendRoot,
    backendPrefix: 'apps/backend',
    frontendRoot,
    frontendPrefix: 'apps/frontend',
  }

  await configureProjectFiles(options, paths)

  const rootContext = await readFile(join(projectRoot, 'AGENTS.md'), 'utf8')
  const codexContext = await readFile(join(frontendRoot, 'AGENTS.md'), 'utf8')
  const claudeContext = await readFile(join(frontendRoot, 'CLAUDE.md'), 'utf8')
  const prettierIgnore = await readFile(join(frontendRoot, '.prettierignore'), 'utf8')
  const userModel = await readFile(join(backendRoot, 'app/models/user.ts'), 'utf8')

  assert.match(rootContext, /apps\/frontend\/AGENTS\.md/)
  assert.match(codexContext, /\.agents\/skills\/nuxt-frontend\/SKILL\.md/)
  assert.match(claudeContext, /\.claude\/skills\/nuxt-frontend\/SKILL\.md/)
  assert.match(prettierIgnore, /^\.agents\/skills\/nuxt-frontend\/$/m)
  assert.match(prettierIgnore, /^\.claude\/skills\/nuxt-frontend\/$/m)
  assert.match(userModel, /withAuthFinder\(\(\) => hash\.use\(\)\)/)
})
