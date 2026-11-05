/* app.js — Task 8 + Task 12: viewer scaffold + playback controls
 * Sets up window.SCHED namespace, file loading, drag-and-drop,
 * render(), and a full playback system (play/pause, step, slider, speed, keyboard).
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
    trace:        null,  /* currently loaded trace object (single-run) */
    t:            0,     /* current playback tick */
    playing:      false, /* whether the animation is running */
    playInterval: null   /* setInterval handle for playback */
};

/* ── Playback helpers ──────────────────────────────────────── */

/* Returns the total_time (last t_end) for the current trace, or 0. */
function totalTime() {
    var trace = state.trace;
    if (!trace || !trace.timeline || trace.timeline.length === 0) return 0;
    return trace.timeline[trace.timeline.length - 1].t_end;
}

/* Stops any running interval and resets the playing flag.
 * Updates the Play button text accordingly. */
function stopPlayback() {
    if (state.playInterval !== null) {
        clearInterval(state.playInterval);
        state.playInterval = null;
    }
    state.playing = false;
    var btn = document.getElementById('btn-play');
    if (btn) btn.textContent = '▶ Play';
}

/* Starts the playback interval at the current speed.
 * Assumes state.playing is already true. */
function startInterval() {
    /* Clear any existing interval first */
    if (state.playInterval !== null) {
        clearInterval(state.playInterval);
        state.playInterval = null;
    }

    var speedEl = document.getElementById('speed-select');
    var speed   = speedEl ? parseFloat(speedEl.value) : 1;
    var delay   = Math.round(400 / speed);   /* ms between ticks */

    state.playInterval = setInterval(function() {
        var total = totalTime();
        if (state.t >= total) {
            /* Reached the end — stop */
            stopPlayback();
            return;
        }
        state.t += 1;
        render();
        /* Sync slider without triggering its 'input' event */
        var slider = document.getElementById('slider');
        if (slider) slider.value = state.t;
        /* Stop once we've just reached total */
        if (state.t >= total) {
            stopPlayback();
        }
    }, delay);
}

/* Toggle play / pause. */
function togglePlay() {
    if (!state.trace) return;

    if (state.playing) {
        /* Currently playing → pause */
        stopPlayback();
    } else {
        /* Currently paused → play */
        var total = totalTime();
        /* If we are at the end, restart from 0 */
        if (state.t >= total) {
            state.t = 0;
            render();
            var slider = document.getElementById('slider');
            if (slider) slider.value = 0;
        }
        state.playing = true;
        var btn = document.getElementById('btn-play');
        if (btn) btn.textContent = '⏸ Pause';
        startInterval();
    }
}

