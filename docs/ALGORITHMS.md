# Scheduling Algorithms

## FCFS — First Come First Served
- Non-preemptive. Processes run in arrival order.
- Simple but suffers from the **convoy effect**: one long process blocks all short ones.
- **Best for**: batch systems where fairness matters more than speed.

## SJF — Shortest Job First (Non-Preemptive)
- Picks the process with the smallest burst time from the ready queue.
- Optimal average waiting time among non-preemptive algorithms.
- **Problem**: can cause **starvation** of long processes.
- **Tie-break**: earlier arrival, then lower PID.

## SRTF — Shortest Remaining Time First (Preemptive SJF)
- At each tick, if a new arrival has strictly less remaining time than the running process, it preempts.
- Optimal average waiting time overall.
- High context-switch overhead.

## Priority (Non-Preemptive)
- Lower priority number = higher priority.
- Process runs until completion once dispatched.
- Can cause **starvation** of low-priority processes.

## Priority-P (Preemptive Priority)
- Preempts the running process if a strictly higher-priority process arrives.
- More responsive but higher overhead.

## Round Robin (RR)
- Each process gets a quantum Q ticks. After Q ticks, it goes to the back of the queue.
- If a process arrives on the same tick a quantum expires, it joins the queue **before** the preempted process.
- **Quantum choice**: small Q → more responsive but more context switches; large Q → approaches FCFS.

## Comparison Table

| Algorithm | Preemptive | Starvation | Overhead | Best For |
|-----------|-----------|------------|---------|---------|
| FCFS | No | No | Low | Batch |
| SJF | No | Yes | Low | Known burst times |
| SRTF | Yes | Yes | High | Minimum avg wait |
| Priority | No | Yes | Low | Priority tasks |
| Priority-P | Yes | Yes | Medium | Real-time |
| RR | Yes | No | Medium | Time-sharing |
