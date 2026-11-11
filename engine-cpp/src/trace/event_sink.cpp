#include "../../include/common/event_sink.hpp"
#include <cstdio>
#include <sstream>

namespace sched {

static std::string format_ready_queue(const std::vector<int>& rq) {
    std::string s = "[";
    for (size_t i = 0; i < rq.size(); ++i) {
        if (i > 0) s += ", ";
        s += "P" + std::to_string(rq[i]);
    }
    s += "]";
    return s;
}

void TerminalSink::on_event(const LiveEvent& ev) {
    if (!out_) return;

    switch (ev.type) {
        case LiveEventType::ARRIVE:
            std::fprintf(out_, " t=%3d ARRIVE   P%-2d fork() -> os_pid %d, child stopped (T)\n",
                ev.t, ev.pid, ev.os_pid);
            break;

        case LiveEventType::DISPATCH: {
            std::string rq = format_ready_queue(ev.ready_queue);
            std::fprintf(out_, " t=%3d DISPATCH P%-2d kill(%d,SIGCONT) ready=%s\n",
                ev.t, ev.pid, ev.os_pid, rq.c_str());
            break;
        }

        case LiveEventType::RUN:
            std::fprintf(out_, " t=%3d RUN      P%-2d os_pid %d tick %d/%d\n",
                ev.t, ev.pid, ev.os_pid, ev.tick_current, ev.tick_total);
            break;

        case LiveEventType::PREEMPT: {
            std::string r = ev.reason.empty() ? "" : (", " + ev.reason);
            std::fprintf(out_, " t=%3d PREEMPT  P%-2d wait4 -> stopped by SIGSTOP%s\n",
                ev.t, ev.pid, r.c_str());
            break;
        }

        case LiveEventType::EXIT: {
            double rss_mb = static_cast<double>(ev.max_rss_kb) / 1024.0;
            std::fprintf(out_, " t=%3d EXIT     P%-2d wait4 -> exited %d, cpu %.2f ms, max_rss %.1f MB\n",
                ev.t, ev.pid, ev.exit_status, ev.cpu_ms, rss_mb);
            break;
        }

        case LiveEventType::CLEANUP:
            std::fprintf(out_, " t=%3d CLEANUP  kill(-%d,SIGKILL) live=%d reaped %d/%d zombies %d\n",
                ev.t, ev.pgid, ev.live_count, ev.reaped_count, ev.total_procs, ev.zombies);
            break;
    }
    std::fflush(out_);
}

void NdjsonSink::on_event(const LiveEvent& ev) {
    if (!out_) return;

    std::fprintf(out_, "{\"t\":%d,\"type\":\"%s\"", ev.t, live_event_type_name(ev.type));
    if (ev.pid > 0) {
        std::fprintf(out_, ",\"pid\":%d", ev.pid);
    }
    if (ev.os_pid > 0) {
        std::fprintf(out_, ",\"os_pid\":%d", ev.os_pid);
    }

    switch (ev.type) {
        case LiveEventType::ARRIVE:
            std::fprintf(out_, ",\"burst\":%d", ev.tick_total);
            break;

        case LiveEventType::DISPATCH:
            std::fprintf(out_, ",\"ready\":[");
            for (size_t i = 0; i < ev.ready_queue.size(); ++i) {
                std::fprintf(out_, "%s%d", i > 0 ? "," : "", ev.ready_queue[i]);
            }
            std::fprintf(out_, "]");
            break;

        case LiveEventType::RUN:
            std::fprintf(out_, ",\"tick\":%d,\"total\":%d", ev.tick_current, ev.tick_total);
            break;

        case LiveEventType::PREEMPT:
            if (!ev.reason.empty()) {
                std::fprintf(out_, ",\"reason\":\"%s\"", ev.reason.c_str());
            }
            std::fprintf(out_, ",\"ready\":[");
            for (size_t i = 0; i < ev.ready_queue.size(); ++i) {
                std::fprintf(out_, "%s%d", i > 0 ? "," : "", ev.ready_queue[i]);
            }
            std::fprintf(out_, "]");
            break;

        case LiveEventType::EXIT:
            std::fprintf(out_, ",\"status\":%d,\"cpu_ms\":%.2f,\"max_rss_kb\":%ld",
                ev.exit_status, ev.cpu_ms, ev.max_rss_kb);
            break;

        case LiveEventType::CLEANUP:
            std::fprintf(out_, ",\"pgid\":%d,\"live\":%d,\"reaped\":%d,\"total\":%d,\"zombies\":%d",
                ev.pgid, ev.live_count, ev.reaped_count, ev.total_procs, ev.zombies);
            break;
    }

    std::fprintf(out_, "}\n");
    std::fflush(out_);
}

} // namespace sched
