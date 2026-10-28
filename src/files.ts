import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { BootstrapOptions, ProjectPaths } from './types.js'

export function databaseConfigTemplate() {
  return `import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/lucid'
import env from '#start/env'

const dbConfig = defineConfig({
  /**
   * Default connection used for all queries.
   */
  connection: 'pg',

  connections: {
    /**
     * SQLite connection (inactive).
     */
    // sqlite: {
    //   client: 'better-sqlite3',
    //   connection: {
    //     filename: app.tmpPath('db.sqlite3'),
    //   },
    //   useNullAsDefault: true,
    //   migrations: {
    //     naturalSort: true,
    //     paths: ['database/migrations'],
    //   },
    //   schemaGeneration: {
    //     enabled: true,
    //     rulesPaths: ['./database/schema_rules.js'],
    //   },
    // },

    /**
     * PostgreSQL connection (active).
     */
    pg: {
      client: 'pg',
      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
      },
      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
      debug: app.inDev,
    },

    /**
     * MySQL / MariaDB connection (inactive).
     */
    // mysql: {
    //   client: 'mysql2',
    //   connection: {
    //     host: env.get('DB_HOST'),
    //     port: env.get('DB_PORT'),
    //     user: env.get('DB_USER'),
    //     password: env.get('DB_PASSWORD'),
    //     database: env.get('DB_DATABASE'),
    //   },
    //   migrations: {
    //     naturalSort: true,
    //     paths: ['database/migrations'],
    //   },
    //   debug: app.inDev,
    // },

    /**
     * Microsoft SQL Server connection (inactive).
     */
    // mssql: {
    //   client: 'mssql',
    //   connection: {
    //     server: env.get('DB_HOST'),
    //     port: env.get('DB_PORT'),
    //     user: env.get('DB_USER'),
    //     password: env.get('DB_PASSWORD'),
    //     database: env.get('DB_DATABASE'),
    //   },
    //   migrations: {
    //     naturalSort: true,
    //     paths: ['database/migrations'],
    //   },
    //   debug: app.inDev,
    // },

    /**
     * libSQL / Turso connection (inactive).
     */
    // libsql: {
    //   client: 'libsql',
    //   connection: {
    //     url: env.get('LIBSQL_URL'),
    //     authToken: env.get('LIBSQL_AUTH_TOKEN'),
    //   },
    //   useNullAsDefault: true,
    //   migrations: {
    //     naturalSort: true,
    //     paths: ['database/migrations'],
    //   },
    //   debug: app.inDev,
    // },
  },
})

export default dbConfig
`
}

export const requestValidatorSource = `import { errors } from '@adonisjs/core'
import type { z } from 'zod'

export default function validateRequest<T extends z.ZodType>(schema: T, data: any) {
  const parse = schema.safeParse(data)
  if (parse.success) return parse.data

  throw errors.E_HTTP_EXCEPTION.invoke({ errors: parse.error.issues }, 422)
}
`

export function configureUserAuthFinder(source: string) {
  const generatedCall = 'withAuthFinder(hash)'
  const configuredCall = 'withAuthFinder(() => hash.use())'
  const generatedCallCount = source.split(generatedCall).length - 1

  if (generatedCallCount === 1 && !source.includes(configuredCall)) {
    return source.replace(generatedCall, configuredCall)
  }
  if (generatedCallCount === 0 && source.includes(configuredCall)) return source

  throw new Error(
    `Expected app/models/user.ts to contain exactly one ${generatedCall} call`
  )
}

export function setEnvValues(content: string, values: Record<string, string>) {
  const lines = content.replace(/\r\n/g, '\n').split('\n')

  for (const [key, value] of Object.entries(values)) {
    const index = lines.findIndex((line) => new RegExp(`^${key}=`).test(line))
    const nextValue = `${key}=${value}`
    if (index === -1) lines.push(nextValue)
    else lines[index] = nextValue
  }

  return `${lines.filter((line, index, all) => index < all.length - 1 || line !== '').join('\n')}\n`
}

export function ensureLines(content: string, requiredLines: string[]) {
  const normalized = content.replace(/\r\n/g, '\n')
  const lines = new Set(normalized.split('\n'))
  const missing = requiredLines.filter((line) => !lines.has(line))
  if (!missing.length) return normalized.endsWith('\n') ? normalized : `${normalized}\n`
  return `${normalized.replace(/\n*$/, '\n')}${missing.join('\n')}\n`
}

