// Screenshot + playtest driver for Solara Bay v11 (Node 22 stdlib only).
// Serves game/ on :8080, drives chrome-headless-shell over CDP, waits for
// window.__ready, captures 1280x720 PNGs and collects console errors.
// Usage:
//   node tools/shoot.mjs [cover|foot|chase|meta|all]   (default: all)
//   node tools/shoot.mjs playtest
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const CHROME = '/home/hatch/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT = 8080;
const CDP_PORT = 9223;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch { /* not up yet */ }
    await sleep(300);
  }
  throw new Error(`timeout waiting for ${url}`);
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id !== undefined && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        this.events.push(msg);
      }
    };
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }
      }, 60000);
    });
  }

  async evaluate(expression) {
    const r = await this.send('Runtime.evaluate', { expression, returnByValue: true });
    return r.result?.value;
  }

  consoleErrors() {
    const out = [];
    for (const e of this.events) {
      if (e.method === 'Runtime.exceptionThrown') {
        out.push(`exception: ${e.params.exceptionDetails?.text ?? ''} ${e.params.exceptionDetails?.exception?.description ?? ''}`);
      }
      if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') {
        out.push(`console.error: ${e.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`);
      }
      if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') {
        out.push(`log.error: ${e.params.entry.text} ${e.params.entry.url ?? ''}`);
      }
    }
    return out;
  }
}

async function main() {
  const arg = process.argv[2] ?? 'all';
  mkdirSync(join(root, 'screenshots'), { recursive: true });

  const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: root, stdio: 'pipe' });
  server.stdout.on('data', (d) => process.stdout.write(`[serve] ${d}`));
  server.stderr.on('data', (d) => process.stderr.write(`[serve:err] ${d}`));
  const chrome = spawn(CHROME, [
    '--remote-debugging-port=' + CDP_PORT,
    '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run',
    '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
    '--window-size=1280,720', '--hide-scrollbars', 'about:blank',
  ], { stdio: 'pipe' });
  chrome.stderr.on('data', () => { /* headless shell is chatty; ignore */ });

  const cleanup = () => { try { chrome.kill('SIGKILL'); } catch {} try { server.kill('SIGKILL'); } catch {} };
  process.on('exit', cleanup);

  try {
    await waitFor(`http://127.0.0.1:${PORT}/index.html`);
    const list = await (await waitFor(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
    const page = list.find((t) => t.type === 'page');
    if (!page) throw new Error('no page target');
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
    const cdp = new Cdp(ws);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Log.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 1, mobile: false });

    if (arg === 'playtest') {
      await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/?playtest=1` });
      const start = Date.now();
      let result = null;
      while (Date.now() - start < 120000) {
        if (await cdp.evaluate('window.__ready === true')) {
          result = await cdp.evaluate('window.__playtest');
          break;
        }
        await sleep(500);
      }
      console.log(JSON.stringify({ playtest: result, errors: cdp.consoleErrors() }, null, 2));
      return;
    }

    const shots = arg === 'all' ? ['cover', 'foot', 'chase', 'meta'] : [arg];
    const names = { cover: '1-cover.png', foot: '2-foot.png', chase: '3-chase.png', meta: '4-meta.png' };
    for (const shot of shots) {
      await cdp.send('Page.navigate', { url: `http://127.0.0.1:${PORT}/?shot=${shot}&freeze=1` });
      const start = Date.now();
      let ready = false;
      while (Date.now() - start < 120000) {
        try {
          if (await cdp.evaluate('window.__ready === true')) { ready = true; break; }
        } catch { /* page still loading */ }
        await sleep(500);
      }
      if (!ready) throw new Error(`shot ${shot}: __ready never set`);
      await sleep(800); // let the HUD/DOM settle
      const shotPng = await cdp.send('Page.captureScreenshot', { format: 'png' });
      const file = join(root, 'screenshots', names[shot]);
      writeFileSync(file, Buffer.from(shotPng.data, 'base64'));
      const errors = cdp.consoleErrors();
      console.log(JSON.stringify({ shot, file, bytes: Buffer.from(shotPng.data, 'base64').length, errors }));
    }
  } finally {
    cleanup();
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
