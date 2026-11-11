# Viva Preparation — 25 Questions

## Process Concepts

**Q1. What is a PCB?**
A Process Control Block stores all information about a process: PID, state, program counter, registers, memory limits, priority, and scheduling info. The OS uses it to context-switch between processes.

**Q2. What are the five process states?**
New → Ready → Running → Waiting → Terminated. A process moves from Running back to Ready when preempted or its quantum expires.

**Q3. What is a context switch?**
Saving the state of the running process (into its PCB) and loading the state of a new process. It has a cost — during this time no useful work is done.

**Q4. What is the difference between preemptive and non-preemptive scheduling?**
Non-preemptive: once dispatched, a process runs until it blocks or finishes. Preemptive: the OS can forcibly remove a running process (on a timer, arrival, or priority event).

## Scheduling Criteria

**Q5. What are the four key scheduling criteria?**
CPU utilization (keep CPU busy), throughput (jobs/second), turnaround time (submission to completion), waiting time (time in ready queue), response time (first response).

**Q6. What is the convoy effect?**
In FCFS, one long process at the front holds up all shorter processes behind it — like a slow truck on a single-lane road. SJF eliminates this.

**Q7. What is starvation? How is it prevented?**
A low-priority process waits indefinitely because higher-priority processes keep arriving. Prevented by **aging** — gradually increasing the priority of waiting processes.

**Q8. Define turnaround time, waiting time, and response time.**
- Turnaround = completion − arrival
- Waiting = turnaround − burst
- Response = first_run_start − arrival

## Algorithm-Specific

**Q9. Why is SJF optimal for average waiting time?**
It minimizes the total time other processes spend waiting by always running the shortest job first — shorter jobs unblock the queue faster.

**Q10. Why can't SJF be used in practice as-is?**
We don't know burst times in advance. We can only estimate them using exponential averaging of past CPU bursts.

**Q11. How does SRTF relate to SJF?**
SRTF is the preemptive version of SJF. It rechecks at every tick whether a new arrival has a shorter remaining time than the running process.

**Q12. What is the RR quantum tradeoff?**
Small quantum → better response time but higher context-switch overhead. Large quantum → approaches FCFS. Rule of thumb: quantum should be larger than 80% of CPU bursts.

**Q13. Why does RR enqueue new arrivals BEFORE the preempted process?**
A process arriving at the exact tick of quantum expiry was waiting before the preempted process's quantum ran out — it's older in terms of waiting time.

**Q14. What makes Priority-P different from Priority (non-preemptive)?**
Priority-P allows a higher-priority arrival to immediately preempt the running process. Non-preemptive priority waits for the current process to finish.

## Implementation

**Q15. How does your engine represent time?**
Tick-based: 1 tick = 1 ms. The simulation loop runs t = 0, 1, 2, ... processing one tick per iteration.

**Q16. How are segments merged in the timeline?**
The add_tick() function checks if the last segment has the same (type, pid) and t_end == t. If so, it extends t_end by 1. Otherwise, a new segment is appended.

**Q17. Why does idle time not reset last_run?**
The contract specifies this — a CPU sitting idle is not a context switch event. When the next process is dispatched after idle time, we compare it against last_run to decide if a context-switch cost applies.

**Q18. What happens during a context switch in your engine?**
context_switches++ is incremented, cs_left = cs_cost, cs_target = incoming process. For cs_cost ticks, SEG_CS segments are recorded. After the last CS tick, running = cs_target and a dispatch event is emitted for t+1.

**Q19. How does the first dispatch work with no context-switch cost?**
last_run starts as -1 (none). The condition `last_run != -1 && last_run != pid` is false, so no context switch is charged.

**Q20. How is the ready queue ordered for different algorithms?**
FCFS/RR: processes stay in arrival order (queue front = oldest). SJF: scan for smallest burst. SRTF: scan for smallest remaining. Priority: scan for smallest priority number. Tie-break is always earlier arrival then lower PID.

## System-Level

**Q21. What is CPU utilization and how is it calculated?**
CPU utilization = (run_ticks / total_time) × 100. Run ticks = sum of all process bursts. Idle and CS ticks reduce utilization.

**Q22. What is throughput?**
Number of processes completed per unit time = n / total_time.

**Q23. What is the dispatcher vs the scheduler?**
The scheduler decides which process runs next (the algorithm). The dispatcher actually performs the context switch and hands CPU control to that process.

**Q24. What are the ready queue data structure choices?**
Array (simple, O(n) for priority-based pick), linked list (O(1) insert/remove), priority queue/heap (O(log n) pick). We use a dynamic array — simple and correct for up to 64 processes.

**Q25. Why is SRTF theoretically optimal but rarely used in practice?**
It minimizes average waiting time, but requires knowing remaining burst time at all times (impossible in general-purpose OS), has high preemption overhead, and can starve long processes indefinitely.


## Implementation Details (fork, IPC, waitpid)

**Q25. What does fork() do?**
`fork()` creates an exact copy of the calling process. Parent receives child's PID (> 0), child receives 0. Both continue from the same point.

**Q26. What is the difference between logical PID and OS PID?**
- Logical PID: our scheduling label (P1, P2, P3)
- OS PID: actual identifier assigned by Linux kernel after fork()
These are different. P1 might have OS PID 1247.

**Q27. What is a pipe and why two pipes per worker?**
A pipe is a unidirectional communication channel. We need two: one for parent→child (instructions) and one for child→parent (acknowledgements).

**Q28. What is EINTR and how do you handle it?**
EINTR means a system call was interrupted by a signal. We retry in a loop until the operation completes.

**Q29. What is a zombie process?**
A process that finished executing but whose exit status hasn't been collected by waitpid(). It stays in the process table until the parent reads its status. We prevent this by calling waitpid() for every child.

**Q30. Does your application control the Linux kernel scheduler?**
No. We implement a **user-space scheduling experiment**: the parent decides which child is *permitted to execute work* via IPC. The kernel continues its own scheduling normally.
