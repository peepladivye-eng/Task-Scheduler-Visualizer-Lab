#pragma once
#include <string>
#include <vector>

namespace sched {

enum class LiveEventType {
    ARRIVE,
    DISPATCH,
    RUN,
    PREEMPT,
    EXIT,
    CLEANUP
};

inline const char* live_event_type_name(LiveEventType t) {
    switch (t) {
        case LiveEventType::ARRIVE:   return "arrive";
        case LiveEventType::DISPATCH: return "dispatch";
        case LiveEventType::RUN:      return "run";
        case LiveEventType::PREEMPT:  return "preempt";
        case LiveEventType::EXIT:     return "exit";
        case LiveEventType::CLEANUP:  return "cleanup";
    }
    return "unknown";
}

struct LiveEvent {
    LiveEventType    type         = LiveEventType::ARRIVE;
    int              t            = 0;
    int              pid          = 0;
    int              os_pid       = -1;
    int              tick_current = 0;
    int              tick_total   = 0;
    std::string      reason;
    std::vector<int> ready_queue;
    double           cpu_ms       = 0.0;
    long             max_rss_kb   = 0;
    int              exit_status  = 0;
    int              live_count   = 0;
    int              reaped_count = 0;
    int              total_procs  = 0;
    int              zombies      = 0;
    int              pgid         = 0;
};

} // namespace sched
