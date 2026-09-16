import { parseArgs } from 'node:util'
import { kitOptions, type Kit, type ParsedOptions } from './types.js'

const kits = new Set<string>(kitOptions.map(({ value }) => value))

function asKit(value: string | undefined): Kit | undefined {
  if (value === undefined) return undefined
  if (!kits.has(value)) {
    throw new Error(`Invalid kit "${value}". Expected one of: ${[...kits].join(', ')}`)
  }
  return value as Kit
}

export function parseCliArgs(argv: string[]): ParsedOptions {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    strict: true,
    options: {
      parent: { type: 'string', short: 'p' },
      kit: { type: 'string', short: 'k' },
      'dev-db': { type: 'string' },
      'test-db': { type: 'string' },
      'skills-repo': { type: 'string', default: '/Users/dinko/agent-skills' },
      'dry-run': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
    },
  })

  if (positionals.length > 1) {
    throw new Error('Expected at most one positional argument: <project-name>')
  }

  return {
    projectName: positionals[0],
    parentDirectory: values.parent,
    kit: asKit(values.kit),
    developmentDatabase: values['dev-db'],
    testDatabase: values['test-db'],
    skillsRepository: values['skills-repo']!,
    dryRun: values['dry-run']!,
    help: values.help!,
    version: values.version!,
  }
}

export const helpText = `adonis-v7-bootstrap [project-name] [options]

Create an AdonisJS v7 project with PostgreSQL, Zod, Bouncer, and local agent context.

Options:
  -p, --parent <path>        Parent directory (default: current directory)
  -k, --kit <kit>           hypermedia | react | vue | api | api-monorepo
      --dev-db <name>       PostgreSQL development database
      --test-db <name>      PostgreSQL test database
      --skills-repo <path>  Agent skills repository
      --dry-run             Print the resolved plan without changing anything
  -h, --help                Show help
  -v, --version             Show version
`
