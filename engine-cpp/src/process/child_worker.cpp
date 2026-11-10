#ifdef __linux__
#include "../../include/process/child_worker.hpp"
#include "../../include/ipc/ipc_protocol.hpp"
#include <unistd.h>
#include <cstdlib>
#include <cstdio>

namespace sched {

[[noreturn]] void child_worker_main(int instr_read_fd,
                                    int ack_write_fd,
                                    int logical_pid) {
    using namespace ipc;

    // Send READY with our actual OS PID so the parent can record it.
    Acknowledgement ready_ack{};
    ready_ack.type       = AckType::READY;
    ready_ack.session_id = logical_pid;
    ready_ack.os_pid     = static_cast<int32_t>(::getpid());

    try {
        send_ack(ack_write_fd, ready_ack);
    } catch (...) {
        ::exit(1);
    }

    // Main instruction loop.
    while (true) {
        Instruction instr{};
        try {
            recv_instruction(instr_read_fd, instr);
        } catch (...) {
            // Pipe closed or error — exit quietly.
            ::exit(1);
        }

        if (instr.type == InstrType::TERMINATE) {
            // Acknowledge and exit cleanly.
            Acknowledgement ack{};
            ack.type       = AckType::TERMINATED;
            ack.session_id = instr.session_id;
            ack.os_pid     = static_cast<int32_t>(::getpid());
            try { send_ack(ack_write_fd, ack); } catch (...) {}
            ::exit(0);
        }

        if (instr.type == InstrType::EXECUTE_UNITS) {
            // Do bounded deterministic CPU work.
            volatile int acc = 0;
            int total_iters  = instr.units * WORK_ITERATIONS_PER_UNIT;
            for (int i = 0; i < total_iters; ++i) {
                acc += i & 0xFF;   // simple arithmetic, can't be optimised away
            }
            (void)acc;

            // Acknowledge completion.
            Acknowledgement ack{};
            ack.type       = AckType::UNITS_DONE;
            ack.session_id = instr.session_id;
            ack.os_pid     = static_cast<int32_t>(::getpid());
            try {
                send_ack(ack_write_fd, ack);
            } catch (...) {
                ::exit(1);
            }
            continue;
        }

        // Unknown instruction type — report error and exit.
        Acknowledgement err_ack{};
        err_ack.type       = AckType::WORKER_ERROR;
        err_ack.session_id = instr.session_id;
        err_ack.os_pid     = static_cast<int32_t>(::getpid());
        try { send_ack(ack_write_fd, err_ack); } catch (...) {}
        ::exit(1);
    }
}

} // namespace sched
#endif // __linux__
