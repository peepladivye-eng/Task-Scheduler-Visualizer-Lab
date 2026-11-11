'use strict';
// server.js — Linux/WSL2 only. See docs/API_CONTRACT.md for the API spec.
var http = require('http');
var fs   = require('fs');
var path = require('path');
var os   = require('os');
var cp   = require('child_process');

if (os.platform() !== 'linux') {
    console.error('This project requires Linux/WSL2. Run: wsl');
    process.exit(1);
}

var PORT    = process.env.PORT || 3000;
var ROOT    = __dirname;
var VIEWER  = path.join(__dirname, 'web', 'dist');
var BINARY  = path.join(ROOT, 'bin', 'scheduler_cpp');

if (!fs.existsSync(BINARY)) {
    console.error('Engine binary not found: ' + BINARY);
    console.error('Build it with:');
    console.error('  cd engine-cpp && cmake -S . -B build && cmake --build build --parallel');
    process.exit(1);
}

var MIME = {
    '.html':'text/html', '.css':'text/css',
    '.js':'application/javascript', '.json':'application/json',
    '.woff2':'font/woff2', '.woff':'font/woff', '.ttf':'font/ttf',
    '.svg':'image/svg+xml', '.png':'image/png', '.ico':'image/x-icon',
};

function setCORS(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function serveStatic(res, filePath) {
    var ext = path.extname(filePath).toLowerCase();
    var ct  = MIME[ext] || 'application/octet-stream';
    var data;
    try { data = fs.readFileSync(filePath); } catch(e) {
        res.writeHead(404); res.end('Not found'); return;
    }
    res.writeHead(200, {'Content-Type': ct, 'Cache-Control': 'no-cache'});
    res.end(data);
}

function readBody(req, maxBytes, cb) {
    var chunks = [];
    var total  = 0;
    req.on('data', function(c) {
        total += c.length;
        if (total > maxBytes) {
            req.destroy();
            cb(null, new Error('body too large'));
            return;
        }
        chunks.push(c);
    });
    req.on('end', function() { cb(Buffer.concat(chunks).toString(), null); });
    req.on('error', function(e) { cb(null, e); });
}

function apiHealth(req, res) {
    setCORS(res);
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({ok:true, engine:'scheduler_cpp', live:true, live_mode_supported:true}));
}

