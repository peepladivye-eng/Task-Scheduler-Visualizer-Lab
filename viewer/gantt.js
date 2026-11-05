/* viewer/gantt.js
 * Renders a Gantt chart as SVG into a container element.
 * Exposes: window.SCHED.renderGantt(container, trace, t)
 *
 * Contract design tokens used:
 *   --border  #263149   idle hatch colour
 *   --warn    #ffb454   context-switch colour
 *   --accent  #6ea8fe   playhead colour
 *   --muted   #8b97b1   axis label colour
 *   --text    #e6ebf5   segment label colour
 */

(function() {
    'use strict';

    /* ── Constants ─────────────────────────────────────────── */
    var SEG_H    = 36;   /* segment rectangle height (px) */
    var AXIS_H   = 24;   /* time axis height (px) */
    var PADDING  = 8;    /* top padding (px) */
    var SVG_H    = SEG_H + AXIS_H + PADDING; /* total SVG height */

    var IDLE_HATCH_ID = 'gantt-idle-hatch';
    var CS_STRIPE_ID  = 'gantt-cs-stripe';

    /* SVG namespace */
    var NS = 'http://www.w3.org/2000/svg';

    /* ── Helper: create SVG element ──────────────────────────── */
    function el(tag, attrs) {
        var node = document.createElementNS(NS, tag);
        if (attrs) {
            Object.keys(attrs).forEach(function(k) {
                node.setAttribute(k, attrs[k]);
            });
        }
        return node;
    }

    /* ── Helper: create <defs> with fill patterns ────────────── */
    function buildDefs(svg) {
        var defs = el('defs');

        /* ── idle-hatch: diagonal lines in #263149 (--border) ── */
        var idlePat = el('pattern', {
            id:             IDLE_HATCH_ID,
            patternUnits:   'userSpaceOnUse',
            width:          '8',
            height:         '8',
            patternTransform: 'rotate(45)'
        });
        /* Background fill */
        idlePat.appendChild(el('rect', {
            width: '8', height: '8', fill: '#1a2234'  /* --surface-2 */
        }));
        /* Diagonal lines */
        idlePat.appendChild(el('line', {
            x1: '0', y1: '0', x2: '0', y2: '8',
            stroke: '#263149', 'stroke-width': '3'    /* --border */
        }));
        defs.appendChild(idlePat);

        /* ── cs-stripe: diagonal stripes in #ffb454 (--warn) ─── */
        var csPat = el('pattern', {
            id:             CS_STRIPE_ID,
            patternUnits:   'userSpaceOnUse',
            width:          '8',
            height:         '8',
            patternTransform: 'rotate(45)'
        });
        /* Lighter-orange background */
        csPat.appendChild(el('rect', {
            width: '8', height: '8', fill: '#7a5520'
        }));
        /* Bright --warn stripes */
        csPat.appendChild(el('line', {
            x1: '0', y1: '0', x2: '0', y2: '8',
            stroke: '#ffb454', 'stroke-width': '4'    /* --warn */
        }));
        defs.appendChild(csPat);

        svg.appendChild(defs);
    }

    /* ── Build tooltip string for a segment ─────────────────── */
    function segTitle(seg) {
        var dur = seg.t_end - seg.t_start;
        if (seg.type === 'idle') {
            return 'Idle | ' + seg.t_start + '-' + seg.t_end + ' | ' + dur + ' ms';
        }
        if (seg.type === 'context_switch') {
            return 'CS \u2192 P' + seg.pid + ' | ' + seg.t_start + '-' + seg.t_end + ' | ' + dur + ' ms';
        }
        /* run */
        return 'P' + seg.pid + ' | ' + seg.t_start + '-' + seg.t_end + ' | ' + dur + ' ms';
    }

    /* ── Main render function ────────────────────────────────── */
    function renderGantt(container, trace, t) {
        /* Clear previous content */
        container.innerHTML = '';

        if (!trace || !Array.isArray(trace.timeline) || trace.timeline.length === 0) {
            container.innerHTML = '<div class="empty-state">No timeline data.</div>';
            return;
        }

        var timeline   = trace.timeline;
        var total_time = timeline[timeline.length - 1].t_end;
        if (total_time <= 0) {
            container.innerHTML = '<div class="empty-state">Empty timeline.</div>';
            return;
        }

        /* Available width — prefer clientWidth, fall back to offsetWidth */
        var availW = container.clientWidth || container.offsetWidth || 800;

        /* Pixels per tick: at least 28, try to fill available width */
        var ppt = Math.max(28, Math.floor(availW / total_time));

        var chartW = ppt * total_time;

        /* Enable horizontal scroll if the chart is wider than the container */
        if (chartW > availW) {
            container.style.overflowX = 'auto';
        } else {
            container.style.overflowX = '';
        }

        /* Create SVG */
        var svg = el('svg', {
            width:   chartW,
            height:  SVG_H,
            xmlns:   NS,
            style:   'display:block; font-family: "JetBrains Mono", Consolas, monospace;'
        });

        buildDefs(svg);

        /* ── Draw segments ───────────────────────────────────── */
        timeline.forEach(function(seg) {
            var x = seg.t_start * ppt;
            var w = (seg.t_end - seg.t_start) * ppt;
            var y = PADDING;

            var fill;
            if (seg.type === 'idle') {
                fill = 'url(#' + IDLE_HATCH_ID + ')';
            } else if (seg.type === 'context_switch') {
                fill = 'url(#' + CS_STRIPE_ID + ')';
            } else {
                /* run — use pid colour */
                fill = window.SCHED.pidColor(seg.pid);
            }

            /* Rounded rectangle */
            var rect = el('rect', {
                x:      x,
                y:      y,
                width:  Math.max(w - 1, 1),   /* 1px gap between segments */
                height: SEG_H,
                rx:     '4',
                ry:     '4',
                fill:   fill,
                opacity: '1'
            });
            rect.setAttribute('title', segTitle(seg));
            svg.appendChild(rect);

            /* Label inside segment (if wide enough) */
            if (w >= 30) {
                var labelText;
                if (seg.type === 'idle') {
                    labelText = 'idle';
                } else if (seg.type === 'context_switch') {
                    labelText = 'CS';
                } else {
                    labelText = 'P' + seg.pid;
                }

                /* Semi-dark background for readability over hatch patterns */
                var txtEl = el('text', {
                    x:             x + w / 2,
                    y:             y + SEG_H / 2 + 1,
                    'text-anchor':     'middle',
                    'dominant-baseline': 'middle',
                    'font-size':   '11',
                    'font-weight': '600',
                    fill:          '#e6ebf5',  /* --text */
                    'pointer-events': 'none'
                });
                txtEl.textContent = labelText;
                svg.appendChild(txtEl);
            }
        });

        /* ── Time axis ───────────────────────────────────────── */
        var axisY = PADDING + SEG_H; /* top of the axis band */

        /* Collect all boundary ticks, dedup, sort */
        var tickSet = {};
        timeline.forEach(function(seg) {
            tickSet[seg.t_start] = true;
            tickSet[seg.t_end]   = true;
        });
        var ticks = Object.keys(tickSet).map(Number).sort(function(a, b) { return a - b; });

        /* Also add every integer tick if ppt >= 28 */
        if (ppt >= 28) {
            for (var ti = 0; ti <= total_time; ti++) {
                tickSet[ti] = true;
            }
            ticks = Object.keys(tickSet).map(Number).sort(function(a, b) { return a - b; });
        }

        /* Draw axis line */
        svg.appendChild(el('line', {
            x1: '0', y1: axisY, x2: chartW, y2: axisY,
            stroke: '#263149', 'stroke-width': '1'
        }));

        /* Draw tick marks and labels, skip overlapping labels */
        var lastLabelX = -Infinity;
        ticks.forEach(function(tick) {
            var x = tick * ppt;

            /* Tick mark */
            svg.appendChild(el('line', {
                x1: x, y1: axisY,
                x2: x, y2: axisY + 4,
                stroke: '#8b97b1', 'stroke-width': '1'
            }));

            /* Label: only if >= 20px from previous label */
            if (x - lastLabelX >= 20) {
                var lbl = el('text', {
                    x:             x,
                    y:             axisY + 16,
                    'text-anchor': 'middle',
                    'font-size':   '10',
                    fill:          '#8b97b1'  /* --muted */
                });
                lbl.textContent = tick;
                svg.appendChild(lbl);
                lastLabelX = x;
            }
        });

        /* ── Playhead ────────────────────────────────────────── */
        var playX = (t || 0) * ppt;

        /* Vertical line */
        svg.appendChild(el('line', {
            x1: playX, y1: PADDING - 2,
            x2: playX, y2: axisY + AXIS_H,
            stroke: '#6ea8fe',  /* --accent */
            'stroke-width': '2'
        }));

        /* Small downward-pointing triangle at top */
        var triSize = 5;
        var triPts  = [
            playX + ',' + (PADDING - 2),
            (playX - triSize) + ',' + (PADDING - 2 - triSize * 1.5),
            (playX + triSize) + ',' + (PADDING - 2 - triSize * 1.5)
        ].join(' ');
        svg.appendChild(el('polygon', {
            points: triPts,
            fill:   '#6ea8fe'  /* --accent */
        }));

        container.appendChild(svg);
    }

    /* ── Expose on window.SCHED ──────────────────────────────── */
    window.SCHED = window.SCHED || {};
    window.SCHED.renderGantt = renderGantt;

}());
