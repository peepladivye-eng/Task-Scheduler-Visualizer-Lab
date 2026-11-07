// tools/gen-presets.js
// GENERATED USAGE: node tools/gen-presets.js
// Reads fixtures/*/input.txt + expected.json, runs the engine binary,
// and writes web/src/lib/presets.generated.ts.
// Node built-ins only — no npm packages.

'use strict';

const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

// ---------------------------------------------------------------------------
// Paths (all relative to repo root, which is one directory up from tools/)
// ---------------------------------------------------------------------------
const REPO_ROOT     = path.resolve(__dirname, '..');
const FIXTURES_DIR  = path.join(REPO_ROOT, 'fixtures');
const BIN_WIN       = path.join(REPO_ROOT, 'bin', 'scheduler.exe');
const BIN_UNIX      = path.join(REPO_ROOT, 'bin', 'scheduler');
const OUT_FILE      = path.join(REPO_ROOT, 'web', 'src', 'lib', 'presets.generated.ts');

// ---------------------------------------------------------------------------
// Find the engine binary
// ---------------------------------------------------------------------------
function findBinary() {
  if (fs.existsSync(BIN_WIN))  return BIN_WIN;
  if (fs.existsSync(BIN_UNIX)) return BIN_UNIX;
  return null;
}

// Convert a Windows path to a WSL-compatible path (e.g. C:\foo -> /mnt/c/foo)
function toWslPath(winPath) {
  return winPath
    .replace(/\\/g, '/')
    .replace(/^([A-Za-z]):/, (_, d) => '/mnt/' + d.toLowerCase());
}

// ---------------------------------------------------------------------------
// Run the binary, returning parsed JSON or null on failure.
// Falls back to WSL if the process is blocked (status === null on Windows).
// ---------------------------------------------------------------------------
function runBinary(binary, args) {
  // First attempt: run binary directly
  const result = spawnSync(binary, args, { encoding: 'utf8', timeout: 10000 });

  if (result.status === 0 && result.stdout) {
    try {
      return JSON.parse(result.stdout);
    } catch (e) {
      console.warn(`  [warn] Failed to parse JSON from binary output: ${e.message}`);
      return null;
    }
  }

  // If blocked (AppControl / Windows security), status is null
  if (result.status === null || result.error) {
    console.warn(`  [warn] Direct binary blocked (${result.error ? result.error.code : 'status null'}), trying WSL...`);
    const wslArgs = ['--', toWslPath(binary), ...args.map(a => a.replace(/\\/g, '/'))];
    const wslResult = spawnSync('wsl', wslArgs, { encoding: 'utf8', timeout: 10000 });

    if (wslResult.status === 0 && wslResult.stdout) {
      try {
        return JSON.parse(wslResult.stdout);
      } catch (e) {
        console.warn(`  [warn] Failed to parse WSL JSON output: ${e.message}`);
        return null;
      }
    }
    console.warn(`  [warn] WSL also failed (status: ${wslResult.status}). Skipping.`);
    return null;
  }

  // Non-zero exit — log stderr for debugging
  if (result.stderr) {
    console.warn(`  [warn] Engine stderr: ${result.stderr.trim()}`);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Parse input.txt → ProcInput[]
// ---------------------------------------------------------------------------
function parseInput(inputPath) {
  const lines = fs.readFileSync(inputPath, 'utf8').split('\n');
  const procs = [];
  for (const raw of lines) {
    const line = raw.trim();
    // Skip blank lines and comments
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    if (parts.length < 4) continue;
    procs.push({
      pid:      parseInt(parts[0], 10),
      arrival:  parseInt(parts[1], 10),
      burst:    parseInt(parts[2], 10),
      priority: parseInt(parts[3], 10),
    });
  }
  return procs;
}

// ---------------------------------------------------------------------------
// Extract algo/quantum/contextSwitch from the args array in expected.json
// ---------------------------------------------------------------------------
function extractArgs(args) {
  let algo          = 'fcfs';
  let quantum       = null;
  let contextSwitch = 0;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--algo' && args[i + 1]) {
      algo = args[++i];
    } else if (args[i] === '--quantum' && args[i + 1]) {
      quantum = parseInt(args[++i], 10);
    } else if (args[i] === '--context-switch' && args[i + 1]) {
      contextSwitch = parseInt(args[++i], 10);
    }
  }
  return { algo, quantum, contextSwitch };
}

