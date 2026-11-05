/* panels.js — Task 13: CPU, ready-queue, and process-table panels
 * Implements window.SCHED.renderPanels(trace, t).
 */

(function() {

    /* ── Helper: pidColor shortcut ─────────────────────────── */
    function pidColor(pid) {
        return window.SCHED.pidColor(pid);
    }

    /* ── Helper: getRunningPid ─────────────────────────────────
     * Returns { type, pid, csPid } describing what the CPU is
     * doing at time t.
     *   type 'run'            → pid is running
     *   type 'idle'           → CPU is idle
     *   type 'context_switch' → switching in csPid
     *   type 'done'           → simulation finished
     */
    function getRunningPid(trace, t) {
        var tl = trace.timeline;

        /* If simulation is finished (t >= last t_end) */
        if (tl.length > 0 && t >= tl[tl.length - 1].t_end) {
            return { type: 'done', pid: null, csPid: null };
        }

        /* Scan segments for one that covers tick t */
        for (var i = 0; i < tl.length; i++) {
            var seg = tl[i];
            if (seg.t_start <= t && t < seg.t_end) {
                if (seg.type === 'run') {
                    return { type: 'run', pid: seg.pid, csPid: null };
                }
                if (seg.type === 'idle') {
                    return { type: 'idle', pid: null, csPid: null };
                }
                if (seg.type === 'context_switch') {
                    return { type: 'context_switch', pid: null, csPid: seg.pid };
                }
            }
        }

        /* Before simulation starts */
        return { type: 'idle', pid: null, csPid: null };
    }

    /* ── Helper: getReadyQueue ─────────────────────────────────
     * Returns the ready queue (array of pids) as of time t by
     * taking the last event whose t <= t.
     */
    function getReadyQueue(trace, t) {
        var events = trace.events;
        var rq = [];

        /* Walk forward and keep overwriting with each matching event */
        for (var i = 0; i < events.length; i++) {
            if (events[i].t <= t) {
                rq = events[i].ready_queue;
            } else {
                break; /* events are in non-decreasing order */
            }
        }

        return rq;
    }

    /* ── Helper: getProcessStatus ──────────────────────────────
     * Returns 'NEW' | 'READY' | 'RUNNING' | 'DONE' for pid at time t.
     */
    function getProcessStatus(trace, pid, t, runningInfo) {
        /* Find the process record */
        var proc = null;
        for (var i = 0; i < trace.processes.length; i++) {
            if (trace.processes[i].pid === pid) {
                proc = trace.processes[i];
                break;
            }
        }
        if (!proc) return 'NEW';

        if (t >= proc.completion) return 'DONE';
        if (runningInfo.type === 'run' && runningInfo.pid === pid) return 'RUNNING';
        if (t >= proc.arrival) return 'READY';
        return 'NEW';
    }

    /* ── Helper: getRemainingAt ────────────────────────────────
     * Computes how many burst ticks are left for pid at time t.
     * Sums up run-segments for that pid where t_start < t,
     * treating partial overlap at t correctly.
     */
    function getRemainingAt(trace, pid, t) {
        var proc = null;
        for (var i = 0; i < trace.processes.length; i++) {
            if (trace.processes[i].pid === pid) {
                proc = trace.processes[i];
                break;
            }
        }
        if (!proc) return 0;

        var done = proc.burst;
        var tl   = trace.timeline;

        for (var j = 0; j < tl.length; j++) {
            var seg = tl[j];
            /* Only count run segments for this pid that started before t */
            if (seg.type !== 'run' || seg.pid !== pid) continue;
            if (seg.t_start >= t) continue;   /* starts at or after t — skip */

            var end = Math.min(seg.t_end, t); /* don't count beyond t */
            done -= (end - seg.t_start);
        }

        return Math.max(0, done);
    }

    /* ── renderCPUPanel ────────────────────────────────────────
     * Fills #panel-cpu based on what the CPU is doing at time t.
     */
    function renderCPUPanel(trace, t, runningInfo) {
        var panel = document.getElementById('panel-cpu');
        /* Keep the <h2> heading, replace everything else */
        var h2 = panel.querySelector('h2');
        /* Remove all children except h2 */
        while (panel.lastChild && panel.lastChild !== h2) {
            panel.removeChild(panel.lastChild);
        }

        var block = document.createElement('div');

        if (runningInfo.type === 'done') {
            /* ── All done ─────────────────────────────────── */
            block.className = 'cpu-block';
            var doneLabel = document.createElement('div');
            doneLabel.className = 'cpu-done';
            doneLabel.textContent = 'ALL DONE ✓';
            block.appendChild(doneLabel);

        } else if (runningInfo.type === 'idle') {
            /* ── CPU idle ─────────────────────────────────── */
            block.className = 'cpu-block cpu-idle';
            var idleLabel = document.createElement('div');
            idleLabel.className = 'cpu-pid-label';
            idleLabel.style.color = 'var(--muted)';
            idleLabel.textContent = 'IDLE';
            block.appendChild(idleLabel);

        } else if (runningInfo.type === 'context_switch') {
            /* ── Context switch ───────────────────────────── */
            block.className = 'cpu-cs';
            var csTitle = document.createElement('div');
            csTitle.className = 'cpu-pid-label';
            csTitle.textContent = 'CONTEXT SWITCH';
            var csArrow = document.createElement('div');
            csArrow.className = 'cpu-sub';
            csArrow.style.color = 'var(--warn)';
            csArrow.textContent = '→ P' + runningInfo.csPid;
            block.appendChild(csTitle);
            block.appendChild(csArrow);

        } else {
            /* ── Process running ──────────────────────────── */
            var pid     = runningInfo.pid;
            var color   = pidColor(pid);
            var proc    = null;
            for (var i = 0; i < trace.processes.length; i++) {
                if (trace.processes[i].pid === pid) {
                    proc = trace.processes[i];
                    break;
                }
            }
            var burst     = proc ? proc.burst : 1;
            var remaining = getRemainingAt(trace, pid, t);

            block.className = 'cpu-block';
            block.style.background = color + '1a'; /* 10% opacity tint */
            block.style.border     = '1px solid ' + color + '66';
            block.style.borderRadius = '8px';

            /* PID label */
            var pidLabel = document.createElement('div');
            pidLabel.className = 'cpu-pid-label';
            pidLabel.style.color = color;
            pidLabel.textContent = 'P' + pid;

            /* Sub-label */
            var subLabel = document.createElement('div');
            subLabel.className = 'cpu-sub';
            subLabel.textContent = 'remaining ' + remaining + ' of ' + burst + ' ms';

            /* Progress bar wrapper */
            var barWrap = document.createElement('div');
            barWrap.className = 'cpu-progress-bar';

            /* Progress bar fill */
            var barFill = document.createElement('div');
            var pct = burst > 0 ? (remaining / burst * 100) : 0;
            barFill.style.width  = pct + '%';
            barFill.style.height = '100%';
            barFill.style.background    = color;
            barFill.style.borderRadius  = '3px';
            barFill.style.transition    = 'width 0.1s';

            barWrap.appendChild(barFill);
            block.appendChild(pidLabel);
            block.appendChild(subLabel);
            block.appendChild(barWrap);
        }

        panel.appendChild(block);
    }

    /* ── renderQueuePanel ──────────────────────────────────────
     * Fills #panel-queue with pid chips from the ready queue.
     */
    function renderQueuePanel(t, rq) {
        var panel = document.getElementById('panel-queue');
        var h2    = panel.querySelector('h2');
        while (panel.lastChild && panel.lastChild !== h2) {
            panel.removeChild(panel.lastChild);
        }

        if (!rq || rq.length === 0) {
            /* Empty queue */
            var empty = document.createElement('div');
            empty.className = 'queue-empty';
            empty.textContent = 'queue empty';
            panel.appendChild(empty);
            return;
        }

        var row = document.createElement('div');
        row.className = 'queue-chips';

        for (var i = 0; i < rq.length; i++) {
            var pid   = rq[i];
            var wrap  = document.createElement('div');
            wrap.style.display        = 'flex';
            wrap.style.flexDirection  = 'column';
            wrap.style.alignItems     = 'center';
            wrap.style.gap            = '4px';

            /* "next" label above the first chip */
            if (i === 0) {
                var nextLabel = document.createElement('div');
                nextLabel.style.fontSize   = '0.7rem';
                nextLabel.style.color      = 'var(--muted)';
                nextLabel.style.fontFamily = 'inherit';
                nextLabel.textContent = 'next';
                wrap.appendChild(nextLabel);
            }

            var chip = document.createElement('div');
            chip.className   = 'queue-chip';
            chip.textContent = 'P' + pid;
            chip.style.background = pidColor(pid);

            wrap.appendChild(chip);
            row.appendChild(wrap);
        }

        panel.appendChild(row);
    }

    /* ── renderTablePanel ──────────────────────────────────────
     * Fills #panel-table with a per-process status table.
     */
    function renderTablePanel(trace, t, runningInfo) {
        var panel = document.getElementById('panel-table');
        var h2    = panel.querySelector('h2');
        while (panel.lastChild && panel.lastChild !== h2) {
            panel.removeChild(panel.lastChild);
        }

        var table = document.createElement('table');
        table.className = 'process-table';

        /* Header row */
        var thead = document.createElement('thead');
        var headerRow = document.createElement('tr');
        var cols = [
            'PID', 'Arrival', 'Burst', 'Priority',
            'Status', 'Remaining',
            'Start', 'Completion', 'Waiting', 'Turnaround', 'Response'
        ];
        for (var c = 0; c < cols.length; c++) {
            var th = document.createElement('th');
            th.textContent = cols[c];
            headerRow.appendChild(th);
        }
        thead.appendChild(headerRow);
        table.appendChild(thead);

        /* Body rows */
        var tbody = document.createElement('tbody');
        var procs = trace.processes; /* already sorted by pid per contract */

        for (var i = 0; i < procs.length; i++) {
            var proc   = procs[i];
            var status = getProcessStatus(trace, proc.pid, t, runningInfo);
            var rem    = getRemainingAt(trace, proc.pid, t);

            var tr = document.createElement('tr');
            if (status === 'RUNNING') {
                tr.className = 'row-running';
            }

            /* Decide which completion-based fields to reveal */
            var startKnown      = (t > proc.start);
            var completionKnown = (t >= proc.completion);

            /* Helper to create a td */
            function td(val) {
                var cell = document.createElement('td');
                cell.textContent = val;
                return cell;
            }

            /* Status pill */
            function statusTd(s) {
                var cell = document.createElement('td');
                var pill = document.createElement('span');
                pill.className = 'status-pill status-' + s.toLowerCase();
                pill.textContent = s;
                cell.appendChild(pill);
                return cell;
            }

            tr.appendChild(td(proc.pid));
            tr.appendChild(td(proc.arrival));
            tr.appendChild(td(proc.burst));
            tr.appendChild(td(proc.priority));
            tr.appendChild(statusTd(status));
            tr.appendChild(td(rem));
            tr.appendChild(td(startKnown      ? proc.start      : '-'));
            tr.appendChild(td(completionKnown ? proc.completion  : '-'));
            tr.appendChild(td(completionKnown ? proc.waiting     : '-'));
            tr.appendChild(td(completionKnown ? proc.turnaround  : '-'));
            tr.appendChild(td(completionKnown ? proc.response    : '-'));

            tbody.appendChild(tr);
        }

        table.appendChild(tbody);
        panel.appendChild(table);
    }

    /* ── renderPanels (public API) ─────────────────────────────
     * Called by app.js render() on every tick.
     */
    window.SCHED.renderPanels = function(trace, t) {
        if (!trace) return;

        /* Derive shared state once */
        var runningInfo = getRunningPid(trace, t);
        var rq          = getReadyQueue(trace, t);

        renderCPUPanel(trace, t, runningInfo);
        renderQueuePanel(t, rq);
        renderTablePanel(trace, t, runningInfo);
    };

})();
