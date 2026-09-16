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
import { z } from 'zod'

export default function validateRequest<T extends z.ZodTypeAny>(schema: T, data: any) {
  const parse = schema.safeParse(data)
  if (parse.success) return parse.data

  throw errors.E_HTTP_EXCEPTION.invoke({ errors: parse.error.issues }, 422)
}
`

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

function backendAgentContext(options: BootstrapOptions, agent: 'Codex' | 'Claude Code') {
  const skillBase = agent === 'Codex' ? '.agents' : '.claude'
  const skillLabel = agent === 'Codex' ? 'Codex' : 'Claude Code'
  const monorepoRule =
    options.kit === 'api-monorepo'
      ? '\nRun Adonis, npm, and backend file operations from `apps/backend`.\n'
      : ''

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

## Quality Bar

For future changes, use the scripts and test suites present in \`package.json\` and \`adonisrc.ts\`.
Do not infer queues, Redis, MCP, or domain invariants unless the repository actually defines them.
`
}

function monorepoRootContext(agent: 'Codex' | 'Claude Code') {
  const filename = agent === 'Codex' ? 'AGENTS.md' : 'CLAUDE.md'
  return `# Monorepo Context

The AdonisJS backend lives in \`apps/backend\`. Run backend commands and make backend-specific edits
from that directory, and read \`apps/backend/${filename}\` before backend work. Do not apply backend
conventions to \`apps/frontend\`.
`
}

async function writeText(path: string, content: string) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content, 'utf8')
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
  await writeText(join(paths.backendRoot, 'AGENTS.md'), backendAgentContext(options, 'Codex'))
  await writeText(join(paths.backendRoot, 'CLAUDE.md'), backendAgentContext(options, 'Claude Code'))

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
    await writeText(join(paths.projectRoot, 'AGENTS.md'), monorepoRootContext('Codex'))
    await writeText(join(paths.projectRoot, 'CLAUDE.md'), monorepoRootContext('Claude Code'))
  }
}
