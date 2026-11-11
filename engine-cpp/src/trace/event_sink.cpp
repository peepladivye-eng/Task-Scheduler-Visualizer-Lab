#include "../../include/common/event_sink.hpp"
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <string>
#include <algorithm>

#ifdef __linux__
#include <unistd.h>
#include <sys/ioctl.h>
#endif

namespace sched {

static const char* PALETTE[] = {
    "\033[36m", // Cyan
    "\033[32m", // Green
    "\033[33m", // Yellow
    "\033[35m", // Magenta
    "\033[34m", // Blue
    "\033[96m", // Bright Cyan
    "\033[92m", // Bright Green
    "\033[93m"  // Bright Yellow
};

static std::string format_ready_queue(const std::vector<int>& rq) {
    std::string s = "[";
    for (size_t i = 0; i < rq.size(); ++i) {
        if (i > 0) s += ", ";
        s += "P" + std::to_string(rq[i]);
    }
    s += "]";
    return s;
}

TerminalSink::TerminalSink(std::FILE* out) : out_(out) {
#ifdef __linux__
    is_tty_ = (out_ != nullptr) && (::isatty(::fileno(out_)) != 0);
#else
    is_tty_ = false;
#endif
    bool no_color = (std::getenv("NO_COLOR") != nullptr);
    use_color_ = is_tty_ && !no_color;
}

TerminalSink::~TerminalSink() {
    erase_live_gantt();
}

const char* TerminalSink::pid_color(int pid) const {
    if (!use_color_ || pid <= 0) return "";
    return PALETTE[(pid - 1) % 8];
}

const char* TerminalSink::reset_color() const {
    return use_color_ ? "\033[0m" : "";
}

void TerminalSink::erase_live_gantt() {
    if (!is_tty_ || gantt_lines_drawn_ <= 0 || !out_) return;
    std::fprintf(out_, "\033[%dA\033[J", gantt_lines_drawn_);
    gantt_lines_drawn_ = 0;
}

void TerminalSink::print_header(int parent_pid, int pgid, const char* algo,
                                int quantum, int cs_cost, const char* ipc, size_t proc_count) {
    if (!out_) return;
    erase_live_gantt();
    std::fprintf(out_, "\n");
    std::fprintf(out_, "╔══════════════════════════════════════════════════════════╗\n");
    std::fprintf(out_, "║   CPU SCHEDULER — REAL PROCESS EXECUTION (WSL2)         ║\n");
    std::fprintf(out_, "╚══════════════════════════════════════════════════════════╝\n");
    std::fprintf(out_, "  Parent PID : %d | PGID: %d\n", parent_pid, pgid);
    std::fprintf(out_, "  Algorithm  : %s", algo);
    if (quantum > 0) std::fprintf(out_, " (quantum=%d)", quantum);
    std::fprintf(out_, "\n");
    std::fprintf(out_, "  CS cost    : %d ms\n", cs_cost);
    std::fprintf(out_, "  Backend    : %s\n", ipc);
    std::fprintf(out_, "  Processes  : %zu\n\n", proc_count);
    std::fflush(out_);
}

void TerminalSink::render_live_gantt(int current_t) {
    if (!is_tty_ || procs_.empty() || !out_) return;

    int term_width = 80;
#ifdef __linux__
    struct winsize ws{};
    if (::ioctl(::fileno(out_), TIOCGWINSZ, &ws) == 0 && ws.ws_col > 20) {
        term_width = ws.ws_col;
    }
#endif
    int avail_cols = term_width - 18;
    if (avail_cols < 10) avail_cols = 10;

    int total_cols = current_t + 1;
    int scale = 1;
    while ((total_cols + scale - 1) / scale > avail_cols) scale++;

    int cols = (total_cols + scale - 1) / scale;
    if (cols < 1) cols = 1;

    std::fprintf(out_, "\n");
    if (scale > 1) {
        std::fprintf(out_, "  [LIVE GANTT] (1 col = %d ticks)\n", scale);
    } else {
        std::fprintf(out_, "  [LIVE GANTT]\n");
    }

    // Ruler
    std::fprintf(out_, "  %-14s│", "");
    for (int c = 0; c < cols; ++c) {
        int t_val = c * scale;
        if (t_val % (scale * 5) == 0) std::fprintf(out_, "%d", (t_val / 10) % 10);
        else std::fprintf(out_, " ");
    }
    std::fprintf(out_, "│\n");

    // Process rows
    for (const auto& p : procs_) {
        char osBuf[16] = "";
        if (p.os_pid > 0) std::snprintf(osBuf, sizeof(osBuf), "[%d]", p.os_pid);
        std::fprintf(out_, "  %sP%-2d%8s%s │",
            pid_color(p.pid), p.pid, osBuf, reset_color());

        for (int c = 0; c < cols; ++c) {
            int t0 = c * scale;
            char ch = ' ';
            const auto& row = proc_chars_[p.pid];
            if (t0 < (int)row.size()) {
                ch = row[t0];
            }
            if (ch == 'R') {
                std::fprintf(out_, "%s█%s", pid_color(p.pid), reset_color());
            } else if (ch == 'C') {
                std::fprintf(out_, "░");
            } else {
                std::fprintf(out_, " ");
            }
        }
        std::fprintf(out_, "│\n");
    }

    // CPU row
    std::fprintf(out_, "  CPU           │");
    for (int c = 0; c < cols; ++c) {
        int t0 = c * scale;
        if (t0 < (int)cpu_history_.size() && cpu_history_[t0] > 0) {
            int rpid = cpu_history_[t0];
            std::fprintf(out_, "%s%d%s", pid_color(rpid), rpid % 10, reset_color());
        } else {
            std::fprintf(out_, " ");
        }
    }
    std::fprintf(out_, "│\n");

    // Total lines drawn: 1 blank + 1 header + 1 ruler + procs count + 1 cpu
    gantt_lines_drawn_ = 4 + (int)procs_.size();
    std::fflush(out_);
}

void TerminalSink::on_event(const LiveEvent& ev) {
    if (!out_) return;

    erase_live_gantt();

    switch (ev.type) {
        case LiveEventType::ARRIVE: {
            if (pid_map_.find(ev.pid) == pid_map_.end()) {
                pid_map_[ev.pid] = procs_.size();
                procs_.push_back({ev.pid, ev.os_pid, ev.tick_total});
            } else {
                procs_[pid_map_[ev.pid]].os_pid = ev.os_pid;
            }
            std::fprintf(out_, " t=%3d ARRIVE   %sP%-2d%s fork() -> os_pid %d, child stopped (T)\n",
                ev.t, pid_color(ev.pid), ev.pid, reset_color(), ev.os_pid);
            break;
        }

        case LiveEventType::DISPATCH: {
            std::string rq = format_ready_queue(ev.ready_queue);
            std::fprintf(out_, " t=%3d DISPATCH %sP%-2d%s kill(%d,SIGCONT) ready=%s\n",
                ev.t, pid_color(ev.pid), ev.pid, reset_color(), ev.os_pid, rq.c_str());
            break;
        }

        case LiveEventType::RUN: {
            if (ev.t >= (int)cpu_history_.size()) {
                cpu_history_.resize(ev.t + 1, -1);
            }
            cpu_history_[ev.t] = ev.pid;

            auto& row = proc_chars_[ev.pid];
            if (ev.t >= (int)row.size()) {
                row.resize(ev.t + 1, ' ');
            }
            row[ev.t] = 'R';

            std::fprintf(out_, " t=%3d RUN      %sP%-2d%s os_pid %d tick %d/%d\n",
                ev.t, pid_color(ev.pid), ev.pid, reset_color(), ev.os_pid, ev.tick_current, ev.tick_total);
            break;
        }

        case LiveEventType::PREEMPT: {
            std::string r = ev.reason.empty() ? "" : (", " + ev.reason);
            std::fprintf(out_, " t=%3d PREEMPT  %sP%-2d%s wait4 -> stopped by SIGSTOP%s\n",
                ev.t, pid_color(ev.pid), ev.pid, reset_color(), r.c_str());
            break;
        }

        case LiveEventType::EXIT: {
            double rss_mb = static_cast<double>(ev.max_rss_kb) / 1024.0;
            std::fprintf(out_, " t=%3d EXIT     %sP%-2d%s wait4 -> exited %d, cpu %.2f ms, max_rss %.1f MB\n",
                ev.t, pid_color(ev.pid), ev.pid, reset_color(), ev.exit_status, ev.cpu_ms, rss_mb);
            break;
        }

        case LiveEventType::CLEANUP: {
            std::fprintf(out_, " t=%3d CLEANUP  kill(-%d,SIGKILL) live=%d reaped %d/%d zombies %d\n",
                ev.t, ev.pgid, ev.live_count, ev.reaped_count, ev.total_procs, ev.zombies);
            break;
        }
    }

    if (ev.type != LiveEventType::CLEANUP) {
        render_live_gantt(ev.t);
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
