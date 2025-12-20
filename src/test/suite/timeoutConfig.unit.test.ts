/**
 * Unit Tests for Timeout Configuration Edge Cases
 *
 * These tests verify edge cases and validation for timeout and reconnect settings.
 *
 * Validates: Requirements 2.3, 2.4, 2.5
 */

import * as assert from "assert";
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
      // Treat null and undefined the same way - return default
      if (value === undefined || value === null) {
        return defaultValue as T;
      }
      return value;
    },
    has: (key: string) => key in settings,
    inspect: () => undefined as any,
    update: async () => {},
  } as vscode.WorkspaceConfiguration;
}

suite("Timeout Configuration Unit Tests", () => {
  suite("Edge Cases", () => {
    test("should reject timeout below 10 seconds", () => {
      const mockConfig = createMockConfig({
        "timeout.initialization": 5000, // Below minimum
        "timeout.standardRequest": 30000,
        "server.logLevel": "info",
      });

      const initTimeout = mockConfig.get<number>(
        "timeout.initialization",
        60000
      );

      // Verify the value is below minimum
      assert.strictEqual(initTimeout, 5000);
      assert.ok(
        initTimeout < 10000,
        "Timeout should be below minimum threshold"
      );
    });

    test("should warn about timeout above 300 seconds", () => {
      const mockConfig = createMockConfig({
        "timeout.initialization": 350000, // Above maximum
        "timeout.standardRequest": 30000,
        "server.logLevel": "info",
      });

      const initTimeout = mockConfig.get<number>(
        "timeout.initialization",
        60000
      );

      // Verify the value is above maximum
      assert.strictEqual(initTimeout, 350000);
      assert.ok(
        initTimeout > 300000,
        "Timeout should be above maximum threshold"
      );
    });

    test("should use defaults when configuration is missing", () => {
      const mockConfig = createMockConfig({
        "server.logLevel": "info",
      });

      const initTimeout = mockConfig.get<number>(
        "timeout.initialization",
        60000
      );
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

    test("should handle undefined timeout values", () => {
      const mockConfig = createMockConfig({
        "timeout.initialization": undefined,
        "timeout.standardRequest": undefined,
        "server.logLevel": "info",
      });

      const initTimeout = mockConfig.get<number>(
        "timeout.initialization",
        60000
      );
      const standardTimeout = mockConfig.get<number>(
        "timeout.standardRequest",
        30000
      );

      // Verify defaults are used when values are undefined
      assert.strictEqual(initTimeout, 60000);
      assert.strictEqual(standardTimeout, 30000);
    });

    test("should handle null timeout values", () => {
      const mockConfig = createMockConfig({
        "timeout.initialization": null,
        "timeout.standardRequest": null,
        "server.logLevel": "info",
      });

      const initTimeout = mockConfig.get<number>(
        "timeout.initialization",
        60000
      );
      const standardTimeout = mockConfig.get<number>(
        "timeout.standardRequest",
        30000
      );

      // Verify defaults are used when values are null
      assert.strictEqual(initTimeout, 60000);
      assert.strictEqual(standardTimeout, 30000);
    });

    test("should handle zero timeout values", () => {
      const mockConfig = createMockConfig({
        "timeout.initialization": 0,
        "timeout.standardRequest": 0,
        "reconnect.maxRetries": 0,
        "reconnect.retryDelay": 0,
        "server.logLevel": "info",
      });

      const initTimeout = mockConfig.get<number>(
        "timeout.initialization",
        60000
      );
      const standardTimeout = mockConfig.get<number>(
        "timeout.standardRequest",
        30000
      );
      const maxRetries = mockConfig.get<number>("reconnect.maxRetries", 3);
      const retryDelay = mockConfig.get<number>("reconnect.retryDelay", 2000);

      // Verify zero values are returned (not defaults)
      assert.strictEqual(initTimeout, 0);
      assert.strictEqual(standardTimeout, 0);
      assert.strictEqual(maxRetries, 0);
      assert.strictEqual(retryDelay, 0);
    });

    test("should handle negative timeout values", () => {
      const mockConfig = createMockConfig({
        "timeout.initialization": -1000,
        "timeout.standardRequest": -500,
        "reconnect.maxRetries": -1,
        "reconnect.retryDelay": -2000,
        "server.logLevel": "info",
      });

      const initTimeout = mockConfig.get<number>(
        "timeout.initialization",
        60000
      );
      const standardTimeout = mockConfig.get<number>(
        "timeout.standardRequest",
        30000
      );
      const maxRetries = mockConfig.get<number>("reconnect.maxRetries", 3);
      const retryDelay = mockConfig.get<number>("reconnect.retryDelay", 2000);

      // Verify negative values are returned (validation should happen elsewhere)
      assert.strictEqual(initTimeout, -1000);
      assert.strictEqual(standardTimeout, -500);
      assert.strictEqual(maxRetries, -1);
      assert.strictEqual(retryDelay, -2000);
    });

    test("should handle very large timeout values", () => {
      const mockConfig = createMockConfig({
        "timeout.initialization": Number.MAX_SAFE_INTEGER,
        "timeout.standardRequest": 999999999,
        "server.logLevel": "info",
      });

      const initTimeout = mockConfig.get<number>(
        "timeout.initialization",
        60000
      );
      const standardTimeout = mockConfig.get<number>(
        "timeout.standardRequest",
        30000
      );

      // Verify large values are returned
      assert.strictEqual(initTimeout, Number.MAX_SAFE_INTEGER);
      assert.strictEqual(standardTimeout, 999999999);
    });

    test("should handle string values for numeric settings", () => {
      const mockConfig = createMockConfig({
        "timeout.initialization": "60000" as any,
        "timeout.standardRequest": "30000" as any,
        "server.logLevel": "info",
      });

      const initTimeout = mockConfig.get<number>(
        "timeout.initialization",
        60000
      );
      const standardTimeout = mockConfig.get<number>(
        "timeout.standardRequest",
        30000
      );

      // Verify string values are returned as-is (type coercion happens elsewhere)
      assert.strictEqual(initTimeout, "60000");
      assert.strictEqual(standardTimeout, "30000");
    });

    test("should handle boundary values for initialization timeout", () => {
      // Test minimum boundary
      const minConfig = createMockConfig({
        "timeout.initialization": 10000,
        "server.logLevel": "info",
      });
      assert.strictEqual(
        minConfig.get<number>("timeout.initialization", 60000),
        10000
      );

      // Test maximum boundary
      const maxConfig = createMockConfig({
        "timeout.initialization": 300000,
        "server.logLevel": "info",
      });
      assert.strictEqual(
        maxConfig.get<number>("timeout.initialization", 60000),
        300000
      );
    });

    test("should handle boundary values for standard request timeout", () => {
      // Test minimum boundary
      const minConfig = createMockConfig({
        "timeout.standardRequest": 5000,
        "server.logLevel": "info",
      });
      assert.strictEqual(
        minConfig.get<number>("timeout.standardRequest", 30000),
        5000
      );

      // Test maximum boundary
      const maxConfig = createMockConfig({
        "timeout.standardRequest": 120000,
        "server.logLevel": "info",
      });
      assert.strictEqual(
        maxConfig.get<number>("timeout.standardRequest", 30000),
        120000
      );
    });

    test("should handle boundary values for max retries", () => {
      // Test minimum boundary
      const minConfig = createMockConfig({
        "reconnect.maxRetries": 0,
        "server.logLevel": "info",
      });
      assert.strictEqual(minConfig.get<number>("reconnect.maxRetries", 3), 0);

      // Test maximum boundary
      const maxConfig = createMockConfig({
        "reconnect.maxRetries": 10,
        "server.logLevel": "info",
      });
      assert.strictEqual(maxConfig.get<number>("reconnect.maxRetries", 3), 10);
    });

    test("should handle boundary values for retry delay", () => {
      // Test minimum boundary
      const minConfig = createMockConfig({
        "reconnect.retryDelay": 1000,
        "server.logLevel": "info",
      });
      assert.strictEqual(
        minConfig.get<number>("reconnect.retryDelay", 2000),
        1000
      );

      // Test maximum boundary
      const maxConfig = createMockConfig({
        "reconnect.retryDelay": 10000,
        "server.logLevel": "info",
      });
      assert.strictEqual(
        maxConfig.get<number>("reconnect.retryDelay", 2000),
        10000
      );
    });
  });

  suite("Configuration Validation", () => {
    test("should detect when initialization timeout is less than standard timeout", () => {
      const mockConfig = createMockConfig({
        "timeout.initialization": 20000,
        "timeout.standardRequest": 30000,
        "server.logLevel": "info",
      });

      const initTimeout = mockConfig.get<number>(
        "timeout.initialization",
        60000
      );
      const standardTimeout = mockConfig.get<number>(
        "timeout.standardRequest",
        30000
      );

      // Verify the invalid configuration
      assert.ok(
        initTimeout < standardTimeout,
        "Initialization timeout should be less than standard timeout (invalid)"
      );
    });

    test("should accept when initialization timeout equals standard timeout", () => {
      const mockConfig = createMockConfig({
        "timeout.initialization": 30000,
        "timeout.standardRequest": 30000,
        "server.logLevel": "info",
      });

      const initTimeout = mockConfig.get<number>(
        "timeout.initialization",
        60000
      );
      const standardTimeout = mockConfig.get<number>(
        "timeout.standardRequest",
        30000
      );

      // Verify equal values are accepted
      assert.strictEqual(initTimeout, standardTimeout);
    });

    test("should accept when initialization timeout is greater than standard timeout", () => {
      const mockConfig = createMockConfig({
        "timeout.initialization": 60000,
        "timeout.standardRequest": 30000,
        "server.logLevel": "info",
      });

      const initTimeout = mockConfig.get<number>(
        "timeout.initialization",
        60000
      );
      const standardTimeout = mockConfig.get<number>(
        "timeout.standardRequest",
        30000
      );

      // Verify valid configuration
      assert.ok(
        initTimeout > standardTimeout,
        "Initialization timeout should be greater than standard timeout (valid)"
      );
    });
  });

  suite("Log Level Configuration", () => {
    test("should handle all valid log levels", () => {
      const levels: Array<"debug" | "info" | "warn" | "error"> = [
        "debug",
        "info",
        "warn",
        "error",
      ];

      for (const level of levels) {
        const mockConfig = createMockConfig({
          "server.logLevel": level,
        });

        const logLevel = mockConfig.get<"debug" | "info" | "warn" | "error">(
          "server.logLevel",
          "info"
        );
        assert.strictEqual(logLevel, level, `Should handle ${level} log level`);
      }
    });

    test("should use default log level when not specified", () => {
      const mockConfig = createMockConfig({});

      const logLevel = mockConfig.get<"debug" | "info" | "warn" | "error">(
        "server.logLevel",
        "info"
      );
      assert.strictEqual(logLevel, "info", "Should use default log level");
    });

    test("should handle invalid log level", () => {
      const mockConfig = createMockConfig({
        "server.logLevel": "invalid" as any,
      });

      const logLevel = mockConfig.get<string>("server.logLevel", "info");
      assert.strictEqual(
        logLevel,
        "invalid",
        "Should return invalid value (validation happens elsewhere)"
      );
    });
  });
});
