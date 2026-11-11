# Phase 1 Research: Real-Time Event Pipeline

## 1. Strace Audit & Comparison with Current Engine Output

### Baseline Strace Analysis
Command run under WSL2:
```bash
strace -f -e trace=clone,fork,kill,wait4,write,sigaction,setpgid \
  bin/scheduler_cpp --algo fcfs --input fixtures/fcfs_textbook/input.txt --mode live --ipc signal --log
```

### What Happens at the Syscall Level
1. **Spawn / Fork**:
   - Parent calls `clone()` / `fork()`.
   - Parent calls `setpgid(child_pid, 0)`.
   - Child calls `raise(SIGSTOP)` immediately upon creation.
   - Parent calls `wait4(child_pid, &status, WUNTRACED)`.
   - When child enters `SIGSTOP` state (Process state `T`), `wait4` returns child PID with `WIFSTOPPED`.
2. **Dispatch**:
   - Parent sends `kill(child_pid, SIGCONT)`.
   - Child unblocks and begins executing `unit_of_work()`.
3. **Tick Execution & Child Log**:
   - Child executes CPU burn loop (`unit_of_work(work_us)`).
   - In signal backend, child writes `[CHILD-...] P1 tick 1/N\n` directly to `STDERR_FILENO` using `write()`.
   - If more burst units remain, child self-stops with `raise(SIGSTOP)`.
4. **Preempt / Tick Stop**:
   - Child enters stopped state (`SIGSTOP`).
   - Parent's `wait4(child_pid, &status, WUNTRACED, &rusage)` returns with `WIFSTOPPED`.
5. **Exit / Completion**:
   - On the final burst tick, child does not call `raise(SIGSTOP)`; it calls `_exit(0)`.
   - Parent's `wait4` returns with `WIFEXITED(status)` and exit code 0.
   - Parent gathers `rusage` (`ru_utime`, `ru_maxrss`).
6. **Termination / Cleanup**:
   - `backend->abort_all()` executes.

### Discrepancies: What Is Missing, Fake, or Synthetic in Current Code

| Feature / Event | Current Engine Behavior | Target Real OS Behavior | Deficiency Identified |
|---|---|---|---|
| **Process Arrival (`ARRIVE`)** | **Lazy Fork**: Child is only forked when first scheduled on CPU (`if (!forked[pid])` in `execution_controller.cpp`). | All processes with `arrival == t` fork at time `t`, stop immediately (`SIGSTOP`), and enter ready queue. | Processes arriving at `t=0` (e.g. P2, P3 in textbook FCFS) were not forked until `t=24` and `t=27`. |
| **Dispatch Line** | `[t= 0] SIGCONT P1 (os_pid=...)` | `t=  0 DISPATCH P1 kill(8571,SIGCONT) ready=[...]` | Ready queue snapshot is missing. Formatting does not match target. |
| **Tick Run Line** | Direct child stderr write: `[CHILD-...] P1 tick 1/N` | `t=  0 RUN P1 os_pid 8571 tick 1/5` | Missing unified timestamped event stream. |
| **Preemption Line** | `[t= 0] stopped P1` | `t=  2 PREEMPT P1 wait4 -> stopped by SIGSTOP, quantum expired` | Preemption reason (quantum expired, priority preempted) and syscall return detail are missing. |
| **Exit Line** | `[t=24] COMPLETE: P1 (os_pid=..., cpu=6.9ms, rss=996kb)` | `t=  9 EXIT P1 wait4 -> exited 0, cpu 1.05 ms, max_rss 1.4 MB` | Wording and format discrepancy (`EXIT` vs `COMPLETE`). |
| **Cleanup Line** | None printed during normal execution or signals. | `t= 12 CLEANUP kill(-pgid,SIGKILL) live=0 reaped 3/3 zombies 0` | Complete absence of cleanup reporting on normal/signal exits. |
| **Event Pipeline Architecture** | Hardcoded `fprintf(stderr)` statements scattered across `execution_controller.cpp` and `signal_backend.cpp`. | Single `IEventSink` interface dispatching to `TraceCollectorSink`, `NdjsonSink`, and `TerminalSink`. | No unified event model; web and server currently buffer finished traces rather than receiving streaming events. |

---

## 2. Event Model & `IEventSink` Design

### Core Event Struct (`LiveEvent`)
```cpp
namespace sched {

enum class LiveEventType {
    ARRIVE,
    DISPATCH,
    RUN,
    PREEMPT,
    EXIT,
    CLEANUP
};

struct LiveEvent {
    LiveEventType type;
    int t;                         // Virtual tick
    int pid;                       // Logical process ID (1..N)
    int os_pid;                    // Real Linux OS PID (-1 if n/a)
    int tick_current;              // Current burst tick (e.g., 1)
    int tick_total;                // Total burst ticks (e.g., 5)
    std::string reason;            // e.g., "quantum expired", "higher priority P2 arrived"
    std::vector<int> ready_queue;  // Snapshot of ready queue PIDs
    double cpu_ms;                 // CPU time from getrusage
    long max_rss_kb;               // Max RSS from getrusage
    int exit_status;               // Process exit code
    int live_count;                // For CLEANUP: live processes
    int reaped_count;              // For CLEANUP: reaped count
    int total_procs;               // For CLEANUP: total processes
    int zombies;                   // For CLEANUP: detected zombie count
    int pgid;                      // Process group ID
};

} // namespace sched
```

