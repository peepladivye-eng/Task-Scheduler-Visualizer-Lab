'use strict';
/**
 * tools/validate-trace.js
 * Validates a scheduler trace JSON object against the contract spec.
 * Usage as CLI: node tools/validate-trace.js <file.json>
 */

const VALID_ALGOS = ['fcfs', 'sjf', 'srtf', 'priority', 'priority-p', 'rr'];
const VALID_TYPES = ['run', 'idle', 'context_switch'];
const VALID_EVENT_TYPES = ['arrive', 'dispatch', 'preempt', 'complete'];

/**
 * Validate a single trace object.
 * Returns an array of error strings (empty = valid).
 */
function validateTrace(t) {
  const errors = [];

  /* ── top-level scalars ─────────────────────────────────────────────── */
  if (t.version !== '1.0') {
    errors.push(`version must be "1.0", got ${JSON.stringify(t.version)}`);
  }

  if (!VALID_ALGOS.includes(t.algo)) {
    errors.push(`algo must be one of ${VALID_ALGOS.join('|')}, got ${JSON.stringify(t.algo)}`);
  }

  if (t.algo === 'rr') {
    if (!Number.isInteger(t.quantum) || t.quantum < 1) {
      errors.push(`quantum must be an integer >= 1 for rr, got ${JSON.stringify(t.quantum)}`);
    }
  } else {
    if (t.quantum !== null) {
      errors.push(`quantum must be null for non-rr algo, got ${JSON.stringify(t.quantum)}`);
    }
  }

  if (!Number.isInteger(t.context_switch_cost) || t.context_switch_cost < 0) {
    errors.push(`context_switch_cost must be an integer >= 0, got ${JSON.stringify(t.context_switch_cost)}`);
  }

  /* ── processes ─────────────────────────────────────────────────────── */
  if (!Array.isArray(t.processes) || t.processes.length === 0) {
    errors.push('processes must be a non-empty array');
    // can't validate further
    return errors;
  }

  const intFields = ['pid', 'arrival', 'burst', 'priority', 'start', 'completion', 'waiting', 'turnaround', 'response'];

  for (let i = 0; i < t.processes.length; i++) {
    const p = t.processes[i];
    const tag = `processes[${i}]`;

    // all required integer fields present
    for (const f of intFields) {
      if (!Number.isInteger(p[f])) {
        errors.push(`${tag}.${f} must be an integer, got ${JSON.stringify(p[f])}`);
      }
    }

    // sorted by pid: each pid > previous
    if (i > 0 && Number.isInteger(p.pid) && Number.isInteger(t.processes[i - 1].pid)) {
      if (p.pid <= t.processes[i - 1].pid) {
        errors.push(`processes must be sorted by pid; ${tag}.pid ${p.pid} <= processes[${i-1}].pid ${t.processes[i-1].pid}`);
      }
    }

    // derived-field checks (only when all source fields are integers)
    if (Number.isInteger(p.completion) && Number.isInteger(p.arrival) &&
        Number.isInteger(p.burst) && Number.isInteger(p.turnaround) &&
        Number.isInteger(p.waiting) && Number.isInteger(p.response) &&
        Number.isInteger(p.start)) {
      if (p.turnaround !== p.completion - p.arrival) {
        errors.push(`${tag}: turnaround(${p.turnaround}) !== completion(${p.completion}) - arrival(${p.arrival})`);
      }
      if (p.waiting !== p.turnaround - p.burst) {
        errors.push(`${tag}: waiting(${p.waiting}) !== turnaround(${p.turnaround}) - burst(${p.burst})`);
      }
      if (p.response !== p.start - p.arrival) {
        errors.push(`${tag}: response(${p.response}) !== start(${p.start}) - arrival(${p.arrival})`);
      }
      if (p.start < p.arrival) {
        errors.push(`${tag}: start(${p.start}) < arrival(${p.arrival})`);
      }
    }
  }

  /* ── timeline ──────────────────────────────────────────────────────── */
  if (!Array.isArray(t.timeline) || t.timeline.length === 0) {
    errors.push('timeline must be a non-empty array');
  } else {
    // Build a map: pid -> {burst, arrival} for cross-checks later
    const procMap = {};
    for (const p of t.processes) {
      if (Number.isInteger(p.pid)) {
        procMap[p.pid] = p;
      }
    }

    // Run-tick accumulators per pid
    const runTicks = {};   // pid -> total run ticks
    const firstRunT = {};  // pid -> t_start of first run segment
    const lastRunEnd = {}; // pid -> t_end of last run segment

    for (let i = 0; i < t.timeline.length; i++) {
      const seg = t.timeline[i];
      const tag = `timeline[${i}]`;

      if (!Number.isInteger(seg.t_start) || !Number.isInteger(seg.t_end)) {
        errors.push(`${tag}: t_start and t_end must be integers`);
        continue;
      }
      if (seg.t_start >= seg.t_end) {
        errors.push(`${tag}: t_start(${seg.t_start}) must be < t_end(${seg.t_end})`);
      }
      if (!VALID_TYPES.includes(seg.type)) {
        errors.push(`${tag}: type must be run|idle|context_switch, got ${JSON.stringify(seg.type)}`);
      }

      // pid null <=> idle
      if (seg.type === 'idle') {
        if (seg.pid !== null) {
          errors.push(`${tag}: idle segment must have pid null`);
        }
      } else {
        if (seg.pid === null || !Number.isInteger(seg.pid)) {
          errors.push(`${tag}: non-idle segment must have integer pid`);
        }
      }

      // contiguity: first t_start >= 0, each t_start == prev t_end
      if (i === 0) {
        if (seg.t_start < 0) {
          errors.push(`${tag}: first t_start must be >= 0`);
        }
      } else {
        const prev = t.timeline[i - 1];
        if (Number.isInteger(prev.t_end) && seg.t_start !== prev.t_end) {
          errors.push(`${tag}: t_start(${seg.t_start}) != previous t_end(${prev.t_end})`);
        }
        // no two adjacent segments same type+pid
        if (seg.type === prev.type && seg.pid === prev.pid) {
          errors.push(`${tag}: adjacent segments have same type(${seg.type}) and pid(${seg.pid})`);
        }
      }

      // context_switch cost checks
      if (Number.isInteger(t.context_switch_cost)) {
        if (seg.type === 'context_switch') {
          if (t.context_switch_cost === 0) {
            errors.push(`${tag}: context_switch segment present but context_switch_cost is 0`);
          } else {
            const len = seg.t_end - seg.t_start;
            if (len !== t.context_switch_cost) {
              errors.push(`${tag}: context_switch length(${len}) != context_switch_cost(${t.context_switch_cost})`);
            }
          }
        }
      }

      // accumulate run ticks per pid
      if (seg.type === 'run' && Number.isInteger(seg.pid)) {
        const pid = seg.pid;
        runTicks[pid] = (runTicks[pid] || 0) + (seg.t_end - seg.t_start);
        if (!(pid in firstRunT)) firstRunT[pid] = seg.t_start;
        lastRunEnd[pid] = seg.t_end;

        // no run segment before arrival
        if (procMap[pid] && Number.isInteger(procMap[pid].arrival)) {
          if (seg.t_start < procMap[pid].arrival) {
            errors.push(`${tag}: run segment for pid ${pid} starts at ${seg.t_start} before arrival ${procMap[pid].arrival}`);
          }
        }
      }
    }

    // run ticks == burst per pid
    for (const p of t.processes) {
      if (!Number.isInteger(p.pid) || !Number.isInteger(p.burst)) continue;
      const actual = runTicks[p.pid] || 0;
      if (actual !== p.burst) {
        errors.push(`pid ${p.pid}: total run ticks(${actual}) != burst(${p.burst})`);
      }
    }

    // completion == t_end of last run; start == t_start of first run
    for (const p of t.processes) {
      if (!Number.isInteger(p.pid)) continue;
      if (p.pid in lastRunEnd) {
        if (Number.isInteger(p.completion) && p.completion !== lastRunEnd[p.pid]) {
          errors.push(`pid ${p.pid}: completion(${p.completion}) != t_end of last run segment(${lastRunEnd[p.pid]})`);
        }
      }
      if (p.pid in firstRunT) {
        if (Number.isInteger(p.start) && p.start !== firstRunT[p.pid]) {
          errors.push(`pid ${p.pid}: start(${p.start}) != t_start of first run segment(${firstRunT[p.pid]})`);
        }
      }
    }
  }

  /* ── events ────────────────────────────────────────────────────────── */
  if (!Array.isArray(t.events)) {
    errors.push('events must be an array');
  } else {
    let lastT = -Infinity;
    for (let i = 0; i < t.events.length; i++) {
      const ev = t.events[i];
      const tag = `events[${i}]`;
      if (!Number.isInteger(ev.t)) {
        errors.push(`${tag}: t must be an integer`);
      } else if (ev.t < lastT) {
        errors.push(`${tag}: t(${ev.t}) decreases from previous t(${lastT})`);
      } else {
        lastT = ev.t;
      }
      if (!VALID_EVENT_TYPES.includes(ev.type)) {
        errors.push(`${tag}: type must be arrive|dispatch|preempt|complete, got ${JSON.stringify(ev.type)}`);
      }
      if (!Array.isArray(ev.ready_queue) || !ev.ready_queue.every(Number.isInteger)) {
        errors.push(`${tag}: ready_queue must be an array of integers`);
      }
    }
  }

  /* ── metrics ───────────────────────────────────────────────────────── */
  const m = t.metrics;
  if (!m || typeof m !== 'object') {
    errors.push('metrics must be an object');
  } else {
    const requiredMetrics = ['avg_waiting', 'avg_turnaround', 'avg_response', 'cpu_utilization', 'throughput', 'context_switches'];
    for (const key of requiredMetrics) {
      if (!(key in m)) {
        errors.push(`metrics.${key} is missing`);
      }
    }

    if (!Number.isInteger(m.context_switches)) {
      errors.push(`metrics.context_switches must be an integer, got ${JSON.stringify(m.context_switches)}`);
    }

    // avg checks: each avg must equal mean of that field over processes within 0.011
    const avgChecks = [
      { key: 'avg_waiting',    field: 'waiting' },
      { key: 'avg_turnaround', field: 'turnaround' },
      { key: 'avg_response',   field: 'response' },
    ];
    const n = t.processes.length;
    for (const { key, field } of avgChecks) {
      if (typeof m[key] !== 'number') {
        errors.push(`metrics.${key} must be a number`);
        continue;
      }
      const vals = t.processes.map(p => p[field]).filter(Number.isInteger);
      if (vals.length === n) {
        const mean = vals.reduce((a, b) => a + b, 0) / n;
        if (Math.abs(m[key] - mean) > 0.011) {
          errors.push(`metrics.${key}(${m[key]}) differs from computed mean(${mean.toFixed(4)}) by more than 0.011`);
        }
      }
    }
  }

  return errors;
}

