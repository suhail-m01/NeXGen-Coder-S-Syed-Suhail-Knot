import { closeDatabase } from './db';
import { runHackathonAgent } from './run';

const isDryRun = process.argv.includes('--dry-run');

try {
  const result = await runHackathonAgent({ trigger: 'local', dryRun: isDryRun });
  console.log(JSON.stringify(result, null, 2));
  if (result.status === 'failed') process.exitCode = 1;
} finally {
  if (!isDryRun) {
    await closeDatabase();
  }
}
