cmake_minimum_required(VERSION 3.16)
project(scheduler_cpp VERSION 2.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(MSVC)
    add_compile_options(/W4)
else()
    add_compile_options(-Wall -Wextra -O2)
endif()

set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/../bin")

# ── Core engine sources (cross-platform) ─────────────────────────────────────
set(ENGINE_CORE_SOURCES
    src/parser/input_parser.cpp
    src/scheduler/simulation.cpp
    src/scheduler/execution_controller.cpp
    src/metrics/metrics.cpp
    src/trace/trace_writer.cpp
    src/trace/event_sink.cpp
)

# ── Linux-only process management sources ────────────────────────────────────
if(UNIX AND NOT APPLE)
    set(PROCESS_SOURCES
        src/ipc/pipe_manager.cpp
        src/process/child_worker.cpp
        src/process/process_manager.cpp
        src/process/pipe_backend.cpp
        src/process/signal_backend.cpp
        src/process/worker_backend_factory.cpp
    )
else()
    set(PROCESS_SOURCES "")
endif()

# ── Main executable ───────────────────────────────────────────────────────────
add_executable(scheduler_cpp
    src/main.cpp
    ${ENGINE_CORE_SOURCES}
    ${PROCESS_SOURCES}
)
target_include_directories(scheduler_cpp PRIVATE include)

# ── Unit tests (cross-platform) ───────────────────────────────────────────────
add_executable(run_tests
    tests/test_main.cpp
    ${ENGINE_CORE_SOURCES}
    ${PROCESS_SOURCES}
)
target_include_directories(run_tests PRIVATE include)

# ── Linux integration tests ───────────────────────────────────────────────────
if(UNIX AND NOT APPLE)
    add_executable(run_linux_tests
        tests/test_linux_process.cpp
        ${ENGINE_CORE_SOURCES}
        ${PROCESS_SOURCES}
    )
    target_include_directories(run_linux_tests PRIVATE include)
endif()

enable_testing()
add_test(NAME unit_tests COMMAND run_tests)
if(UNIX AND NOT APPLE)
    add_test(NAME linux_process_tests COMMAND run_linux_tests)
endif()
