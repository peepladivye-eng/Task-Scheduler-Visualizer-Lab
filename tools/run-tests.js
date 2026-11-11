'use strict';
/**
 * tools/run-tests.js
 * Usage: node tools/run-tests.js [--engine <path>] [--mode simulate|live] [--only <fixture>]
 *
 * Defaults: --engine bin/scheduler_cpp  --mode simulate
 */
const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT         = path.resolve(__dirname, '..');
const FIXTURES_DIR = path.join(ROOT, 'fixtures');
const INVALID_DIR  = path.join(ROOT, 'fixtures-invalid');

// ── Parse CLI args ───────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let enginePath  = path.join(ROOT, 'bin', 'scheduler_cpp');
let mode        = 'simulate';
let onlyFixture = null;

for (let i = 0; i < args.length; i++) {
    if      (args[i] === '--engine' && args[i+1]) { enginePath  = path.resolve(ROOT, args[++i]); }
    else if (args[i] === '--mode'   && args[i+1]) { mode        = args[++i]; }
    else if (args[i] === '--only'   && args[i+1]) { onlyFixture = args[++i]; }
    else if (args[i] === '--help') {
        console.log('Usage: node tools/run-tests.js [--engine PATH] [--mode simulate|live] [--only FIXTURE]');
        process.exit(0);
    } else {
        console.error('Unknown argument: ' + args[i]);
        process.exit(1);
    }
}

if (!fs.existsSync(enginePath)) {
    console.error('Engine not found: ' + enginePath);
    process.exit(1);
}
if (mode !== 'simulate' && mode !== 'live') {
    console.error('--mode must be simulate or live, got: ' + mode);
    process.exit(1);
}

// ── Counters ─────────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;

function pass(label) { console.log('PASS  ' + label); passed++; }
function fail(label, reason) { console.log('FAIL  ' + label + ' — ' + reason); failed++; }

