#pragma once
#include "events.hpp"
#include <memory>
#include <vector>
#include <cstdio>

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
class TerminalSink : public IEventSink {
public:
    explicit TerminalSink(std::FILE* out = stderr) : out_(out) {}
    void on_event(const LiveEvent& ev) override;

private:
    std::FILE* out_;
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
