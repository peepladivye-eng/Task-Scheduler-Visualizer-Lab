(function() {
'use strict';

var ALGO_LABELS = ['FCFS','SJF','SRTF','Priority','Priority-P','RR'];
var METRICS_TO_CHART = [
    { key: 'avg_waiting',     label: 'Avg Waiting (ms)' },
    { key: 'avg_turnaround',  label: 'Avg Turnaround (ms)' },
    { key: 'avg_response',    label: 'Avg Response (ms)' },
    { key: 'context_switches',label: 'Context Switches' }
];

function renderCompare(container, compareObj) {
    container.innerHTML = '';
    if (!compareObj || !Array.isArray(compareObj.runs) || compareObj.runs.length !== 6) {
        container.innerHTML = '<div class="empty-state">Invalid compare data.</div>';
        return;
    }
    var runs = compareObj.runs;

    /* ── Bar charts ── */
    var chartsDiv = document.createElement('div');
    chartsDiv.className = 'compare-charts';

    METRICS_TO_CHART.forEach(function(metric) {
        var values = runs.map(function(r) {
            return r.metrics ? (r.metrics[metric.key] || 0) : 0;
        });
        var minVal = Math.min.apply(null, values);
        var maxVal = Math.max.apply(null, values);

        var chartDiv = document.createElement('div');
        chartDiv.className = 'compare-chart';

        var title = document.createElement('div');
        title.className = 'compare-chart-title';
        title.textContent = metric.label;
        chartDiv.appendChild(title);

        var barsDiv = document.createElement('div');
        barsDiv.className = 'compare-bars';

        values.forEach(function(val, i) {
            var isBest = (val === minVal);
            var barWrap = document.createElement('div');
            barWrap.className = 'compare-bar-wrap' + (isBest ? ' compare-best' : '');

            var barOuter = document.createElement('div');
            barOuter.className = 'compare-bar-outer';

            var barInner = document.createElement('div');
            barInner.className = 'compare-bar-inner';
            var pct = maxVal > 0 ? (val / maxVal * 100) : 0;
            barInner.style.height = pct + '%';
            barInner.style.background = window.SCHED.PID_COLORS[i];

            var valLabel = document.createElement('div');
            valLabel.className = 'compare-bar-value';
            valLabel.textContent = typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(2) : val;

            if (isBest) {
                var bestTag = document.createElement('div');
                bestTag.className = 'compare-best-tag';
                bestTag.textContent = 'best';
                barWrap.appendChild(bestTag);
            }

            barOuter.appendChild(barInner);
            barWrap.appendChild(valLabel);
            barWrap.appendChild(barOuter);

            var algoLabel = document.createElement('div');
            algoLabel.className = 'compare-bar-algo';
            algoLabel.textContent = ALGO_LABELS[i];
            barWrap.appendChild(algoLabel);

            barsDiv.appendChild(barWrap);
        });

        chartDiv.appendChild(barsDiv);
        chartsDiv.appendChild(chartDiv);
    });

    container.appendChild(chartsDiv);

    /* ── Summary table ── */
    var tableDiv = document.createElement('div');
    tableDiv.className = 'compare-table-wrap';

    var table = document.createElement('table');
    table.className = 'compare-table';

    /* Header */
    var thead = document.createElement('thead');
    var hrow = document.createElement('tr');
    var allMetricKeys = ['avg_waiting','avg_turnaround','avg_response','cpu_utilization','throughput','context_switches'];
    var allMetricLabels = ['Avg Wait','Avg TAT','Avg Resp','CPU %','Throughput','CS Count'];
    [document.createElement('th')].concat(allMetricLabels.map(function(l){ var th=document.createElement('th'); th.textContent=l; return th; })).forEach(function(th,i){ if(i===0)th.textContent='Algorithm'; hrow.appendChild(th); });
    thead.appendChild(hrow);
    table.appendChild(thead);

    /* Find best per column */
    var bestPerCol = allMetricKeys.map(function(k) {
        var vals = runs.map(function(r){ return r.metrics ? (r.metrics[k]||0) : 0; });
        return Math.min.apply(null, vals);
    });

    /* Body */
    var tbody = document.createElement('tbody');
    runs.forEach(function(run, i) {
        var tr = document.createElement('tr');
        var algoTd = document.createElement('td');
        algoTd.textContent = ALGO_LABELS[i];
        algoTd.style.fontWeight = '600';
        tr.appendChild(algoTd);
        allMetricKeys.forEach(function(k, ci) {
            var td = document.createElement('td');
            var val = run.metrics ? (run.metrics[k]||0) : 0;
            td.textContent = typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(2) : val;
            td.style.fontFamily = '"JetBrains Mono", Consolas, monospace';
            if (val === bestPerCol[ci]) {
                td.style.color = 'var(--good)';
                td.style.fontWeight = '700';
            }
            tr.appendChild(td);
        });
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    tableDiv.appendChild(table);
    container.appendChild(tableDiv);
}

window.SCHED = window.SCHED || {};
window.SCHED.renderCompare = renderCompare;
}());
