import { spawn } from 'node:child_process'

export interface CommandOptions {
  cwd?: string
  capture?: boolean
  quiet?: boolean
}

function quote(value: string) {
  return /^[A-Za-z0-9_./:@=-]+$/.test(value) ? value : JSON.stringify(value)
}

export function formatCommand(command: string, args: string[]) {
  return [command, ...args].map(quote).join(' ')
}

export async function runCommand(
  command: string,
  args: string[],
  options: CommandOptions = {}
): Promise<string> {
  if (!options.quiet) {
    console.log(`\n$ ${formatCommand(command, args)}`)
  }

  return await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: options.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    })

    let stdout = ''
    if (options.capture && child.stdout) {
      child.stdout.setEncoding('utf8')
      child.stdout.on('data', (chunk: string) => {
        stdout += chunk
      })
    }

    child.on('error', reject)
    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve(stdout.trim())
        return
      }

      const suffix = signal ? ` (signal ${signal})` : ''
      reject(new Error(`${formatCommand(command, args)} exited with code ${code ?? 'unknown'}${suffix}`))
    })
  })
}
