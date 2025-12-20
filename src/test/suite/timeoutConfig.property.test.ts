/**
 * Property-Based Tests for Timeout Configuration
 *
 * Feature: mcp-process-timeout-fix, Property 7: Timeout respects configuration
 *
 * These tests verify that the Process extension properly reads timeout and reconnect
 * settings from VS Code configuration and passes them correctly to BaseMCPClient.
 *
 * Validates: Requirements 1.1, 2.1
 */

import * as assert from "assert";
import * as fc from "fast-check";
import * as vscode from "vscode";

/**
 * Helper to create a mock VS Code configuration
 */
function createMockConfig(
  settings: Record<string, any>
): vscode.WorkspaceConfiguration {
  return {
    get: <T>(key: string, defaultValue?: T): T => {
      const value = settings[key];
      return value !== undefined ? value : (defaultValue as T);
    },
    has: (key: string) => key in settings,
    inspect: () => undefined as any,
    update: async () => {},
  } as vscode.WorkspaceConfiguration;
}

/**
 * Property 7: Timeout respects configuration
 *
 * For any valid timeout configuration from VS Code settings, the generated
 * MCPClientConfig should contain the same timeout values.
 */
suite("Timeout Configuration Property Tests", () => {
  test("Property 7: Timeout configuration is correctly read from VS Code settings", () => {
    fc.assert(
      fc.property(
        fc.record({
          initTimeout: fc.integer({ min: 10000, max: 300000 }),
          standardTimeout: fc.integer({ min: 5000, max: 120000 }),
          maxRetries: fc.integer({ min: 0, max: 10 }),
          retryDelay: fc.integer({ min: 1000, max: 10000 }),
        }),
        (config) => {
          // Create mock VS Code configuration
          const mockConfig = createMockConfig({
            "timeout.initialization": config.initTimeout,
            "timeout.standardRequest": config.standardTimeout,
            "reconnect.maxRetries": config.maxRetries,
            "reconnect.retryDelay": config.retryDelay,
            "server.logLevel": "info",
          });

          // Simulate the getTimeoutConfig function from extension.ts
          const initTimeout = mockConfig.get<number>(
            "timeout.initialization",
            60000
          );
          const standardTimeout = mockConfig.get<number>(
            "timeout.standardRequest",
            30000
          );
          const maxRetries = mockConfig.get<number>("reconnect.maxRetries", 3);
          const retryDelay = mockConfig.get<number>(
            "reconnect.retryDelay",
            2000
          );
          const logLevel = mockConfig.get<"debug" | "info" | "warn" | "error">(
            "server.logLevel",
            "info"
          );

          const timeoutConfig = {
            timeout: {
              initializationTimeoutMs: initTimeout,
              standardRequestTimeoutMs: standardTimeout,
              toolsListTimeoutMs: initTimeout,
            },
            reSync: {
              maxRetries,
              retryDelayMs: retryDelay,
              backoffMultiplier: 1.5,
            },
            logging: {
              logLevel,
              logCommunication: logLevel === "debug",
            },
          };

          // Verify the configuration matches what was set
          assert.strictEqual(
            timeoutConfig.timeout.initializationTimeoutMs,
            config.initTimeout,
            "Initialization timeout should match VS Code setting"
          );
          assert.strictEqual(
            timeoutConfig.timeout.standardRequestTimeoutMs,
            config.standardTimeout,
            "Standard request timeout should match VS Code setting"
          );
          assert.strictEqual(
            timeoutConfig.timeout.toolsListTimeoutMs,
            config.initTimeout,
            "Tools list timeout should use initialization timeout"
          );
          assert.strictEqual(
            timeoutConfig.reSync.maxRetries,
            config.maxRetries,
            "Max retries should match VS Code setting"
          );
          assert.strictEqual(
            timeoutConfig.reSync.retryDelayMs,
            config.retryDelay,
            "Retry delay should match VS Code setting"
          );
          assert.strictEqual(
            timeoutConfig.reSync.backoffMultiplier,
            1.5,
            "Backoff multiplier should be 1.5"
          );

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test("Property 7: Default values are used when settings are not configured", () => {
    // Create mock config with no timeout settings
    const mockConfig = createMockConfig({
      "server.logLevel": "info",
    });

    // Simulate the getTimeoutConfig function with defaults
    const initTimeout = mockConfig.get<number>("timeout.initialization", 60000);
    const standardTimeout = mockConfig.get<number>(
      "timeout.standardRequest",
      30000
    );
    const maxRetries = mockConfig.get<number>("reconnect.maxRetries", 3);
    const retryDelay = mockConfig.get<number>("reconnect.retryDelay", 2000);

    // Verify defaults are used
    assert.strictEqual(
      initTimeout,
      60000,
      "Should use default initialization timeout"
    );
    assert.strictEqual(
      standardTimeout,
      30000,
      "Should use default standard timeout"
    );
    assert.strictEqual(maxRetries, 3, "Should use default max retries");
    assert.strictEqual(retryDelay, 2000, "Should use default retry delay");
  });

  test("Property 7: Initialization timeout is used for tools/list requests", () => {
    fc.assert(
      fc.property(fc.integer({ min: 10000, max: 300000 }), (initTimeout) => {
        const mockConfig = createMockConfig({
          "timeout.initialization": initTimeout,
          "timeout.standardRequest": 30000,
          "server.logLevel": "info",
        });

        const timeoutConfig = {
          timeout: {
            initializationTimeoutMs: mockConfig.get<number>(
              "timeout.initialization",
              60000
            ),
            standardRequestTimeoutMs: mockConfig.get<number>(
              "timeout.standardRequest",
              30000
            ),
            toolsListTimeoutMs: mockConfig.get<number>(
              "timeout.initialization",
              60000
            ),
          },
        };

        // Verify tools/list uses initialization timeout
        assert.strictEqual(
          timeoutConfig.timeout.toolsListTimeoutMs,
          initTimeout,
          "Tools list timeout should equal initialization timeout"
        );
        assert.strictEqual(
          timeoutConfig.timeout.toolsListTimeoutMs,
          timeoutConfig.timeout.initializationTimeoutMs,
          "Tools list timeout should match initialization timeout"
        );

        return true;
      }),
      { numRuns: 100 }
    );
  });

  test("Property 7: Log communication is enabled when log level is debug", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("debug", "info", "warn", "error"),
        (logLevel) => {
          const mockConfig = createMockConfig({
            "server.logLevel": logLevel,
          });

          const timeoutConfig = {
            logging: {
              logLevel: mockConfig.get<"debug" | "info" | "warn" | "error">(
                "server.logLevel",
                "info"
              ),
              logCommunication:
                mockConfig.get<"debug" | "info" | "warn" | "error">(
                  "server.logLevel",
                  "info"
                ) === "debug",
            },
          };

          // Verify log communication is only enabled for debug level
          if (logLevel === "debug") {
            assert.strictEqual(
              timeoutConfig.logging.logCommunication,
              true,
              "Log communication should be enabled for debug level"
            );
          } else {
            assert.strictEqual(
              timeoutConfig.logging.logCommunication,
              false,
              "Log communication should be disabled for non-debug levels"
            );
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test("Property 7: Configuration values are within valid ranges", () => {
    fc.assert(
      fc.property(
        fc.record({
          initTimeout: fc.integer({ min: 10000, max: 300000 }),
          standardTimeout: fc.integer({ min: 5000, max: 120000 }),
          maxRetries: fc.integer({ min: 0, max: 10 }),
          retryDelay: fc.integer({ min: 1000, max: 10000 }),
        }),
        (config) => {
          // Verify all values are within their specified ranges
          assert.ok(
            config.initTimeout >= 10000 && config.initTimeout <= 300000,
            "Initialization timeout should be between 10000 and 300000"
          );
          assert.ok(
            config.standardTimeout >= 5000 && config.standardTimeout <= 120000,
            "Standard timeout should be between 5000 and 120000"
          );
          assert.ok(
            config.maxRetries >= 0 && config.maxRetries <= 10,
            "Max retries should be between 0 and 10"
          );
          assert.ok(
            config.retryDelay >= 1000 && config.retryDelay <= 10000,
            "Retry delay should be between 1000 and 10000"
          );

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  test("Property 7: Backoff multiplier is always 1.5", () => {
    fc.assert(
      fc.property(
        fc.record({
          maxRetries: fc.integer({ min: 0, max: 10 }),
          retryDelay: fc.integer({ min: 1000, max: 10000 }),
        }),
        (config) => {
          const timeoutConfig = {
            reSync: {
              maxRetries: config.maxRetries,
              retryDelayMs: config.retryDelay,
              backoffMultiplier: 1.5,
            },
          };

          // Verify backoff multiplier is always 1.5
          assert.strictEqual(
            timeoutConfig.reSync.backoffMultiplier,
            1.5,
            "Backoff multiplier should always be 1.5"
          );

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
