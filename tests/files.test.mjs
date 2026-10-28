import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  appendMarkdownSection,
  configureUserAuthFinder,
  configureProjectFiles,
  databaseConfigTemplate,
  deploymentSection,
  ensureLines,
  requestValidatorSource,
  setEnvValues,
} from '../dist/files.js'

const deploymentOptions = {
  projectName: 'inventory',
  parentDirectory: tmpdir(),
  developmentDatabase: 'inventory_dev',
  testDatabase: 'inventory_test',
  installNuxt: false,
  skillsRepository: '/Users/dinko/agent-skills',
  dryRun: true,
}

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

test('documents a Render backend deployed from the repository root for regular apps', () => {
  const section = deploymentSection({ ...deploymentOptions, kit: 'api' })

  assert.match(section, /^## Deployment\n/)
  assert.match(section, /\*\*Root Directory:\*\* empty \(repository root\)/)
  assert.match(section, /`npm ci --include=dev && node ace build && npm prune --omit=dev`/)
  assert.match(section, /`cd build && node bin\/server\.js`/)
  assert.match(section, /variables from `\.env\.example`/)
  assert.match(section, /pinned to `24\.x`/)
  assert.doesNotMatch(section, /Build Filters/)
  assert.doesNotMatch(section, /static site/)
})

test('documents both Render services for a Nuxt monorepo', () => {
  const section = deploymentSection({ ...deploymentOptions, kit: 'api-monorepo', installNuxt: true })

  assert.match(section, /\*\*Root Directory:\*\* `apps\/backend`/)
  assert.match(section, /`apps\/backend\/\*\*`, `package\.json`, `package-lock\.json`/)
  assert.match(section, /variables from `apps\/backend\/\.env\.example`/)
  assert.match(section, /lockfile lives at the repository root/)
  assert.match(section, /### Frontend \(Render static site\)/)
  assert.match(section, /\*\*Root Directory:\*\* `apps\/frontend`/)
  assert.match(section, /`npm ci --include=dev && npm run generate`/)
  assert.match(section, /\*\*Publish Directory:\*\* `\.output\/public`/)
  assert.match(section, /Source `\/\*`, Destination `\/200\.html`, Action Rewrite/)
})

test('leaves the frontend service undocumented for a monorepo without Nuxt', () => {
  const section = deploymentSection({ ...deploymentOptions, kit: 'api-monorepo' })

  assert.match(section, /`apps\/frontend` has no configured framework yet/)
  assert.doesNotMatch(section, /static site/)
})

test('appends a Markdown section once', () => {
  const section = '## Deployment\n\nRender.\n'
  const appended = appendMarkdownSection('# App\n\nIntro.\n', section)

  assert.equal(appended, '# App\n\nIntro.\n\n## Deployment\n\nRender.\n')
  assert.equal(appendMarkdownSection(appended, section), appended)
  assert.equal(appendMarkdownSection('', section), section)
})

test('documents the deployment in the README of a regular app', async (context) => {
  const projectRoot = await mkdtemp(join(tmpdir(), 'adonis-bootstrap-files-'))
  context.after(() => rm(projectRoot, { recursive: true, force: true }))

  await mkdir(join(projectRoot, 'config'), { recursive: true })
  await mkdir(join(projectRoot, 'app/models'), { recursive: true })
  await writeFile(join(projectRoot, '.gitignore'), 'node_modules\n')
  await writeFile(join(projectRoot, '.env'), 'APP_KEY=secret\n')
  await writeFile(join(projectRoot, '.prettierignore'), 'build\n')
  await writeFile(join(projectRoot, 'package.json'), '{"imports":{}}\n')
  await writeFile(join(projectRoot, 'README.md'), '# Starter kit\n\nGenerated README.\n')
  await writeFile(
    join(projectRoot, 'app/models/user.ts'),
    'export default class User extends compose(UserSchema, withAuthFinder(hash)) {}\n'
  )

  const options = { ...deploymentOptions, kit: 'api' }
  const paths = { projectRoot, backendRoot: projectRoot, backendPrefix: '' }

  await configureProjectFiles(options, paths)
  await configureProjectFiles(options, paths)

  const readme = await readFile(join(projectRoot, 'README.md'), 'utf8')
  const claudeContext = await readFile(join(projectRoot, 'CLAUDE.md'), 'utf8')

  assert.match(readme, /^# Starter kit\n\nGenerated README\.\n\n## Deployment\n/)
  assert.equal(readme.split('\n## Deployment\n').length, 2)
  assert.match(claudeContext, /`Deployment` section of `README\.md`/)
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
  const readme = await readFile(join(projectRoot, 'README.md'), 'utf8')
  const backendContext = await readFile(join(backendRoot, 'CLAUDE.md'), 'utf8')

  assert.match(readme, /^# inventory\n\n## Deployment\n/)
  assert.match(readme, /### Frontend \(Render static site\)/)
  assert.match(rootContext, /`Deployment` section of the root `README\.md`/)
  assert.doesNotMatch(backendContext, /## Deployment/)
  assert.match(rootContext, /apps\/frontend\/AGENTS\.md/)
  assert.match(codexContext, /\.agents\/skills\/nuxt-frontend\/SKILL\.md/)
  assert.match(claudeContext, /\.claude\/skills\/nuxt-frontend\/SKILL\.md/)
  assert.match(prettierIgnore, /^\.agents\/skills\/nuxt-frontend\/$/m)
  assert.match(prettierIgnore, /^\.claude\/skills\/nuxt-frontend\/$/m)
  assert.match(userModel, /withAuthFinder\(\(\) => hash\.use\(\)\)/)
})
