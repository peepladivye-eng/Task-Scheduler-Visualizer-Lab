#pragma once
// ExecutionController ties the tick-based scheduler to real Linux child workers.
// On non-Linux it falls back to the pure simulation path.
#include "../common/types.hpp"
#include "../common/event_sink.hpp"
#include <vector>
#include <string>
#include <memory>

#ifdef __linux__
#include "../process/worker_backend.hpp"
#endif

namespace sched {

// Live mode options passed from CLI.
struct LiveParams {
    Ipc  ipc         = Ipc::Signal;
    int  work_us     = 200;
    int  tick_ms     = 0;
    bool log_mode    = false;
    bool ndjson_mode = false;
    std::shared_ptr<IEventSink> sink = nullptr;
};

// Run simulation, then drive real child processes tick-by-tick
// following the timeline the simulator produced.
// On non-Linux, falls back to pure simulate().
SimResult simulate_with_workers(const SimConfig& cfg,
                                const std::vector<ProcessInput>& inputs,
                                const LiveParams& live);

} // namespace sched
