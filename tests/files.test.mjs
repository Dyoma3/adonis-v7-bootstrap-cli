import assert from 'node:assert/strict'
import test from 'node:test'
import {
  databaseConfigTemplate,
  ensureLines,
  requestValidatorSource,
  setEnvValues,
} from '../dist/files.js'

test('generates an active PostgreSQL connection and commented inactive connections', () => {
  const config = databaseConfigTemplate()

  assert.match(config, /connection: 'pg'/)
  assert.match(config, /\n    pg: \{/)
  assert.match(config, /\/\/ sqlite: \{/)
  assert.match(config, /\/\/ mysql: \{/)
  assert.match(config, /\/\/ mssql: \{/)
  assert.match(config, /\/\/ libsql: \{/)
  assert.match(config, /schemaGeneration:/)
})

test('sets the requested databases and a truly empty password', () => {
  const development = setEnvValues('APP_KEY=secret\nDB_USER=old\nDB_PASSWORD=old\n', {
    DB_USER: 'dinko',
    DB_PASSWORD: '',
    DB_DATABASE: 'orders_dev',
  })
  const testing = setEnvValues(development, {
    NODE_ENV: 'test',
    DB_DATABASE: 'orders_test',
  })

  assert.match(development, /^DB_USER=dinko$/m)
  assert.match(development, /^DB_PASSWORD=$/m)
  assert.match(development, /^DB_DATABASE=orders_dev$/m)
  assert.match(testing, /^DB_DATABASE=orders_test$/m)
})

test('adds ignore entries without duplicating them', () => {
  assert.equal(ensureLines('node_modules\n.env\n', ['.env', '.env.test']), 'node_modules\n.env\n.env.test\n')
})

test('keeps the Luka Zod request validator contract', () => {
  assert.match(requestValidatorSource, /schema\.safeParse\(data\)/)
  assert.match(requestValidatorSource, /E_HTTP_EXCEPTION\.invoke\(\{ errors: parse\.error\.issues \}, 422\)/)
})
