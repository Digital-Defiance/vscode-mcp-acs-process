# Testing Guide

This document describes the testing strategy and how to run tests for the MCP Process Manager VS Code extension.

## Test Structure

```
src/test/
├── runTest.ts                    # Test runner entry point
└── suite/
    ├── index.ts                  # Test suite index
    ├── extension.test.ts         # Extension lifecycle tests
    ├── mcpClient.test.ts         # MCP client tests
    ├── processTreeProvider.test.ts  # Process tree view tests
    ├── securityTreeProvider.test.ts # Security tree view tests
    └── integration.test.ts       # Integration tests
```

## Test Categories

### 1. Extension Tests (`extension.test.ts`)

Tests for extension lifecycle and core functionality:

- **Extension Presence**: Verifies extension is installed
- **Extension Activation**: Tests activation process
- **Command Registration**: Verifies all commands are registered
- **Configuration**: Tests all configuration settings
- **Views**: Tests tree view registration
- **Command Execution**: Tests command execution
- **Lifecycle**: Tests activation/deactivation
- **Error Handling**: Tests error scenarios
- **Output Channel**: Tests logging

**Coverage**: ~80 tests

### 2. MCP Client Tests (`mcpClient.test.ts`)

Tests for MCP server communication:

- **Client Instantiation**: Tests client creation
- **Method Availability**: Verifies all methods exist
- **Error Handling**: Tests error scenarios
- **Configuration**: Tests configuration reading
- **Server Communication**: Tests JSON-RPC protocol
- **Request/Response**: Tests message handling

**Coverage**: ~25 tests

### 3. Process Tree Provider Tests (`processTreeProvider.test.ts`)

Tests for process tree view:

- **Provider Creation**: Tests provider instantiation
- **Tree Data Provider Interface**: Tests interface implementation
- **Process Display**: Tests process item creation
- **State Icons**: Tests icon selection
- **Tooltips**: Tests tooltip generation
- **Refresh**: Tests tree refresh
- **Mock Client**: Tests with mock data
- **Error Handling**: Tests error scenarios

**Coverage**: ~35 tests

### 4. Security Tree Provider Tests (`securityTreeProvider.test.ts`)

Tests for security tree view:

- **Provider Creation**: Tests provider instantiation
- **Tree Structure**: Tests hierarchical structure
- **Security Items**: Tests security item creation
- **Icons**: Tests icon selection
- **Configuration Display**: Tests config visualization
- **Allowlist**: Tests executable allowlist display
- **Resource Limits**: Tests limit display
- **Security Features**: Tests feature display

**Coverage**: ~40 tests

### 5. Integration Tests (`integration.test.ts`)

End-to-end tests:

- **Full Workflow**: Tests complete process lifecycle
- **Configuration Changes**: Tests dynamic configuration
- **View Visibility**: Tests view rendering
- **Configuration Files**: Tests file handling
- **Tree View Integration**: Tests tree view functionality
- **Webview Integration**: Tests webview creation
- **Error Recovery**: Tests error handling
- **Performance**: Tests activation and refresh speed
- **Memory Management**: Tests memory usage

**Coverage**: ~25 tests

## Running Tests

### Prerequisites

1. Install dependencies:

   ```bash
   npm install
   ```

2. Compile TypeScript:
   ```bash
   npm run compile
   ```

### Run All Tests

```bash
npm test
```

This will:

1. Compile TypeScript
2. Download VS Code test instance
3. Run all test suites
4. Display results

### Run Specific Test Suite

```bash
npm test -- --grep "Extension Test Suite"
npm test -- --grep "MCP Client Test Suite"
npm test -- --grep "Process Tree Provider"
npm test -- --grep "Security Tree Provider"
npm test -- --grep "Integration Test Suite"
```

### Run in Watch Mode

```bash
npm run watch
```

Then in another terminal:

```bash
npm test
```

### Run with Coverage

```bash
npm run test:coverage
```

## Test Configuration

### VS Code Test Settings

Tests run in a headless VS Code instance with:

- No extensions (except the one being tested)
- Clean workspace
- Default settings

### Test Timeouts

- Default: 2000ms
- Integration tests: 5000-10000ms
- Performance tests: 5000ms

### Test Environment

Tests use:

- Mocha test framework
- VS Code Test Electron
- Node.js assert library

## Writing Tests

### Test Structure

```typescript
import * as assert from "assert";
import * as vscode from "vscode";

suite("My Test Suite", () => {
  setup(() => {
    // Run before each test
  });

  teardown(() => {
    // Run after each test
  });

  test("My test", () => {
    assert.ok(true);
  });

  suite("Nested Suite", () => {
    test("Nested test", () => {
      assert.strictEqual(1 + 1, 2);
    });
  });
});
```

### Async Tests

```typescript
test("Async test", async () => {
  const result = await someAsyncFunction();
  assert.ok(result);
});
```

### Test Timeouts

```typescript
test("Long running test", async function () {
  this.timeout(5000); // 5 seconds
  await longRunningOperation();
});
```

### Skipping Tests

```typescript
test.skip("Skipped test", () => {
  // This test will be skipped
});

test("Conditional skip", function () {
  if (condition) {
    this.skip();
  }
  // Test code
});
```

### Assertions