/**
 * Japa runs the tests from the TypeScript sources, so a workspace does not
 * need its own build before testing. "^build" still builds the workspaces it
 * depends on, such as internal packages or the backend a Tuyau frontend imports.
 */
export function configureTurboTestTask(source: string) {
  const turbo = JSON.parse(source) as { tasks?: Record<string, Record<string, unknown>> }
  const testTask = turbo.tasks?.test
  if (!testTask) throw new Error('Expected turbo.json to define a test task')

  const dependsOn = JSON.stringify(testTask.dependsOn)
  if (dependsOn === '["^build"]') return source
  if (dependsOn !== '["build"]') {
    throw new Error('Expected the turbo.json test task to depend only on "build"')
  }

  testTask.dependsOn = ['^build']
  return `${JSON.stringify(turbo, null, 2)}\n`
}

/**
 * Render resolves an open range such as ">=24" to the newest Node.js release,
 * so generated projects pin the major version.
 */
export const nodeEngine = '24.x'

export function appendMarkdownSection(content: string, section: string) {
  const normalized = content.replace(/\r\n/g, '\n')
  const heading = section.split('\n', 1)[0] ?? section
  if (normalized.split('\n').includes(heading)) {
    return normalized.endsWith('\n') ? normalized : `${normalized}\n`
  }
  if (!normalized.trim()) return section
  return `${normalized.replace(/\n*$/, '\n')}\n${section}`
}

function frontendDeploymentSection() {
  return `
### Frontend (Render static site)

- **Root Directory:** \`apps/frontend\`
- **Build Command:** \`npm ci --include=dev && npm run generate\`
- **Publish Directory:** \`.output/public\`
- **Build Filters (included paths):** \`apps/frontend/**\`, \`package.json\`, \`package-lock.json\`
- **Redirects/Rewrites:** Source \`/*\`, Destination \`/200.html\`, Action Rewrite

Why:

- \`npm run generate\` writes the site to \`.output/public\`. With \`ssr: false\`, every HTML file is
  the same client-side shell; with SSR enabled, Nuxt prerenders the routes it can discover.
- The rewrite serves the \`200.html\` SPA fallback for routes without a generated file, such as
  dynamic routes. Render only applies rewrites when no file exists at the requested path, so assets
  are unaffected.
- \`--include=dev\` keeps devDependencies installed if the site defines \`NODE_ENV=production\`.
- \`generate\` bakes \`NUXT_PUBLIC_*\` variables into the build, so define them in the static site.
`
}

export function deploymentSection(options: BootstrapOptions) {
  const isMonorepo = options.kit === 'api-monorepo'
  const rootDirectory = isMonorepo ? '`apps/backend`' : 'empty (repository root)'
  const buildFilters = isMonorepo
    ? '- **Build Filters (included paths):** `apps/backend/**`, `package.json`, `package-lock.json`\n'
    : ''
  const noInstallInBuild = isMonorepo
    ? `- There is no \`npm ci\` inside \`build/\`. The lockfile lives at the repository root, so
  \`node ace build\` cannot copy one into \`build/\` and \`npm ci\` would fail there. The server
  resolves the dependencies installed by the build step.`
    : `- There is no \`npm ci\` inside \`build/\`. Dependencies are installed once by the build step;
  installing them again inside \`build/\` on every start would slow down each boot.`
  const filtersNote = isMonorepo
    ? `- With a Root Directory, Render only autodeploys changes inside it. The Build Filters also deploy
  changes to the root \`package.json\` and \`package-lock.json\`.\n`
    : ''
  const envExample = isMonorepo ? 'apps/backend/.env.example' : '.env.example'
  const frontend = options.installNuxt
    ? frontendDeploymentSection()
    : isMonorepo
      ? '\n`apps/frontend` has no configured framework yet. Document its service here when you add one.\n'
      : ''

  return `## Deployment

The project deploys to [Render](https://render.com). These settings live in the Render dashboard;
update this section whenever you change them.

### Backend (Render web service)

- **Root Directory:** ${rootDirectory}
- **Build Command:** \`npm ci --include=dev && node ace build && npm prune --omit=dev\`
- **Start Command:** \`cd build && node bin/server.js\`
${buildFilters}- **Environment:** the variables from \`${envExample}\`, with \`NODE_ENV=production\` and
  \`HOST=0.0.0.0\`. Render routes traffic to \`PORT\` (default \`10000\`); do not hardcode it.

Why:

- The service runs with \`NODE_ENV=production\`, which also applies during the build and makes npm
  skip devDependencies. \`node ace build\` needs them (\`@poppinss/ts-exec\`, \`typescript\`,
  \`@adonisjs/assembler\`), hence \`--include=dev\`.
- \`npm prune --omit=dev\` removes the build-only tooling, so the server runs with production
  dependencies only.
${noInstallInBuild}
- \`&&\` stops at the first failing step. A failed build keeps the previous deploy serving.
${filtersNote}- \`engines.node\` is pinned to \`${nodeEngine}\` in every \`package.json\`. Keep an upper bound: an
  open range such as \`>=24\` resolves to the newest Node.js release.
${frontend}`
}

