import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');
let checks = 0;
const failures = [];
function check(name, condition) {
  checks += 1;
  if (condition) console.log(`✓ ${name}`);
  else {
    failures.push(name);
    console.error(`✗ ${name}`);
  }
}

const requiredFiles = [
  'agents/hackathon/apiHandlers.ts',
  'agents/hackathon/config.ts',
  'agents/hackathon/run.ts',
  'agents/hackathon/sources.approved.ts',
  'api/hackathons/index.ts',
  'api/hackathons/run.ts',
  'api/hackathons/status.ts',
  'api/hackathons/[id]/interest.ts',
  'supabase/migrations/20261105120000_knot_hackathon_discovery.sql',
  'supabase/migrations/20261105180000_add_hackathon_verification_tracking.sql',
  'docs/HACKATHON_DEPLOYMENT.md',
  '.env.example',
  'vercel.json',
];
for (const path of requiredFiles) {
  try {
    check(`${path} is present`, statSync(join(root, path)).isFile());
  } catch {
    check(`${path} is present`, false);
  }
}

const envExample = read('.env.example');
const documented = new Set([...envExample.matchAll(/^\s*([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]));
const sourcePaths = ['agents/hackathon', 'api/hackathons'];
const sourceFiles = [];
function collect(directory) {
  for (const entry of readdirSync(join(root, directory))) {
    const path = join(directory, entry);
    const stat = statSync(join(root, path));
    if (stat.isDirectory()) collect(path);
    else if (/\.ts$/.test(entry)) sourceFiles.push(path);
  }
}
sourcePaths.forEach(collect);
sourceFiles.push('scripts/hackathon-doctor.ts', 'src/features/hackathons/flag.ts');
const usedEnv = new Set();
for (const path of sourceFiles) {
  const source = read(path);
  for (const match of source.matchAll(/(?:process\.env|import\.meta\.env|\benv)\.([A-Z][A-Z0-9_]+)/g)) usedEnv.add(match[1]);
}
for (const key of [...usedEnv].sort()) check(`${key} is documented in .env.example`, documented.has(key));

const baseMigration = read('supabase/migrations/20261105120000_knot_hackathon_discovery.sql');
const verificationMigration = read('supabase/migrations/20261105180000_add_hackathon_verification_tracking.sql');
for (const table of ['hackathons', 'hackathon_interests', 'agent_runs']) {
  check(`${table} has an additive table definition`, new RegExp(`create\\s+table\\s+public\\.${table}\\b`, 'i').test(baseMigration));
  check(`${table} enables row-level security`, new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, 'i').test(baseMigration));
}
check('Hackathon migrations do not drop tables', !/drop\s+table/i.test(`${baseMigration}\n${verificationMigration}`));
check('Hackathon migrations do not reshape the existing Event table', !/alter\s+table\s+public\.events\b/i.test(`${baseMigration}\n${verificationMigration}`));
check('verification tracking migration is additive', /alter\s+table\s+public\.hackathons\s+add\s+column\s+if\s+not\s+exists/i.test(verificationMigration));

const config = read('agents/hackathon/config.ts');
const apiHandlers = read('agents/hackathon/apiHandlers.ts');
const interestApi = read('api/hackathons/[id]/interest.ts');
check('source ingestion requires explicit runtime opt-in', config.includes('HACKATHON_ENABLED_SOURCES') && config.includes('sourceReadinessError'));
check('manual/cron runner uses the server-only cron secret', apiHandlers.includes('CRON_SECRET') && /authorization/i.test(apiHandlers));
check('interest wrapper has no fabricated fallback persistence', !/fallback-interest|X-Fallback-Source|Math\.random/.test(interestApi));

const vercel = JSON.parse(read('vercel.json'));
check('Vercel declares the authenticated agent run path', Array.isArray(vercel.crons) && vercel.crons.some((cron) => cron.path === '/api/hackathons/run' && typeof cron.schedule === 'string'));
check('SPA rewrite excludes API routes', Array.isArray(vercel.rewrites) && vercel.rewrites.some((rewrite) => rewrite.source.includes('?!api/')));

const packageJson = JSON.parse(read('package.json'));
for (const script of ['build', 'test', 'agent:doctor', 'test:e2e:trust', 'test:e2e:importer']) {
  check(`package script ${script} is available`, typeof packageJson.scripts?.[script] === 'string');
}

if (failures.length) {
  console.error(`\n${failures.length} of ${checks} deployment checks failed.`);
  process.exitCode = 1;
} else {
  console.log(`\n${checks} static deployment checks passed. No live provider, migration, cron, or deployed-run activation is claimed by this check.`);
}
