import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/**
 * Uma conexão por request: no Worker, o Hyperdrive faz o pool de verdade.
 * `prepare: false` é necessário com poolers em modo transação.
 */
export function createDb(connectionString: string) {
  const client = postgres(connectionString, { max: 5, fetch_types: false, prepare: false })
  const db = drizzle(client, { schema })
  return { db, close: () => client.end({ timeout: 5 }) }
}

/** Qualquer banco Drizzle com este schema (postgres.js no Worker, PGlite nos testes). */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>
