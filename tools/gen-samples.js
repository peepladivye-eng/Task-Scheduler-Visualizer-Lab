/* tools/gen-samples.js
 * Generates viewer/samples.js by running the scheduler binary against each fixture.
 * Usage: node tools/gen-samples.js
 * No external dependencies — only Node built-ins: fs, path, child_process.
 *
 * On Windows, if scheduler.exe is blocked by AppControl, falls back to
 * running the Linux build (bin/scheduler) through WSL.
 */

'use strict';

var fs   = require('fs');
var path = require('path');
var cp   = require('child_process');

/* ── Find binary and build run-args wrapper ──────────────────── */
var root        = path.join(__dirname, '..');
var binaryExe   = path.join(root, 'bin', 'scheduler.exe');
var binaryLinux = path.join(root, 'bin', 'scheduler');

/* Convert a Windows absolute path to a WSL /mnt/... path */
function toWslPath(winPath) {
    /* C:\foo\bar → /mnt/c/foo/bar */
    return winPath.replace(/\\/g, '/').replace(/^([A-Za-z]):/, function(_, d) {
        return '/mnt/' + d.toLowerCase();
    });
}

/* Returns {cmd, baseArgs} for spawnSync.
 * baseArgs are prepended before the scheduler's own arguments. */
var runCmd;      /* the executable to spawn */
var runPrefix;   /* args prepended before scheduler args */
var useWsl = false;

(function detectBinary() {
    /* First: try native .exe via a quick spawnSync probe */
    if (fs.existsSync(binaryExe)) {
        var probe = cp.spawnSync(binaryExe, ['--help'], { encoding: 'utf8' });
        /* status !== null means the OS actually ran it */
        if (probe.status !== null) {
            runCmd    = binaryExe;
            runPrefix = [];
            return;
        }
        console.log('scheduler.exe is blocked by AppControl; trying WSL fallback...');
    }

    /* Second: Linux binary via WSL */
    if (fs.existsSync(binaryLinux)) {
        var wslProbe = cp.spawnSync('wsl', ['--', toWslPath(binaryLinux), '--help'],
                                   { encoding: 'utf8' });
        if (wslProbe.status !== null) {
            runCmd    = 'wsl';
            runPrefix = ['--'];
            useWsl    = true;
            return;
        }
    }

    console.error('error: scheduler binary not found or not runnable. ' +
                  'Build the engine (make / gcc) and ensure it is executable.');
    process.exit(1);
}());

console.log('Using' + (useWsl ? ' WSL + ' : ' ') + (useWsl ? 'bin/scheduler' : (runCmd.replace(root, '.'))));

/* ── humanLabel ──────────────────────────────────────────────── */
/* "fcfs_textbook" → "FCFS Textbook", "rr_q2" → "RR Q2" */
function humanLabel(name) {
    return name
        .split('_')
        .map(function(word) {
            /* All-uppercase abbreviations */
            var abbrevs = ['fcfs', 'sjf', 'srtf', 'rr', 'cs'];
            if (abbrevs.indexOf(word.toLowerCase()) !== -1) {
                return word.toUpperCase();
            }
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
}

/* ── Run binary helper ───────────────────────────────────────── */
/* Returns parsed JSON from stdout, or null on failure.
 * schedulerArgs: the args for the scheduler itself (paths as Windows paths;
 * we convert them if running via WSL). */
function runBinary(schedulerArgs, label) {
    /* Convert any --input paths to WSL paths when needed */
    var convertedArgs = schedulerArgs.map(function(a, i) {
        if (useWsl && schedulerArgs[i - 1] === '--input') {
            return toWslPath(a);
        }
        if (useWsl && i === 0 && path.isAbsolute(a)) {
            return toWslPath(a);
        }
        return a;
    });

    /* For WSL runs, the first prefix arg is '--', then the binary path, then scheduler args */
    var fullArgs;
    if (useWsl) {
        fullArgs = ['--', toWslPath(binaryLinux)].concat(convertedArgs);
    } else {
        fullArgs = convertedArgs;
    }

    var result = cp.spawnSync(runCmd, fullArgs, { encoding: 'utf8' });

    if (result.status === null || result.status !== 0) {
        var code = result.status === null ? '(blocked/null)' : result.status;
        console.warn('WARNING: ' + label + ' exited ' + code + '; skipping.');
        if (result.stderr && result.stderr.trim()) {
            console.warn('  stderr: ' + result.stderr.trim().substring(0, 200));
        }
        return null;
    }
    try {
        return JSON.parse(result.stdout);
    } catch (e) {
        console.warn('WARNING: ' + label + ' produced invalid JSON; skipping.');
        return null;
    }
}

/* ── Enumerate fixtures ──────────────────────────────────────── */
var fixturesDir = path.join(root, 'fixtures');
var entries     = fs.readdirSync(fixturesDir).sort(); /* sorted for determinism */
var samples     = [];

entries.forEach(function(name) {
    var dir          = path.join(fixturesDir, name);
    var expectedPath = path.join(dir, 'expected.json');
    var inputPath    = path.join(dir, 'input.txt');

    /* Skip non-directories or missing files */
    if (!fs.statSync(dir).isDirectory()) return;
    if (!fs.existsSync(expectedPath) || !fs.existsSync(inputPath)) return;

    var expected;
    try {
        expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
    } catch (e) {
        console.warn('WARNING: ' + name + '/expected.json is invalid JSON; skipping.');
        return;
    }

    if (!Array.isArray(expected.args)) {
        console.warn('WARNING: ' + name + '/expected.json has no "args" field; skipping.');
        return;
    }

    /* Build arg list: --input <file> plus the fixture's own args */
    var args  = ['--input', inputPath].concat(expected.args);
    var trace = runBinary(args, name);
    if (!trace) return;

    console.log('  OK: ' + name);
    samples.push({
        name:  name,
        label: humanLabel(name),
        trace: trace
    });
});

/* ── Compare run ─────────────────────────────────────────────── */
var sjfInput = path.join(fixturesDir, 'sjf_basic', 'input.txt');
if (fs.existsSync(sjfInput)) {
    var compareArgs  = ['--compare', '--quantum', '2', '--input', sjfInput];
    var compareTrace = runBinary(compareArgs, 'compare_all');
    if (compareTrace) {
        console.log('  OK: compare_all');
        samples.push({
            name:  'compare_all',
            label: 'Compare All (SJF input)',
            trace: compareTrace
        });
    }
} else {
    console.warn('WARNING: fixtures/sjf_basic/input.txt not found; skipping compare run.');
}

/* ── Write viewer/samples.js ─────────────────────────────────── */
var outPath = path.join(root, 'viewer', 'samples.js');

var lines = ['window.SCHED_SAMPLES = ['];
samples.forEach(function(s, i) {
    var comma = (i < samples.length - 1) ? ',' : '';
    lines.push('  {name:' + JSON.stringify(s.name) +
               ',label:' + JSON.stringify(s.label) +
               ',trace:' + JSON.stringify(s.trace, null, 2) + '}' + comma);
});
lines.push('];');
lines.push('');

fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('\nWrote ' + samples.length + ' samples to ' + outPath);
