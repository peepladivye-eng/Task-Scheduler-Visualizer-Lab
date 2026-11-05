'use strict';
/**
 * tools/run-tests.js
 * Integration test runner for the CPU scheduler engine.
 * Usage: node tools/run-tests.js [--only <fixture-name>]
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { validate } = require('./validate-trace.js');

/* ── helpers ───────────────────────────────────────────────────────────── */

const ROOT = path.resolve(__dirname, '..');
const FIXTURES_DIR = path.join(ROOT, 'fixtures');
const FIXTURES_INVALID_DIR = path.join(ROOT, 'fixtures-invalid');
const BIN_WIN = path.join(ROOT, 'bin', 'scheduler.exe');
const BIN_UNIX = path.join(ROOT, 'bin', 'scheduler');

let passed = 0;
let failed = 0;

function pass(label) {
  console.log(`PASS  ${label}`);
  passed++;
}

function fail(label, reason) {
  console.log(`FAIL  ${label} — ${reason}`);
  failed++;
}

/**
 * Run binary with given args, return { exitCode, stdout, stderr }.
 * Uses spawnSync (no shell) for safety and portability.
 */
function runBinary(binary, args) {
  const result = spawnSync(binary, args, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  return {
    exitCode: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

/**
 * Find the scheduler binary. Returns the path or null if not found.
 */
function findBinary() {
  if (fs.existsSync(BIN_WIN)) return BIN_WIN;
  if (fs.existsSync(BIN_UNIX)) return BIN_UNIX;
  return null;
}

/* ── fixture tests ─────────────────────────────────────────────────────── */

/**
 * Run tests for a single fixture folder.
 */
function runFixture(binary, fixtureName) {
  const fixtureDir = path.join(FIXTURES_DIR, fixtureName);
  const expectedPath = path.join(fixtureDir, 'expected.json');
  const inputPath = path.join(fixtureDir, 'input.txt');

  // Load expected.json
  let expected;
  try {
    expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
  } catch (e) {
    fail(`${fixtureName}/load-expected`, `cannot read expected.json: ${e.message}`);
    return;
  }

  // Build args: --input <path> + args from expected.args
  const args = ['--input', inputPath].concat(expected.args || []);

  // Run engine
  const { exitCode, stdout, stderr } = runBinary(binary, args);

  // Must exit 0
  if (exitCode !== 0) {
    fail(`${fixtureName}/exit-code`, `expected exit 0, got ${exitCode}; stderr: ${stderr.trim()}`);
    return;
  }

  // Parse JSON output
  let trace;
  try {
    trace = JSON.parse(stdout);
  } catch (e) {
    fail(`${fixtureName}/parse-json`, `stdout is not valid JSON: ${e.message}`);
    return;
  }

  /* check a: validate the trace */
  const validErrors = validate(trace);
  if (validErrors.length > 0) {
    fail(`${fixtureName}/validate`, validErrors[0]);
  } else {
    pass(`${fixtureName}/validate`);
  }

  /* check b: timeline matches expected exactly */
  // expected.timeline is array of [t_start, t_end, type, pid]
  const expTL = expected.timeline || [];
  const actTL = trace.timeline || [];

  if (actTL.length !== expTL.length) {
    fail(`${fixtureName}/timeline`, `expected ${expTL.length} segments, got ${actTL.length}`);
  } else {
    let timelineOk = true;
    for (let i = 0; i < expTL.length; i++) {
      const [es, ee, et, ep] = expTL[i];
      const seg = actTL[i];
      if (seg.t_start !== es || seg.t_end !== ee || seg.type !== et || seg.pid !== ep) {
        fail(`${fixtureName}/timeline`, `segment[${i}] expected [${es},${ee},"${et}",${ep}] got [${seg.t_start},${seg.t_end},"${seg.type}",${seg.pid}]`);
        timelineOk = false;
        break;
      }
    }
    if (timelineOk) pass(`${fixtureName}/timeline`);
  }

  /* check c: per-pid process fields */
  const expProcs = expected.processes || {};
  let procsOk = true;
  for (const pidStr of Object.keys(expProcs)) {
    const pid = parseInt(pidStr, 10);
    const exp = expProcs[pidStr];
    const act = trace.processes.find(p => p.pid === pid);
    if (!act) {
      fail(`${fixtureName}/pid-${pid}`, `pid ${pid} not found in output`);
      procsOk = false;
      continue;
    }
    const fields = ['start', 'completion', 'waiting', 'turnaround', 'response'];
    for (const f of fields) {
      if (act[f] !== exp[f]) {
        fail(`${fixtureName}/pid-${pid}`, `${f}: expected ${exp[f]}, got ${act[f]}`);
        procsOk = false;
      }
    }
  }
  if (procsOk) pass(`${fixtureName}/processes`);

  /* check d: metrics within 0.011 */
  const expM = expected.metrics || {};
  const actM = trace.metrics || {};
  let metricsOk = true;
  for (const key of Object.keys(expM)) {
    const ev = expM[key];
    const av = actM[key];
    if (av === undefined) {
      fail(`${fixtureName}/metrics`, `missing key ${key}`);
      metricsOk = false;
      continue;
    }
    if (typeof ev === 'number') {
      if (Math.abs(av - ev) > 0.011) {
        fail(`${fixtureName}/metrics`, `${key}: expected ${ev}, got ${av} (diff ${Math.abs(av - ev).toFixed(4)})`);
        metricsOk = false;
      }
    } else {
      // integer (context_switches)
      if (av !== ev) {
        fail(`${fixtureName}/metrics`, `${key}: expected ${ev}, got ${av}`);
        metricsOk = false;
      }
    }
  }
  if (metricsOk) pass(`${fixtureName}/metrics`);
}

/* ── invalid input tests ───────────────────────────────────────────────── */

function runInvalidTests(binary) {
  // Each .txt file in fixtures-invalid/ should cause exit 1, empty stdout, stderr starts "error:"
  let files;
  try {
    files = fs.readdirSync(FIXTURES_INVALID_DIR).filter(f => f.endsWith('.txt'));
  } catch (e) {
    fail('invalid-inputs/list', `cannot list fixtures-invalid/: ${e.message}`);
    return;
  }

  for (const file of files) {
    const filePath = path.join(FIXTURES_INVALID_DIR, file);
    const label = `invalid/${file}`;
    const { exitCode, stdout, stderr } = runBinary(binary, ['--algo', 'fcfs', '--input', filePath]);
    if (exitCode !== 1) {
      fail(label, `expected exit 1, got ${exitCode}`);
    } else if (stdout.trim() !== '') {
      fail(label, `expected empty stdout, got: ${stdout.trim().substring(0, 80)}`);
    } else if (!stderr.trim().startsWith('error:')) {
      fail(label, `expected stderr to start with "error:", got: ${stderr.trim().substring(0, 80)}`);
    } else {
      pass(label);
    }
  }

  // Non-existent file test
  const missing = path.join(ROOT, 'fixtures', '__no_such_file__.txt');
  const label = 'invalid/nonexistent-file';
  const { exitCode, stdout, stderr } = runBinary(binary, ['--algo', 'fcfs', '--input', missing]);
  if (exitCode !== 1) {
    fail(label, `expected exit 1, got ${exitCode}`);
  } else if (stdout.trim() !== '') {
    fail(label, `expected empty stdout, got: ${stdout.trim().substring(0, 80)}`);
  } else if (!stderr.trim().startsWith('error:')) {
    fail(label, `expected stderr to start with "error:", got: ${stderr.trim().substring(0, 80)}`);
  } else {
    pass(label);
  }
}

/* ── compare test ──────────────────────────────────────────────────────── */

function runCompareTest(binary) {
  const inputFile = path.join(FIXTURES_DIR, 'sjf_basic', 'input.txt');
  const label = 'compare/validate';
  const labelSjf = 'compare/sjf.avg_waiting';
  const labelSrtf = 'compare/srtf.avg_waiting';

  const { exitCode, stdout, stderr } = runBinary(binary, [
    '--compare', '--quantum', '2', '--input', inputFile,
  ]);

  if (exitCode !== 0) {
    fail(label, `expected exit 0, got ${exitCode}; stderr: ${stderr.trim()}`);
    fail(labelSjf, 'skipped (engine failed)');
    fail(labelSrtf, 'skipped (engine failed)');
    return;
  }

  let trace;
  try {
    trace = JSON.parse(stdout);
  } catch (e) {
    fail(label, `stdout is not valid JSON: ${e.message}`);
    fail(labelSjf, 'skipped (parse failed)');
    fail(labelSrtf, 'skipped (parse failed)');
    return;
  }

  const errs = validate(trace);
  if (errs.length > 0) {
    fail(label, errs[0]);
  } else {
    pass(label);
  }

  // runs[1] = sjf, runs[2] = srtf
  if (!trace.runs || !trace.runs[1] || !trace.runs[2]) {
    fail(labelSjf, 'runs[1] missing');
    fail(labelSrtf, 'runs[2] missing');
    return;
  }

  const sjfWaiting = trace.runs[1].metrics && trace.runs[1].metrics.avg_waiting;
  if (typeof sjfWaiting === 'number' && Math.abs(sjfWaiting - 4) <= 0.011) {
    pass(labelSjf);
  } else {
    fail(labelSjf, `expected 4.00, got ${sjfWaiting}`);
  }

  const srtfWaiting = trace.runs[2].metrics && trace.runs[2].metrics.avg_waiting;
  if (typeof srtfWaiting === 'number' && Math.abs(srtfWaiting - 3) <= 0.011) {
    pass(labelSrtf);
  } else {
    fail(labelSrtf, `expected 3.00, got ${srtfWaiting}`);
  }
}

/* ── main ──────────────────────────────────────────────────────────────── */

function main() {
  const args = process.argv.slice(2);
  let onlyFixture = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--only' && args[i + 1]) {
      onlyFixture = args[i + 1];
      i++;
    }
  }

  // Special: --only none means no tests, just exit
  if (onlyFixture === 'none') {
    console.log('no tests run');
    process.exit(0);
  }

  // Find engine binary
  const binary = findBinary();
  if (!binary) {
    console.error('error: build the engine first');
    process.exit(1);
  }

  if (onlyFixture) {
    // Run only the named fixture
    runFixture(binary, onlyFixture);
  } else {
    // Run all fixtures
    let fixtureDirs;
    try {
      fixtureDirs = fs.readdirSync(FIXTURES_DIR).filter(name => {
        return fs.statSync(path.join(FIXTURES_DIR, name)).isDirectory();
      });
    } catch (e) {
      console.error(`error: cannot list fixtures/: ${e.message}`);
      process.exit(1);
    }

    for (const name of fixtureDirs) {
      runFixture(binary, name);
    }

    // Invalid input tests
    runInvalidTests(binary);

    // Compare test
    runCompareTest(binary);
  }

  /* ── summary ── */
  console.log('');
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