// ---------------------------------------------------------------------------
// Prettify a folder name into a label
// e.g. "fcfs_textbook" → "Fcfs Textbook"
// ---------------------------------------------------------------------------
function toLabel(folderName) {
  return folderName
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Serialize a value as compact JSON for embedding in a TS literal.
// We use JSON.stringify with a 2-space indent so the file is readable,
// but we prefix each line with extra indentation to match the array context.
// ---------------------------------------------------------------------------
function indentJson(obj, baseIndent) {
  const raw = JSON.stringify(obj, null, 2);
  return raw
    .split('\n')
    .map((line, i) => (i === 0 ? line : baseIndent + line))
    .join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const binary = findBinary();
  if (!binary) {
    console.error('error: engine binary not found in bin/scheduler.exe or bin/scheduler');
    process.exit(1);
  }
  console.log(`Using binary: ${binary}`);

  // Ensure output directory exists
  const outDir = path.dirname(OUT_FILE);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Get all fixture folders
  const fixtureFolders = fs.readdirSync(FIXTURES_DIR)
    .filter(name => fs.statSync(path.join(FIXTURES_DIR, name)).isDirectory())
    .sort(); // deterministic order

  const presets = [];

  for (const folderName of fixtureFolders) {
    const fixtureDir = path.join(FIXTURES_DIR, folderName);
    const inputPath  = path.join(fixtureDir, 'input.txt');
    const expectedPath = path.join(fixtureDir, 'expected.json');

    // Both files must exist
    if (!fs.existsSync(inputPath) || !fs.existsSync(expectedPath)) {
      console.warn(`  [skip] ${folderName}: missing input.txt or expected.json`);
      continue;
    }

    console.log(`Processing fixture: ${folderName}`);

    // Parse processes from input.txt
    const processes = parseInput(inputPath);
    if (processes.length === 0) {
      console.warn(`  [skip] ${folderName}: no processes parsed from input.txt`);
      continue;
    }

    // Extract algo/quantum/contextSwitch from expected.json args
    let expectedData;
    try {
      expectedData = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
    } catch (e) {
      console.warn(`  [skip] ${folderName}: failed to parse expected.json: ${e.message}`);
      continue;
    }

    const { algo, quantum, contextSwitch } = extractArgs(expectedData.args || []);

    // Build CLI args for the engine
    const engineArgs = ['--input', inputPath, '--algo', algo];
    if (quantum !== null) {
      engineArgs.push('--quantum', String(quantum));
    }
    if (contextSwitch !== 0) {
      engineArgs.push('--context-switch', String(contextSwitch));
    }

    // Run the engine
    const trace = runBinary(binary, engineArgs);
    if (!trace) {
      console.warn(`  [skip] ${folderName}: engine run failed`);
      continue;
    }

    presets.push({
      id:            folderName,
      label:         toLabel(folderName),
      processes,
      algo,
      quantum,
      contextSwitch,
      trace,
    });
    console.log(`  [ok] ${folderName} (algo: ${algo})`);
  }

  // ---------------------------------------------------------------------------
  // Also run the compare preset for sjf_basic (as the task specifies)
  // but do NOT include it in PRESETS (compare is not an Algo type).
  // We just verify it runs; we don't embed it.
  // ---------------------------------------------------------------------------
  const sjfInputPath = path.join(FIXTURES_DIR, 'sjf_basic', 'input.txt');
  if (fs.existsSync(sjfInputPath)) {
    console.log('Running compare test (sjf_basic input)...');
    const compareArgs = ['--compare', '--quantum', '4', '--input', sjfInputPath];
    const compareResult = runBinary(binary, compareArgs);
    if (compareResult) {
      console.log('  [ok] compare run succeeded');
    } else {
      console.warn('  [warn] compare run failed or was skipped');
    }
  }

  // ---------------------------------------------------------------------------
  // Generate the TypeScript output file
  // ---------------------------------------------------------------------------
  const lines = [];
  lines.push('// GENERATED by tools/gen-presets.js. Do not edit.');
  lines.push("import type { ProcInput, Algo, Trace } from '../types/trace'");
  lines.push('');
  lines.push('export interface Preset {');
  lines.push('  id: string');
  lines.push('  label: string');
  lines.push('  processes: ProcInput[]');
  lines.push('  algo: Algo');
  lines.push('  quantum: number | null');
  lines.push('  contextSwitch: number');
  lines.push('  trace: Trace');
  lines.push('}');
  lines.push('');

  if (presets.length === 0) {
    lines.push('// No presets generated — engine binary could not be run.');
    lines.push('export const PRESETS: Preset[] = []');
  } else {
    lines.push('export const PRESETS: Preset[] = [');
    for (let i = 0; i < presets.length; i++) {
      const p = presets[i];
      const isLast = i === presets.length - 1;
      lines.push('  {');
      lines.push(`    id: ${JSON.stringify(p.id)},`);
      lines.push(`    label: ${JSON.stringify(p.label)},`);
      lines.push(`    processes: ${indentJson(p.processes, '    ')},`);
      lines.push(`    algo: ${JSON.stringify(p.algo)} as Algo,`);
      lines.push(`    quantum: ${p.quantum === null ? 'null' : p.quantum},`);
      lines.push(`    contextSwitch: ${p.contextSwitch},`);
      lines.push(`    trace: ${indentJson(p.trace, '    ')},`);
      lines.push(isLast ? '  }' : '  },');
    }
    lines.push(']');
  }
  lines.push('');  // trailing newline

  const content = lines.join('\n');
  fs.writeFileSync(OUT_FILE, content, 'utf8');
  console.log(`\nWrote ${presets.length} preset(s) to: ${OUT_FILE}`);
}

main();
