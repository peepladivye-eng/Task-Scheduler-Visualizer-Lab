CC = gcc
CFLAGS = -std=c11 -Wall -Wextra -O2
SRC = $(wildcard src/*.c)
BIN = ../bin/scheduler

all: $(BIN)

$(BIN): $(SRC)
	$(CC) $(CFLAGS) -o $@ $^

clean:
	rm -f $(BIN) ../bin/*.o
