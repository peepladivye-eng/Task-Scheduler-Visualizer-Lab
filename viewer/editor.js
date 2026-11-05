(function() {
'use strict';

/* ── Example presets ──────────────────────────────────────── */
var EXAMPLES = {
    convoy: {
        label: 'Convoy Effect',
        processes: [
            {pid:1,arrival:0,burst:24,priority:3},
            {pid:2,arrival:0,burst:3,priority:1},
            {pid:3,arrival:0,burst:3,priority:2}
        ],
        algo: 'fcfs', quantum: 4, contextSwitch: 0
    },
    starvation: {
        label: 'Starvation Demo',
        processes: [
            {pid:1,arrival:0,burst:10,priority:5},
            {pid:2,arrival:1,burst:3,priority:1},
            {pid:3,arrival:2,burst:3,priority:1},
            {pid:4,arrival:3,burst:3,priority:1}
        ],
        algo: 'priority', quantum: 4, contextSwitch: 0
    },
    rrquantum: {
        label: 'RR Quantum Demo',
        processes: [
            {pid:1,arrival:0,burst:5,priority:1},
            {pid:2,arrival:1,burst:3,priority:1},
            {pid:3,arrival:2,burst:1,priority:1}
        ],
        algo: 'rr', quantum: 2, contextSwitch: 0
    }
};

function isServerMode() {
    return window.location.protocol === 'http:' || window.location.protocol === 'https:';
}

function buildEditor() {
    /* ── Create panel ── */
    var panel = document.createElement('div');
    panel.id = 'editor-panel';
    panel.className = 'editor-panel';

    var toggle = document.createElement('button');
    toggle.id = 'editor-toggle';
    toggle.className = 'editor-toggle';
    toggle.textContent = '✎ Task Editor';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'editor-body');

    var body = document.createElement('div');
    body.id = 'editor-body';
    body.style.display = 'none';

    toggle.addEventListener('click', function() {
        var expanded = body.style.display !== 'none';
        body.style.display = expanded ? 'none' : 'block';
        toggle.setAttribute('aria-expanded', String(!expanded));
    });

    /* ── Process table ── */
    var tableWrap = document.createElement('div');
    tableWrap.className = 'editor-table-wrap';

    var table = document.createElement('table');
    table.className = 'editor-table';
    table.innerHTML = '<thead><tr><th>PID</th><th>Arrival</th><th>Burst</th><th>Priority</th><th></th></tr></thead>';
    var tbody = document.createElement('tbody');
    tbody.id = 'editor-tbody';
    table.appendChild(tbody);
    tableWrap.appendChild(table);

    /* ── Controls row ── */
    var ctrlRow = document.createElement('div');
    ctrlRow.className = 'editor-controls';

    var addBtn = document.createElement('button');
    addBtn.textContent = '+ Add Process';
    addBtn.className = 'editor-btn';
    addBtn.addEventListener('click', addRow);

    var algoSel = document.createElement('select');
    algoSel.id = 'editor-algo';
    algoSel.className = 'editor-input';
    ['fcfs','sjf','srtf','priority','priority-p','rr','compare'].forEach(function(a) {
        var opt = document.createElement('option');
        opt.value = a;
        opt.textContent = a === 'compare' ? 'Compare All' : a.toUpperCase();
        algoSel.appendChild(opt);
    });

    var qWrap = document.createElement('div');
    qWrap.className = 'editor-field';
    var qLabel = document.createElement('label');
    qLabel.textContent = 'Quantum:';
    var qInput = document.createElement('input');
    qInput.type = 'number'; qInput.id = 'editor-quantum'; qInput.value = '4'; qInput.min = '1';
    qInput.className = 'editor-input editor-num';
    qWrap.appendChild(qLabel); qWrap.appendChild(qInput);

    var csWrap = document.createElement('div');
    csWrap.className = 'editor-field';
    var csLabel = document.createElement('label');
    csLabel.textContent = 'CS Cost:';
    var csInput = document.createElement('input');
    csInput.type = 'number'; csInput.id = 'editor-cs'; csInput.value = '0'; csInput.min = '0'; csInput.max = '100';
    csInput.className = 'editor-input editor-num';
    csWrap.appendChild(csLabel); csWrap.appendChild(csInput);

    /* Enable/disable quantum based on algo */
    algoSel.addEventListener('change', function() {
        var needsQ = algoSel.value === 'rr' || algoSel.value === 'compare';
        qInput.disabled = !needsQ;
    });

    var exSel = document.createElement('select');
    exSel.id = 'editor-example';
    exSel.className = 'editor-input';
    var defOpt = document.createElement('option');
    defOpt.value = ''; defOpt.textContent = 'Load example…';
    exSel.appendChild(defOpt);
    Object.keys(EXAMPLES).forEach(function(k) {
        var opt = document.createElement('option');
        opt.value = k; opt.textContent = EXAMPLES[k].label;
        exSel.appendChild(opt);
    });
    exSel.addEventListener('change', function() {
        if (!exSel.value) return;
        var ex = EXAMPLES[exSel.value];
        loadExample(ex);
        exSel.value = '';
    });

    var runBtn = document.createElement('button');
    runBtn.id = 'editor-run';
    runBtn.textContent = '▶ Run';
    runBtn.className = 'editor-btn editor-btn-primary';

    ctrlRow.appendChild(addBtn);
    ctrlRow.appendChild(algoSel);
    ctrlRow.appendChild(qWrap);
    ctrlRow.appendChild(csWrap);
    ctrlRow.appendChild(exSel);
    ctrlRow.appendChild(runBtn);

    body.appendChild(tableWrap);
    body.appendChild(ctrlRow);

    /* ── File:// hint ── */
    if (!isServerMode()) {
        var hint = document.createElement('div');
        hint.className = 'editor-hint';
        hint.textContent = 'Start the live server: node server.js, then open http://localhost:3000';
        body.appendChild(hint);
        runBtn.disabled = true;
    }

    panel.appendChild(toggle);
    panel.appendChild(body);

    /* Insert before toolbar */
    var toolbar = document.querySelector('.toolbar');
    if (toolbar) toolbar.parentNode.insertBefore(panel, toolbar);

    /* ── Row management ── */
    var nextPid = 1;

    function addRow(data) {
        var pid  = data ? data.pid      : nextPid;
        var arr  = data ? data.arrival  : 0;
        var bst  = data ? data.burst    : 1;
        var pri  = data ? data.priority : 1;
        nextPid = Math.max(nextPid, pid) + (data ? 0 : 1);

        var tr = document.createElement('tr');
        tr.dataset.pid = pid;

        function numInput(val, min, max) {
            var inp = document.createElement('input');
            inp.type = 'number'; inp.value = val; inp.min = min; inp.max = max;
            inp.className = 'editor-input editor-num';
            var td = document.createElement('td'); td.appendChild(inp); return td;
        }

        var pidTd = numInput(pid, 1, 999);
        var arrTd = numInput(arr, 0, 10000);
        var bstTd = numInput(bst, 1, 10000);
        var priTd = numInput(pri, 0, 1000);

        var delTd = document.createElement('td');
        var delBtn = document.createElement('button');
        delBtn.textContent = '×'; delBtn.className = 'editor-del';
        delBtn.addEventListener('click', function() { tr.parentNode.removeChild(tr); });
        delTd.appendChild(delBtn);

        tr.appendChild(pidTd); tr.appendChild(arrTd);
        tr.appendChild(bstTd); tr.appendChild(priTd);
        tr.appendChild(delTd);
        tbody.appendChild(tr);
    }

    function loadExample(ex) {
        tbody.innerHTML = '';
        nextPid = 1;
        ex.processes.forEach(function(p) { addRow(p); });
        algoSel.value = ex.algo;
        qInput.value  = ex.quantum;
        csInput.value = ex.contextSwitch;
        qInput.disabled = !(ex.algo === 'rr' || ex.algo === 'compare');
    }

    function getProcesses() {
        var rows = tbody.querySelectorAll('tr');
        var result = [];
        var err = null;
        rows.forEach(function(row) {
            var inputs = row.querySelectorAll('input');
            var pid = parseInt(inputs[0].value);
            var arr = parseInt(inputs[1].value);
            var bst = parseInt(inputs[2].value);
            var pri = parseInt(inputs[3].value);
            if (isNaN(pid)||pid<1||isNaN(arr)||arr<0||isNaN(bst)||bst<1||isNaN(pri)||pri<0) {
                err = 'Invalid process data'; return;
            }
            result.push({pid:pid,arrival:arr,burst:bst,priority:pri});
        });
        return err ? null : result;
    }

    runBtn.addEventListener('click', function() {
        var procs = getProcesses();
        if (!procs || procs.length === 0) {
            showToast('Add at least one process', 'error'); return;
        }
        var algo = algoSel.value;
        var payload = {
            processes: procs,
            algo: algo,
            quantum: parseInt(qInput.value) || 4,
            contextSwitch: parseInt(csInput.value) || 0
        };

        runBtn.disabled = true;
        runBtn.textContent = '…';

        fetch('/api/run', {
            method: 'POST',
            headers: {'Content-Type':'application/json'},
            body: JSON.stringify(payload)
        }).then(function(r) {
            return r.json().then(function(data) { return {ok: r.ok, data: data}; });
        }).then(function(res) {
            runBtn.disabled = false;
            runBtn.textContent = '▶ Run';
            if (!res.ok) {
                showToast('Error: ' + (res.data.error || 'unknown'), 'error'); return;
            }
            loadTrace(res.data);
        }).catch(function(e) {
            runBtn.disabled = false;
            runBtn.textContent = '▶ Run';
            showToast('Network error: ' + e.message, 'error');
        });
    });

    /* Load default example */
    loadExample(EXAMPLES.convoy);
}

document.addEventListener('DOMContentLoaded', buildEditor);
})();
