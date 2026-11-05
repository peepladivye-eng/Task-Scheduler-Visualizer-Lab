#ifndef PARSER_H
#define PARSER_H
#include "process.h"
#include <stddef.h>
/* Returns 0 on success. On failure returns 1 and writes a message into err (without the "error: " prefix). */
int parse_input(const char *path, Process *out, int *n, char *err, size_t errlen);
#endif