/**
 * validate(obj) – public export.
 * Handles both compare JSON and single trace JSON.
 */
function validate(obj) {
  if (obj && obj.compare === true) {
    const errors = [];
    if (!Array.isArray(obj.runs) || obj.runs.length !== 6) {
      errors.push('compare JSON must have runs array of exactly 6 traces');
      return errors;
    }
    const expectedAlgos = ['fcfs', 'sjf', 'srtf', 'priority', 'priority-p', 'rr'];
    for (let i = 0; i < 6; i++) {
      const run = obj.runs[i];
      if (!run || typeof run !== 'object') {
        errors.push(`runs[${i}] is not an object`);
        continue;
      }
      if (run.algo !== expectedAlgos[i]) {
        errors.push(`runs[${i}].algo must be "${expectedAlgos[i]}", got ${JSON.stringify(run.algo)}`);
      }
      const subErrors = validateTrace(run);
      for (const e of subErrors) {
        errors.push(`runs[${i}] (${expectedAlgos[i]}): ${e}`);
      }
    }
    return errors;
  }
  return validateTrace(obj);
}

module.exports = { validate };

/* ── CLI entry point ───────────────────────────────────────────────────── */
if (require.main === module) {
  const fs = require('fs');
  const filePath = process.argv[2];
  if (!filePath) {
    process.stderr.write('usage: node tools/validate-trace.js <file.json>\n');
    process.exit(1);
  }
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    process.stderr.write(`error: cannot read file: ${e.message}\n`);
    process.exit(1);
  }
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch (e) {
    process.stderr.write(`error: invalid JSON: ${e.message}\n`);
    process.exit(1);
  }
  const errs = validate(obj);
  if (errs.length === 0) {
    process.stdout.write('OK\n');
    process.exit(0);
  } else {
    for (const e of errs) {
      process.stdout.write(e + '\n');
    }
    process.exit(1);
  }
}