/* ── DOM wiring (runs after document is ready) ─────────────── */
document.addEventListener('DOMContentLoaded', function() {
    var fileBtn      = document.getElementById('file-btn');
    var fileInput    = document.getElementById('file-input');
    var sampleSelect = document.getElementById('sample-select');
    var btnPlay      = document.getElementById('btn-play');
    var btnBack      = document.getElementById('btn-back');
    var btnFwd       = document.getElementById('btn-fwd');
    var slider       = document.getElementById('slider');
    var speedSelect  = document.getElementById('speed-select');

    /* ── Load button → trigger hidden file input ─────────── */
    fileBtn.addEventListener('click', function() {
        fileInput.click();
    });

    /* ── File chosen via picker ──────────────────────────── */
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

    /* ── Sample select ───────────────────────────────────── */
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

    /* ── Play / Pause button ─────────────────────────────── */
    btnPlay.addEventListener('click', function() {
        togglePlay();
    });

    /* ── Step back button ────────────────────────────────── */
    btnBack.addEventListener('click', function() {
        if (!state.trace) return;
        stopPlayback();                          /* pause if playing */
        state.t = Math.max(0, state.t - 1);
        render();
        if (slider) slider.value = state.t;
    });

    /* ── Step forward button ─────────────────────────────── */
    btnFwd.addEventListener('click', function() {
        if (!state.trace) return;
        stopPlayback();                          /* pause if playing */
        state.t = Math.min(totalTime(), state.t + 1);
        render();
        if (slider) slider.value = state.t;
    });

    /* ── Slider scrub ────────────────────────────────────── */
    slider.addEventListener('input', function() {
        if (!state.trace) return;
        stopPlayback();                          /* pause if playing */
        state.t = parseInt(slider.value, 10);
        render();
    });

    /* ── Speed select ─────────────────────────────────────── */
    speedSelect.addEventListener('change', function() {
        /* If currently playing, restart the interval at the new speed */
        if (state.playing) {
            startInterval();
        }
    });

    /* ── Drag-and-drop anywhere on the page ──────────────── */
    document.addEventListener('dragover', function(e) {
        e.preventDefault();
        document.body.classList.add('drag-over');
    });

    document.addEventListener('dragleave', function(e) {
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

    /* ── Keyboard shortcuts ──────────────────────────────── */
    document.addEventListener('keydown', function(e) {
        /* Ignore when focus is inside an input, select, or textarea */
        var tag = document.activeElement && document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;

        switch (e.key) {
            case ' ':
                /* Space → toggle play/pause */
                e.preventDefault();   /* prevent page scroll */
                togglePlay();
                break;

            case 'ArrowLeft':
                /* Step back */
                e.preventDefault();
                if (!state.trace) break;
                stopPlayback();
                state.t = Math.max(0, state.t - 1);
                render();
                if (slider) slider.value = state.t;
                break;

            case 'ArrowRight':
                /* Step forward */
                e.preventDefault();
                if (!state.trace) break;
                stopPlayback();
                state.t = Math.min(totalTime(), state.t + 1);
                render();
                if (slider) slider.value = state.t;
                break;

            case 'Home':
                /* Jump to start */
                e.preventDefault();
                if (!state.trace) break;
                stopPlayback();
                state.t = 0;
                render();
                if (slider) slider.value = 0;
                break;

            case 'End':
                /* Jump to end */
                e.preventDefault();
                if (!state.trace) break;
                stopPlayback();
                state.t = totalTime();
                render();
                if (slider) slider.value = state.t;
                break;
        }
    });
});

/* ── File reading helper ────────────────────────────────────── */
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
function loadTrace(obj) {
    if (!obj || obj.version !== '1.0') {
        showToast('Not a valid trace file (bad version)', 'error');
        return;
    }

    /* Stop any running playback before loading a new trace */
    stopPlayback();

    if (obj.compare === true) {
        if (!Array.isArray(obj.runs) || obj.runs.length === 0) {
            showToast('Compare file has no runs', 'error');
            return;
        }
        state.trace = obj.runs[0];
        showToast('Compare file: showing FCFS (compare view comes later)', 'info');
    } else {
        if (!Array.isArray(obj.timeline) || !Array.isArray(obj.processes)) {
            showToast('Not a valid trace file', 'error');
            return;
        }
        state.trace = obj;
    }

    /* Always reset to t=0 when loading a new trace */
    state.t = 0;
    render();
}

/* ── render ─────────────────────────────────────────────────── */
function render() {
    var trace = state.trace;
    if (!trace) return;

    var total = totalTime();

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
    var slider = document.getElementById('slider');
    slider.max   = total;
    slider.value = state.t;
    slider.disabled = false;

    document.getElementById('btn-play').disabled  = false;
    document.getElementById('btn-back').disabled  = false;
    document.getElementById('btn-fwd').disabled   = false;
    document.getElementById('speed-select').disabled = false;

    /* Time readout: show current t AND total */
    document.getElementById('time-readout').textContent =
        't = ' + state.t + ' / ' + total + ' ms';

    /* ── Panels (wired in later tasks) ──────────────────────── */
    if (window.SCHED.renderPanels) {
        window.SCHED.renderPanels(trace, state.t);
    }

    /* ── Metrics panel ──────────────────────────────────────── */
    if (window.SCHED.renderMetrics) {
        window.SCHED.renderMetrics(trace, state.t);
    }
}

/* ── showToast ──────────────────────────────────────────────── */
function showToast(msg, type) {
    var toast = document.createElement('div');
    toast.className = 'toast toast-' + (type || 'info');
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function() {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3500);
}
