# AdonisJS v7 Bootstrap CLI

Personal, deterministic CLI for creating AdonisJS v7 applications using Dinko's standard setup. It
prompts for the starter kit and database names on every run, and it can also run non-interactively
using command-line flags.

## What it configures

- Runs `npm create adonisjs@latest <project> -- --kit=<kit> --skip-migrations`.
- For `api-monorepo`, performs all backend operations inside `apps/backend`.
- Configures Lucid with PostgreSQL and keeps inactive connections commented out in
  `config/database.ts`.
- Removes `better-sqlite3` through npm without manually editing any lockfile.
- Configures `.env` and `.env.test` with `DB_USER=dinko`, an empty `DB_PASSWORD=`, and separate
  databases.
- Creates both databases with `createdb`, after confirming that neither already exists.
- Installs Zod and creates `lib/request_validator.ts` with the shared helper.
- Installs and configures `@adonisjs/bouncer` with `node ace add @adonisjs/bouncer`.
- Creates local Codex and Claude Code context and installs `adonis-v7-backend` as two Git subtrees.
- Does not run migrations, tests, or the generated project's server.

## Requirements

- Node.js 24 or newer and npm 11 or newer.
- PostgreSQL CLI (`psql` and `createdb`) with local access configured.
- Git with a configured user name and email, so the subtree commits can be created.
- The `/Users/dinko/agent-skills` repository, including `adonis-v7-backend`.

## Development and global installation

```bash
npm install
npm test
npm link
```

The command can then be run from any directory:

```bash
adonis-v7-bootstrap
```

The interactive assistant prompts for the project name, application type, development database, and
test database.

## Non-interactive usage

```bash
adonis-v7-bootstrap billing-api \
  --parent /Users/dinko/projects \
  --kit api-monorepo \
  --dev-db billing_dev \
  --test-db billing_test
```

The accepted `--kit` values are `hypermedia`, `react`, `vue`, `api`, and `api-monorepo`.

To inspect the plan without creating files, installing packages, creating databases, or making
commits:

```bash
adonis-v7-bootstrap demo \
  --kit api \
  --dev-db demo_dev \
  --test-db demo_test \
  --dry-run
```

Run `adonis-v7-bootstrap --help` to see every available option.

## Operational safety

The CLI rejects a non-empty destination directory and database names containing anything other than
letters, numbers, and underscores. If either requested database already exists, it stops without
creating either database. It checks `.env` and `.env.test` with `git check-ignore` before creating
commits.

The bootstrap may leave a partially created project if an external tool fails after scaffolding. It
does not automatically delete the project or existing databases, in order to prevent data loss.

## License

MIT
