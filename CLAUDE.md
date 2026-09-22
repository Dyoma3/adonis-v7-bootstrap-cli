# Repository Context

This repository contains a personal Node.js and TypeScript CLI for creating opinionated AdonisJS v7
projects. The package name is `adonis-v7-bootstrap-cli`, and its executable is
`adonis-v7-bootstrap`.

## Runtime and Structure

- Use Node.js 24 or newer and npm 11 or newer.
- The project is strict TypeScript using ESM and `NodeNext` module resolution.
- `src/cli.ts` is the executable entry point.
- `src/args.ts` owns command-line flags and help text.
- `src/prompts.ts` resolves interactive and non-interactive choices.
- `src/workflow.ts` orchestrates external commands and Git subtrees.
- `src/files.ts` owns generated file templates and narrow source transformations.
- Tests are JavaScript files under `tests/` and exercise the compiled output under `dist/`.
- `dist/` is generated and ignored. Edit `src/`, then rebuild; never edit `dist/` manually.

## Bootstrap Invariants

- Require an AdonisJS starter kit choice for every run and prompt when it was not supplied by flag.
  Supported kits are `hypermedia`, `react`, `vue`, `api`, and `api-monorepo`.
- For `api-monorepo`, run backend npm and Adonis commands from `apps/backend`.
- Only offer Nuxt for `api-monorepo`. When selected, run
  `npm create nuxt@latest . --force` from `apps/frontend` and keep frontend operations scoped there.
- Preserve a side-effect-free `--dry-run`. It must not create directories, projects, databases,
  commits, dependencies, or subtrees.
- Scaffold AdonisJS with `--skip-migrations`. Never run migrations, generated-project tests, or a
  development server as part of the bootstrap.
- PostgreSQL is the active Lucid connection. Keep the complete inactive SQLite, MySQL, MSSQL, and
  libSQL examples commented in `config/database.ts`.
- Remove `better-sqlite3` with `npm uninstall`; never edit an npm lockfile manually.
- Keep `.env` and `.env.test` ignored. Both use `DB_USER=dinko` and a truly empty `DB_PASSWORD=`;
  development and test must use distinct database names.
- Check that neither requested database exists before calling `createdb`. Never drop or overwrite a
  database.
- Generate `lib/request_validator.ts` with a type-only `z` import and `T extends z.ZodType`.
- Change exactly one generated `withAuthFinder(hash)` call to
  `withAuthFinder(() => hash.use())`. If the model has an unexpected shape, stop instead of applying
  a broad replacement.
- Install Bouncer through `node ace add @adonisjs/bouncer`.
- Install backend and optional frontend agent skills as independent squash-mode Git subtrees for
  both Codex and Claude Code. Do not replace them with copied directories or symlinks.
- Never stage or commit generated `.env` files.

## Development Workflow

Run these checks after implementation changes:

```bash
npm run typecheck
npm test
npm pack --dry-run
```

Use fully specified `--dry-run` invocations when testing CLI behavior. Do not create a live AdonisJS
project or PostgreSQL databases unless the user explicitly requests an integration run.

When behavior changes, update the relevant help text, README documentation, plan output, and tests
in the same change. Use npm commands for dependency, version, and lockfile updates.

Do not publish the package, push commits, or modify generated projects unless explicitly requested.
