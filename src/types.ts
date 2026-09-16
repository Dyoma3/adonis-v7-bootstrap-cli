export const kitOptions = [
  {
    name: 'Hypermedia app',
    value: 'hypermedia',
    description: 'A full-stack app using server-side templates',
  },
  {
    name: 'React app (using Inertia)',
    value: 'react',
    description: 'A full-stack React app with end-to-end type safety',
  },
  {
    name: 'Vue app (using Inertia)',
    value: 'vue',
    description: 'A full-stack Vue app with end-to-end type safety',
  },
  {
    name: 'API',
    value: 'api',
    description: 'A type-safe REST API with session and access token auth',
  },
  {
    name: 'API (monorepo)',
    value: 'api-monorepo',
    description: 'A monorepo setup with a type-safe REST API',
  },
] as const

export type Kit = (typeof kitOptions)[number]['value']

export interface ParsedOptions {
  projectName?: string
  parentDirectory?: string
  kit?: Kit
  developmentDatabase?: string
  testDatabase?: string
  skillsRepository: string
  dryRun: boolean
  help: boolean
  version: boolean
}

export interface BootstrapOptions {
  projectName: string
  parentDirectory: string
  kit: Kit
  developmentDatabase: string
  testDatabase: string
  skillsRepository: string
  dryRun: boolean
}

export interface ProjectPaths {
  projectRoot: string
  backendRoot: string
  backendPrefix: string
}
