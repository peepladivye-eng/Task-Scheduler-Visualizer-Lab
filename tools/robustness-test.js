'use strict';
/**
 * tools/robustness-test.js
 * Synchronous robustness tests: one scenario at a time, check exit + leftovers.
 */
const fs   = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CPP  = path.join(ROOT, 'bin', 'scheduler_cpp');

let pass = 0, fail = 0;

function check(name, ipc, ok, detail) {
    const s = ok ? 'PASS' : 'FAIL';
    if (ok) pass++; else fail++;
    console.log(`${s}: ${name} [${ipc}]${detail ? ' — ' + detail : ''}`);
}

function makeInput(lines) {
    const f = path.join(ROOT, '.robust_input.txt');
    fs.writeFileSync(f, lines.join('\n') + '\n');
    return f;
}

function noLeftovers() {
    // Wait a moment then check for exact process name match
    const r = spawnSync('bash', ['-c', 'sleep 1 && pgrep -x scheduler_cpp || true'], {
        encoding: 'utf8', timeout: 5000
    });
    return !r.stdout || r.stdout.trim() === '';
}

function sleep(ms) {
    // Use a tight polling loop so async events can fire
    const start = Date.now();
    while (Date.now() - start < ms) {
        // Allow event loop to process by doing a tiny synchronous pause
    }
}

// Start engine, send signal after delay, wait for exit
function testSignal(name, ipc, signal, delayMs) {
    const f = makeInput(['1 0 10 1', '2 1 8 1', '3 2 6 1']);
    const child = spawn(CPP, ['--algo', 'fcfs', '--input', f, '--mode', 'live',
        '--ipc', ipc, '--work-us', '0', '--tick-ms', '200'], {
        cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe']
    });

    sleep(delayMs);
    try { process.kill(child.pid, signal); } catch (e) {}

    // Wait for exit (up to 5s)
    let exited = false;
    let exitCode = null;
    child.on('exit', (code) => { exited = true; exitCode = code; });
    const start = Date.now();
    while (!exited && Date.now() - start < 5000) {
        sleep(100);
    }

    const clean = noLeftovers();
    fs.unlinkSync(f);

    const expected = signal === 'SIGINT' ? 130 : 143;
    check(name, ipc, exited && clean, `exit=${exitCode}, expected~${expected}, clean=${clean}`);
}

function testKillParent(ipc) {
    const f = makeInput(['1 0 10 1', '2 1 8 1', '3 2 6 1']);
    const child = spawn(CPP, ['--algo', 'fcfs', '--input', f, '--mode', 'live',
        '--ipc', ipc, '--work-us', '0', '--tick-ms', '200'], {
        cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe']
    });

    sleep(600);
    try { process.kill(child.pid, 'SIGKILL'); } catch (e) {}

    let exited = false;
    child.on('exit', () => { exited = true; });
    const start = Date.now();
    while (!exited && Date.now() - start < 3000) { sleep(100); }

    const clean = noLeftovers();
    fs.unlinkSync(f);
    check('3_SIGKILL_parent', ipc, clean, `exited=${exited}, clean=${clean}`);
}

function testKillChild(ipc) {
    const f = makeInput(['1 0 10 1', '2 1 5 1', '3 2 8 1']);
    const child = spawn(CPP, ['--algo', 'fcfs', '--input', f, '--mode', 'live',
        '--ipc', ipc, '--work-us', '0', '--tick-ms', '200'], {
        cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe']
    });

    sleep(800);
    // Find child process of the engine
    const r = spawnSync('bash', ['-c', `pgrep -P ${child.pid} | head -1`], {
        encoding: 'utf8', timeout: 3000
    });
    const childPid = r.stdout.trim();
    if (childPid) {
        try { process.kill(parseInt(childPid), 'SIGKILL'); } catch (e) {}
    }

    let exitCode = null;
    child.on('exit', (code) => { exitCode = code; });
    const start = Date.now();
    while (exitCode === null && Date.now() - start < 5000) { sleep(100); }

    const clean = noLeftovers();
    fs.unlinkSync(f);
    check('4_kill_child', ipc, exitCode !== 0 && exitCode !== null && clean,
        `exit=${exitCode}, clean=${clean}`);
}

function test64Procs(ipc) {
    const lines = [];
    for (let i = 1; i <= 64; i++) lines.push(`${i} 0 5 1`);
    const f = makeInput(lines);

    const r = spawnSync(CPP, ['--algo', 'fcfs', '--input', f, '--mode', 'live',
        '--ipc', ipc, '--work-us', '0'], { cwd: ROOT, timeout: 30000, encoding: 'utf8' });

    const clean = noLeftovers();
    fs.unlinkSync(f);
    check('6_64_processes', ipc, r.status === 0 && clean,
        `exit=${r.status}, clean=${clean}`);
}

function testLiveLimit(ipc) {
    const lines = [];
    let total = 0;
    for (let i = 1; total < 5001; i++) {
        const burst = Math.min(5001 - total, 500);
        lines.push(`${i} 0 ${burst} 1`);
        total += burst;
    }
    const f = makeInput(lines);

    const rLive = spawnSync(CPP, ['--algo', 'fcfs', '--input', f, '--mode', 'live',
        '--ipc', ipc], { cwd: ROOT, timeout: 5000, encoding: 'utf8' });
    const rSim = spawnSync(CPP, ['--algo', 'fcfs', '--input', f, '--mode', 'simulate'],
        { cwd: ROOT, timeout: 10000, encoding: 'utf8' });

    fs.unlinkSync(f);
    const liveFails = rLive.status !== 0 && rLive.stderr.includes('5000');
    const simWorks = rSim.status === 0;
    check('7_live_limit', ipc, liveFails && simWorks,
        `liveExit=${rLive.status}, simExit=${rSim.status}, limitMsg=${liveFails}`);
}

function testBadFlags(ipc) {
    const f = makeInput(['1 0 5 1']);
    const tests = [
        ['--ipc', 'foo'],
        ['--work-us', '-1'],
        ['--tick-ms', '1001'],
        ['--mode', 'lvie'],
    ];
    let allFail = true;
    for (const bad of tests) {
        const r = spawnSync(CPP, ['--algo', 'fcfs', '--input', f, ...bad],
            { cwd: ROOT, timeout: 5000, encoding: 'utf8' });
        if (r.status === 0 || !r.stderr.includes('error:')) allFail = false;
    }
    fs.unlinkSync(f);
    check('8_bad_flags', ipc, allFail, `allRejected=${allFail}`);
}

// ── Run all tests ─────────────────────────────────────────────────────────────
const IPCS = ['signal', 'pipe'];

for (const ipc of IPCS) {
    console.log(`\n=== Testing --ipc ${ipc} ===`);

    // 1. SIGINT
    testSignal('1_SIGINT', ipc, 'SIGINT', 600);

    // 2. SIGTERM
    testSignal('2_SIGTERM', ipc, 'SIGTERM', 600);

    // 3. SIGKILL of parent
    testKillParent(ipc);

    // 4. Kill one child mid-run
    testKillChild(ipc);

    // 6. 64 processes
    test64Procs(ipc);

    // 7. Live limit
    testLiveLimit(ipc);

    // 8. Bad flags
    testBadFlags(ipc);
}

console.log(`\n=== SUMMARY: ${pass} PASS, ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
