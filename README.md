# AdonisJS v7 Bootstrap CLI

CLI personal y determinístico para crear aplicaciones AdonisJS v7 con la configuración habitual de
Dinko. Pregunta en cada ejecución por el starter kit y por los nombres de las bases de datos; también
puede ejecutarse sin interacción mediante flags.

## Qué configura

- Ejecuta `npm create adonisjs@latest <proyecto> -- --kit=<kit> --skip-migrations`.
- En `api-monorepo`, realiza todas las operaciones del backend dentro de `apps/backend`.
- Configura Lucid con PostgreSQL y deja comentadas las conexiones inactivas en
  `config/database.ts`.
- Elimina `better-sqlite3` mediante npm, sin editar manualmente ningún lockfile.
- Configura `.env` y `.env.test` con `DB_USER=dinko`, `DB_PASSWORD=` vacío y bases separadas.
- Crea ambas bases con `createdb`, después de comprobar que ninguna exista.
- Instala Zod y crea `lib/request_validator.ts` con el helper compartido.
- Instala y configura `@adonisjs/bouncer` mediante `node ace add @adonisjs/bouncer`.
- Crea el contexto local de Codex y Claude Code e instala `adonis-v7-backend` como dos git subtrees.
- No ejecuta migraciones, tests ni el servidor del proyecto generado.

## Requisitos

- Node.js 24 o superior y npm 11 o superior.
- PostgreSQL CLI (`psql` y `createdb`) con acceso local configurado.
- Git con nombre y correo configurados para crear los commits de los subtrees.
- El repositorio `/Users/dinko/agent-skills`, incluyendo `adonis-v7-backend`.

## Desarrollo e instalación global

```bash
npm install
npm test
npm link
```

Luego se puede ejecutar desde cualquier carpeta:

```bash
adonis-v7-bootstrap
```

El asistente solicita nombre del proyecto, tipo de aplicación, base de desarrollo y base de test.

## Uso no interactivo

```bash
adonis-v7-bootstrap billing-api \
  --parent /Users/dinko/projects \
  --kit api-monorepo \
  --dev-db billing_dev \
  --test-db billing_test
```

Los valores aceptados por `--kit` son `hypermedia`, `react`, `vue`, `api` y `api-monorepo`.

Para revisar el plan sin crear archivos, instalar paquetes, crear bases ni hacer commits:

```bash
adonis-v7-bootstrap demo \
  --kit api \
  --dev-db demo_dev \
  --test-db demo_test \
  --dry-run
```

Ejecuta `adonis-v7-bootstrap --help` para ver todas las opciones.

## Seguridad operacional

El CLI rechaza un directorio de destino que no esté vacío y nombres de base fuera del conjunto de
letras, números y guion bajo. Si una de las bases solicitadas ya existe, se detiene sin crear ninguna.
Los archivos `.env` y `.env.test` se comprueban con `git check-ignore` antes de crear commits.

El bootstrap puede dejar un proyecto parcialmente creado si falla una herramienta externa después
del scaffold. No borra el proyecto ni bases existentes automáticamente, para evitar pérdida de datos.

## Licencia

MIT
