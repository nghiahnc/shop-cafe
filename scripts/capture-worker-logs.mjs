import { spawn } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const child = spawn(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'tail', 'shop-cafe', '--format', 'json'], { stdio: ['ignore', 'pipe', 'pipe'] });
let buffer = '';
child.stdout.on('data', chunk => {
  buffer += chunk.toString();
  while (buffer.includes('{')) {
    const start = buffer.indexOf('{');
    let depth = 0, quoted = false, escaped = false, end = -1;
    for (let i = start; i < buffer.length; i++) {
      const c = buffer[i];
      if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; }
      else if (c === '"') quoted = true;
      else if (c === '{') depth++;
      else if (c === '}' && --depth === 0) { end = i + 1; break; }
    }
    if (end === -1) break;
    const raw = buffer.slice(start, end); buffer = buffer.slice(end);
    try {
      const event = JSON.parse(raw);
      const safe = { outcome: event.outcome, time: event.eventTimestamp, cpuTime: event.cpuTime, wallTime: event.wallTime,
        method: event.event?.request?.method, path: event.event?.request?.url ? new URL(event.event.request.url).pathname : undefined,
        exceptions: event.exceptions?.map(x => ({ name: x.name, message: x.message })),
        storageErrors: event.logs?.filter(x => x.message?.[0] === 'Media storage error').map(x => x.message.slice(1)) };
      if (safe.outcome) { const line = JSON.stringify(safe); appendFileSync('artifacts/cloudflare/requests.jsonl', line + '\n'); console.log(line); }
    } catch { /* Startup/progress output is not a request event. */ }
  }
});
child.stderr.on('data', () => {});
process.on('SIGINT', () => { child.kill(); process.exit(); });
child.on('exit', code => { process.exitCode = code ?? 0; });
