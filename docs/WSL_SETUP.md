# WSL2 Setup Guide

## Prerequisites
- Windows 10 version 2004+ or Windows 11
- WSL2 enabled with Ubuntu

## Install WSL2
```powershell
# Run in PowerShell as Administrator
wsl --install
# Reboot, then set up Ubuntu username/password
```

## Install dependencies in WSL2 Ubuntu
```bash
sudo apt update && sudo apt install -y build-essential cmake nodejs npm git
```

## Clone or access the project
```bash
# Access from Windows filesystem
cd /mnt/c/Users/<YourName>/Desktop/Divye/NSUT/OS\ project

# Or clone fresh
git clone https://github.com/peepladivye-eng/Task-Scheduler-Visualizer-Lab.git
cd Task-Scheduler-Visualizer-Lab
git checkout cpp-migration
```

## Build the C++ engine (Linux)
```bash
cd engine-cpp
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --parallel
# Binary is output to ../bin/scheduler_cpp
ls -la ../bin/scheduler_cpp
```

## Run the Linux integration tests
```bash
./build/run_linux_tests
# Expected: 13 passed, 0 failed
```

## Run the unit tests
```bash
./build/run_tests
# Expected: 40 passed, 0 failed
```

## Build the React frontend (from Windows or WSL2)
```bash
cd web
npm install
npm run build
```

## Start the server
```bash
# From project root (WSL2 — enables live mode with real fork())
node server.js

# Or from Windows PowerShell (simulate mode only)
node server.js
```

Open **http://localhost:3000** in your browser.

## Verify live mode
1. Open http://localhost:3000
2. In the ScenarioBar, you should see a "Live mode" toggle (only visible when running in WSL2 with the C++ engine)
3. Toggle it on
4. Run a simulation — the Process table will show actual Linux OS PIDs in green
5. You can verify PIDs: `ps aux | grep scheduler_cpp` in WSL2

## Troubleshooting
| Problem | Solution |
|---------|----------|
| "Live mode" toggle not shown | Server must run inside WSL2, not Windows PowerShell |
| "engine binary not found" | Run `cmake --build engine-cpp/build --parallel` from WSL2 |
| Port 3000 already in use | `pkill -f server.js` or use `PORT=3001 node server.js` |
| OS PIDs show as "—" | Live mode is off, or running on Windows |