function apiRun(req, res) {
    setCORS(res);
    readBody(req, 65536, function(body, err) {
        if (err) {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error: err.message})); return;
        }

        var data;
        try { data = JSON.parse(body); } catch(e) {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'invalid JSON body'})); return;
        }

        // Validate processes
        var procs = data.processes;
        if (!Array.isArray(procs) || procs.length === 0 || procs.length > 64) {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'processes must be an array of 1..64'})); return;
        }
        var seenPids = {};
        var totalBurst = 0;
        for (var i = 0; i < procs.length; i++) {
            var p = procs[i];
            if (!Number.isInteger(p.pid)      || p.pid      < 1     || p.pid      > 1000000 ||
                !Number.isInteger(p.arrival)  || p.arrival  < 0     || p.arrival  > 10000   ||
                !Number.isInteger(p.burst)    || p.burst    < 1     || p.burst    > 10000   ||
                !Number.isInteger(p.priority) || p.priority < 0     || p.priority > 1000) {
                res.writeHead(400, {'Content-Type':'application/json'});
                res.end(JSON.stringify({error:'process ' + p.pid + ': invalid fields'})); return;
            }
            if (seenPids[p.pid]) {
                res.writeHead(400, {'Content-Type':'application/json'});
                res.end(JSON.stringify({error:'duplicate pid: ' + p.pid})); return;
            }
            seenPids[p.pid] = true;
            totalBurst += p.burst;
        }

        var validAlgos = ['fcfs','sjf','srtf','priority','priority-p','rr','compare'];
        if (validAlgos.indexOf(data.algo) === -1) {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'invalid algo: ' + data.algo})); return;
        }

        var q  = parseInt(data.quantum)       || 4;
        var cs = parseInt(data.contextSwitch) || 0;
        if (data.algo === 'rr' && q < 1) {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'quantum must be >= 1 for rr'})); return;
        }
        if (cs < 0 || cs > 100) {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'contextSwitch must be 0..100'})); return;
        }

        var liveModeRequested = !!(data.live);

        // Live mode limits and IPC options
        var ipc    = data.ipc    || 'signal';
        var workUs = parseInt(data.workUs) || 200;
        var tickMs = parseInt(data.tickMs) || 0;

        if (ipc !== 'signal' && ipc !== 'pipe') {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'ipc must be signal or pipe'})); return;
        }
        if (workUs < 0 || workUs > 100000) {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'workUs must be 0..100000'})); return;
        }
        if (tickMs < 0 || tickMs > 1000) {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'tickMs must be 0..1000'})); return;
        }

        // Live mode burst limit
        if (liveModeRequested && totalBurst > 5000) {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'live mode supports at most 5000 total burst ticks, got ' + totalBurst})); return;
        }

        // Write temp input file
        var tmpDir  = fs.mkdtempSync(path.join(os.tmpdir(), 'sched-'));
        var tmpFile = path.join(tmpDir, 'input.txt');
        var lines   = procs.map(function(p){ return p.pid+' '+p.arrival+' '+p.burst+' '+p.priority; });
        fs.writeFileSync(tmpFile, lines.join('\n') + '\n');

        // Build args
        var args;
        if (data.algo === 'compare') {
            args = ['--compare', '--quantum', String(q), '--context-switch', String(cs), '--input', tmpFile];
        } else {
            args = ['--algo', data.algo, '--input', tmpFile, '--context-switch', String(cs)];
            if (data.algo === 'rr') args.push('--quantum', String(q));
            if (liveModeRequested) {
                args.push('--mode', 'live', '--ipc', ipc, '--work-us', String(workUs));
                if (tickMs > 0) args.push('--tick-ms', String(tickMs));
                args.push('--log');
            }
        }

        var timeout = liveModeRequested ? 30000 : 10000;

        cp.execFile(BINARY, args, {timeout: timeout, maxBuffer: 32*1024*1024}, function(err, stdout, stderr) {
            try { fs.unlinkSync(tmpFile); fs.rmdirSync(tmpDir); } catch(e) {}

            if (err) {
                var msg = stderr ? stderr.split('\n').filter(function(l){return l.match(/^error:/);})[0]
                                 : (err.message || 'engine error');
                if (msg) msg = msg.replace(/^error:\s*/i,'').trim();
                res.writeHead(400, {'Content-Type':'application/json'});
                res.end(JSON.stringify({error: msg || 'engine error'})); return;
            }

            // Echo log lines to server terminal
            if (liveModeRequested && stderr) {
                stderr.split('\n').forEach(function(line) {
                    if (line.trim()) console.log('[engine] ' + line);
                });
            }

            console.log('[engine] ' + data.algo + ' ' + (liveModeRequested?'live('+ipc+')':'sim') + ' -> ' + procs.length + ' procs');

            if (liveModeRequested) {
                // Return trace + log lines for live mode
                var logLines = stderr ? stderr.split('\n').filter(function(l){ return l.trim() && !l.match(/^error:/); }) : [];
                res.writeHead(200, {'Content-Type':'application/json'});
                res.end(JSON.stringify({trace: JSON.parse(stdout), log: logLines}));
            } else {
                res.writeHead(200, {'Content-Type':'application/json'});
                res.end(stdout);
            }
        });
    });
}

