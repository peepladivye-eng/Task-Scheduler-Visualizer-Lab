# WORKING RULES
- Do exactly the task. No extra features, files or refactors. Max 3 files unless the task lists more.
- Never edit .kiro/steering/*, fixtures/, or any test file unless the task names it. If a test fails, fix the code, not the test.
- No new dependencies. Engine: C++17 standard library + POSIX only. Server: Node built-ins only. Web: only libraries already in package.json.
- Run the verify commands from the task in WSL (Ubuntu) and paste the FULL output.
- Never commit build output (bin/, engine-cpp/build/, web/node_modules/, web/dist/).
- If something is ambiguous, ask.
- Never add a third scheduling implementation. engine-cpp is the only live engine; engine/ is only a test reference.
