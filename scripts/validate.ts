/** Validates all content and prints the ranked lists. Exit code 1 on any error. */
import { join } from 'node:path';
import { loadContent, ContentError } from '../src/lib/content.ts';
import { today } from '../src/lib/today.ts';

const root = join(import.meta.dirname, '..');
try {
  const content = loadContent(join(root, 'content'), today());
  for (const w of content.warnings) console.warn(`  ! ${w.where}: ${w.message}`);
  const verbose = process.argv.includes('--verbose');
  for (const list of content.lists.values()) {
    if (list.picks.length === 0) continue;
    console.log(`${list.city.name} / ${list.category}: ${list.picks.length} picks${list.backups ? ` (+${list.backups} verified backups)` : ''}`);
    if (verbose) for (const p of list.picks) console.log(`   ${String(p.rank).padStart(2)}. ${p.entry.name}  [${p.score.total} → ${p.adjusted}]  ${p.entry.subtype}`);
  }
  console.log('✓ Content is valid.');
} catch (err) {
  if (err instanceof ContentError) {
    console.error(err.message);
    process.exit(1);
  }
  throw err;
}
