import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { drizzle } from 'drizzle-orm/pglite'
import * as schema from '../../src/db/schema'

const SUPABASE_DIR = join(import.meta.dirname, '../../../../supabase')

/**
 * Esquema mínimo de `auth` do Supabase, só com as colunas que o seed usa.
 * Permite validar o seed.sql sem Docker; o caminho real é `supabase db reset`.
 */
const AUTH_STUB = `
  create schema if not exists extensions;
  create extension if not exists pgcrypto with schema extensions;
  create schema if not exists auth;
  create table auth.users (
    instance_id uuid, id uuid primary key, aud varchar(255), role varchar(255),
    email varchar(255), encrypted_password varchar(255), email_confirmed_at timestamptz,
    raw_app_meta_data jsonb, raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz,
    confirmation_token varchar(255), email_change varchar(255), email_change_token_new varchar(255),
    recovery_token varchar(255)
  );
  create table auth.identities (
    id uuid primary key default gen_random_uuid(), provider_id text not null, user_id uuid not null,
    identity_data jsonb not null, provider text not null, last_sign_in_at timestamptz,
    created_at timestamptz, updated_at timestamptz
  );
`

export function migrationSql(): string {
  const dir = join(SUPABASE_DIR, 'migrations')
  return readdirSync(dir)
    .filter((file) => file.endsWith('.sql'))
    .sort()
    .map((file) => readFileSync(join(dir, file), 'utf8').replaceAll('--> statement-breakpoint', ''))
    .join('\n')
}

export function seedSql(): string {
  return readFileSync(join(SUPABASE_DIR, 'seed.sql'), 'utf8')
}

/** Banco Postgres em memória com migrations aplicadas (e seed, se pedido). */
export async function createTestDb(opts: { seed?: boolean } = {}) {
  const client = new PGlite({ extensions: { pgcrypto } })
  await client.exec(AUTH_STUB)
  await client.exec(migrationSql())
  if (opts.seed) await client.exec(seedSql())
  const db = drizzle(client, { schema })
  return { client, db }
}
