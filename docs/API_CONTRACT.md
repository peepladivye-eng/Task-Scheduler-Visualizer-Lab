# API Contract v1.1

## Base URL
`http://localhost:3000`

## GET /api/health
Returns engine status.

**Response:**
```json
{
  "status": "online",
  "platform": "linux",
  "live_mode_supported": true,
  "binary": "/path/to/scheduler_cpp"
}
```

## POST /api/run

### Request
```json
{
  "processes": [
    { "pid": 1, "arrival": 0, "burst": 6, "priority": 3 },
    { "pid": 2, "arrival": 1, "burst": 8, "priority": 2 }
  ],
  "algo": "fcfs",
  "quantum": 4,
  "contextSwitch": 0,
  "live": false
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| processes | array | yes | 1–64 entries |
| algo | string | yes | fcfs, sjf, srtf, priority, priority-p, rr, compare |
| quantum | int | rr only | >= 1 |
| contextSwitch | int | no | 0–100, default 0 |
| live | bool | no | true = fork real child processes (Linux only) |

### Process object
| Field | Range |
|-------|-------|
| pid | >= 1, unique |
| arrival | 0–10000 |
| burst | 1–10000 |
| priority | 0–1000 (lower = higher priority) |

### Response (single run)
```json
{
  "version": "1.0",
  "algo": "fcfs",
  "quantum": null,
  "context_switch_cost": 0,
  "processes": [
    {
      "pid": 1, "arrival": 0, "burst": 6, "priority": 3,
      "os_pid": 1247,
      "start": 0, "completion": 6,
      "waiting": 0, "turnaround": 6, "response": 0
    }
  ],
  "timeline": [
    { "t_start": 0, "t_end": 6, "pid": 1, "type": "run" }
  ],
  "events": [
    { "t": 0, "type": "arrive", "pid": 1, "ready_queue": [1] },
    { "t": 0, "type": "dispatch", "pid": 1, "ready_queue": [] }
  ],
  "metrics": {
    "avg_waiting": 0.00, "avg_turnaround": 6.00,
    "avg_response": 0.00, "cpu_utilization": 100.00,
    "throughput": 0.17, "context_switches": 0
  }
}
```

**New field:** `os_pid` — actual Linux PID from fork(). Null when `live: false` or on non-Linux.

### Response (compare mode)
```json
{
  "version": "1.0",
  "compare": true,
  "runs": [ /* 6 full trace objects in order: fcfs, sjf, srtf, priority, priority-p, rr */ ]
}
```

### Error response
```json
{ "error": "description of error" }
```

HTTP 400 for validation errors, HTTP 500 for engine errors.
