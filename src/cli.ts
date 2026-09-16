#!/usr/bin/env node
import process from 'node:process'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { helpText, parseCliArgs } from './args.js'
import { resolveOptions } from './prompts.js'
import { bootstrap } from './workflow.js'

async function getVersion() {
  const here = dirname(fileURLToPath(import.meta.url))
  const packagePath = join(here, '..', 'package.json')
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8')) as { version: string }
  return packageJson.version
}

async function main() {
  const parsed = parseCliArgs(process.argv.slice(2))
  if (parsed.help) {
    console.log(helpText)
    return
  }
  if (parsed.version) {
    console.log(await getVersion())
    return
  }

  const options = await resolveOptions(parsed)
  await bootstrap(options)
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`\nError: ${message}`)
  process.exitCode = 1
})
