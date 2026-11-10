cmake_minimum_required(VERSION 3.16)
project(scheduler_cpp VERSION 1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Strict warnings
if(MSVC)
    add_compile_options(/W4 /WX)
else()
    add_compile_options(
        -Wall -Wextra -Wpedantic
        -Wconversion -Wshadow
        -Wno-unused-parameter   # common in virtual overrides
    )
endif()

# Output binary to project-root/bin/ so the existing server.js can find it
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_SOURCE_DIR}/../bin")

# ── Sources ────────────────────────────────────────────────────────────────
set(ENGINE_SOURCES
    src/parser/input_parser.cpp
    src/scheduler/simulation.cpp
    src/metrics/metrics.cpp
    src/trace/trace_writer.cpp
    src/main.cpp
)

add_executable(scheduler_cpp ${ENGINE_SOURCES})

target_include_directories(scheduler_cpp PRIVATE include)

# ── Tests ──────────────────────────────────────────────────────────────────
# Simple single-binary test runner (no external framework needed)
add_executable(run_tests
    tests/test_main.cpp
    src/parser/input_parser.cpp
    src/scheduler/simulation.cpp
    src/metrics/metrics.cpp
    src/trace/trace_writer.cpp
)
target_include_directories(run_tests PRIVATE include)

enable_testing()
add_test(NAME unit_tests COMMAND run_tests)
