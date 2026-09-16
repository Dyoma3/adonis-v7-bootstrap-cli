import process from 'node:process'
import { resolve } from 'node:path'
import { createInterface, type Interface } from 'node:readline/promises'
import { kitOptions, type BootstrapOptions, type ParsedOptions } from './types.js'

const safeNamePattern = /^[A-Za-z0-9_]+$/

function validateProjectName(value: string): true | string {
  const trimmed = value.trim()
  if (!trimmed) return 'Enter a project name'
  if (trimmed === '.' || trimmed === '..' || trimmed.includes('/') || trimmed.includes('\\')) {
    return 'Use a directory name, not a path'
  }
  return true
}

export function validateDatabaseName(value: string): true | string {
  if (!value) return 'Enter a database name'
  if (!safeNamePattern.test(value)) return 'Use only letters, numbers, and underscores'
  return true
}

function requireInteractive(field: string) {
  if (!process.stdin.isTTY) {
    throw new Error(`Missing ${field}. Provide it as a flag when running without an interactive terminal.`)
  }
}

async function promptInput(
  readline: Interface,
  message: string,
  validate: (value: string) => true | string,
  defaultValue?: string
) {
  while (true) {
    const suffix = defaultValue ? ` (${defaultValue})` : ''
    const answer = (await readline.question(`${message}${suffix}: `)).trim() || defaultValue || ''
    const validation = validate(answer)
    if (validation === true) return answer
    console.error(validation)
  }
}

async function promptKit(readline: Interface) {
  console.log('\nSelect the kind of app you want to create:')
  kitOptions.forEach((option, index) => {
    console.log(`  ${index + 1}. ${option.name} — ${option.description}`)
  })

  while (true) {
    const answer = (await readline.question('Choice: ')).trim()
    const index = Number.parseInt(answer, 10) - 1
    const option = kitOptions[index]
    if (option) return option.value
    console.error(`Enter a number between 1 and ${kitOptions.length}`)
  }
}

export async function resolveOptions(parsed: ParsedOptions): Promise<BootstrapOptions> {
  const needsPrompt =
    !parsed.projectName || !parsed.kit || !parsed.developmentDatabase || !parsed.testDatabase
  if (needsPrompt) requireInteractive('required options')

  const readline = needsPrompt
    ? createInterface({ input: process.stdin, output: process.stdout })
    : undefined

  try {
    let projectName = parsed.projectName
    if (!projectName) {
      projectName = await promptInput(readline!, 'Project name', validateProjectName)
    } else {
      const validation = validateProjectName(projectName)
      if (validation !== true) throw new Error(validation)
    }

    let kit = parsed.kit
    if (!kit) kit = await promptKit(readline!)

    const resolvedProjectName = projectName
    const resolvedKit = kit
    const databaseBase = resolvedProjectName.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

    let developmentDatabase = parsed.developmentDatabase
    if (!developmentDatabase) {
      developmentDatabase = await promptInput(
        readline!,
        'Development database name',
        validateDatabaseName,
        `${databaseBase}_dev`
      )
    } else {
      const validation = validateDatabaseName(developmentDatabase)
      if (validation !== true) throw new Error(validation)
    }

    let testDatabase = parsed.testDatabase
    if (!testDatabase) {
      testDatabase = await promptInput(
        readline!,
        'Test database name',
        validateDatabaseName,
        `${databaseBase}_test`
      )
    } else {
      const validation = validateDatabaseName(testDatabase)
      if (validation !== true) throw new Error(validation)
    }

    if (developmentDatabase === testDatabase) {
      throw new Error('Development and test database names must be different')
    }

    const resolvedDevelopmentDatabase = developmentDatabase
    const resolvedTestDatabase = testDatabase

    return {
      projectName: resolvedProjectName,
      parentDirectory: resolve(parsed.parentDirectory ?? process.cwd()),
      kit: resolvedKit,
      developmentDatabase: resolvedDevelopmentDatabase,
      testDatabase: resolvedTestDatabase,
      skillsRepository: resolve(parsed.skillsRepository),
      dryRun: parsed.dryRun,
    }
  } finally {
    readline?.close()
  }
}
