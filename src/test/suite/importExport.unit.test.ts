/**
 * Unit Tests for Import/Export Functionality
 *
 * These tests verify configuration export and import operations.
 */

import * as assert from "assert";
import { SettingsManager } from "../../settingsManager";

suite("Import/Export Unit Tests", () => {
  /**
   * Test export includes all settings
   */
  suite("Export Functionality", () => {
    test("should export configuration as JSON string", async () => {
      const manager = new SettingsManager();
      try {
        const exported = await manager.exportConfiguration();

        assert.ok(exported);
        assert.strictEqual(typeof exported, "string");
        assert.ok(exported.length > 0);

        // Should be valid JSON
        const parsed = JSON.parse(exported);
        assert.ok(parsed);
      } finally {
        manager.dispose();
      }
    });

    test("should include metadata in export", async () => {
      const manager = new SettingsManager();
      try {
        const exported = await manager.exportConfiguration();
        const parsed = JSON.parse(exported);

        // Check metadata fields
        assert.ok(parsed.version, "Should include version");
        assert.ok(parsed.timestamp, "Should include timestamp");
        assert.ok(parsed.exportedBy, "Should include exportedBy");
      } finally {
        manager.dispose();
      }
    });

    test("should include platform metadata in export", async () => {
      const manager = new SettingsManager();
      try {
        const exported = await manager.exportConfiguration();
        const parsed = JSON.parse(exported);

        // Check platform metadata
        assert.ok(parsed.platform, "Should include platform");
        assert.ok(parsed.platformName, "Should include platformName");
        assert.ok(parsed.architecture, "Should include architecture");
        assert.ok(parsed.nodeVersion, "Should include nodeVersion");
      } finally {
        manager.dispose();
      }
    });

    test("should include platform capabilities in export", async () => {
      const manager = new SettingsManager();
      try {
        const exported = await manager.exportConfiguration();
        const parsed = JSON.parse(exported);

        // Check platform capabilities
        assert.ok(
          parsed.platformCapabilities,
          "Should include platformCapabilities"
        );
        assert.strictEqual(
          typeof parsed.platformCapabilities.supportsChroot,
          "boolean"
        );
        assert.strictEqual(
          typeof parsed.platformCapabilities.supportsNamespaces,
          "boolean"
        );
      } finally {
        manager.dispose();
      }
    });

    test("should include server settings in export", async () => {
      const manager = new SettingsManager();
      try {
        const exported = await manager.exportConfiguration();
        const parsed = JSON.parse(exported);

        // Check server settings
        assert.ok(parsed.server, "Should include server settings");
        assert.ok(
          parsed.server.serverPath !== undefined,
          "Should include serverPath"
        );
        assert.ok(
          parsed.server.autoStart !== undefined,
          "Should include autoStart"
        );
        assert.ok(
          parsed.server.logLevel !== undefined,
          "Should include logLevel"
        );
      } finally {
        manager.dispose();
      }
    });

    test("should include UI settings in export", async () => {
      const manager = new SettingsManager();
      try {
        const exported = await manager.exportConfiguration();
        const parsed = JSON.parse(exported);

        // Check UI settings
        assert.ok(parsed.ui, "Should include UI settings");
        assert.ok(
          parsed.ui.refreshInterval !== undefined,
          "Should include refreshInterval"
        );
        assert.ok(
          parsed.ui.showResourceUsage !== undefined,
          "Should include showResourceUsage"
        );
      } finally {
        manager.dispose();
      }
    });

    test("should include security configuration in export", async () => {
      const manager = new SettingsManager();
      try {
        const exported = await manager.exportConfiguration();
        const parsed = JSON.parse(exported);

        // Check security configuration
        assert.ok(parsed.security, "Should include security configuration");
        assert.ok(
          parsed.security.allowedExecutables !== undefined,
          "Should include allowedExecutables"
        );
        assert.ok(
          parsed.security.blockSetuidExecutables !== undefined,
          "Should include blockSetuidExecutables"
        );
        assert.ok(
          parsed.security.defaultResourceLimits !== undefined,
          "Should include defaultResourceLimits"
        );
        assert.ok(
          parsed.security.maxConcurrentProcesses !== undefined,
          "Should include maxConcurrentProcesses"
        );
      } finally {
        manager.dispose();
      }
    });

    test("should export well-formed JSON", async () => {
      const manager = new SettingsManager();
      try {
        const exported = await manager.exportConfiguration();

        // Should be parseable
        const parsed = JSON.parse(exported);

        // Should be re-serializable
        const reserialized = JSON.stringify(parsed);
        assert.ok(reserialized);

        // Should parse to same structure
        const reparsed = JSON.parse(reserialized);
        assert.deepStrictEqual(parsed, reparsed);
      } finally {
        manager.dispose();
      }
    });

    test("should export with pretty formatting", async () => {
      const manager = new SettingsManager();
      try {
        const exported = await manager.exportConfiguration();

        // Should have newlines (pretty formatted)
        assert.ok(exported.includes("\n"));

        // Should have indentation
        assert.ok(exported.includes("  "));
      } finally {
        manager.dispose();
      }
    });
  });

  /**
   * Test import validates settings
   */
  suite("Import Validation", () => {
    test("should reject invalid JSON", async () => {
      const manager = new SettingsManager();
      try {
        const invalidJson = "{ invalid json }";

        await assert.rejects(
          async () => {
            await manager.importConfiguration(invalidJson, true);
          },
          /Invalid JSON/,
          "Should reject invalid JSON"
        );
      } finally {
        manager.dispose();
      }
    });

    test("should reject non-object JSON", async () => {
      const manager = new SettingsManager();
      try {
        const invalidJson = JSON.stringify("not an object");

        await assert.rejects(
          async () => {
            await manager.importConfiguration(invalidJson, true);
          },
          /Invalid configuration/,
          "Should reject non-object JSON"
        );
      } finally {
        manager.dispose();
      }
    });

    test("should reject configuration without security section", async () => {
      const manager = new SettingsManager();
      try {
        const invalidConfig = JSON.stringify({
          version: "1.0.0",
          timestamp: new Date().toISOString(),
          // Missing security section
        });

        await assert.rejects(
          async () => {
            await manager.importConfiguration(invalidConfig, true);
          },
          /missing 'security' section/,
          "Should reject configuration without security section"
        );
      } finally {
        manager.dispose();
      }
    });

    test("should validate security configuration on import", async () => {
      const manager = new SettingsManager();
      try {
        const invalidConfig = JSON.stringify({
          version: "1.0.0",
          timestamp: new Date().toISOString(),
          security: {
            allowedExecutables: [],
            blockSetuidExecutables: true,
            blockShellInterpreters: false,
            maxConcurrentProcesses: -5, // Invalid
            maxProcessLifetime: 3600,
            allowProcessTermination: true,
            allowGroupTermination: true,
            allowForcedTermination: false,
            allowStdinInput: true,
            allowOutputCapture: true,
            enableAuditLog: true,
            requireConfirmation: false,
            defaultResourceLimits: {},
          },
        });

        await assert.rejects(
          async () => {
            await manager.importConfiguration(invalidConfig, true);
          },
          /validation failed/,
          "Should reject invalid security configuration"
        );
      } finally {
        manager.dispose();
      }
    });
  });

  /**
   * Test import handles invalid JSON
   */
  suite("Import Error Handling", () => {
    test("should provide helpful error message for invalid JSON", async () => {
      const manager = new SettingsManager();
      try {
        const invalidJson = "{ invalid: json, }";

        try {
          await manager.importConfiguration(invalidJson, true);
          assert.fail("Should have thrown error");
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.ok(error.message.includes("Invalid JSON"));
        }
      } finally {
        manager.dispose();
      }
    });

    test("should provide helpful error message for validation failures", async () => {
      const manager = new SettingsManager();
      try {
        const invalidConfig = JSON.stringify({
          version: "1.0.0",
          timestamp: new Date().toISOString(),
          security: {
            allowedExecutables: "not-an-array", // Invalid type
            blockSetuidExecutables: true,
            blockShellInterpreters: false,
            maxConcurrentProcesses: 10,
            maxProcessLifetime: 3600,
            allowProcessTermination: true,
            allowGroupTermination: true,
            allowForcedTermination: false,
            allowStdinInput: true,
            allowOutputCapture: true,
            enableAuditLog: true,
            requireConfirmation: false,
            defaultResourceLimits: {},
          },
        });

        try {
          await manager.importConfiguration(invalidConfig, true);
          assert.fail("Should have thrown error");
        } catch (error) {
          assert.ok(error instanceof Error);
          assert.ok(error.message.includes("validation failed"));
          assert.ok(error.message.includes("allowedExecutables"));
        }
      } finally {
        manager.dispose();
      }
    });
  });

  /**
   * Test import handles platform differences
   */
  suite("Platform Compatibility", () => {
    test("should include platform information in export", async () => {
      const manager = new SettingsManager();
      try {
        const exported = await manager.exportConfiguration();
        const parsed = JSON.parse(exported);

        assert.ok(parsed.platform);
        assert.ok(parsed.platformName);
        assert.ok(parsed.platformCapabilities);
      } finally {
        manager.dispose();
      }
    });

    test("should handle import with platform metadata", async function () {
      this.timeout(10000); // Increase timeout for async operations
      const manager = new SettingsManager();
      try {
        // Export current configuration
        const exported = await manager.exportConfiguration();
        const parsed = JSON.parse(exported);

        // Modify platform to simulate cross-platform import
        parsed.platform = "different-platform";
        parsed.platformName = "Different Platform";

        const modified = JSON.stringify(parsed);

        // Import should handle platform differences
        // (with skipWarnings=true to avoid user prompts in tests)
        await manager.importConfiguration(modified, true);

        // Should complete without error
        assert.ok(true);
      } finally {
        manager.dispose();
      }
    });
  });

  /**
   * Test round-trip import/export
   */
  suite("Round-Trip Testing", () => {
    test("should preserve configuration through export/import cycle", async function () {
      this.timeout(10000); // Increase timeout for async operations
      const manager = new SettingsManager();
      try {
        // Export current configuration
        const exported = await manager.exportConfiguration();
        const originalParsed = JSON.parse(exported);

        // Import it back (with skipWarnings=true to avoid user prompts)
        await manager.importConfiguration(exported, true);

        // Export again
        const reexported = await manager.exportConfiguration();
        const reexportedParsed = JSON.parse(reexported);

        // Security configuration should be the same
        // (timestamps will differ, so we compare security config specifically)
        assert.deepStrictEqual(
          originalParsed.security.allowedExecutables,
          reexportedParsed.security.allowedExecutables
        );
        assert.deepStrictEqual(
          originalParsed.security.blockSetuidExecutables,
          reexportedParsed.security.blockSetuidExecutables
        );
        assert.deepStrictEqual(
          originalParsed.security.maxConcurrentProcesses,
          reexportedParsed.security.maxConcurrentProcesses
        );
      } finally {
        manager.dispose();
      }
    });

    test("should handle export/import of all setting types", async function () {
      this.timeout(10000); // Increase timeout for async operations
      const manager = new SettingsManager();
      try {
        // Export current configuration
        const exported = await manager.exportConfiguration();
        const parsed = JSON.parse(exported);

        // Verify all setting types are present
        assert.ok(Array.isArray(parsed.security.allowedExecutables)); // Array
        assert.strictEqual(
          typeof parsed.security.blockSetuidExecutables,
          "boolean"
        ); // Boolean
        assert.strictEqual(
          typeof parsed.security.maxConcurrentProcesses,
          "number"
        ); // Number
        assert.strictEqual(
          typeof parsed.security.defaultResourceLimits,
          "object"
        ); // Object

        // Import should handle all types
        await manager.importConfiguration(exported, true);

        assert.ok(true);
      } finally {
        manager.dispose();
      }
    });
  });

  /**
   * Test export format consistency
   */
  suite("Export Format", () => {
    test("should use consistent version format", async () => {
      const manager = new SettingsManager();
      try {
        const exported = await manager.exportConfiguration();
        const parsed = JSON.parse(exported);

        assert.ok(parsed.version);
        assert.ok(/^\d+\.\d+\.\d+$/.test(parsed.version)); // Semantic versioning
      } finally {
        manager.dispose();
      }
    });

    test("should use ISO 8601 timestamp format", async () => {
      const manager = new SettingsManager();
      try {
        const exported = await manager.exportConfiguration();
        const parsed = JSON.parse(exported);

        assert.ok(parsed.timestamp);
        // Should be parseable as Date
        const date = new Date(parsed.timestamp);
        assert.ok(!isNaN(date.getTime()));
      } finally {
        manager.dispose();
      }
    });

    test("should include exportedBy field", async () => {
      const manager = new SettingsManager();
      try {
        const exported = await manager.exportConfiguration();
        const parsed = JSON.parse(exported);

        assert.ok(parsed.exportedBy);
        assert.strictEqual(typeof parsed.exportedBy, "string");
        assert.ok(parsed.exportedBy.length > 0);
      } finally {
        manager.dispose();
      }
    });
  });

  /**
   * Test import applies settings correctly
   */
  suite("Import Application", () => {
    test("should apply server settings from import", async function () {
      this.timeout(15000); // Increase timeout for multiple async operations
      const manager = new SettingsManager();
      try {
        const config = {
          version: "1.0.0",
          timestamp: new Date().toISOString(),
          server: {
            serverPath: "/custom/path",
            autoStart: false,
            logLevel: "debug",
          },
          security: {
            allowedExecutables: [],
            blockSetuidExecutables: true,
            blockShellInterpreters: false,
            maxConcurrentProcesses: 10,
            maxProcessLifetime: 3600,
            allowProcessTermination: true,
            allowGroupTermination: true,
            allowForcedTermination: false,
            allowStdinInput: true,
            allowOutputCapture: true,
            enableAuditLog: true,
            requireConfirmation: false,
            defaultResourceLimits: {},
          },
        };

        await manager.importConfiguration(JSON.stringify(config), true);

        // Verify settings were applied
        const vsConfig = manager.getConfiguration();
        assert.strictEqual(vsConfig.get("server.serverPath"), "/custom/path");
        assert.strictEqual(vsConfig.get("server.autoStart"), false);
        assert.strictEqual(vsConfig.get("server.logLevel"), "debug");
      } finally {
        manager.dispose();
      }
    });

    test("should apply security settings from import", async function () {
      this.timeout(20000); // Increase timeout for many async operations
      const manager = new SettingsManager();
      try {
        const config = {
          version: "1.0.0",
          timestamp: new Date().toISOString(),
          security: {
            allowedExecutables: ["/usr/bin/node"],
            blockSetuidExecutables: false,
            blockShellInterpreters: true,
            maxConcurrentProcesses: 20,
            maxProcessLifetime: 7200,
            allowProcessTermination: false,
            allowGroupTermination: false,
            allowForcedTermination: true,
            allowStdinInput: false,
            allowOutputCapture: false,
            enableAuditLog: false,
            requireConfirmation: true,
            defaultResourceLimits: {
              maxCpuPercent: 75,
              maxMemoryMB: 1024,
            },
          },
        };

        await manager.importConfiguration(JSON.stringify(config), true);

        // Verify settings were applied
        const serverConfig = manager.generateServerConfig();
        assert.deepStrictEqual(serverConfig.allowedExecutables, [
          "/usr/bin/node",
        ]);
        assert.strictEqual(serverConfig.blockSetuidExecutables, false);
        assert.strictEqual(serverConfig.blockShellInterpreters, true);
        assert.strictEqual(serverConfig.maxConcurrentProcesses, 20);
        assert.strictEqual(serverConfig.maxProcessLifetime, 7200);
      } finally {
        manager.dispose();
      }
    });
  });
});
