#ifndef PROCESS_H
#define PROCESS_H
#define MAX_PROCS 64
typedef struct {
    int pid, arrival, burst, priority;   /* from input */
    int remaining;                       /* set = burst by the simulator */
    int start;                           /* first run tick, -1 until it runs */
    int completion;                      /* -1 until finished */
    int waiting, turnaround, response;
} Process;
#endif