### The `IEventSink` Interface
```cpp
namespace sched {

class IEventSink {
public:
    virtual ~IEventSink() = default;
    virtual void on_event(const LiveEvent& ev) = 0;
};

// Composite dispatcher that broadcasts each event to multiple registered sinks:
class CompositeEventSink : public IEventSink {
public:
    void add_sink(std::shared_ptr<IEventSink> sink) {
        sinks_.push_back(sink);
    }
    void on_event(const LiveEvent& ev) override {
        for (auto& s : sinks_) {
            s->on_event(ev);
        }
    }
private:
    std::vector<std::shared_ptr<IEventSink>> sinks_;
};

} // namespace sched
```

### The Concrete Sinks
1. **`TerminalSink`**:
   - Implements target line formats:
     - `t=  0 ARRIVE   P1 fork() -> os_pid 8571, child stopped (T)`
     - `t=  0 DISPATCH P1 kill(8571,SIGCONT) ready=[]`
     - `t=  0 RUN      P1 os_pid 8571 tick 1/5`
     - `t=  2 PREEMPT  P1 wait4 -> stopped by SIGSTOP, <reason>`
     - `t=  9 EXIT     P1 wait4 -> exited 0, cpu 1.05 ms, max_rss 1.4 MB`
     - `t= 12 CLEANUP  kill(-pgid,SIGKILL) live=0 reaped 3/3 zombies 0`
   - Formats padding, signals, and rusage cleanly to `stderr`.
2. **`NdjsonSink`**:
   - Formats `LiveEvent` into JSON string:
     ```json
     {"type":"arrive","t":0,"pid":1,"os_pid":8571,"ready_queue":[2,3]}
     ```
   - Writes directly to designated stream (e.g. `stdout` when in NDJSON streaming mode) and calls `fflush()` immediately.
3. **`TraceCollectorSink`**:
   - Records timeline segments, events (`EvType`), and process completion stats in memory.
   - Preserves 100% backwards compatibility for `SimResult` JSON trace schema 1.0.

---

## 3. Integration with Execution Controller & Worker Backends

### Fork at Arrival
In `simulate_with_workers`:
- Maintain an `arrival_map`: group processes by `p.arrival`.
- At tick `t`:
  - Find all processes arriving at `t`.
  - For each arriving process, invoke `backend->spawn(pid, burst)`:
    - Child calls `PR_SET_PDEATHSIG`, joins process group, stops via `raise(SIGSTOP)`.
    - Parent calls `wait4(child_pid, &st, WUNTRACED)`.
    - Parent records `os_pid`.
    - Parent emits `LiveEvent{ ARRIVE, t, pid, os_pid, ... }`.
  - Push arrived processes into the ready queue.

### Dispatch & Preempt Coordination
- When the scheduling policy picks the next process `P_curr`:
  - Parent captures `ready_queue` snapshot.
  - Parent emits `LiveEvent{ DISPATCH, t, P_curr, os_pid, ready_queue, ... }`.
  - Parent calls `backend->run_tick(P_curr)`:
    - Sends `SIGCONT` (or pipe token).
    - Child burns CPU, emits RUN event.
    - Parent waits with `wait4(..., WUNTRACED)`.
  - If tick finished and more burst remains:
    - Parent determines preemption reason (e.g. `quantum expired` in RR, or `higher priority arrived`).
    - Parent emits `LiveEvent{ PREEMPT, t, P_curr, os_pid, reason, ... }`.
  - If process completed:
    - `wait4` returned `WIFEXITED`.
    - Worker stats collected via `getrusage`.
    - Parent emits `LiveEvent{ EXIT, t, P_curr, os_pid, cpu_ms, max_rss_kb, ... }`.

### Pipe Backend Compatibility
- The `IWorkerBackend` interface already has `spawn`, `run_tick`, `stats`, `abort_all`.
- `PipeBackend` executes the same logic via instruction/ack pipes instead of signals.
- In both backends, the event emissions correspond strictly to when the IPC exchange / `wait4` returns.

---

## 4. Verification & Constraints
- **Virtual Time**: Ticks remain integer virtual time units (`t=0, 1, 2...`). `--tick-ms` only causes parent to call `usleep()` for pacing observation, never affecting scheduling decisions.
- **Backwards Compatibility**: The JSON trace returned on `stdout` maintains the existing schema (`version: "1.0"`).
- **Test Integrity**: Pure simulation mode (`simulate()`) remains identical to C reference.