const deploymentContext = (readme: string) => `
## Deployment

Render deployment settings are documented in the \`Deployment\` section of ${readme}. Update that
section whenever the Render configuration changes.
`

function backendAgentContext(options: BootstrapOptions, agent: 'Codex' | 'Claude Code') {
  const skillBase = agent === 'Codex' ? '.agents' : '.claude'
  const skillLabel = agent === 'Codex' ? 'Codex' : 'Claude Code'
  const monorepoRule =
    options.kit === 'api-monorepo'
      ? '\nRun Adonis, npm, and backend file operations from `apps/backend`.\n'
      : ''
  const deployment = options.kit === 'api-monorepo' ? '' : deploymentContext('`README.md`')

  return `# ${options.projectName} Backend

This repository contains an AdonisJS v7 ${options.kit} application configured with PostgreSQL.

## Required Agent Context

Before backend work, read and follow the local ${skillLabel} skill at
\`${skillBase}/skills/adonis-v7-backend/SKILL.md\`. Treat it as mandatory generic backend context and
read its referenced files as directed and relevant to the task.
${monorepoRule}
## Local Conventions

- External request validation uses Zod schemas under \`app/validators\` and \`validateRequest\` from
  \`#lib/request_validator\`.
- Authorization uses \`@adonisjs/bouncer\` abilities and policies.
- PostgreSQL is the active Lucid connection.
- Inspect installed providers, configuration, nearby code, and tests before applying optional skill
  guidance.
- Product and domain context has not been authored by this bootstrap. If later added under
  \`.context/\`, prefer those project-specific rules over generic examples.
${deployment}
## Quality Bar

For future changes, use the scripts and test suites present in \`package.json\` and \`adonisrc.ts\`.
Do not infer queues, Redis, MCP, or domain invariants unless the repository actually defines them.
`
}

function frontendAgentContext(options: BootstrapOptions, agent: 'Codex' | 'Claude Code') {
  const skillBase = agent === 'Codex' ? '.agents' : '.claude'
  const skillLabel = agent === 'Codex' ? 'Codex' : 'Claude Code'

  return `# ${options.projectName} Frontend

This workspace contains the project's Nuxt frontend.

## Required Agent Context

Before frontend work, read and follow the local ${skillLabel} skill at
\`${skillBase}/skills/nuxt-frontend/SKILL.md\`. Treat it as mandatory generic frontend context and
read its referenced files as directed and relevant to the task.

## Local Conventions

- Run Nuxt, npm, and frontend file operations from \`apps/frontend\`.
- Inspect the installed Nuxt version, source directory layout, dependencies, configuration, nearby
  code, and tests before applying generic skill guidance.
- Product and domain context has not been authored by this bootstrap. If later added under
  \`.context/\`, prefer those project-specific rules over generic examples.

## Quality Bar

For future changes, use the scripts and test suites actually present in \`package.json\`. Do not
infer Vuetify, Pinia, Axios, i18n, or domain invariants unless the repository defines them.
`
}

function monorepoRootContext(agent: 'Codex' | 'Claude Code', installNuxt: boolean) {
  const filename = agent === 'Codex' ? 'AGENTS.md' : 'CLAUDE.md'
  const frontendContext = installNuxt
    ? `\nThe Nuxt frontend lives in \`apps/frontend\`. Run frontend commands and make frontend-specific
edits from that directory, and read \`apps/frontend/${filename}\` before frontend work.\n`
    : '\nNo frontend framework was configured by this bootstrap. Do not apply backend conventions to `apps/frontend`.\n'

  return `# Monorepo Context

The AdonisJS backend lives in \`apps/backend\`. Run backend commands and make backend-specific edits
from that directory, and read \`apps/backend/${filename}\` before backend work.
${frontendContext}
Keep backend and frontend conventions scoped to their owning workspace.
${deploymentContext('the root `README.md`')}`
}

