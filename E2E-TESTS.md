# End-to-End Test Suite

## Overview

The E2E test suite (`src/test/suite/e2e.test.ts`) provides comprehensive testing of the VS Code extension with a **real MCP server**. Unlike the unit tests which use mocks, these tests actually:

- Start a real MCP process server
- Communicate via JSON-RPC over stdio
- Launch real system processes
- Test actual security boundaries
- Validate real resource limits
- Verify tree view content with live data

## Test Coverage

### 1. Real Process Lifecycle (3 tests)

- **Start and list a real process**: Launches `sleep`, verifies it appears in process list, terminates it
- **Capture process output**: Runs `echo`, verifies output is captured correctly
- **Enforce resource limits**: Starts process with custom CPU/memory limits, verifies they're applied

### 2. Security Boundary Enforcement (3 tests)

- **Block non-allowlisted executables**: Attempts to run `/bin/bash`, verifies it's blocked
- **Allow allowlisted executables**: Runs `echo`, verifies it's permitted
- **Get security configuration**: Retrieves and validates allowlist, blocklist settings

### 3. Process Statistics (2 tests)

- **Get real-time process statistics**: Monitors CPU%, memory usage of running process
- **Track process uptime**: Verifies uptime tracking accuracy

### 4. Tree View Content Validation (2 tests)

- **Populate process tree with real data**: Starts multiple processes, verifies they appear in VS Code tree view
- **Show security boundaries in tree**: Displays security config in tree view

### 5. Concurrent Operations (2 tests)

- **Handle multiple simultaneous process starts**: Launches 3 processes concurrently
- **Handle rapid list operations**: Performs 20 list operations in quick succession

### 6. Error Handling (3 tests)

- **Handle process that exits immediately**: Tests short-lived process behavior
- **Handle terminating non-existent process**: Verifies graceful error handling
- **Handle getting info for non-existent process**: Tests error messages

### 7. MCP Protocol Communication (2 tests)

- **Handle JSON-RPC requests correctly**: Validates request/response format
- **Handle server errors gracefully**: Tests error propagation

## Total: 17 E2E Tests

## Prerequisites

### 1. Install the MCP Server

The E2E tests require the MCP process server to be available. The tests will automatically find it in one of these locations:

**Option A: Install from npm (recommended)**

```bash
npm install -g @ai-capabilities-suite/mcp-process
# or locally in the extension directory
cd packages/vscode-mcp-acs-process
npm install @ai-capabilities-suite/mcp-process
```

**Option B: Use local build (for development)**

```bash
cd packages/mcp-process
yarn build
```

The tests check for the server in this order:

1. Local node_modules: `node_modules/@ai-capabilities-suite/mcp-process/dist/cli.js`
2. Monorepo location: `packages/mcp-process/dist/cli.js`
3. Global installation via `npx @ai-capabilities-suite/mcp-process`

### 2. Test Configuration

The tests create a temporary configuration file with:

- Allowed executables: `node`, `echo`, `sleep`, `cat`, `ls`
- Resource limits: 80% CPU, 512MB RAM
- Security: Block setuid, allow shell interpreters (for testing)
- Max concurrent processes: 5

## Running the Tests

### Run All Tests (including E2E)

```bash
cd packages/vscode-mcp-acs-process
yarn test
```

### Run Only E2E Tests

```bash
yarn test -- --grep "E2E Test Suite"
```

### Run Specific E2E Test Suite

```bash
# Real process lifecycle tests
yarn test -- --grep "Real Process Lifecycle"

# Security tests
yarn test -- --grep "Security Boundary Enforcement"

# Performance tests
yarn test -- --grep "Concurrent Operations"
```

## Test Architecture

### Setup Phase

1. Creates test configuration file
2. Locates MCP server CLI (`packages/mcp-process/dist/cli.js`)
3. Spawns MCP server process with stdio transport
4. Creates MCP client and connects
5. Waits for server initialization (2 seconds)

### Test Execution

- Each test uses the shared MCP client
- Tests launch real processes on the system
- Processes are tracked and cleaned up
- Tree views are updated with real data

### Teardown Phase

1. Disconnects MCP client
2. Terminates MCP server (SIGTERM, then SIGKILL if needed)
3. Removes test configuration file
4. Cleans up any remaining processes

## Key Differences from Unit Tests

| Aspect                 | Unit Tests       | E2E Tests                |
| ---------------------- | ---------------- | ------------------------ |
| MCP Server             | Mocked           | Real process             |
| Process Execution      | Simulated        | Actual system processes  |
| Security Enforcement   | Mocked responses | Real allowlist/blocklist |
| Resource Limits        | Not tested       | Actually enforced        |
| Tree View Content      | Mock data        | Live process data        |
| JSON-RPC Communication | Simulated        | Real stdio transport     |
| Test Speed             | Fast (~1-2s)     | Slower (~30-60s)         |
| System Impact          | None             | Spawns real processes    |

## Troubleshooting

### Tests Skip with "MCP server not built"

**Solution**: Build the MCP server first:

```bash
nx run mcp-process:build
```

### Tests Fail with "Server not running"

**Possible causes**:

1. MCP server crashed during startup
2. Configuration file is invalid
3. Port/stdio conflicts

**Solution**: Check the test output for server stderr messages

### Tests Timeout

**Possible causes**:

1. Process didn't terminate cleanly
2. Server is unresponsive
3. System is under heavy load

**Solution**: Increase test timeouts or reduce concurrent process count

### Permission Errors

**Possible causes**:

1. Executable not in PATH
2. Insufficient permissions
3. Security policy blocking execution

**Solution**: Verify executables are accessible and permissions are correct

## CI/CD Integration

The E2E tests are designed to run in CI environments:

```yaml
- name: Build MCP Server
  run: nx run mcp-process:build

- name: Run E2E Tests
  run: |
    cd packages/vscode-mcp-acs-process
    yarn test
```

**Note**: CI environments should have `node`, `echo`, `sleep`, `cat`, and `ls` available.

## Future Enhancements

Potential additions to the E2E test suite:

1. **Webview Content Testing**: Validate HTML/data in statistics webview
2. **Multi-user Scenarios**: Test concurrent users with separate security contexts
3. **Long-running Process Tests**: Monitor processes over extended periods
4. **Resource Exhaustion Tests**: Test behavior under resource pressure
5. **Network Process Tests**: Test processes that make network calls
6. **File I/O Tests**: Verify file descriptor limits and I/O tracking
7. **Signal Handling**: Test various termination signals (SIGTERM, SIGKILL, etc.)
8. **Audit Log Validation**: Verify audit log entries are created correctly

## Performance Benchmarks

Expected test execution times (on typical development machine):

- Setup/Teardown: ~3-4 seconds
- Process Lifecycle Tests: ~10-15 seconds
- Security Tests: ~5-8 seconds
- Statistics Tests: ~5-8 seconds
- Tree View Tests: ~8-12 seconds
- Concurrent Tests: ~10-15 seconds
- Error Handling Tests: ~5-8 seconds
- Protocol Tests: ~3-5 seconds

**Total E2E Suite**: ~50-75 seconds

## Conclusion

The E2E test suite provides confidence that the VS Code extension works correctly with a real MCP server, enforces security boundaries, and handles real-world scenarios. Combined with the unit tests, this provides comprehensive coverage of the extension's functionality.
