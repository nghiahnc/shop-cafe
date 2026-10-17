import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse } from 'dotenv';

const command = process.argv[2];
if (!['build', 'preview', 'deploy'].includes(command)) throw new Error('Expected build, preview or deploy');
const packageRoot = resolve('node_modules/@opennextjs/cloudflare');
const manifest = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8'));
const bin = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin['opennextjs-cloudflare'];
let previewEnv = {};
if (command === 'preview' && !process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE) {
  const local = parse(readFileSync('.env.cloudflare.local'));
  if (!local.DATABASE_URL_UNPOOLED) throw new Error('Preview requires DATABASE_URL_UNPOOLED in .env.cloudflare.local or a Hyperdrive local connection override');
  previewEnv.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE = local.DATABASE_URL_UNPOOLED;
}
const child = spawn(process.execPath, [resolve(packageRoot, bin), command, ...process.argv.slice(3)], {
  stdio: 'inherit', env: {
    ...process.env, ...previewEnv, APP_RUNTIME: 'cloudflare',
    ...(process.platform === 'win32' ? { NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --require="${resolve('scripts/windows-build.cjs').replaceAll('\\', '/')}"`.trim() } : {}),
  },
});
const exitCode = await new Promise(resolve => child.on('exit', resolve));
if (exitCode === 0 && command === 'build') {
  // OpenNext serializes .env.local as fallback runtime values by default.
  // Workers secrets must come only from bindings, never from the upload.
  const generated = resolve('.open-next/cloudflare/next-env.mjs');
  const captured = await import(pathToFileURL(generated).href + '?build=' + Date.now());
  const output = ['development', 'production', 'test'].map(mode => {
    const publicValues = Object.fromEntries(Object.entries(captured[mode] || {}).filter(([key]) => key.startsWith('NEXT_PUBLIC_')));
    return `export const ${mode} = ${JSON.stringify(publicValues)};`;
  }).join('\n');
  writeFileSync(generated, output + '\n');
  console.log('Removed private env fallbacks from Worker bundle; runtime secrets use bindings only.');
}
process.exitCode = exitCode ?? 1;