async function writeText(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content, 'utf8')
}

async function readOptionalText(path: string) {
  try {
    return await readFile(path, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return ''
    throw error
  }
}

export async function configureProjectFiles(options: BootstrapOptions, paths: ProjectPaths) {
  await writeText(join(paths.backendRoot, 'config/database.ts'), databaseConfigTemplate())

  const envPath = join(paths.backendRoot, '.env')
  const env = await readFile(envPath, 'utf8')
  const configuredEnv = setEnvValues(env, {
    DB_USER: 'dinko',
    DB_PASSWORD: '',
    DB_DATABASE: options.developmentDatabase,
  })
  await writeText(envPath, configuredEnv)

  const testEnv = setEnvValues(configuredEnv, {
    NODE_ENV: 'test',
    DB_USER: 'dinko',
    DB_PASSWORD: '',
    DB_DATABASE: options.testDatabase,
  })
  await writeText(join(paths.backendRoot, '.env.test'), testEnv)

  const gitignorePath = join(paths.projectRoot, '.gitignore')
  const gitignore = await readFile(gitignorePath, 'utf8')
  await writeText(gitignorePath, ensureLines(gitignore, ['.env', '.env.test']))

  const packagePath = join(paths.backendRoot, 'package.json')
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as Record<string, unknown>
  const imports = (packageJson.imports ?? {}) as Record<string, string>
  imports['#lib/*'] = './lib/*.js'
  packageJson.imports = imports
  await writeText(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`)

  await writeText(join(paths.backendRoot, 'lib/request_validator.ts'), requestValidatorSource)

  const userModelPath = join(paths.backendRoot, 'app/models/user.ts')
  const userModel = await readFile(userModelPath, 'utf8')
  await writeText(userModelPath, configureUserAuthFinder(userModel))

  await writeText(join(paths.backendRoot, 'AGENTS.md'), backendAgentContext(options, 'Codex'))
  await writeText(join(paths.backendRoot, 'CLAUDE.md'), backendAgentContext(options, 'Claude Code'))

  const readmePath = join(paths.projectRoot, 'README.md')
  const readme = (await readOptionalText(readmePath)) || `# ${options.projectName}\n`
  await writeText(readmePath, appendMarkdownSection(readme, deploymentSection(options)))

  const prettierIgnorePath = join(paths.backendRoot, '.prettierignore')
  const prettierIgnore = await readFile(prettierIgnorePath, 'utf8')
  await writeText(
    prettierIgnorePath,
    ensureLines(prettierIgnore, [
      '.agents/skills/adonis-v7-backend/',
      '.claude/skills/adonis-v7-backend/',
    ])
  )

  if (options.kit === 'api-monorepo') {
    const turboPath = join(paths.projectRoot, 'turbo.json')
    await writeText(turboPath, configureTurboTestTask(await readFile(turboPath, 'utf8')))

    await writeText(
      join(paths.projectRoot, 'AGENTS.md'),
      monorepoRootContext('Codex', options.installNuxt)
    )
    await writeText(
      join(paths.projectRoot, 'CLAUDE.md'),
      monorepoRootContext('Claude Code', options.installNuxt)
    )
  }

  if (options.installNuxt && paths.frontendRoot) {
    await writeText(join(paths.frontendRoot, 'AGENTS.md'), frontendAgentContext(options, 'Codex'))
    await writeText(
      join(paths.frontendRoot, 'CLAUDE.md'),
      frontendAgentContext(options, 'Claude Code')
    )

    const frontendPrettierIgnorePath = join(paths.frontendRoot, '.prettierignore')
    const frontendPrettierIgnore = await readOptionalText(frontendPrettierIgnorePath)
    await writeText(
      frontendPrettierIgnorePath,
      ensureLines(frontendPrettierIgnore, [
        '.agents/skills/nuxt-frontend/',
        '.claude/skills/nuxt-frontend/',
      ])
    )
  }
}
