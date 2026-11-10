#pragma once
// Child worker routine — runs entirely in the forked child process.
// Never call this from the parent after fork() returns a positive PID.

namespace sched {

// Work iterations per EXECUTE_UNITS call.
// 100000 iterations of volatile arithmetic = real CPU work, bounded and fast.
static const int WORK_ITERATIONS_PER_UNIT = 100000;

#ifdef __linux__
// Entry point for the child worker.
// instr_read_fd  : read Instruction messages from parent
// ack_write_fd   : write Acknowledgement messages to parent
// logical_pid    : the scheduling logical ID (for session tagging)
// Does not return — calls exit() when done or on fatal error.
[[noreturn]] void child_worker_main(int instr_read_fd,
                                    int ack_write_fd,
                                    int logical_pid);
#endif

} // namespace sched
