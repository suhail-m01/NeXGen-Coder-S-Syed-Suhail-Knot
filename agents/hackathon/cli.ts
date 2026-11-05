import { closeDatabase } from './db';
import { runHackathonAgent } from './run';

try {
  const result = await runHackathonAgent({ trigger: 'local' });
  console.log(JSON.stringify(result, null, 2));
  if (result.status === 'failed') process.exitCode = 1;
} finally {
  await closeDatabase();
}
