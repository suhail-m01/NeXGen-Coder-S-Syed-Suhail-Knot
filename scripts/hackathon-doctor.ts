import postgres from 'postgres';
import { loadAgentConfig, sourceReadinessError } from '../agents/hackathon/config';

interface EnvCheck {
  key: string;
  required: boolean;
  isSet: boolean;
  valueDescription?: string;
}

async function checkDatabase(url: string | undefined) {
  if (!url?.trim()) {
    return {
      reachable: false,
      error: 'DATABASE_URL is not set.',
      tables: { hackathons: false, hackathon_interests: false, agent_runs: false },
      hackathonCount: null,
      lastRun: null,
    };
  }

  const sql = postgres(url.trim(), {
    max: 1,
    connect_timeout: 5,
    idle_timeout: 3,
    ssl: 'require',
    prepare: false,
  });

  try {
    const tableRows = await sql<{ table_name: string }[]>`
      select table_name from information_schema.tables 
      where table_schema = 'public' and table_name in ('hackathons', 'hackathon_interests', 'agent_runs')
    `;
    const foundTables = new Set(tableRows.map((r) => r.table_name));

    let hackathonCount: number | null = null;
    if (foundTables.has('hackathons')) {
      const countRes = await sql<{ count: number }[]>`select count(*)::int as count from public.hackathons`;
      hackathonCount = countRes[0]?.count ?? 0;
    }

    let lastRun: Record<string, unknown> | null = null;
    if (foundTables.has('agent_runs')) {
      const runRes = await sql<Record<string, unknown>[]>`
        select id, kind, status, trigger_source, items_found, items_saved, started_at, finished_at, created_at
        from public.agent_runs
        where kind = 'run'
        order by created_at desc
        limit 1
      `;
      lastRun = runRes[0] || null;
    }

    await sql.end({ timeout: 2 });

    return {
      reachable: true,
      error: null,
      tables: {
        hackathons: foundTables.has('hackathons'),
        hackathon_interests: foundTables.has('hackathon_interests'),
        agent_runs: foundTables.has('agent_runs'),
      },
      hackathonCount,
      lastRun,
    };
  } catch (err) {
    await sql.end({ timeout: 2 }).catch(() => undefined);
    return {
      reachable: false,
      error: err instanceof Error ? err.message : String(err),
      tables: { hackathons: false, hackathon_interests: false, agent_runs: false },
      hackathonCount: null,
      lastRun: null,
    };
  }
}

