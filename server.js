'use strict';
var http = require('http');
var fs   = require('fs');
var path = require('path');
var os   = require('os');
var cp   = require('child_process');

var PORT    = process.env.PORT || 3000;
var ROOT    = __dirname;
var webDist = path.join(__dirname, 'web', 'dist');
var VIEWER  = fs.existsSync(path.join(webDist, 'index.html')) ? webDist : path.join(__dirname, 'viewer');

/* ── Binary detection ──────────────────────────────────────────────────────
 * Prefer the C++ engine on Linux (WSL2).  Fall back to the Windows .exe.
 * Live mode (--mode live with fork()) only works on Linux. */
var BINARY = null;
var PLATFORM_LINUX = (os.platform() === 'linux');

(function() {
    var cppLinux = path.join(ROOT, 'bin', 'scheduler_cpp');
    var cppWin   = path.join(ROOT, 'bin', 'scheduler_cpp.exe');
    var cLinux   = path.join(ROOT, 'bin', 'scheduler');
    var cWin     = path.join(ROOT, 'bin', 'scheduler.exe');

    if (PLATFORM_LINUX && fs.existsSync(cppLinux))  { BINARY = cppLinux;  return; }
    if (fs.existsSync(cppWin))                       { BINARY = cppWin;   return; }
    if (PLATFORM_LINUX && fs.existsSync(cLinux))     { BINARY = cLinux;   return; }
    if (fs.existsSync(cWin))                         { BINARY = cWin;     return; }
})();

/* MIME types */
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

function readBody(req, cb) {
    var chunks = [];
    req.on('data', function(c){ chunks.push(c); });
    req.on('end', function(){ cb(Buffer.concat(chunks).toString()); });
}

/* ── /api/health ────────────────────────────────────────────────────────────*/
function apiHealth(req, res) {
    setCORS(res);
    var info = {
        status:   BINARY ? 'online' : 'no_binary',
        platform: os.platform(),
        live_mode_supported: PLATFORM_LINUX,
        binary:   BINARY || null,
    };
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify(info));
}

/* ── /api/run ───────────────────────────────────────────────────────────────*/
function apiRun(req, res) {
    setCORS(res);
    readBody(req, function(body) {
        var data;
        try { data = JSON.parse(body); } catch(e) {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'invalid JSON body'})); return;
        }

        var procs = data.processes;
        if (!Array.isArray(procs) || procs.length === 0 || procs.length > 64) {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'processes must be an array of 1..64'})); return;
        }
        for (var i = 0; i < procs.length; i++) {
            var p = procs[i];
            if (!Number.isInteger(p.pid)      || p.pid < 1 ||
                !Number.isInteger(p.arrival)  || p.arrival  < 0 || p.arrival  > 10000 ||
                !Number.isInteger(p.burst)    || p.burst    < 1 || p.burst    > 10000 ||
                !Number.isInteger(p.priority) || p.priority < 0 || p.priority > 1000) {
                res.writeHead(400, {'Content-Type':'application/json'});
                res.end(JSON.stringify({error:'process ' + p.pid + ': invalid fields'})); return;
            }
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

        // live=true only honoured on Linux with the C++ engine
        var liveModeRequested = !!(data.live);
        var useLive = liveModeRequested && PLATFORM_LINUX &&
                      BINARY && BINARY.indexOf('scheduler_cpp') !== -1;

        if (!BINARY) {
            res.writeHead(500, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'engine binary not found — build first'})); return;
        }

        // Write temp input file
        var tmpDir  = fs.mkdtempSync(path.join(os.tmpdir(), 'sched-'));
        var tmpFile = path.join(tmpDir, 'input.txt');
        var lines   = procs.map(function(p){ return p.pid+' '+p.arrival+' '+p.burst+' '+p.priority; });
        fs.writeFileSync(tmpFile, lines.join('\n') + '\n');

        // Build args
        var args;
        if (data.algo === 'compare') {
            args = ['--compare', '--quantum', String(q),
                    '--context-switch', String(cs), '--input', tmpFile];
        } else {
            args = ['--algo', data.algo, '--input', tmpFile,
                    '--context-switch', String(cs)];
            if (data.algo === 'rr')     args.push('--quantum', String(q));
            if (useLive)                args.push('--mode', 'live');
        }

        // Longer timeout for live mode (real processes)
        var timeout = useLive ? 15000 : 5000;

        cp.execFile(BINARY, args, {timeout: timeout}, function(err, stdout, stderr) {
            try { fs.unlinkSync(tmpFile); fs.rmdirSync(tmpDir); } catch(e) {}

            if (err) {
                var msg = stderr ? stderr.replace(/^error:\s*/i,'').trim()
                                 : (err.message || 'engine error');
                res.writeHead(400, {'Content-Type':'application/json'});
                res.end(JSON.stringify({error: msg})); return;
            }
            res.writeHead(200, {'Content-Type':'application/json'});
            res.end(stdout);
        });
    });
}

/* ── HTTP server ─────────────────────────────────────────────────────────────*/
var server = http.createServer(function(req, res) {
    var method = req.method.toUpperCase();
    var url    = req.url.split('?')[0];

    console.log(method + ' ' + url);

    if (method === 'OPTIONS') { setCORS(res); res.writeHead(204); res.end(); return; }

    if (method === 'GET'  && url === '/api/health') { apiHealth(req, res); return; }
    if (method === 'POST' && url === '/api/run')    { apiRun(req, res);    return; }

    if (method !== 'GET') { res.writeHead(405); res.end('Method not allowed'); return; }

    var reqPath  = url === '/' ? '/index.html' : url;
    var filePath = path.normalize(path.join(VIEWER, reqPath));
    if (!filePath.startsWith(VIEWER + path.sep) && filePath !== VIEWER) {
        res.writeHead(403); res.end('Forbidden'); return;
    }
    serveStatic(res, filePath);
});

server.listen(PORT, '127.0.0.1', function() {
    console.log('Scheduler UI:  http://localhost:' + PORT);
    console.log('Platform:      ' + os.platform());
    console.log('Live mode:     ' + (PLATFORM_LINUX ? 'available' : 'not available (needs Linux/WSL2)'));
    console.log('Engine binary: ' + (BINARY || 'NOT FOUND'));
});
