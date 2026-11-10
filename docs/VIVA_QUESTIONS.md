# VIVA Questions & Answers — CPU Scheduler Visualizer Lab

## Architecture

**Q: What is the high-level architecture of this project?**
Four layers:
1. React frontend (browser) — process configuration, Gantt chart, metrics display
2. Node.js bridge (server.js) — receives API requests, invokes the C++ engine, returns JSON
3. C++17 engine (engine-cpp/) — scheduling algorithms, real process management, JSON trace output
4. Linux/WSL2 — OS-level process creation, IPC, scheduling

**Q: Why C++? Why not keep the C engine?**
C++ gives us classes, RAII, std::vector, and proper OOP for the process manager. The C engine was a pure tick-based simulator with no real process management. The C++ engine adds `fork()`, `pipe()`, `waitpid()` — Linux system calls that require a richer language for safe resource management.

---

## fork()

**Q: What does fork() do?**
`fork()` creates an exact copy of the calling process (the parent). After fork():
- Parent receives the child's PID (> 0)
- Child receives 0
- Both continue executing from the same point

**Q: What is the difference between the parent PID and the logical process ID?**
- Logical PID: our scheduling label (P1, P2, P3) — just an integer we assign
- OS PID: the actual identifier assigned by the Linux kernel after fork()
These are completely different. P1 might have OS PID 1247. We display both in the process table.

**Q: What happens to file descriptors after fork()?**
Both parent and child inherit all open file descriptors. We immediately close the ends we don't need:
- Parent closes the child's read end of the instruction pipe and write end of the ack pipe
- Child closes the parent's write end of the instruction pipe and read end of the ack pipe

**Q: Show the code.**
```cpp
pid_t child_pid = ::fork();
if (child_pid == 0) {
    // CHILD — close unused ends, run worker
    instr_pipe.write_end.close_fd();
    ack_pipe.read_end.close_fd();
    child_worker_main(instr_read_fd, ack_write_fd, logical_pid);
    ::_exit(1);
}
// PARENT — close unused ends, record PID
instr_pipe.read_end.close_fd();
ack_pipe.write_end.close_fd();
// wait for READY ack from child...
```

---

## IPC — Pipes

**Q: What is a pipe?**
A unidirectional communication channel. Data written to one end can be read from the other. We create them with `pipe(int fds[2])` before fork() so both processes inherit the file descriptors.

**Q: Why two pipes per worker?**
One pipe for parent→child (instructions) and one for child→parent (acknowledgements). A single pipe would be bidirectional chaos.

**Q: What messages go over the pipes?**
Fixed-size C structs:
```cpp
struct Instruction { InstrType type; int32_t session_id; int32_t units; };
struct Acknowledgement { AckType type; int32_t session_id; int32_t os_pid; };
```
Instruction types: EXECUTE_UNITS, TERMINATE
Acknowledgement types: READY, UNITS_DONE, TERMINATED, WORKER_ERROR

**Q: Why use fixed-size structs?**
`write()` and `read()` on pipes can transfer partial data. Fixed-size structs let us loop until exactly `sizeof(struct)` bytes are transferred, avoiding framing complexity.

**Q: What is EINTR and how do you handle it?**
EINTR means a system call was interrupted by a signal before completing. We retry:
```cpp
while (remaining > 0) {
    ssize_t written = ::write(fd, p, remaining);
    if (written < 0) {
        if (errno == EINTR) continue;   // retry
        throw std::runtime_error(...);
    }
    p += written; remaining -= written;
}
```

---

## waitpid() and Zombie Prevention

**Q: What is a zombie process?**
A process that has finished executing but whose exit status hasn't been collected by the parent with waitpid(). It stays in the process table until the parent reads its status.

**Q: How do you prevent zombies?**
Every child is registered. `terminate_worker()` sends TERMINATE, waits for TERMINATED ack, then calls `waitpid()`. `shutdown_all()` terminates every registered worker. The destructor calls `shutdown_all()`.

```cpp
void ProcessManager::reap_worker(WorkerEntry& entry) {
    ::close(entry.instr_write_fd);
    ::close(entry.ack_read_fd);
    while (true) {
        pid_t ret = ::waitpid(entry.os_pid, &status, 0);
        if (ret > 0) break;
        if (errno == EINTR) continue;   // retry on signal
        if (errno == ECHILD) break;     // already reaped
        break;
    }
    entry.state = WorkerState::REAPED;
}
```

---

## Scheduling Algorithms

**Q: How does FCFS work?**
First Come First Served. Ready queue ordered by arrival time. The process at the front runs until it finishes. No preemption.

**Q: What is the difference between SJF and SRTF?**
- SJF: non-preemptive, picks the process with the shortest *total* burst from the ready queue at dispatch time.
- SRTF: preemptive, re-evaluates at every arrival. If a new process has a shorter *remaining* time than the currently running process, it preempts.

**Q: What tie-breaking do you use?**
1. Primary key (burst, remaining, priority, or arrival depending on algorithm)
2. Earliest arrival time
3. Lowest logical PID

**Q: How does Round Robin handle a process arriving exactly when the quantum expires?**
Contract rule: arrivals are processed BEFORE the quantum expiry check. So the new process joins the queue BEFORE the preempted process is requeued. This gives new arrivals priority over the preempted process — correct FIFO behaviour.

---

## Metrics

**Q: Define the metrics.**
- Turnaround time = completion − arrival
- Waiting time = turnaround − burst
- Response time = first_start − arrival
- CPU utilization = (sum of burst ticks / total_time) × 100
- Throughput = number of processes / total_time

**Q: Who calculates the metrics?**
The C++ engine calculates them and includes them in the JSON trace. The frontend reads and displays them. The frontend does not recalculate independently.

---

## User Space vs Kernel Scheduling

**Q: Does your application control the Linux kernel scheduler?**
No. The Linux kernel continues to schedule all processes normally. Our application implements a **user-space scheduling experiment**: the parent C++ process decides which child worker is *permitted to execute a unit of work* by sending it an IPC message. Children wait (blocked on read()) until the parent sends EXECUTE_UNITS. This demonstrates scheduling decisions, process coordination, and IPC without claiming kernel control.

---

## Demo Scenario (4 processes, compare 5 algorithms)

Input (fixtures/sjf_basic/input.txt):
```
1  0  6  3
2  1  8  2
3  2  7  1
4  3  3  4
```

| Algorithm | Avg Wait | Avg TAT | Context Switches |
|-----------|----------|---------|-----------------|
| FCFS      | 8.25 ms  | 15.25 ms | 3 |
| SJF       | 7.75 ms  | 14.75 ms | 3 |
| SRTF      | 7.25 ms  | 14.25 ms | 5 |
| Priority  | 8.25 ms  | 15.25 ms | 3 |
| RR (q=2)  | 11.75 ms | 18.75 ms | 4 |

SRTF achieves lowest waiting time. RR has highest due to frequent context switches.

**To run live (WSL2):**
```bash
cd /mnt/c/Users/Lenovo/Desktop/Divye/NSUT/OS\ project
# Start backend
node server.js &
# Or open in browser: http://localhost:3000
# Enable "Live mode" toggle in the UI to see real OS PIDs
```