async function runDoctor() {
  console.log('====================================================');
  console.log('         KNOT HACKATHON AGENT HEALTH DOCTOR         ');
  console.log('====================================================\n');

  const env = process.env;

  // 1. Environment Variable Checks
  console.log('--- 1. ENVIRONMENT VARIABLES ---');
  const envChecks: EnvCheck[] = [
    { key: 'DATABASE_URL', required: true, isSet: Boolean(env.DATABASE_URL?.trim()) },
    { key: 'CRON_SECRET', required: true, isSet: Boolean(env.CRON_SECRET?.trim()) },
    {
      key: 'SEARCH_API_PROVIDER',
      required: false,
      isSet: Boolean(env.SEARCH_API_PROVIDER?.trim()),
      valueDescription: env.SEARCH_API_PROVIDER?.trim() || undefined,
    },
    { key: 'SEARCH_API_KEY', required: Boolean(env.SEARCH_API_PROVIDER?.trim()), isSet: Boolean(env.SEARCH_API_KEY?.trim()) },
    { key: 'ANTHROPIC_API_KEY', required: false, isSet: Boolean(env.ANTHROPIC_API_KEY?.trim()) },
    { key: 'EVENTBRITE_API_KEY', required: false, isSet: Boolean(env.EVENTBRITE_API_KEY?.trim()) },
    { key: 'MEETUP_API_KEY', required: false, isSet: Boolean(env.MEETUP_API_KEY?.trim()) },
  ];

  for (const check of envChecks) {
    const status = check.isSet ? '✔ SET' : check.required ? '✖ MISSING (Required)' : '○ NOT SET (Optional)';
    const extra = check.valueDescription ? ` [provider: ${check.valueDescription}]` : '';
    console.log(`  ${check.key.padEnd(22)} : ${status}${extra}`);
  }
  console.log();

  // 2. Database Reachability and Schema Checks
  console.log('--- 2. DATABASE CONNECTIVITY & SCHEMA ---');
  const dbResult = await checkDatabase(env.DATABASE_URL);
  if (!dbResult.reachable) {
    console.log(`  Database Reachable    : ✖ NO (${dbResult.error})`);
    console.log('  Tables Check          : Skipped (Database unreachable)');
    console.log('  Hackathons Row Count  : N/A');
    console.log('  Last agent_runs Row   : N/A');
  } else {
    console.log('  Database Reachable    : ✔ YES (PostgreSQL connection established)');
    console.log(`  Table public.hackathons          : ${dbResult.tables.hackathons ? '✔ EXISTS' : '✖ MISSING'}`);
    console.log(`  Table public.hackathon_interests : ${dbResult.tables.hackathon_interests ? '✔ EXISTS' : '✖ MISSING'}`);
    console.log(`  Table public.agent_runs          : ${dbResult.tables.agent_runs ? '✔ EXISTS' : '✖ MISSING'}`);
    console.log(`  Total Hackathons Stored          : ${dbResult.hackathonCount ?? 'N/A'}`);
    if (dbResult.lastRun) {
      console.log('  Last agent_runs Record:');
      console.log(`    - ID             : ${dbResult.lastRun.id}`);
      console.log(`    - Status         : ${dbResult.lastRun.status}`);
      console.log(`    - Items Found    : ${dbResult.lastRun.items_found}`);
      console.log(`    - Items Saved    : ${dbResult.lastRun.items_saved}`);
      console.log(`    - Trigger Source : ${dbResult.lastRun.trigger_source}`);
      console.log(`    - Started At     : ${dbResult.lastRun.started_at}`);
      console.log(`    - Finished At    : ${dbResult.lastRun.finished_at}`);
    } else {
      console.log('  Last agent_runs Record           : (No previous runs recorded in table)');
    }
  }
  console.log();

  // 3. Source Status & Skipping Diagnostics
  const agentConfig = loadAgentConfig(env);
  console.log(`--- 3. SOURCE CONFIGURATION & PERMISSION STATUS (${agentConfig.sources.length} Sources) ---`);
  let readyCount = 0;

  for (const source of agentConfig.sources) {
    const readinessError = sourceReadinessError(source, agentConfig, env);
    const isReady = readinessError === null;
    if (isReady) readyCount += 1;
    const icon = isReady ? '✔' : '✖';
    console.log(`  [${icon}] ${source.platform} (id: ${source.id})`);
    console.log(`      Enabled            : ${source.enabled}`);
    console.log(`      Approved Methods   : ${source.approvedMethods.join(', ') || 'none'}`);
    console.log(`      Permission Evidence: ${source.permissionEvidence || 'none'}`);
    console.log(`      API Key Env Var    : ${source.apiKeyEnv || 'none'}${source.apiKeyEnv ? (env[source.apiKeyEnv] ? ' (SET)' : ' (MISSING)') : ''}`);
    console.log(`      Status / Reason    : ${readinessError ?? 'Configuration ready; execution and source responses are not yet evidenced.'}\n`);
  }

  console.log('--- 4. SUMMARY & DIAGNOSIS ---');
  console.log(`  Sources Ready: ${readyCount} / ${agentConfig.sources.length}`);
  if (readyCount === 0) {
    console.log('  CRITICAL REASON NO LIVE DATA APPEARS:');
    console.log('  1. No source has both explicit HACKATHON_ENABLED_SOURCES opt-in and complete reviewed configuration.');
    console.log('     Configure permission evidence, approved methods, discovery URLs and any required provider key.');
    if (!env.DATABASE_URL?.trim()) {
      console.log('  2. DATABASE_URL is not set, so persistent writes and runs cannot be saved to Supabase.');
    }
    if (!env.SEARCH_API_KEY?.trim()) {
      console.log('  3. Web Search API key (TAVILY/BRAVE/SERPAPI) is not set for search-driven discovery.');
    }
  } else {
    console.log(`  ${readyCount} source(s) have complete runtime configuration. This does not prove a successful deployed run.`);
  }
  const schemaReady = dbResult.reachable && Object.values(dbResult.tables).every(Boolean);
  const configurationReady = schemaReady && Boolean(env.CRON_SECRET?.trim()) && readyCount > 0;
  console.log(`  Production configuration: ${configurationReady ? 'READY FOR A CONTROLLED RUN' : 'NOT READY'}`);
  console.log('  Deployed activation: NOT VERIFIED by this local doctor. Verify the deployed API, cron authentication and a persisted agent_runs record separately.');
  if (!configurationReady) process.exitCode = 1;
  console.log('====================================================\n');
}

runDoctor().catch((err) => {
  console.error('Doctor script failed:', err);
  process.exit(1);
});
