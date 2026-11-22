// Kit-check for Solara Bay v11 (Node 22 stdlib only): mirrors the gate's
// first four rows — game_files, references, screenshots, dossier_matches —
// plus the js_parses row as information. Exit 0 when the first four pass.
// Usage: node tools/kitcheck.mjs
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, lstatSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const out = '/tmp/v11-out';

const results = [];
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail}`);
};

// 1. Run main.ts into /tmp/v11-out.
const run = spawnSync('node', ['main.ts'], {
  cwd: root, env: { ...process.env, MAKEFUN_OUTPUT_DIR: out }, encoding: 'utf8',
});
if (run.status !== 0) {
  check('main.ts runs', false, run.stderr.slice(0, 300));
  console.log(JSON.stringify({ pass: 0, fail: results.filter((r) => !r.pass).length }));
  process.exit(1);
}
check('main.ts runs', true, 'exit 0, dossier written');

// 2. game_files.
let count = 0, bytes = 0, bad = [];
const walk = (dir, rel) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    const r = rel ? `${rel}/${e.name}` : e.name;
    const st = lstatSync(p);
    count += 1;
    if (!st.isFile() && !st.isDirectory()) bad.push(`${r}: not a plain file/dir`);
    if (Buffer.byteLength(r, 'utf8') > 1000) bad.push(`${r}: path too long`);
    if (st.isFile()) bytes += st.size;
    if (st.isDirectory()) walk(p, r);
  }
};
walk(join(out, 'game'), '');
const indexSize = statSync(join(out, 'game', 'index.html')).size;
check('game_files', count <= 993 && bytes <= 50331648 && indexSize <= 1048576 && bad.length === 0,
  `${count} entries, ${bytes} bytes, index.html ${indexSize} B${bad.length ? `; ${bad.join('; ')}` : ''}`);

// 3. references: no http(s)/protocol-relative refs in index.html or reachable js.
const text = (p) => readFileSync(p, 'utf8');
const html = text(join(out, 'game', 'index.html'));
const badRefs = [];
for (const m of html.matchAll(/(?:src|href)\s*=\s*"([^"]+)"/g)) {
  const ref = m[1];
  if (/^(https?:)?\/\//.test(ref) || /^[a-z][a-z0-9+.-]*:/i.test(ref)) badRefs.push(`index.html: ${ref}`);
  else if (!ref.startsWith('data:') && !existsSync(join(out, 'game', ref.replace(/^\.\//, '')))) badRefs.push(`index.html: missing ${ref}`);
}
const jsFiles = [];
const walkJs = (dir, rel) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) walkJs(p, r);
    else if (/\.(js|mjs)$/.test(e.name) && !/\.min\.(js|mjs)$/.test(e.name)) jsFiles.push({ p, r });
  }
};
walkJs(join(out, 'game'), '');
for (const { p, r } of jsFiles) {
  const src = text(p);
  for (const m of src.matchAll(/from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    const spec = m[1] ?? m[2];
    if (/^(https?:)?\/\//.test(spec) || /^[a-z][a-z0-9+.-]*:/i.test(spec)) badRefs.push(`${r}: ${spec}`);
    else if (spec !== 'three' && !spec.startsWith('./') && !spec.startsWith('../')) badRefs.push(`${r}: bare specifier ${spec}`);
  }
}
check('references', badRefs.length === 0, badRefs.length ? badRefs.join('; ') : `${jsFiles.length} source modules, all refs inside game/`);

// 4. screenshots.
const shots = readdirSync(join(out, 'screenshots')).filter((f) => !f.startsWith('.')).sort();
let shotsOk = shots.length >= 3 && shots.length <= 4;
const shotDetails = [];
for (const f of shots) {
  const p = join(out, 'screenshots', f);
  const size = statSync(p).size;
  const buf = readFileSync(p);
  const isPng = buf[0] === 0x89 && buf[1] === 0x50;
  const w = isPng ? buf.readUInt32BE(16) : 0;
  const h = isPng ? buf.readUInt32BE(20) : 0;
  const ok = size <= 262144 && isPng && Math.max(w, h) <= 1280 && Math.min(w, h) >= 480;
  if (!ok) shotsOk = false;
  shotDetails.push(`${f} ${size} B ${w}x${h}`);
}
check('screenshots', shotsOk, shotDetails.join(' · '));

// 5. dossier_matches: rebuild into a second dir and compare bytes.
const out2 = '/tmp/v11-out2';
const run2 = spawnSync('node', ['main.ts'], {
  cwd: root, env: { ...process.env, MAKEFUN_OUTPUT_DIR: out2 }, encoding: 'utf8',
});
let match = false, dsize = 0;
if (run2.status === 0) {
  const a = readFileSync(join(out, 'dossier.json'));
  const b = readFileSync(join(out2, 'dossier.json'));
  match = a.equals(b);
  dsize = a.length;
  const schema = JSON.parse(a.toString()).schema;
  check('dossier_matches', match && dsize <= 1572864 && schema === 'makefun/dossier/v1',
    `${dsize} B, schema ${schema}, byte-identical rebuild: ${match}`);
} else {
  check('dossier_matches', false, 'rebuild failed');
}

// 6. js_parses (informational): every source module must parse as a module.
let parseBad = null;
for (const { p, r } of jsFiles) {
  const chk = spawnSync('node', ['--check', p], { encoding: 'utf8' });
  if (chk.status !== 0) { parseBad = `${r}: ${(chk.stderr || '').split('\n')[0]}`; break; }
}
check('js_parses (info)', parseBad === null, parseBad ?? `${jsFiles.length} modules parse`);

const fails = results.filter((r) => !r.pass && !r.name.startsWith('js_parses')).length;
console.log(JSON.stringify({ pass: results.filter((r) => r.pass).length, fail: fails }));
process.exit(fails === 0 ? 0 : 1);
