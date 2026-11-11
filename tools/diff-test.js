'use strict';
/**
 * tools/diff-test.js
 * Differential testing: generate random workloads, run all 4 engines,
 * compare JSON traces (ignoring os_pid and "os" fields).
 *
 * Usage: node tools/diff-test.js [--n 500] [--seed 1]
 */
const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const REF  = path.join(ROOT, 'bin', 'scheduler');
const CPP  = path.join(ROOT, 'bin', 'scheduler_cpp');

const args = process.argv.slice(2);
let n    = 500;
let seed = 1;
for (let i = 0; i < args.length; i++) {
    if (args[i] === '--n'    && args[i+1]) n    = parseInt(args[++i], 10);
    else if (args[i] === '--seed' && args[i+1]) seed = parseInt(args[++i], 10);
    else if (args[i] === '--help') {
        console.log('Usage: node tools/diff-test.js [--n 500] [--seed 1]');
        process.exit(0);
    }
}

// ── Simple seeded PRNG (mulberry32) ───────────────────────────────────────────
function makeRng(seed) {
    let s = seed >>> 0;
    return function() {
        s = (s + 0x6D2B79F5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const rng = makeRng(seed);
const randInt = (lo, hi) => Math.floor(rng() * (hi - lo + 1)) + lo;

const ALGOS = ['fcfs', 'sjf', 'srtf', 'priority', 'priority-p', 'rr'];

function genWorkload() {
    const nProcs = randInt(1, 6);
    const lines = [];
    const usedPids = new Set();
    for (let i = 0; i < nProcs; i++) {
        let pid;
        do { pid = randInt(1, 8); } while (usedPids.has(pid));
        usedPids.add(pid);
        const arrival  = randInt(0, 10);
        const burst    = randInt(1, 6);
        const priority = randInt(1, 5);
        lines.push(`${pid} ${arrival} ${burst} ${priority}`);
    }
    return lines.join('\n') + '\n';
}

// Run an engine and return normalized JSON string (os_pid stripped).
function runEngine(binary, args, inputFile) {
    const result = spawnSync(binary, args, {
        input: fs.readFileSync(inputFile, 'utf8'),
        cwd: ROOT,
        timeout: 10000,
        encoding: 'utf8'
    });
    if (result.status !== 0 || !result.stdout) return null;
    return normalize(result.stdout);
}

function normalize(json) {
    return json
        .replace(/"os_pid":[0-9][0-9]*/g, '"os_pid":null')
        .replace(/,"os_pid":null/g, '')
        .replace(/,"os":\{[^}]*\}/g, '');
}

let totalTests = 0;
let mismatches = 0;

for (let w = 0; w < n; w++) {
    const workload = genWorkload();
    const tmpFile = path.join(ROOT, '.diff_test_input.txt');
    fs.writeFileSync(tmpFile, workload);

    for (const algo of ALGOS) {
        const quantum = (algo === 'rr') ? randInt(1, 4) : 0;
        const csCost  = randInt(0, 2);

        // Build args for each engine
        const refArgs = ['--algo', algo, '--input', tmpFile];
        if (quantum > 0) refArgs.push('--quantum', String(quantum));
        if (csCost > 0)  refArgs.push('--context-switch', String(csCost));

        const simArgs = [...refArgs, '--mode', 'simulate'];
        const pipeArgs = [...refArgs, '--mode', 'live', '--ipc', 'pipe', '--work-us', '0'];
        const sigArgs  = [...refArgs, '--mode', 'live', '--ipc', 'signal', '--work-us', '0'];

        const ref  = runEngine(REF,  refArgs,  tmpFile);
        const sim  = runEngine(CPP, simArgs,  tmpFile);
        const pipe = runEngine(CPP, pipeArgs, tmpFile);
        const sig  = runEngine(CPP, sigArgs,  tmpFile);

        totalTests++;

        if (ref === null || sim === null || pipe === null || sig === null) {
            console.error(`ERROR: engine returned null for workload ${w}, algo ${algo}`);
            console.error(`  input: ${workload.replace(/\n/g, ' | ')}`);
            mismatches++;
            continue;
        }

        if (ref !== sim || sim !== pipe || pipe !== sig) {
            mismatches++;
            console.error(`MISMATCH: workload ${w}, algo ${algo}`);
            console.error(`  input: ${workload.replace(/\n/g, ' | ')}`);
            console.error(`  ref==sim: ${ref === sim}, sim==pipe: ${sim === pipe}, pipe==sig: ${pipe === sig}`);
            if (ref !== sim) {
                console.error(`  ref vs sim:`);
                console.error(`    ref:  ${ref.substring(0, 200)}...`);
                console.error(`    sim:  ${sim.substring(0, 200)}...`);
            }
            if (mismatches > 5) {
                console.error('Too many mismatches, stopping.');
                process.exit(1);
            }
        }
    }

    fs.unlinkSync(tmpFile);
}

if (mismatches > 0) {
    console.error(`${mismatches} mismatches found out of ${totalTests} tests`);
    process.exit(1);
}

console.log(`${n} workloads x 6 algorithms x 4 engines: 0 mismatches`);
