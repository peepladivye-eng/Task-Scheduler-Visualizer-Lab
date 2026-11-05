/* app.js — Task 8: viewer scaffold
 * Sets up window.SCHED namespace, file loading, drag-and-drop,
 * and a basic render() stub (Gantt drawn in Task 9).
 */

/* ── Global namespace ──────────────────────────────────────── */
window.SCHED = {
    /* Contract-defined pid palette (10 colours, wrap with modulo) */
    PID_COLORS: [
        '#6ea8fe', '#3ddc97', '#ffb454', '#ff6b9d', '#b794f6',
        '#4fd1c5', '#f6e05e', '#fc8181', '#90cdf4', '#a3e635'
    ],

    /* Returns the colour string for a given pid (1-based) */
    pidColor: function(pid) {
        return window.SCHED.PID_COLORS[(pid - 1) % 10];
    }
};

/* ── Application state ─────────────────────────────────────── */
var state = {
    trace: null,  /* currently loaded trace object (single-run) */
    t: 0          /* current playback tick */
};

/* ── DOM wiring (runs after document is ready) ─────────────── */
document.addEventListener('DOMContentLoaded', function() {
    var fileBtn      = document.getElementById('file-btn');
    var fileInput    = document.getElementById('file-input');
    var sampleSelect = document.getElementById('sample-select');

    /* Load button → trigger hidden file input */
    fileBtn.addEventListener('click', function() {
        fileInput.click();
    });

    /* File chosen via picker */
    fileInput.addEventListener('change', function() {
        var file = fileInput.files[0];
        if (!file) return;
        readFileAsJSON(file, function(obj, err) {
            if (err) { showToast('Invalid JSON file', 'error'); return; }
            loadTrace(obj);
        });
        /* Reset so the same file can be re-loaded if needed */
        fileInput.value = '';
    });

    /* Sample select — populate from window.SCHED_SAMPLES (written by gen-samples.js) */
    if (window.SCHED_SAMPLES && window.SCHED_SAMPLES.length > 0) {
        sampleSelect.disabled = false;
        window.SCHED_SAMPLES.forEach(function(s) {
            var opt = document.createElement('option');
            opt.value = s.name;
            opt.textContent = s.label;
            sampleSelect.appendChild(opt);
        });
        sampleSelect.addEventListener('change', function() {
            var name   = sampleSelect.value;
            var sample = window.SCHED_SAMPLES.find(function(s) { return s.name === name; });
            if (sample) loadTrace(sample.trace);
        });
        /* Auto-load first sample so the viewer isn't blank on open */
        loadTrace(window.SCHED_SAMPLES[0].trace);
    }

    /* ── Drag-and-drop anywhere on the page ─────────────────── */
    document.addEventListener('dragover', function(e) {
        e.preventDefault();
        document.body.classList.add('drag-over');
    });

    document.addEventListener('dragleave', function(e) {
        /* relatedTarget is null when leaving the browser window */
        if (e.relatedTarget === null) {
            document.body.classList.remove('drag-over');
        }
    });

    document.addEventListener('drop', function(e) {
        e.preventDefault();
        document.body.classList.remove('drag-over');

        var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (!file || !file.name.endsWith('.json')) {
            showToast('Please drop a .json file', 'error');
            return;
        }
        readFileAsJSON(file, function(obj, err) {
            if (err) { showToast('Invalid JSON file', 'error'); return; }
            loadTrace(obj);
        });
    });
});

/* ── File reading helper ────────────────────────────────────── */
/* Reads a File object as text and parses it as JSON.
 * Calls cb(parsedObject, null) on success, cb(null, error) on failure. */
function readFileAsJSON(file, cb) {
    var reader = new FileReader();
    reader.onload = function(e) {
        try {
            var obj = JSON.parse(e.target.result);
            cb(obj, null);
        } catch (err) {
            cb(null, err);
        }
    };
    reader.onerror = function() {
        cb(null, new Error('FileReader error'));
    };
    reader.readAsText(file);
}

/* ── loadTrace ──────────────────────────────────────────────── */
/* Accepts either a single-run trace or a compare JSON.
 * Validates the minimum required fields and updates state. */
function loadTrace(obj) {
    if (!obj || obj.version !== '1.0') {
        showToast('Not a valid trace file (bad version)', 'error');
        return;
    }

    if (obj.compare === true) {
        /* Compare file — use the first run (FCFS) for now;
         * the compare view will be wired up in a later task. */
        if (!Array.isArray(obj.runs) || obj.runs.length === 0) {
            showToast('Compare file has no runs', 'error');
            return;
        }
        state.trace = obj.runs[0];
        showToast('Compare file: showing FCFS (compare view comes later)', 'info');
    } else {
        /* Single-run trace */
        if (!Array.isArray(obj.timeline) || !Array.isArray(obj.processes)) {
            showToast('Not a valid trace file', 'error');
            return;
        }
        state.trace = obj;
    }

    state.t = 0;
    render();
}

/* ── render ─────────────────────────────────────────────────── */
/* Top-level render: updates all panels to reflect state.trace / state.t.
 * Gantt chart implementation lives in Task 9 (gantt.js).
 * Panel implementations live in Task 10 (panels.js). */
function render() {
    var trace = state.trace;
    if (!trace) return;

    /* ── Algo badge ─────────────────────────────────────────── */
    var badge = document.getElementById('algo-badge');
    var label = (trace.algo || '').toUpperCase();
    if (trace.algo === 'rr' && trace.quantum) {
        label += ' q=' + trace.quantum;
    }
    if (trace.context_switch_cost > 0) {
        label += ' cs=' + trace.context_switch_cost;
    }
    badge.textContent = label;
    badge.style.display = 'inline-block';

    /* ── Gantt panel ────────────────────────────────────────── */
    var ganttEl = document.getElementById('gantt');
    if (window.SCHED.renderGantt) {
        window.SCHED.renderGantt(ganttEl, trace, state.t);
    }

    /* ── Controls ───────────────────────────────────────────── */
    /* Compute total_time from the last timeline segment (metrics may omit it) */
    var totalTime = 0;
    if (trace.timeline && trace.timeline.length > 0) {
        totalTime = trace.timeline[trace.timeline.length - 1].t_end;
    }
    var slider = document.getElementById('slider');
    slider.max   = totalTime;
    slider.value = state.t;
    slider.disabled = false;

    document.getElementById('btn-play').disabled = false;
    document.getElementById('btn-back').disabled = false;
    document.getElementById('btn-fwd').disabled  = false;
    document.getElementById('speed-select').disabled = false;

    document.getElementById('time-readout').textContent = 't = ' + state.t;
}

/* ── showToast ──────────────────────────────────────────────── */
/* Displays a temporary notification at the bottom-right of the page.
 * type: 'info' (default) | 'error' */
function showToast(msg, type) {
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'info');
    toast.textContent = msg;
    document.body.appendChild(toast);
    /* Auto-remove after 3.5 s */
    setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3500);
}
