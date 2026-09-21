import { access, mkdir, readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { runCommand } from './command.js'
import { configureProjectFiles } from './files.js'
import type { BootstrapOptions, ProjectPaths } from './types.js'

export function resolveProjectPaths(options: BootstrapOptions): ProjectPaths {
  const projectRoot = resolve(options.parentDirectory, options.projectName)
  const isMonorepo = options.kit === 'api-monorepo'
  const backendPrefix = isMonorepo ? 'apps/backend' : ''
  const frontendPrefix = isMonorepo ? 'apps/frontend' : undefined
  return {
    projectRoot,
    backendPrefix,
    backendRoot: backendPrefix ? join(projectRoot, backendPrefix) : projectRoot,
    frontendPrefix,
    frontendRoot: frontendPrefix ? join(projectRoot, frontendPrefix) : undefined,
  }
}

export function buildPlan(options: BootstrapOptions, paths = resolveProjectPaths(options)) {
  const plan = [
    `Project: ${paths.projectRoot}`,
    `Backend: ${paths.backendRoot}`,
    `Kit: ${options.kit}`,
    `Development database: ${options.developmentDatabase}`,
    `Test database: ${options.testDatabase}`,
    `Skills repository: ${options.skillsRepository}`,
    'Scaffold with migrations skipped',
    'Configure PostgreSQL and remove better-sqlite3',
    'Install Zod and create lib/request_validator.ts',
    'Install and configure @adonisjs/bouncer',
    'Create both PostgreSQL databases with createdb',
    'Create Codex/Claude context and add both backend skill subtrees',
  ]

  if (options.installNuxt) {
    plan.splice(7, 0, `Install Nuxt in ${paths.frontendRoot}`)
    plan.push('Create frontend agent context and add both nuxt-frontend skill subtrees')
  } else if (options.kit === 'api-monorepo') {
    plan.splice(7, 0, 'Leave apps/frontend without a configured framework')
  }

  return plan
}

async function exists(path: string) {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function assertDestinationAvailable(projectRoot: string) {
  if (!(await exists(projectRoot))) return
  const entries = await readdir(projectRoot)
  if (entries.length) throw new Error(`Destination is not empty: ${projectRoot}`)
}

async function databaseExists(name: string) {
  const output = await runCommand(
    'psql',
    [
      '--dbname=postgres',
      '--tuples-only',
      '--no-align',
      '--command',
      `SELECT 1 FROM pg_database WHERE datname = '${name}'`,
    ],
    { capture: true, quiet: true }
  )
  return output.split(/\s+/).includes('1')
}

function subtreePrefix(
  workspacePrefix: string,
  agentDirectory: '.agents' | '.claude',
  skillName: string
) {
  return [workspacePrefix, agentDirectory, `skills/${skillName}`].filter(Boolean).join('/')
}

async function addSkillSubtrees(
  options: BootstrapOptions,
  paths: ProjectPaths,
  skillName: string,
  workspacePrefix: string
) {
  const splitCommit = await runCommand(
    'git',
    ['-C', options.skillsRepository, 'subtree', 'split', `--prefix=${skillName}`, 'HEAD'],
    { capture: true }
  )

  if (!/^[0-9a-f]{40}$/.test(splitCommit)) {
    throw new Error(`Could not resolve ${skillName} subtree commit: ${splitCommit}`)
  }

  for (const agentDirectory of ['.agents', '.claude'] as const) {
    await runCommand(
      'git',
      [
        'subtree',
        'add',
        `--prefix=${subtreePrefix(workspacePrefix, agentDirectory, skillName)}`,
        options.skillsRepository,
        splitCommit,
        '--squash',
      ],
      { cwd: paths.projectRoot }
    )
  }
}

async function configureGitAndSubtrees(options: BootstrapOptions, paths: ProjectPaths) {
  if (!(await exists(join(paths.projectRoot, '.git')))) {
    await runCommand('git', ['init'], { cwd: paths.projectRoot })
  }

  const envRelative = paths.backendPrefix ? `${paths.backendPrefix}/.env` : '.env'
  const testEnvRelative = paths.backendPrefix ? `${paths.backendPrefix}/.env.test` : '.env.test'
  await runCommand('git', ['check-ignore', '--quiet', envRelative], {
    cwd: paths.projectRoot,
    quiet: true,
  })
  await runCommand('git', ['check-ignore', '--quiet', testEnvRelative], {
    cwd: paths.projectRoot,
    quiet: true,
  })

  await runCommand('git', ['add', '.'], { cwd: paths.projectRoot })
  const staged = await runCommand('git', ['diff', '--cached', '--name-only'], {
    cwd: paths.projectRoot,
    capture: true,
    quiet: true,
  })
  if (staged.split('\n').includes(envRelative) || staged.split('\n').includes(testEnvRelative)) {
    throw new Error('Refusing to commit .env or .env.test')
  }
  if (staged) {
    await runCommand('git', ['commit', '-m', 'Bootstrap AdonisJS v7 project'], {
      cwd: paths.projectRoot,
    })
  }

  await addSkillSubtrees(options, paths, 'adonis-v7-backend', paths.backendPrefix)

  if (options.installNuxt && paths.frontendPrefix) {
    await addSkillSubtrees(options, paths, 'nuxt-frontend', paths.frontendPrefix)
  }
}

export async function bootstrap(options: BootstrapOptions) {
  const paths = resolveProjectPaths(options)

  if (options.dryRun) {
    console.log(buildPlan(options, paths).map((line) => `- ${line}`).join('\n'))
    return paths
  }

  await assertDestinationAvailable(paths.projectRoot)
  await runCommand('node', ['--version'], { quiet: true })
  await runCommand('npm', ['--version'], { quiet: true })
  await runCommand('git', ['--version'], { quiet: true })
  await runCommand('createdb', ['--version'], { quiet: true })
  await runCommand('psql', ['--version'], { quiet: true })

  if (!(await exists(join(options.skillsRepository, 'adonis-v7-backend/SKILL.md')))) {
    throw new Error(`Missing adonis-v7-backend skill in ${options.skillsRepository}`)
  }
  if (
    options.installNuxt &&
    !(await exists(join(options.skillsRepository, 'nuxt-frontend/SKILL.md')))
  ) {
    throw new Error(`Missing nuxt-frontend skill in ${options.skillsRepository}`)
  }

  await runCommand(
    'npm',
    [
      'create',
      'adonisjs@latest',
      options.projectName,
      '--',
      `--kit=${options.kit}`,
      '--skip-migrations',
    ],
    { cwd: options.parentDirectory }
  )

  if (!(await exists(join(paths.backendRoot, 'package.json')))) {
    throw new Error(`Could not find the generated backend at ${paths.backendRoot}`)
  }

  if (options.installNuxt && paths.frontendRoot) {
    await mkdir(paths.frontendRoot, { recursive: true })
    await runCommand('npm', ['create', 'nuxt@latest', '.', '--force'], {
      cwd: paths.frontendRoot,
    })
    if (!(await exists(join(paths.frontendRoot, 'package.json')))) {
      throw new Error(`Could not find the generated Nuxt frontend at ${paths.frontendRoot}`)
    }
  }

  await runCommand(
    'node',
    ['ace', 'configure', '@adonisjs/lucid', '--db=postgres'],
    { cwd: paths.backendRoot }
  )
  await runCommand('npm', ['uninstall', 'better-sqlite3'], { cwd: paths.backendRoot })
  await runCommand('npm', ['install', 'zod'], { cwd: paths.backendRoot })
  await runCommand('node', ['ace', 'add', '@adonisjs/bouncer'], { cwd: paths.backendRoot })

  await configureProjectFiles(options, paths)

  for (const database of [options.developmentDatabase, options.testDatabase]) {
    if (await databaseExists(database)) {
      throw new Error(`Database already exists; refusing to overwrite it: ${database}`)
    }
  }
  await runCommand('createdb', [options.developmentDatabase])
  await runCommand('createdb', [options.testDatabase])

  await configureGitAndSubtrees(options, paths)

  console.log('\nBootstrap complete')
  console.log(buildPlan(options, paths).map((line) => `- ${line}`).join('\n'))
  console.log('- Migrations were not run')
  console.log('- Project tests were not run')

  return paths
}