function apiLive(req, res) {
    setCORS(res);
    readBody(req, 65536, function(body, err) {
        if (err) {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error: err.message})); return;
        }

        var data;
        try { data = JSON.parse(body); } catch(e) {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'invalid JSON body'})); return;
        }

        // Validate processes
        var procs = data.processes;
        if (!Array.isArray(procs) || procs.length === 0 || procs.length > 64) {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'processes must be an array of 1..64'})); return;
        }
        var seenPids = {};
        var totalBurst = 0;
        for (var i = 0; i < procs.length; i++) {
            var p = procs[i];
            if (!Number.isInteger(p.pid)      || p.pid      < 1     || p.pid      > 1000000 ||
                !Number.isInteger(p.arrival)  || p.arrival  < 0     || p.arrival  > 10000   ||
                !Number.isInteger(p.burst)    || p.burst    < 1     || p.burst    > 10000   ||
                !Number.isInteger(p.priority) || p.priority < 0     || p.priority > 1000) {
                res.writeHead(400, {'Content-Type':'application/json'});
                res.end(JSON.stringify({error:'process ' + p.pid + ': invalid fields'})); return;
            }
            if (seenPids[p.pid]) {
                res.writeHead(400, {'Content-Type':'application/json'});
                res.end(JSON.stringify({error:'duplicate pid: ' + p.pid})); return;
            }
            seenPids[p.pid] = true;
            totalBurst += p.burst;
        }

        // Reject burst > 5000 for live mode
        if (totalBurst > 5000) {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'live mode supports at most 5000 total burst ticks, got ' + totalBurst})); return;
        }

        var validAlgos = ['fcfs','sjf','srtf','priority','priority-p','rr'];
        if (validAlgos.indexOf(data.algo) === -1) {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'invalid algo: ' + data.algo})); return;
        }

        var ipc    = data.ipc    || 'signal';
        var workUs = parseInt(data.workUs) || 200;
        var tickMs = parseInt(data.tickMs) || 0;

        if (ipc !== 'signal' && ipc !== 'pipe') {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'ipc must be signal or pipe'})); return;
        }
        if (workUs < 0 || workUs > 100000) {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'workUs must be 0..100000'})); return;
        }
        if (tickMs < 0 || tickMs > 1000) {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'tickMs must be 0..1000'})); return;
        }

        var q  = parseInt(data.quantum)       || 4;
        var cs = parseInt(data.contextSwitch) || 0;
        if (cs < 0 || cs > 100) {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'contextSwitch must be 0..100'})); return;
        }

        // Write temp input file
        var tmpDir  = fs.mkdtempSync(path.join(os.tmpdir(), 'sched-'));
        var tmpFile = path.join(tmpDir, 'input.txt');
        var lines   = procs.map(function(p){ return p.pid+' '+p.arrival+' '+p.burst+' '+p.priority; });
        fs.writeFileSync(tmpFile, lines.join('\n') + '\n');

        // Build args — use --ndjson (stdout), no --log
        var args = ['--algo', data.algo, '--input', tmpFile, '--context-switch', String(cs),
                    '--mode', 'live', '--ipc', ipc, '--work-us', String(workUs), '--ndjson'];
        if (data.algo === 'rr') args.push('--quantum', String(q));
        if (tickMs > 0) args.push('--tick-ms', String(tickMs));

        // Stream NDJSON response
        res.writeHead(200, {
            'Content-Type': 'application/x-ndjson',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
        });

        var child = cp.spawn(BINARY, args, { stdio: ['ignore', 'pipe', 'pipe'], detached: true });
        var enginePid = child.pid;
        var closed = false;

        function cleanup() {
            if (closed) return;
            closed = true;
            try { fs.unlinkSync(tmpFile); } catch(e) {}
            try { fs.rmdirSync(tmpDir); } catch(e) {}
        }

        // Pipe stdout line by line to response
        var buf = '';
        child.stdout.on('data', function(chunk) {
            buf += chunk.toString();
            var parts = buf.split('\n');
            buf = parts.pop(); // last (possibly incomplete) line
            for (var j = 0; j < parts.length; j++) {
                var line = parts[j].trim();
                if (!line) continue;
                console.log('[engine] ' + line);
                res.write(line + '\n');
            }
        });

        child.stderr.on('data', function(chunk) {
            // Engine terminal output goes to server console only
            var text = chunk.toString();
            text.split('\n').forEach(function(l) {
                if (l.trim()) console.log('[engine-tty] ' + l);
            });
        });

        child.on('close', function(code) {
            // Flush any remaining buffered data
            if (buf.trim()) {
                console.log('[engine] ' + buf.trim());
                res.write(buf.trim() + '\n');
            }
            console.log('[engine] exited code=' + code + ' algo=' + data.algo + ' ipc=' + ipc + ' procs=' + procs.length);
            cleanup();
            res.end();
        });

        child.on('error', function(e) {
            console.error('[engine] spawn error: ' + e.message);
            cleanup();
            if (!res.writableEnded) res.end();
        });

        // Kill engine process group when client disconnects
        res.on('close', function() {
            if (!closed && enginePid) {
                try { process.kill(-enginePid, 'SIGKILL'); } catch(e) {}
            }
            cleanup();
        });
    });
}

var server = http.createServer(function(req, res) {
    var method = req.method.toUpperCase();
    var url    = req.url.split('?')[0];

    if (method === 'OPTIONS') { setCORS(res); res.writeHead(204); res.end(); return; }
    if (method === 'GET'  && url === '/api/health') { apiHealth(req, res); return; }
    if (method === 'POST' && url === '/api/run')    { apiRun(req, res);    return; }
    if (method === 'POST' && url === '/api/live')   { apiLive(req, res);   return; }

    if (method !== 'GET') { res.writeHead(405); res.end(); return; }

    var reqPath  = url === '/' ? '/index.html' : url;
    var filePath = path.normalize(path.join(VIEWER, reqPath));
    if (!filePath.startsWith(VIEWER + path.sep) && filePath !== VIEWER) {
        res.writeHead(403); res.end('Forbidden'); return;
    }
    serveStatic(res, filePath);
});

function shutdown() {
    server.close();
    process.exit(0);
}
process.on('SIGINT',  shutdown);
process.on('SIGTERM', shutdown);

server.listen(PORT, '0.0.0.0', function() {
    console.log('Scheduler UI:  http://localhost:' + PORT);
    console.log('Engine:        ' + BINARY);
    console.log('Live mode:     enabled');
});
