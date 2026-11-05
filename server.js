'use strict';
var http = require('http');
var fs   = require('fs');
var path = require('path');
var os   = require('os');
var cp   = require('child_process');

var PORT    = process.env.PORT || 3000;
var VIEWER  = path.join(__dirname, 'viewer');
var ROOT    = __dirname;

/* Find binary */
var BINARY = null;
(function() {
    var w = path.join(ROOT, 'bin', 'scheduler.exe');
    var l = path.join(ROOT, 'bin', 'scheduler');
    if (fs.existsSync(w)) BINARY = w;
    else if (fs.existsSync(l)) BINARY = l;
})();

/* MIME types */
var MIME = { '.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json' };

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

function apiRun(req, res) {
    readBody(req, function(body) {
        var data;
        try { data = JSON.parse(body); } catch(e) {
            res.writeHead(400, {'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'invalid JSON body'})); return;
        }

        /* Validate */
        var procs = data.processes;
        if (!Array.isArray(procs) || procs.length === 0 || procs.length > 64) {
            res.writeHead(400,{'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'processes must be an array of 1..64'})); return;
        }
        for (var i = 0; i < procs.length; i++) {
            var p = procs[i];
            if (!Number.isInteger(p.pid) || p.pid < 1 ||
                !Number.isInteger(p.arrival) || p.arrival < 0 || p.arrival > 10000 ||
                !Number.isInteger(p.burst) || p.burst < 1 || p.burst > 10000 ||
                !Number.isInteger(p.priority) || p.priority < 0 || p.priority > 1000) {
                res.writeHead(400,{'Content-Type':'application/json'});
                res.end(JSON.stringify({error:'process ' + p.pid + ': invalid fields'})); return;
            }
        }
        var validAlgos = ['fcfs','sjf','srtf','priority','priority-p','rr','compare'];
        if (validAlgos.indexOf(data.algo) === -1) {
            res.writeHead(400,{'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'invalid algo: ' + data.algo})); return;
        }
        var q = parseInt(data.quantum) || 4;
        if (data.algo === 'rr' && (q < 1)) {
            res.writeHead(400,{'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'quantum must be >= 1 for rr'})); return;
        }
        var cs = parseInt(data.contextSwitch) || 0;
        if (cs < 0 || cs > 100) {
            res.writeHead(400,{'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'contextSwitch must be 0..100'})); return;
        }

        if (!BINARY) {
            res.writeHead(500,{'Content-Type':'application/json'});
            res.end(JSON.stringify({error:'engine binary not found — build first'})); return;
        }

        /* Write temp file */
        var tmpDir  = fs.mkdtempSync(path.join(os.tmpdir(), 'sched-'));
        var tmpFile = path.join(tmpDir, 'input.txt');
        var lines   = procs.map(function(p){ return p.pid+' '+p.arrival+' '+p.burst+' '+p.priority; });
        fs.writeFileSync(tmpFile, lines.join('\n') + '\n');

        /* Build args */
        var args;
        if (data.algo === 'compare') {
            args = ['--compare', '--quantum', String(q), '--context-switch', String(cs), '--input', tmpFile];
        } else {
            args = ['--algo', data.algo, '--input', tmpFile, '--context-switch', String(cs)];
            if (data.algo === 'rr') args.push('--quantum', String(q));
        }

        /* Run engine */
        cp.execFile(BINARY, args, {timeout: 5000}, function(err, stdout, stderr) {
            /* Cleanup temp */
            try { fs.unlinkSync(tmpFile); fs.rmdirSync(tmpDir); } catch(e) {}

            if (err) {
                var msg = stderr ? stderr.replace(/^error:\s*/i, '').trim() : (err.message || 'engine error');
                res.writeHead(400,{'Content-Type':'application/json'});
                res.end(JSON.stringify({error: msg})); return;
            }
            res.writeHead(200,{'Content-Type':'application/json'});
            res.end(stdout);
        });
    });
}

var server = http.createServer(function(req, res) {
    var method = req.method.toUpperCase();
    var url    = req.url.split('?')[0]; /* ignore query string */

    console.log(method + ' ' + url);

    /* API */
    if (method === 'POST' && url === '/api/run') {
        apiRun(req, res); return;
    }

    /* Static files from viewer/ */
    if (method !== 'GET') {
        res.writeHead(405); res.end('Method not allowed'); return;
    }

    /* Normalize path, prevent directory traversal */
    var reqPath = url === '/' ? '/index.html' : url;
    var filePath = path.normalize(path.join(VIEWER, reqPath));

    /* Security: must stay inside viewer/ */
    if (!filePath.startsWith(VIEWER + path.sep) && filePath !== VIEWER) {
        res.writeHead(403); res.end('Forbidden'); return;
    }

    serveStatic(res, filePath);
});

server.listen(PORT, function() {
    console.log('Scheduler UI: http://localhost:' + PORT);
});