// ── Run engine ────────────────────────────────────────────────────────────────
function runEngine(extraArgs) {
    // Only pass --mode when the binary is scheduler_cpp
    const isCpp = path.basename(enginePath).startsWith('scheduler_cpp');
    const allArgs = isCpp ? ['--mode', mode, ...extraArgs] : [...extraArgs];
    const r = spawnSync(enginePath, allArgs, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    return { exitCode: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

// ── Fixture tests ─────────────────────────────────────────────────────────────
function runFixture(name) {
    const dir  = path.join(FIXTURES_DIR, name);
    const expF = path.join(dir, 'expected.json');
    const inF  = path.join(dir, 'input.txt');

    let exp;
    try { exp = JSON.parse(fs.readFileSync(expF, 'utf8')); }
    catch(e) { fail(name + '/load', 'cannot read expected.json: ' + e.message); return; }

    const engineArgs = ['--input', inF, ...(exp.args || [])];
    const { exitCode, stdout, stderr } = runEngine(engineArgs);

    if (exitCode !== 0) {
        fail(name + '/exit', 'expected exit 0, got ' + exitCode + '; stderr: ' + stderr.trim().slice(0,120));
        return;
    }

    let trace;
    try { trace = JSON.parse(stdout); }
    catch(e) { fail(name + '/json', 'stdout is not valid JSON'); return; }

    // 1. Timeline: [[t_start, t_end, type, pid], ...]
    const expTL = exp.timeline || [];
    const actTL = trace.timeline || [];
    if (actTL.length !== expTL.length) {
        fail(name + '/timeline', 'expected ' + expTL.length + ' segs, got ' + actTL.length);
    } else {
        let ok = true;
        for (let i = 0; i < expTL.length; i++) {
            const [es, ee, et, ep] = expTL[i];
            const s = actTL[i];
            if (s.t_start !== es || s.t_end !== ee || s.type !== et || s.pid !== ep) {
                fail(name + '/timeline', 'seg[' + i + '] expected [' + es + ',' + ee + ',"' + et + '",' + ep + '] got [' + s.t_start + ',' + s.t_end + ',"' + s.type + '",' + s.pid + ']');
                ok = false; break;
            }
        }
        if (ok) pass(name + '/timeline');
    }

    // 2. Per-process fields
    const expProcs = exp.processes || {};
    let procsOk = true;
    for (const pidStr of Object.keys(expProcs)) {
        const pid = parseInt(pidStr, 10);
        const e   = expProcs[pidStr];
        const a   = (trace.processes || []).find(p => p.pid === pid);
        if (!a) { fail(name + '/proc-' + pid, 'pid not in output'); procsOk = false; continue; }
        for (const f of ['start','completion','waiting','turnaround','response']) {
            if (a[f] !== e[f]) {
                fail(name + '/proc-' + pid, f + ': expected ' + e[f] + ', got ' + a[f]);
                procsOk = false;
            }
        }
    }
    if (procsOk) pass(name + '/processes');

    // 3. Metrics (tolerance 0.011)
    const expM = exp.metrics || {};
    const actM = trace.metrics || {};
    let metricsOk = true;
    for (const key of Object.keys(expM)) {
        const ev = expM[key];
        const av = actM[key];
        if (av === undefined) { fail(name + '/metrics', 'missing ' + key); metricsOk = false; continue; }
        if (typeof ev === 'number') {
            if (Math.abs(av - ev) > 0.011) {
                fail(name + '/metrics', key + ': expected ' + ev + ', got ' + av);
                metricsOk = false;
            }
        } else if (av !== ev) {
            fail(name + '/metrics', key + ': expected ' + ev + ', got ' + av);
            metricsOk = false;
        }
    }
    if (metricsOk) pass(name + '/metrics');

    // 4. Events ready_queue — must contain PIDs, not indices
    const events = trace.events || [];
    for (const ev of events) {
        if (!Array.isArray(ev.ready_queue)) continue;
        for (const item of ev.ready_queue) {
            if (!Number.isInteger(item) || item < 1) {
                fail(name + '/events-pids', 'ready_queue contains non-pid value: ' + item);
            }
        }
    }
    pass(name + '/events-pids');
}

// ── Invalid input tests ───────────────────────────────────────────────────────
function runInvalidTests() {
    let files;
    try { files = fs.readdirSync(INVALID_DIR).filter(f => f.endsWith('.txt')); }
    catch(e) { fail('invalid/list', e.message); return; }

    for (const f of files) {
        const filePath = path.join(INVALID_DIR, f);
        const { exitCode, stdout, stderr } = runEngine(['--algo', 'fcfs', '--input', filePath]);
        const label = 'invalid/' + f;
        if (exitCode === 0)                              fail(label, 'expected non-zero exit');
        else if (stdout.trim() !== '')                   fail(label, 'stdout not empty');
        else if (!stderr.trim().startsWith('error:'))    fail(label, 'stderr does not start with "error:"');
        else                                             pass(label);
    }

    // Non-existent file
    const { exitCode, stdout, stderr } = runEngine(['--algo', 'fcfs', '--input', '/tmp/__no_such_file__.txt']);
    if (exitCode !== 0 && stdout.trim() === '' && stderr.trim().startsWith('error:')) pass('invalid/nonexistent');
    else fail('invalid/nonexistent', 'exit=' + exitCode);
}

// ── Compare test ──────────────────────────────────────────────────────────────
function runCompareTest() {
    const inF = path.join(FIXTURES_DIR, 'sjf_basic', 'input.txt');
    const { exitCode, stdout, stderr } = runEngine(['--compare', '--quantum', '2', '--input', inF]);
    if (exitCode !== 0) { fail('compare/exit', stderr.trim().slice(0,80)); return; }
    let trace;
    try { trace = JSON.parse(stdout); } catch(e) { fail('compare/json', 'not valid JSON'); return; }
    if (!trace.compare) { fail('compare/shape', 'missing compare:true'); return; }
    if (!Array.isArray(trace.runs) || trace.runs.length !== 6) { fail('compare/runs', 'expected 6 runs'); return; }
    pass('compare/shape');

    const sjf  = trace.runs[1]?.metrics?.avg_waiting;
    const srtf = trace.runs[2]?.metrics?.avg_waiting;
    if (typeof sjf  === 'number' && Math.abs(sjf  - 4) <= 0.011) pass('compare/sjf.avg_waiting');
    else fail('compare/sjf.avg_waiting', 'expected 4.00, got ' + sjf);
    if (typeof srtf === 'number' && Math.abs(srtf - 3) <= 0.011) pass('compare/srtf.avg_waiting');
    else fail('compare/srtf.avg_waiting', 'expected 3.00, got ' + srtf);
}

// ── Main ──────────────────────────────────────────────────────────────────────
const header = 'engine=' + path.basename(enginePath) + '  mode=' + mode;
console.log(header);
console.log('-'.repeat(header.length));

if (onlyFixture) {
    runFixture(onlyFixture);
} else {
    const dirs = fs.readdirSync(FIXTURES_DIR).filter(n => fs.statSync(path.join(FIXTURES_DIR, n)).isDirectory());
    for (const d of dirs) runFixture(d);
    runInvalidTests();
    runCompareTest();
}

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed > 0 ? 1 : 0);
