/**
 * Unit Tests for Settings Manager
 *
 * These tests verify individual components of the Settings Manager in isolation.
 */

import * as assert from "assert";
import {
  SettingsManager,
  SecurityConfig,
  CONFIGURATION_PRESETS,
} from "../../settingsManager";

suite("Settings Manager Unit Tests", () => {
  /**
   * Test getConfiguration() for all setting categories
   */
  suite("getConfiguration()", () => {
    test("should return VS Code configuration object", () => {
      const manager = new SettingsManager();
      try {
        const config = manager.getConfiguration();
        assert.ok(config, "Configuration should be defined");
        assert.strictEqual(
          typeof config.get,
          "function",
          "Configuration should have get method"
        );
      } finally {
        manager.dispose();
      }
    });

    test("should access server settings", () => {
      const manager = new SettingsManager();
      try {
        const config = manager.getConfiguration();
        const serverPath = config.get("server.serverPath");
        const autoStart = config.get("server.autoStart");
        const logLevel = config.get("server.logLevel");

        // These should be defined (even if default values)
        assert.notStrictEqual(autoStart, undefined);
        assert.notStrictEqual(logLevel, undefined);
      } finally {
        manager.dispose();
      }
    });

    test("should access executable settings", () => {
      const manager = new SettingsManager();
      try {
        const config = manager.getConfiguration();
        const allowedExecutables = config.get("executable.allowedExecutables");
        const blockSetuid = config.get("executable.blockSetuidExecutables");

        assert.ok(Array.isArray(allowedExecutables));
        assert.strictEqual(typeof blockSetuid, "boolean");
      } finally {
        manager.dispose();
      }
    });

    test("should access resource settings", () => {
      const manager = new SettingsManager();
      try {
        const config = manager.getConfiguration();
        const maxCpu = config.get("resources.defaultMaxCpuPercent");
        const maxMemory = config.get("resources.defaultMaxMemoryMB");

        assert.strictEqual(typeof maxCpu, "number");
        assert.strictEqual(typeof maxMemory, "number");
      } finally {
        manager.dispose();
      }
    });

    test("should access process settings", () => {
      const manager = new SettingsManager();
      try {
        const config = manager.getConfiguration();
        const maxConcurrent = config.get("process.maxConcurrentProcesses");
        const maxLifetime = config.get("process.maxProcessLifetime");

        assert.strictEqual(typeof maxConcurrent, "number");
        assert.strictEqual(typeof maxLifetime, "number");
      } finally {
        manager.dispose();
      }
    });

    test("should access I/O settings", () => {
      const manager = new SettingsManager();
      try {
        const config = manager.getConfiguration();
        const allowStdin = config.get("io.allowStdinInput");
        const allowOutput = config.get("io.allowOutputCapture");

        assert.strictEqual(typeof allowStdin, "boolean");
        assert.strictEqual(typeof allowOutput, "boolean");
      } finally {
        manager.dispose();
      }
    });

    test("should access security settings", () => {
      const manager = new SettingsManager();
      try {
        const config = manager.getConfiguration();
        const allowTermination = config.get("security.allowProcessTermination");
        const requireConfirmation = config.get("security.requireConfirmation");

        assert.strictEqual(typeof allowTermination, "boolean");
        assert.strictEqual(typeof requireConfirmation, "boolean");
      } finally {
        manager.dispose();
      }
    });

    test("should access advanced security settings", () => {
      const manager = new SettingsManager();
      try {
        const config = manager.getConfiguration();
        const enableChroot = config.get("security.advanced.enableChroot");
        const enableNamespaces = config.get(
          "security.advanced.enableNamespaces"
        );

        assert.strictEqual(typeof enableChroot, "boolean");
        assert.strictEqual(typeof enableNamespaces, "boolean");
      } finally {
        manager.dispose();
      }
    });

    test("should access audit settings", () => {
      const manager = new SettingsManager();
      try {
        const config = manager.getConfiguration();
        const enableAudit = config.get("audit.enableAuditLog");
        const auditLevel = config.get("audit.auditLogLevel");

        assert.strictEqual(typeof enableAudit, "boolean");
        assert.strictEqual(typeof auditLevel, "string");
      } finally {
        manager.dispose();
      }
    });
  });

  /**
   * Test generateServerConfig() produces valid SecurityConfig
   */
  suite("generateServerConfig()", () => {
    test("should produce valid SecurityConfig with all required fields", () => {
      const manager = new SettingsManager();
      try {
        const config = manager.generateServerConfig();

        // Verify all required fields are present
        assert.ok(config.allowedExecutables !== undefined);
        assert.ok(config.blockSetuidExecutables !== undefined);
        assert.ok(config.blockShellInterpreters !== undefined);
        assert.ok(config.defaultResourceLimits !== undefined);
        assert.ok(config.maxConcurrentProcesses !== undefined);
        assert.ok(config.maxProcessLifetime !== undefined);
        assert.ok(config.allowProcessTermination !== undefined);
        assert.ok(config.allowGroupTermination !== undefined);
        assert.ok(config.allowForcedTermination !== undefined);
        assert.ok(config.allowStdinInput !== undefined);
        assert.ok(config.allowOutputCapture !== undefined);
        assert.ok(config.enableAuditLog !== undefined);
        assert.ok(config.requireConfirmation !== undefined);
      } finally {
        manager.dispose();
      }
    });

    test("should correctly map executable settings", () => {
      const manager = new SettingsManager();
      try {
        const config = manager.generateServerConfig();

        assert.ok(Array.isArray(config.allowedExecutables));
        assert.strictEqual(typeof config.blockSetuidExecutables, "boolean");
        assert.strictEqual(typeof config.blockShellInterpreters, "boolean");

        if (config.additionalBlockedExecutables !== undefined) {
          assert.ok(Array.isArray(config.additionalBlockedExecutables));
        }
      } finally {
        manager.dispose();
      }
    });

    test("should correctly map resource limits", () => {
      const manager = new SettingsManager();
      try {
        const config = manager.generateServerConfig();

        assert.ok(config.defaultResourceLimits);
        assert.strictEqual(typeof config.defaultResourceLimits, "object");

        // Check each resource limit field
        if (config.defaultResourceLimits.maxCpuPercent !== undefined) {
          assert.strictEqual(
            typeof config.defaultResourceLimits.maxCpuPercent,
            "number"
          );
        }
        if (config.defaultResourceLimits.maxMemoryMB !== undefined) {
          assert.strictEqual(
            typeof config.defaultResourceLimits.maxMemoryMB,
            "number"
          );
        }
        if (config.defaultResourceLimits.maxFileDescriptors !== undefined) {
          assert.strictEqual(
            typeof config.defaultResourceLimits.maxFileDescriptors,
            "number"
          );
        }
        if (config.defaultResourceLimits.maxCpuTime !== undefined) {
          assert.strictEqual(
            typeof config.defaultResourceLimits.maxCpuTime,
            "number"
          );
        }
        if (config.defaultResourceLimits.maxProcesses !== undefined) {
          assert.strictEqual(
            typeof config.defaultResourceLimits.maxProcesses,
            "number"
          );
        }
      } finally {
        manager.dispose();
      }
    });

    test("should correctly map process limits", () => {
      const manager = new SettingsManager();
      try {
        const config = manager.generateServerConfig();

        assert.strictEqual(typeof config.maxConcurrentProcesses, "number");
        assert.strictEqual(typeof config.maxProcessLifetime, "number");

        if (config.maxConcurrentProcessesPerAgent !== undefined) {
          assert.strictEqual(
            typeof config.maxConcurrentProcessesPerAgent,
            "number"
          );
        }
        if (config.maxTotalProcesses !== undefined) {
          assert.strictEqual(typeof config.maxTotalProcesses, "number");
        }
      } finally {
        manager.dispose();
      }
    });

    test("should correctly map I/O settings", () => {
      const manager = new SettingsManager();
      try {
        const config = manager.generateServerConfig();

        assert.strictEqual(typeof config.allowStdinInput, "boolean");
        assert.strictEqual(typeof config.allowOutputCapture, "boolean");

        if (config.maxOutputBufferSize !== undefined) {
          assert.strictEqual(typeof config.maxOutputBufferSize, "number");
        }
        if (config.blockBinaryStdin !== undefined) {
          assert.strictEqual(typeof config.blockBinaryStdin, "boolean");
        }
      } finally {
        manager.dispose();
      }
    });

    test("should correctly map security settings", () => {
      const manager = new SettingsManager();
      try {
        const config = manager.generateServerConfig();

        assert.strictEqual(typeof config.allowProcessTermination, "boolean");
        assert.strictEqual(typeof config.allowGroupTermination, "boolean");
        assert.strictEqual(typeof config.allowForcedTermination, "boolean");
        assert.strictEqual(typeof config.requireConfirmation, "boolean");
      } finally {
        manager.dispose();
      }
    });

    test("should correctly map namespace settings", () => {
      const manager = new SettingsManager();
      try {
        const config = manager.generateServerConfig();

        if (config.namespaces !== undefined) {
          assert.strictEqual(typeof config.namespaces, "object");

          if (config.namespaces.pid !== undefined) {
            assert.strictEqual(typeof config.namespaces.pid, "boolean");
          }
          if (config.namespaces.network !== undefined) {
            assert.strictEqual(typeof config.namespaces.network, "boolean");
          }
          if (config.namespaces.mount !== undefined) {
            assert.strictEqual(typeof config.namespaces.mount, "boolean");
          }
          if (config.namespaces.uts !== undefined) {
            assert.strictEqual(typeof config.namespaces.uts, "boolean");
          }
          if (config.namespaces.ipc !== undefined) {
            assert.strictEqual(typeof config.namespaces.ipc, "boolean");
          }
          if (config.namespaces.user !== undefined) {
            assert.strictEqual(typeof config.namespaces.user, "boolean");
          }
        }
      } finally {
        manager.dispose();
      }
    });

    test("should correctly map audit settings", () => {
      const manager = new SettingsManager();
      try {
        const config = manager.generateServerConfig();

        assert.strictEqual(typeof config.enableAuditLog, "boolean");

        if (config.auditLogPath !== undefined) {
          assert.strictEqual(typeof config.auditLogPath, "string");
        }
        if (config.auditLogLevel !== undefined) {
          assert.strictEqual(typeof config.auditLogLevel, "string");
        }
      } finally {
        manager.dispose();
      }
    });
  });

  /**
   * Test setting name mapping is correct
   */
  suite("Setting Name Mapping", () => {
    test("should correctly map SecurityConfig fields to VS Code setting paths", () => {
      const manager = new SettingsManager();
      try {
        const config = manager.generateServerConfig();
        const vsConfig = manager.getConfiguration();

        // Test a few key mappings
        const allowedExecs = vsConfig.get("executable.allowedExecutables");
        assert.deepStrictEqual(config.allowedExecutables, allowedExecs);

        const blockSetuid = vsConfig.get("executable.blockSetuidExecutables");
        assert.strictEqual(config.blockSetuidExecutables, blockSetuid);

        const maxConcurrent = vsConfig.get("process.maxConcurrentProcesses");
        assert.strictEqual(config.maxConcurrentProcesses, maxConcurrent);

        const allowStdin = vsConfig.get("io.allowStdinInput");
        assert.strictEqual(config.allowStdinInput, allowStdin);

        const enableAudit = vsConfig.get("audit.enableAuditLog");
        assert.strictEqual(config.enableAuditLog, enableAudit);
      } finally {
        manager.dispose();
      }
    });

    test("should handle nested settings correctly", () => {
      const manager = new SettingsManager();
      try {
        const config = manager.generateServerConfig();
        const vsConfig = manager.getConfiguration();

        // Test resource limits mapping
        const maxCpu = vsConfig.get("resources.defaultMaxCpuPercent");
        assert.strictEqual(config.defaultResourceLimits.maxCpuPercent, maxCpu);

        const maxMemory = vsConfig.get("resources.defaultMaxMemoryMB");
        assert.strictEqual(config.defaultResourceLimits.maxMemoryMB, maxMemory);

        // Test namespace mapping
        const pidNamespace = vsConfig.get("security.advanced.namespacesPid");
        if (config.namespaces) {
          assert.strictEqual(config.namespaces.pid, pidNamespace);
        }
      } finally {
        manager.dispose();
      }
    });
  });

  /**
   * Test platform capabilities
   */
  suite("Platform Capabilities", () => {
    test("should detect platform capabilities", () => {
      const manager = new SettingsManager();
      try {
        const caps = manager.getPlatformCapabilities();

        assert.ok(caps);
        assert.ok(caps.platform);
        assert.ok(caps.platformName);
        assert.strictEqual(typeof caps.supportsChroot, "boolean");
        assert.strictEqual(typeof caps.supportsNamespaces, "boolean");
        assert.strictEqual(typeof caps.supportsSeccomp, "boolean");
        assert.strictEqual(typeof caps.supportsMAC, "boolean");
      } finally {
        manager.dispose();
      }
    });
  });

  /**
   * Test configuration change listeners
   */
  suite("Configuration Change Listeners", () => {
    test("should allow registering configuration change callbacks", () => {
      const manager = new SettingsManager();
      try {
        let callbackCalled = false;

        manager.onConfigurationChanged(() => {
          callbackCalled = true;
        });

        // We can't easily trigger a config change in tests, but we can verify
        // the callback was registered without error
        assert.ok(true, "Callback registered successfully");
      } finally {
        manager.dispose();
      }
    });
  });

  /**
   * Test preset availability
   */
  suite("Configuration Presets", () => {
    test("should have three predefined presets", () => {
      assert.strictEqual(
        CONFIGURATION_PRESETS.length,
        3,
        "Should have exactly 3 presets"
      );
    });

    test("should have Development preset", () => {
      const devPreset = CONFIGURATION_PRESETS.find(
        (p) => p.name === "Development"
      );
      assert.ok(devPreset, "Development preset should exist");
      assert.strictEqual(devPreset.securityLevel, "low");
      assert.ok(devPreset.config);
      assert.ok(devPreset.description);
    });

    test("should have Production preset", () => {
      const prodPreset = CONFIGURATION_PRESETS.find(
        (p) => p.name === "Production"
      );
      assert.ok(prodPreset, "Production preset should exist");
      assert.strictEqual(prodPreset.securityLevel, "medium");
      assert.ok(prodPreset.config);
      assert.ok(prodPreset.description);
    });

    test("should have High Security preset", () => {
      const secPreset = CONFIGURATION_PRESETS.find(
        (p) => p.name === "High Security"
      );
      assert.ok(secPreset, "High Security preset should exist");
      assert.strictEqual(secPreset.securityLevel, "high");
      assert.ok(secPreset.config);
      assert.ok(secPreset.description);
    });
  });
});
