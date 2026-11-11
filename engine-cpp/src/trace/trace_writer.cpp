#include "../../include/trace/trace_writer.hpp"
#include <cstdio>
#include <cstring>
#include <cstdlib>
#include <algorithm>

#ifdef __linux__
#include <unistd.h>
#include <sys/ioctl.h>
#endif

namespace sched {

static const char* GANTT_PALETTE[] = {
    "\033[36m", // Cyan
    "\033[32m", // Green
    "\033[33m", // Yellow
    "\033[35m", // Magenta
    "\033[34m", // Blue
    "\033[96m", // Bright Cyan
    "\033[92m", // Bright Green
    "\033[93m"  // Bright Yellow
};

static inline const char* get_pid_color(int pid, bool use_color) {
    if (!use_color || pid <= 0) return "";
    return GANTT_PALETTE[(pid - 1) % 8];
}

static inline const char* get_reset_color(bool use_color) {
    return use_color ? "\033[0m" : "";
}

void write_trace_json(std::FILE* f, const SimResult& r, const Metrics& m) {
    const auto& cfg = r.cfg;

    std::fprintf(f, "{\n");
    std::fprintf(f, "  \"version\": \"1.0\",\n");
    std::fprintf(f, "  \"algo\": \"%s\",\n", algo_name(cfg.algo));

    if (cfg.algo == Algo::RR)
        std::fprintf(f, "  \"quantum\": %d,\n", cfg.quantum);
    else
        std::fprintf(f, "  \"quantum\": null,\n");

    std::fprintf(f, "  \"context_switch_cost\": %d,\n", cfg.cs_cost);

    // ── processes ──
    std::fprintf(f, "  \"processes\": [");
    for (std::size_t i = 0; i < r.processes.size(); ++i) {
        const auto& p = r.processes[i];
        if (i > 0) std::fprintf(f, ",");
        // os_pid: null when -1 (simulate mode), integer when fork() succeeded
        if (p.os_pid >= 0) {
            std::fprintf(f,
                "\n    {\"pid\":%d,\"arrival\":%d,\"burst\":%d,"
                "\"priority\":%d,\"os_pid\":%d,\"start\":%d,\"completion\":%d,"
                "\"waiting\":%d,\"turnaround\":%d,\"response\":%d}",
                p.pid, p.arrival, p.burst, p.priority, p.os_pid,
                p.start, p.completion,
                p.waiting, p.turnaround, p.response);
        } else {
            std::fprintf(f,
                "\n    {\"pid\":%d,\"arrival\":%d,\"burst\":%d,"
                "\"priority\":%d,\"os_pid\":null,\"start\":%d,\"completion\":%d,"
                "\"waiting\":%d,\"turnaround\":%d,\"response\":%d}",
                p.pid, p.arrival, p.burst, p.priority,
                p.start, p.completion,
                p.waiting, p.turnaround, p.response);
        }
    }
    std::fprintf(f, "\n  ],\n");

    // ── timeline ──
    std::fprintf(f, "  \"timeline\": [");
    for (std::size_t i = 0; i < r.timeline.size(); ++i) {
        const auto& s = r.timeline[i];
        if (i > 0) std::fprintf(f, ",");
        if (s.pid == -1) {
            std::fprintf(f,
                "\n    {\"t_start\":%d,\"t_end\":%d,\"pid\":null,\"type\":\"%s\"}",
                s.t_start, s.t_end, seg_type_name(s.type));
        } else {
            std::fprintf(f,
                "\n    {\"t_start\":%d,\"t_end\":%d,\"pid\":%d,\"type\":\"%s\"}",
                s.t_start, s.t_end, s.pid, seg_type_name(s.type));
        }
    }
    std::fprintf(f, "\n  ],\n");

    // ── events ──
    std::fprintf(f, "  \"events\": [");
    for (std::size_t i = 0; i < r.events.size(); ++i) {
        const auto& ev = r.events[i];
        if (i > 0) std::fprintf(f, ",");
        std::fprintf(f,
            "\n    {\"t\":%d,\"type\":\"%s\",\"pid\":%d,\"ready_queue\":[",
            ev.t, ev_type_name(ev.type), ev.pid);
        for (std::size_t j = 0; j < ev.ready_queue.size(); ++j) {
            if (j > 0) std::fprintf(f, ",");
            std::fprintf(f, "%d", ev.ready_queue[j]);
        }
        std::fprintf(f, "]}");
    }
    std::fprintf(f, "\n  ],\n");

    // ── metrics ──
    std::fprintf(f,
        "  \"metrics\": {"
        "\"avg_waiting\":%.2f,"
        "\"avg_turnaround\":%.2f,"
        "\"avg_response\":%.2f,"
        "\"cpu_utilization\":%.2f,"
        "\"throughput\":%.2f,"
        "\"context_switches\":%d"
        "}\n",
        m.avg_waiting, m.avg_turnaround, m.avg_response,
        m.cpu_utilization, m.throughput, m.context_switches);

    std::fprintf(f, "}");
}

void write_compare_json(std::FILE* f,
                        const std::vector<SimResult>& runs,
                        const std::vector<Metrics>& metrics) {
    std::fprintf(f, "{\"version\":\"1.0\",\"compare\":true,\"runs\":[\n");
    for (std::size_t i = 0; i < runs.size(); ++i) {
        if (i > 0) std::fprintf(f, ",\n");
        write_trace_json(f, runs[i], metrics[i]);
    }
    std::fprintf(f, "\n]}");
}

void write_table(std::FILE* f, const SimResult& r, const Metrics& m) {
    std::fprintf(f, "%-6s %-8s %-6s %-9s %-6s %-11s %-8s %-11s %-9s\n",
        "pid","arrival","burst","priority","start","completion",
        "waiting","turnaround","response");
    std::fprintf(f, "%-6s %-8s %-6s %-9s %-6s %-11s %-8s %-11s %-9s\n",
        "---","-------","-----","--------","-----","----------",
        "-------","----------","--------");

    for (const auto& p : r.processes) {
        std::fprintf(f, "%-6d %-8d %-6d %-9d %-6d %-11d %-8d %-11d %-9d\n",
            p.pid, p.arrival, p.burst, p.priority,
            p.start, p.completion,
            p.waiting, p.turnaround, p.response);
    }

    std::fprintf(f,
        "\navg_waiting: %.2f  avg_turnaround: %.2f  avg_response: %.2f\n",
        m.avg_waiting, m.avg_turnaround, m.avg_response);
    std::fprintf(f,
        "cpu_utilization: %.2f%%  throughput: %.2f  context_switches: %d\n",
        m.cpu_utilization, m.throughput, m.context_switches);
}

void write_live_report(std::FILE* f, const SimResult& r, const Metrics& m) {
    // ── header ───────────────────────────────────────────────────────────────
    std::fprintf(f, "\n");
    std::fprintf(f, "╔══════════════════════════════════════════════════════════╗\n");
    std::fprintf(f, "║   CPU SCHEDULER — REAL PROCESS EXECUTION REPORT         ║\n");
    std::fprintf(f, "╚══════════════════════════════════════════════════════════╝\n");
    std::fprintf(f, "  Algorithm : %s", algo_name(r.cfg.algo));
    if (r.cfg.algo == Algo::RR)
        std::fprintf(f, "  (quantum=%d)", r.cfg.quantum);
    std::fprintf(f, "\n");
    std::fprintf(f, "  CS cost   : %d ms\n", r.cfg.cs_cost);
    std::fprintf(f, "  Processes : %zu\n\n", r.processes.size());

    // ── ASCII Gantt chart ────────────────────────────────────────────────────
    bool is_tty = false;
#ifdef __linux__
    if (f) is_tty = (::isatty(::fileno(f)) != 0);
#endif
    bool no_color = (std::getenv("NO_COLOR") != nullptr);
    bool use_color = is_tty && !no_color;

    int term_width = 80;
#ifdef __linux__
    if (f) {
        struct winsize ws{};
        if (::ioctl(::fileno(f), TIOCGWINSZ, &ws) == 0 && ws.ws_col > 0) {
            term_width = ws.ws_col;
        }
    }
#endif
    int avail_width = term_width - 20;
    if (avail_width < 20) avail_width = 20;

    int total = r.total_time;
    int scale = 1;
    while ((total + scale - 1) / scale > avail_width) scale++;

    if (scale > 1) {
        std::fprintf(f, "  GANTT CHART (1 column = %d ticks)\n", scale);
    } else {
        std::fprintf(f, "  GANTT CHART (1 column = 1 tick)\n");
    }

    int cols = (total + scale - 1) / scale;

    // Timeline ruler header
    std::fprintf(f, "  %-12s", "");
    for (int c = 0; c < cols; ++c) {
        int t = c * scale;
        if (c % 5 == 0) {
            std::fprintf(f, "%-5d", t);
        }
    }
    std::fprintf(f, "\n");

    // Process rows
    for (const auto& p : r.processes) {
        char osPidBuf[32] = "";
        if (p.os_pid > 0) std::snprintf(osPidBuf, sizeof(osPidBuf), "[%d]", p.os_pid);
        std::fprintf(f, "  %sP%-2d%8s%s │",
            get_pid_color(p.pid, use_color), p.pid, osPidBuf, get_reset_color(use_color));

        for (int c = 0; c < cols; c++) {
            int t0 = c * scale;
            // Find what this process is doing at tick t0
            const char* ch = " ";
            bool is_run = false;
            for (const auto& seg : r.timeline) {
                if (seg.t_start <= t0 && t0 < seg.t_end && seg.pid == p.pid) {
                    if (seg.type == SegType::RUN) {
                        ch = "█";
                        is_run = true;
                    } else if (seg.type == SegType::CS) {
                        ch = "░";
                    }
                    break;
                }
            }
            if (is_run) {
                std::fprintf(f, "%s%s%s", get_pid_color(p.pid, use_color), ch, get_reset_color(use_color));
            } else {
                std::fprintf(f, "%s", ch);
            }
        }
        std::fprintf(f, "│\n");
    }

    // Dedicated CPU row
    std::fprintf(f, "  CPU         │");
    for (int c = 0; c < cols; ++c) {
        int t0 = c * scale;
        int running_pid = -1;
        for (const auto& seg : r.timeline) {
            if (seg.t_start <= t0 && t0 < seg.t_end && seg.type == SegType::RUN) {
                running_pid = seg.pid;
                break;
            }
        }
        if (running_pid > 0) {
            std::fprintf(f, "%s%d%s", get_pid_color(running_pid, use_color),
                         running_pid % 10, get_reset_color(use_color));
        } else {
            std::fprintf(f, " ");
        }
    }
    std::fprintf(f, "│\n");

    // Timeline ruler
    std::fprintf(f, "  %-12s└", "");
    for (int c = 0; c < cols; c++)
        std::fprintf(f, "─");
    std::fprintf(f, "┘\n");
    std::fprintf(f, "  %-12s 0", "");
    for (int c = 5; c <= cols; c += 5) {
        std::fprintf(f, "%5d", c * scale);
    }
    std::fprintf(f, "\n\n");

    // Legend
    std::fprintf(f, "  █ = running   ░ = context switch   (space) = idle/waiting\n\n");

    // ── Process table with real OS PIDs ──────────────────────────────────────
    std::fprintf(f, "  ┌──────┬──────────┬───────┬─────────┬─────────┬──────────┬─────────┬────────────┬──────────┐\n");
    std::fprintf(f, "  │ P-ID │  OS PID  │ burst │  start  │  done   │ waiting  │   TAT   │  response  │  CPU ms  │\n");
    std::fprintf(f, "  ├──────┼──────────┼───────┼─────────┼─────────┼──────────┼─────────┼────────────┼──────────┤\n");
    for (const auto& p : r.processes) {
        char osPid[16];
        if (p.os_pid > 0) std::snprintf(osPid, sizeof(osPid), "%d", p.os_pid);
        else std::snprintf(osPid, sizeof(osPid), "—");
        char cpuBuf[16];
        if (p.cpu_ms > 0) std::snprintf(cpuBuf, sizeof(cpuBuf), "%.1f", p.cpu_ms);
        else std::snprintf(cpuBuf, sizeof(cpuBuf), "—");
        std::fprintf(f, "  │ P%-3d │ %-8s │ %-5d │ %-7d │ %-7d │ %-8d │ %-7d │ %-10d │ %-8s │\n",
            p.pid, osPid, p.burst,
            p.start, p.completion,
            p.waiting, p.turnaround, p.response,
            cpuBuf);
    }
    std::fprintf(f, "  └──────┴──────────┴───────┴─────────┴─────────┴──────────┴─────────┴────────────┴──────────┘\n\n");

    // ── Summary ──────────────────────────────────────────────────────────────
    std::fprintf(f, "  ┌─────────────────────────────────────┐\n");
    std::fprintf(f, "  │  SUMMARY                            │\n");
    std::fprintf(f, "  ├─────────────────────────────────────┤\n");
    std::fprintf(f, "  │  Avg Waiting Time   : %7.2f ms     │\n", m.avg_waiting);
    std::fprintf(f, "  │  Avg Turnaround     : %7.2f ms     │\n", m.avg_turnaround);
    std::fprintf(f, "  │  Avg Response Time  : %7.2f ms     │\n", m.avg_response);
    std::fprintf(f, "  │  CPU Utilization    : %7.2f %%     │\n", m.cpu_utilization);
    std::fprintf(f, "  │  Throughput         : %7.2f p/ms   │\n", m.throughput);
    std::fprintf(f, "  │  Context Switches   : %7d        │\n", m.context_switches);
    std::fprintf(f, "  │  Total Time         : %7d ms     │\n", total);
    std::fprintf(f, "  └─────────────────────────────────────┘\n\n");
}

} // namespace sched
