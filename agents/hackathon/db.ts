import postgres, { type Sql } from 'postgres';

const globalDatabase = globalThis as typeof globalThis & { __knotHackathonDb?: Sql };

export function getDatabase(): Sql {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error('DATABASE_URL is required for Hackathon Agent persistence. Use the Supabase pooled server-only connection string.');
  if (!globalDatabase.__knotHackathonDb) {
    globalDatabase.__knotHackathonDb = postgres(url, {
      max: 1, prepare: false, ssl: 'require', idle_timeout: 5, connect_timeout: 10,
      connection: { application_name: 'knot-hackathon-agent' },
    });
  }
  return globalDatabase.__knotHackathonDb;
}

export async function closeDatabase(): Promise<void> {
  if (globalDatabase.__knotHackathonDb) {
    await globalDatabase.__knotHackathonDb.end({ timeout: 2 });
    delete globalDatabase.__knotHackathonDb;
  }
}
