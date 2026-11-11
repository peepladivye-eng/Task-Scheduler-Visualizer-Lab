#ifdef __linux__
#include "../../include/process/worker_backend.hpp"
#include "../../include/process/pipe_backend.hpp"
#include "../../include/process/signal_backend.hpp"

namespace sched {

std::unique_ptr<IWorkerBackend> make_backend(Ipc ipc, const LiveOptions& opt) {
    if (ipc == Ipc::Pipe)
        return std::unique_ptr<IWorkerBackend>(new PipeBackend(opt));
    return std::unique_ptr<IWorkerBackend>(new SignalBackend(opt));
}

} // namespace sched
#endif // __linux__
