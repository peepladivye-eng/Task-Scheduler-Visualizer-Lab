#include "parser.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

/* ------------------------------------------------------------------ */
/* Helper: parse one whitespace-delimited token as a long.
   Returns 1 on success, 0 if the token is not a valid integer.       */
static int parse_token(const char *tok, long *out) {
    char *end;
    if (tok == NULL || *tok == '\0') return 0;
    *out = strtol(tok, &end, 10);
    /* end must point to the null terminator – whole token consumed */
    return (*end == '\0');
}

/* ------------------------------------------------------------------ */
/* Comparator for sorting Process array by pid ascending.              */
static int cmp_pid(const void *a, const void *b) {
    return ((const Process *)a)->pid - ((const Process *)b)->pid;
}

/* ------------------------------------------------------------------ */
int parse_input(const char *path, Process *out, int *n, char *err, size_t errlen) {
    FILE *fp = fopen(path, "r");
    if (!fp) {
        snprintf(err, errlen, "cannot open file %s", path);
        return 1;
    }

    int count = 0;         /* number of valid process lines parsed so far */
    int line_num = 0;      /* raw line counter (including comments/blanks) */
    char line[512];

    while (fgets(line, sizeof(line), fp)) {
        line_num++;

        /* Skip blank lines and comment lines (first non-space char == '#') */
        const char *p = line;
        while (*p == ' ' || *p == '\t') p++;
        if (*p == '\0' || *p == '\n' || *p == '\r') continue;   /* blank */
        if (*p == '#') continue;                                  /* comment */

        /* Check overflow before we try to store another process */
        if (count >= MAX_PROCS) {
            fclose(fp);
            snprintf(err, errlen, "too many processes (max 64)");
            return 1;
        }

        /* Tokenise the line – we expect exactly 4 tokens */
        /* Make a mutable copy (strip trailing newline) */
        char buf[512];
        strncpy(buf, line, sizeof(buf) - 1);
        buf[sizeof(buf) - 1] = '\0';
        /* strip \r\n */
        size_t len = strlen(buf);
        while (len > 0 && (buf[len-1] == '\n' || buf[len-1] == '\r')) {
            buf[--len] = '\0';
        }

        /* Extract up to 5 tokens (to detect wrong count).
           strtok modifies buf in-place; single-threaded so this is safe. */
        char *tokens[5];
        int ntok = 0;
        char *tok = strtok(buf, " \t");
        while (tok != NULL && ntok < 5) {
            tokens[ntok++] = tok;
            tok = strtok(NULL, " \t");
        }

        if (ntok != 4) {
            fclose(fp);
            snprintf(err, errlen, "line %d: expected 4 integers", line_num);
            return 1;
        }

        /* Parse each token as an integer */
        long vals[4];
        for (int i = 0; i < 4; i++) {
            if (!parse_token(tokens[i], &vals[i])) {
                fclose(fp);
                snprintf(err, errlen, "line %d: invalid integer '%s'", line_num, tokens[i]);
                return 1;
            }
        }

        long pid      = vals[0];
        long arrival  = vals[1];
        long burst    = vals[2];
        long priority = vals[3];

        /* Range checks – order matches task spec */
        if (pid < 1) {
            fclose(fp);
            snprintf(err, errlen, "line %d: pid must be >= 1", line_num);
            return 1;
        }
        if (arrival < 0 || arrival > 10000) {
            fclose(fp);
            snprintf(err, errlen, "line %d: arrival must be between 0 and 10000", line_num);
            return 1;
        }
        if (burst < 1 || burst > 10000) {
            fclose(fp);
            snprintf(err, errlen, "line %d: burst must be between 1 and 10000", line_num);
            return 1;
        }
        if (priority < 0 || priority > 1000) {
            fclose(fp);
            snprintf(err, errlen, "line %d: priority must be between 0 and 1000", line_num);
            return 1;
        }

        /* Duplicate pid check – scan the processes we have so far */
        for (int i = 0; i < count; i++) {
            if (out[i].pid == (int)pid) {
                fclose(fp);
                snprintf(err, errlen, "line %d: duplicate pid %ld", line_num, pid);
                return 1;
            }
        }

        /* Store the process */
        out[count].pid      = (int)pid;
        out[count].arrival  = (int)arrival;
        out[count].burst    = (int)burst;
        out[count].priority = (int)priority;
        count++;
    }

    fclose(fp);

    if (count == 0) {
        snprintf(err, errlen, "input file has no processes");
        return 1;
    }

    /* Sort by pid ascending */
    qsort(out, count, sizeof(Process), cmp_pid);

    /* Initialise simulator fields */
    for (int i = 0; i < count; i++) {
        out[i].remaining  = out[i].burst;
        out[i].start      = -1;
        out[i].completion = -1;
        out[i].waiting    = 0;
        out[i].turnaround = 0;
        out[i].response   = 0;
    }

    *n = count;
    return 0;
}
