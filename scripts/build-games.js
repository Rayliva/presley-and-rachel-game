/**
 * Builds All That Glitters and Presleytest from sibling directories
 * and copies their dist to public/games/ for embedding in house overlay
 */
import { existsSync, mkdirSync, cpSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const base = join(__dirname, '..');

// Only All That Glitters needs to be built - Presleytest (Hide and Seek) is embedded in our overlay
const games = [
  { name: 'All That Glitters', path: join(base, '../allthatglitters'), output: 'allthatglitters' },
];

for (const game of games) {
  if (!existsSync(game.path)) {
    console.log(`Skipping ${game.name} - not found at ${game.path}`);
    continue;
  }
  try {
    console.log(`Building ${game.name}...`);
    execSync('npm run build -- --base ./', {
      cwd: game.path,
      stdio: 'inherit',
    });
    const src = join(game.path, 'dist');
    const dest = join(base, 'public', 'games', game.output);
    if (existsSync(dest)) rmSync(dest, { recursive: true });
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest, { recursive: true });
    console.log(`Copied ${game.name} to public/games/${game.output}/`);
  } catch (err) {
    console.error(`Failed to build ${game.name}:`, err.message);
  }
}