```typescript
// Basic assertions
assert.ok(value);
assert.strictEqual(actual, expected);
assert.deepStrictEqual(actual, expected);
assert.notStrictEqual(actual, expected);

// Async assertions
await assert.rejects(async () => {
  await functionThatShouldThrow();
});

await assert.doesNotReject(async () => {
  await functionThatShouldNotThrow();
});

// Throws assertions
assert.throws(() => {
  functionThatShouldThrow();
});

assert.doesNotThrow(() => {
  functionThatShouldNotThrow();
});
```

## Test Best Practices

### 1. Test Isolation

Each test should be independent:

```typescript
setup(() => {
  // Create fresh state
});

teardown(() => {
  // Clean up
});
```

### 2. Descriptive Names

Use clear, descriptive test names:

```typescript
// Good
test("Should create process item with running state");

// Bad
test("Test 1");
```

### 3. Single Responsibility

Each test should test one thing:

```typescript
// Good
test("Should have correct label", () => {
  assert.strictEqual(item.label, "Expected Label");
});

test("Should have correct icon", () => {
  assert.ok(item.iconPath);
});

// Bad
test("Should have correct properties", () => {
  assert.strictEqual(item.label, "Expected Label");
  assert.ok(item.iconPath);
  assert.ok(item.tooltip);
});
```

### 4. Mock External Dependencies

```typescript
const mockClient = {
  listProcesses: async () => [{ pid: 1234, command: "node", state: "running" }],
};

provider.setMCPClient(mockClient as MCPProcessClient);
```

### 5. Test Error Cases

```typescript
test("Should handle errors gracefully", async () => {
  const errorClient = {
    listProcesses: async () => {
      throw new Error("Connection failed");
    },
  };

  provider.setMCPClient(errorClient as MCPProcessClient);
  await provider.refresh();

  // Should not crash
  const children = await provider.getChildren();
  assert.strictEqual(children.length, 0);
});
```

### 6. Use Appropriate Assertions

```typescript
// For exact equality
assert.strictEqual(actual, expected);

// For object comparison
assert.deepStrictEqual(actual, expected);

// For truthiness
assert.ok(value);

// For type checking
assert.strictEqual(typeof value, "string");
```

## Debugging Tests

### VS Code Debugger

1. Open test file
2. Set breakpoints
3. Press F5
4. Select "Extension Tests" configuration
5. Tests will run with debugger attached

### Console Logging

```typescript
test("Debug test", () => {
  console.log("Debug info:", value);
  assert.ok(value);
});
```

### Test Output

Check test output in terminal:

```
Extension Test Suite
  ✓ Extension should be present
  ✓ Extension should activate
  ✓ Commands should be registered
  Configuration
    ✓ Should have mcp-process configuration section
    ✓ Should have serverPath setting
```

## Continuous Integration

### GitHub Actions

Tests run automatically on:

- Push to main branch
- Pull requests
- Release creation

### CI Configuration

```yaml
- name: Run tests
  run: |
    npm install
    npm run compile
    npm test
```

## Test Coverage

### Current Coverage

- Extension: ~90%
- MCP Client: ~70%
- Process Tree Provider: ~85%
- Security Tree Provider: ~85%
- Integration: ~60%

### Coverage Goals

- Overall: >80%
- Critical paths: >90%
- Error handling: >80%

### Viewing Coverage

```bash
npm run test:coverage
open coverage/index.html
```

## Common Issues

### Issue: Tests Timeout

**Solution**: Increase timeout

```typescript
test("Long test", async function () {
  this.timeout(10000);
  // Test code
});
```

### Issue: Extension Not Found

**Solution**: Check extension ID matches package.json

```typescript
vscode.extensions.getExtension("DigitalDefiance.mcp-process-manager");
```

### Issue: Configuration Not Found

**Solution**: Use correct configuration key

```typescript
vscode.workspace.getConfiguration("mcp-process");
```

### Issue: Async Test Fails

**Solution**: Use async/await properly

```typescript
test("Async test", async () => {
  await asyncFunction();
  assert.ok(true);
});
```

### Issue: Mock Not Working

**Solution**: Ensure mock implements required interface

```typescript
const mockClient: Partial<MCPProcessClient> = {
  listProcesses: async () => [],
};
```

## Test Maintenance

### Adding New Tests

1. Create test file in `src/test/suite/`
2. Import required modules
3. Write test suite
4. Run tests to verify
5. Update this documentation

### Updating Tests

1. Identify failing tests
2. Update test expectations
3. Verify all tests pass
4. Update documentation if needed

### Removing Tests

1. Remove test file or test case
2. Verify remaining tests pass
3. Update documentation

## Resources

- [VS Code Testing API](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Mocha Documentation](https://mochajs.org/)
- [Node.js Assert](https://nodejs.org/api/assert.html)
- [VS Code Extension Samples](https://github.com/microsoft/vscode-extension-samples)

## Summary

The test suite provides comprehensive coverage of:

- ✅ Extension lifecycle
- ✅ Command registration and execution
- ✅ Configuration management
- ✅ Tree view functionality
- ✅ MCP client communication
- ✅ Error handling
- ✅ Integration scenarios
- ✅ Performance characteristics

Total tests: **~205 tests** across 5 test suites.
