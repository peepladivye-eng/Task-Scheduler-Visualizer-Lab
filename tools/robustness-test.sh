#!/bin/bash
# Robustness tests: run each scenario, check exit + leftovers.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CPP="$ROOT/bin/scheduler_cpp"
TMP="$ROOT/.robust_input.txt"
PASS=0
FAIL=0

check() {
    local name="$1" ipc="$2" ok="$3" detail="$4"
    if [ "$ok" = "1" ]; then
        PASS=$((PASS+1))
        echo "PASS: $name [$ipc]${detail:+ — $detail}"
    else
        FAIL=$((FAIL+1))
        echo "FAIL: $name [$ipc]${detail:+ — $detail}"
    fi
}

no_leftovers() {
    sleep 1
    if pgrep -x scheduler_cpp > /dev/null 2>&1; then return 1; else return 0; fi
}

for IPC in signal pipe; do
    echo ""
    echo "=== Testing --ipc $IPC ==="

    # 1. SIGINT
    printf '1 0 10 1\n2 1 8 1\n3 2 6 1\n4 3 2 1\n' > "$TMP"
    "$CPP" --algo fcfs --input "$TMP" --mode live --ipc "$IPC" --work-us 0 --tick-ms 200 &
    local_pid=$!
    sleep 0.6
    kill -INT $local_pid 2>/dev/null
    wait $local_pid
    EXIT_CODE=$?
    no_leftovers && CLEAN=1 || CLEAN=0
    if [ $EXIT_CODE -ne 0 ] && [ $CLEAN -eq 1 ]; then
        check "1_SIGINT" "$IPC" 1 "exit=$EXIT_CODE, clean=$CLEAN"
    else
        check "1_SIGINT" "$IPC" 0 "exit=$EXIT_CODE, clean=$CLEAN"
    fi

    # 2. SIGTERM
    "$CPP" --algo fcfs --input "$TMP" --mode live --ipc "$IPC" --work-us 0 --tick-ms 200 &
    local_pid=$!
    sleep 0.6
    kill -TERM $local_pid 2>/dev/null
    wait $local_pid
    EXIT_CODE=$?
    no_leftovers && CLEAN=1 || CLEAN=0
    if [ $EXIT_CODE -ne 0 ] && [ $CLEAN -eq 1 ]; then
        check "2_SIGTERM" "$IPC" 1 "exit=$EXIT_CODE, clean=$CLEAN"
    else
        check "2_SIGTERM" "$IPC" 0 "exit=$EXIT_CODE, clean=$CLEAN"
    fi

    # 3. SIGKILL of parent
    "$CPP" --algo fcfs --input "$TMP" --mode live --ipc "$IPC" --work-us 0 --tick-ms 200 &
    local_pid=$!
    sleep 0.6
    kill -KILL $local_pid 2>/dev/null
    wait $local_pid 2>/dev/null
    sleep 2
    no_leftovers && CLEAN=1 || CLEAN=0
    check "3_SIGKILL_parent" "$IPC" $CLEAN "clean=$CLEAN"

    # 4. Kill one child mid-run
    "$CPP" --algo fcfs --input "$TMP" --mode live --ipc "$IPC" --work-us 0 --tick-ms 200 &
    local_pid=$!
    sleep 0.8
    CHILD_PID=$(pgrep -P $local_pid 2>/dev/null | head -1)
    if [ -n "$CHILD_PID" ]; then
        kill -KILL "$CHILD_PID" 2>/dev/null
    fi
    wait $local_pid 2>/dev/null
    EXIT_CODE=$?
    no_leftovers && CLEAN=1 || CLEAN=0
    if [ $EXIT_CODE -ne 0 ] && [ $EXIT_CODE -ne 137 ] && [ $CLEAN -eq 1 ]; then
        check "4_kill_child" "$IPC" 1 "exit=$EXIT_CODE, clean=$CLEAN"
    else
        check "4_kill_child" "$IPC" 0 "exit=$EXIT_CODE, clean=$CLEAN"
    fi

    # 6. 64 processes
    : > "$TMP"
    for i in $(seq 1 64); do echo "$i 0 5 1" >> "$TMP"; done
    "$CPP" --algo fcfs --input "$TMP" --mode live --ipc "$IPC" --work-us 0 > /dev/null 2>&1
    EXIT_CODE=$?
    no_leftovers && CLEAN=1 || CLEAN=0
    if [ $EXIT_CODE -eq 0 ] && [ $CLEAN -eq 1 ]; then
        check "6_64_processes" "$IPC" 1 "exit=$EXIT_CODE, clean=$CLEAN"
    else
        check "6_64_processes" "$IPC" 0 "exit=$EXIT_CODE, clean=$CLEAN"
    fi

    # 7. Live limit (total burst > 5000)
    : > "$TMP"
    TOTAL=0; I=1
    while [ $TOTAL -lt 5001 ]; do
        REM=$((5001 - TOTAL))
        BURST=$((REM > 500 ? 500 : REM))
        echo "$I 0 $BURST 1" >> "$TMP"
        TOTAL=$((TOTAL + BURST)); I=$((I + 1))
    done
    "$CPP" --algo fcfs --input "$TMP" --mode live --ipc "$IPC" > /dev/null 2>&1
    LIVE_EXIT=$?
    "$CPP" --algo fcfs --input "$TMP" --mode simulate > /dev/null 2>&1
    SIM_EXIT=$?
    if [ $LIVE_EXIT -ne 0 ] && [ $SIM_EXIT -eq 0 ]; then
        check "7_live_limit" "$IPC" 1 "liveExit=$LIVE_EXIT, simExit=$SIM_EXIT"
    else
        check "7_live_limit" "$IPC" 0 "liveExit=$LIVE_EXIT, simExit=$SIM_EXIT"
    fi

    # 8. Bad flags
    printf '1 0 5 1\n' > "$TMP"
    BAD_FAIL=1
    for BAD_ARGS in "--ipc foo" "--work-us -1" "--tick-ms 1001" "--mode lvie"; do
        "$CPP" --algo fcfs --input "$TMP" $BAD_ARGS > /dev/null 2>&1
        E=$?
        if [ $E -eq 0 ]; then BAD_FAIL=0; fi
    done
    check "8_bad_flags" "$IPC" $BAD_FAIL "allRejected=$BAD_FAIL"

    # 5. Watchdog (signal backend only): suspend grandchild mid-run, engine must abort and clean up
    if [ "$IPC" = "signal" ]; then
        printf '1 0 5 1\n' > "$TMP"
        "$CPP" --algo fcfs --input "$TMP" --mode live --ipc signal --work-us 100000 > /dev/null 2>&1 &
        local_pid=$!
        # Poll for grandchild (it appears quickly after fork)
        GC=""
        for i in $(seq 1 20); do
            GC=$(ps --ppid $local_pid -o pid= 2>/dev/null | head -1 | tr -d ' ')
            [ -n "$GC" ] && break
            sleep 0.05
        done
        if [ -n "$GC" ]; then
            kill -STOP "$GC" 2>/dev/null
        fi
        wait $local_pid 2>/dev/null
        EXIT_WD=$?
        no_leftovers && WD_CLEAN=1 || WD_CLEAN=0
        if [ $EXIT_WD -ne 0 ] && [ $WD_CLEAN -eq 1 ]; then
            check "5_watchdog" "signal" 1 "exit=$EXIT_WD, clean=$WD_CLEAN"
        else
            check "5_watchdog" "signal" 0 "exit=$EXIT_WD, clean=$WD_CLEAN"
        fi
    fi

    # 9. 20 back-to-back runs with zero leftovers
    printf '1 0 3 1\n2 1 2 1\n' > "$TMP"
    BACK_FAIL=0
    for i in $(seq 1 20); do
        "$CPP" --algo fcfs --input "$TMP" --mode live --ipc "$IPC" --work-us 0 > /dev/null 2>&1
        R=$?
        if [ $R -ne 0 ]; then BACK_FAIL=1; fi
    done
    no_leftovers && BACK_CLEAN=1 || BACK_CLEAN=0
    if [ $BACK_FAIL -eq 0 ] && [ $BACK_CLEAN -eq 1 ]; then
        check "9_back_to_back_20" "$IPC" 1 "allExit=0, clean=$BACK_CLEAN"
    else
        check "9_back_to_back_20" "$IPC" 0 "anyFail=$BACK_FAIL, clean=$BACK_CLEAN"
    fi

done

rm -f "$TMP"
echo ""
echo "=== SUMMARY: $PASS PASS, $FAIL FAIL ==="
exit $FAIL
