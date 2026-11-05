#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "../src/parser.h"

/* ------------------------------------------------------------------ */
/* Small helper: write a temp file from a string, return 1 on failure. */
static int write_tmp(const char *path, const char *content) {
    FILE *fp = fopen(path, "w");
    if (!fp) return 1;
    fputs(content, fp);
    fclose(fp);
    return 0;
}

/* ------------------------------------------------------------------ */
/* CHECK macro: prints the failing condition and exits with 1.         */
#define CHECK(cond) \
    do { \
        if (!(cond)) { \
            printf("FAIL: %s  (line %d)\n", #cond, __LINE__); \
            return 1; \
        } \
    } while (0)

/* ------------------------------------------------------------------ */
int main(void) {
    Process procs[MAX_PROCS];
    int n;
    char err[256];
    int rc;

    /* ---- 1. Valid 3-line file with comment and blank line ---------- */
    {
        const char *tmp = "tmp_valid.txt";
        write_tmp(tmp,
            "# this is a comment\n"
            "\n"
            "3 0 10 2\n"
            "1 2  5 1\n"
            "2 1  8 3\n");

        rc = parse_input(tmp, procs, &n, err, sizeof(err));
        remove(tmp);

        CHECK(rc == 0);
        CHECK(n == 3);
        /* sorted by pid: 1, 2, 3 */
        CHECK(procs[0].pid == 1);
        CHECK(procs[1].pid == 2);
        CHECK(procs[2].pid == 3);
        /* spot-check a few fields */
        CHECK(procs[0].burst == 5);
        CHECK(procs[0].remaining == 5);
        CHECK(procs[0].start == -1);
        CHECK(procs[0].completion == -1);
        CHECK(procs[2].arrival == 0);
    }

    /* ---- 2. Empty file -> error ------------------------------------ */
    {
        const char *tmp = "tmp_empty.txt";
        write_tmp(tmp, "");

        rc = parse_input(tmp, procs, &n, err, sizeof(err));
        remove(tmp);

        CHECK(rc == 1);
        CHECK(strstr(err, "no processes") != NULL);
    }

    /* ---- 3. Negative burst -> error -------------------------------- */
    {
        const char *tmp = "tmp_neg_burst.txt";
        write_tmp(tmp, "1 0 -5 1\n");

        rc = parse_input(tmp, procs, &n, err, sizeof(err));
        remove(tmp);

        CHECK(rc == 1);
        CHECK(strstr(err, "burst") != NULL);
    }

    /* ---- 4. Zero burst -> error ------------------------------------ */
    {
        const char *tmp = "tmp_zero_burst.txt";
        write_tmp(tmp, "1 0 0 1\n");

        rc = parse_input(tmp, procs, &n, err, sizeof(err));
        remove(tmp);

        CHECK(rc == 1);
        CHECK(strstr(err, "burst") != NULL);
    }

    /* ---- 5. Duplicate pid -> error --------------------------------- */
    {
        const char *tmp = "tmp_dup_pid.txt";
        write_tmp(tmp,
            "1 0 5 1\n"
            "1 1 3 2\n");

        rc = parse_input(tmp, procs, &n, err, sizeof(err));
        remove(tmp);

        CHECK(rc == 1);
        CHECK(strstr(err, "duplicate pid") != NULL);
    }

    /* ---- 6. 3 tokens only -> error --------------------------------- */
    {
        const char *tmp = "tmp_3tok.txt";
        write_tmp(tmp, "1 0 5\n");

        rc = parse_input(tmp, procs, &n, err, sizeof(err));
        remove(tmp);

        CHECK(rc == 1);
        CHECK(strstr(err, "expected 4 integers") != NULL);
    }

    /* ---- 7. Non-integer token -> error ----------------------------- */
    {
        const char *tmp = "tmp_nonint.txt";
        write_tmp(tmp, "1 0 abc 1\n");

        rc = parse_input(tmp, procs, &n, err, sizeof(err));
        remove(tmp);

        CHECK(rc == 1);
        CHECK(strstr(err, "invalid integer") != NULL);
    }

    /* ---- 8. Burst 99999 -> error ----------------------------------- */
    {
        const char *tmp = "tmp_big_burst.txt";
        write_tmp(tmp, "1 0 99999 1\n");

        rc = parse_input(tmp, procs, &n, err, sizeof(err));
        remove(tmp);

        CHECK(rc == 1);
        CHECK(strstr(err, "burst") != NULL);
    }

    /* ---- 9. Pid 0 (bad_pid) -> error ------------------------------- */
    {
        const char *tmp = "tmp_pid0.txt";
        write_tmp(tmp, "0 0 5 1\n");

        rc = parse_input(tmp, procs, &n, err, sizeof(err));
        remove(tmp);

        CHECK(rc == 1);
        CHECK(strstr(err, "pid") != NULL);
    }

    /* ---- 10. Missing file -> error --------------------------------- */
    {
        rc = parse_input("no_such_file_xyz.txt", procs, &n, err, sizeof(err));

        CHECK(rc == 1);
        CHECK(strstr(err, "cannot open file") != NULL);
    }

    printf("parser_test: all passed\n");
    return 0;
}
