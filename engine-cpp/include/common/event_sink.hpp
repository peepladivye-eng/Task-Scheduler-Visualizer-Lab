#pragma once
#include "events.hpp"
#include <memory>
#include <vector>
#include <unordered_map>
#include <cstdio>
#include <string>

namespace sched {

// Abstract interface for receiving live scheduling events synchronously
// as POSIX syscalls return.
class IEventSink {
public:
    virtual ~IEventSink() = default;
    virtual void on_event(const LiveEvent& ev) = 0;
};

// Composite dispatcher that fans out each event to multiple registered sinks.
class CompositeEventSink : public IEventSink {
public:
    void add_sink(std::shared_ptr<IEventSink> sink) {
        if (sink) sinks_.push_back(std::move(sink));
    }

    void on_event(const LiveEvent& ev) override {
        for (auto& s : sinks_) {
            s->on_event(ev);
        }
    }

private:
    std::vector<std::shared_ptr<IEventSink>> sinks_;
};

// TerminalSink: formats events to an output file (default stderr) in the target human-readable format.
// Supports live Gantt redraw on TTY and PID color coding.
class TerminalSink : public IEventSink {
public:
    explicit TerminalSink(std::FILE* out = stderr);
    ~TerminalSink() override;

    void print_header(int parent_pid, int pgid, const char* algo,
                      int quantum, int cs_cost, const char* ipc, size_t proc_count);

    void on_event(const LiveEvent& ev) override;

private:
    std::FILE* out_;
    bool is_tty_    = false;
    bool use_color_ = false;
    int  gantt_lines_drawn_ = 0;

    struct ProcInfo {
        int pid;
        int os_pid;
        int burst;
    };
    std::vector<ProcInfo> procs_;
    std::unordered_map<int, size_t> pid_map_;
    std::unordered_map<int, std::vector<char>> proc_chars_;
    std::vector<int> cpu_history_; // logical pid running at each tick, -1 for none

    const char* pid_color(int pid) const;
    const char* reset_color() const;
    void erase_live_gantt();
    void render_live_gantt(int current_t);
};

// NdjsonSink: serializes LiveEvent into a compact JSON line and immediately flushes.
class NdjsonSink : public IEventSink {
public:
    explicit NdjsonSink(std::FILE* out = stdout) : out_(out) {}
    void on_event(const LiveEvent& ev) override;

private:
    std::FILE* out_;
};

} // namespace sched
