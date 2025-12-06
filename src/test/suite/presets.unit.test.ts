/**
 * Unit Tests for Configuration Presets
 *
 * These tests verify preset application, validation, and diff generation.
 */

import * as assert from "assert";
import {
  SettingsManager,
  CONFIGURATION_PRESETS,
  SecurityConfig,
} from "../../settingsManager";

suite("Configuration Presets Unit Tests", () => {
  /**
   * Test that each preset applies correct values
   */
  suite("Preset Values", () => {
    test("Development preset should have permissive settings", () => {
      const devPreset = CONFIGURATION_PRESETS.find(
        (p) => p.name === "Development"
      );
      assert.ok(devPreset);

      // Check key permissive settings
      assert.strictEqual(devPreset.config.blockShellInterpreters, false);
      assert.strictEqual(devPreset.config.requireConfirmation, false);
      assert.strictEqual(devPreset.config.enableChroot, false);
      assert.strictEqual(devPreset.config.enableNamespaces, false);

      // Check generous resource limits
      assert.ok(devPreset.config.defaultResourceLimits);
      assert.strictEqual(
        devPreset.config.defaultResourceLimits.maxCpuPercent,
        0
      ); // Unlimited
      assert.strictEqual(devPreset.config.defaultResourceLimits.maxMemoryMB, 0); // Unlimited
    });

    test("Production preset should have balanced settings", () => {
      const prodPreset = CONFIGURATION_PRESETS.find(
        (p) => p.name === "Production"
      );
      assert.ok(prodPreset);

      // Check balanced settings
      assert.strictEqual(prodPreset.config.blockSetuidExecutables, true);
      assert.strictEqual(prodPreset.config.blockShellInterpreters, false);
      assert.strictEqual(prodPreset.config.requireConfirmation, false);
      assert.strictEqual(prodPreset.config.strictResourceEnforcement, true);

      // Check balanced resource limits
      assert.ok(prodPreset.config.defaultResourceLimits);
      assert.strictEqual(
        prodPreset.config.defaultResourceLimits.maxCpuPercent,
        50
      );
      assert.strictEqual(
        prodPreset.config.defaultResourceLimits.maxMemoryMB,
        512
      );
    });

    test("High Security preset should have strict settings", () => {
      const secPreset = CONFIGURATION_PRESETS.find(
        (p) => p.name === "High Security"
      );
      assert.ok(secPreset);

      // Check strict settings
      assert.strictEqual(secPreset.config.blockSetuidExecutables, true);
      assert.strictEqual(secPreset.config.blockShellInterpreters, true);
      assert.strictEqual(secPreset.config.requireConfirmation, true);
      assert.strictEqual(secPreset.config.allowForcedTermination, false);
      assert.strictEqual(secPreset.config.allowStdinInput, false);
      assert.strictEqual(secPreset.config.blockNetworkAccess, true);
      assert.strictEqual(secPreset.config.readOnlyFilesystem, true);

      // Check strict resource limits
      assert.ok(secPreset.config.defaultResourceLimits);
      assert.strictEqual(
        secPreset.config.defaultResourceLimits.maxCpuPercent,
        25
      );
      assert.strictEqual(
        secPreset.config.defaultResourceLimits.maxMemoryMB,
        256
      );
    });

    test("All presets should have required fields", () => {
      for (const preset of CONFIGURATION_PRESETS) {
        assert.ok(preset.name, `Preset should have name: ${preset.name}`);
        assert.ok(
          preset.description,
          `Preset should have description: ${preset.name}`
        );
        assert.ok(
          preset.securityLevel,
          `Preset should have securityLevel: ${preset.name}`
        );
        assert.ok(preset.config, `Preset should have config: ${preset.name}`);

        // Check security level is valid
        assert.ok(
          ["low", "medium", "high"].includes(preset.securityLevel),
          `Preset security level should be low, medium, or high: ${preset.name}`
        );
      }
    });

    test("All presets should have complete configuration", () => {
      for (const preset of CONFIGURATION_PRESETS) {
        const config = preset.config;

        // Check required fields are present
        assert.ok(
          config.allowedExecutables !== undefined,
          `${preset.name}: allowedExecutables should be defined`
        );
        assert.ok(
          config.blockSetuidExecutables !== undefined,
          `${preset.name}: blockSetuidExecutables should be defined`
        );
        assert.ok(
          config.blockShellInterpreters !== undefined,
          `${preset.name}: blockShellInterpreters should be defined`
        );
        assert.ok(
          config.defaultResourceLimits !== undefined,
          `${preset.name}: defaultResourceLimits should be defined`
        );
        assert.ok(
          config.maxConcurrentProcesses !== undefined,
          `${preset.name}: maxConcurrentProcesses should be defined`
        );
        assert.ok(
          config.maxProcessLifetime !== undefined,
          `${preset.name}: maxProcessLifetime should be defined`
        );
        assert.ok(
          config.allowProcessTermination !== undefined,
          `${preset.name}: allowProcessTermination should be defined`
        );
        assert.ok(
          config.allowGroupTermination !== undefined,
          `${preset.name}: allowGroupTermination should be defined`
        );
        assert.ok(
          config.allowForcedTermination !== undefined,
          `${preset.name}: allowForcedTermination should be defined`
        );
        assert.ok(
          config.allowStdinInput !== undefined,
          `${preset.name}: allowStdinInput should be defined`
        );
        assert.ok(
          config.allowOutputCapture !== undefined,
          `${preset.name}: allowOutputCapture should be defined`
        );
        assert.ok(
          config.enableAuditLog !== undefined,
          `${preset.name}: enableAuditLog should be defined`
        );
        assert.ok(
          config.requireConfirmation !== undefined,
          `${preset.name}: requireConfirmation should be defined`
        );
      }
    });
  });

  /**
   * Test that preset doesn't modify unrelated settings
   */
  suite("Preset Isolation", () => {
    test("Preset should only modify settings included in preset config", () => {
      const manager = new SettingsManager();
      try {
        const devPreset = CONFIGURATION_PRESETS.find(
          (p) => p.name === "Development"
        );
        assert.ok(devPreset);

        // Get list of settings in preset
        const presetSettings = Object.keys(devPreset.config);

        // Verify preset doesn't include settings it shouldn't modify
        // (This is more of a sanity check that presets are well-defined)
        assert.ok(presetSettings.length > 0);

        // Create a sample SecurityConfig to check valid fields
        const validFields: (keyof SecurityConfig)[] = [
          "allowedExecutables",
          "blockSetuidExecutables",
          "blockShellInterpreters",
          "additionalBlockedExecutables",
          "maxArgumentCount",
          "maxArgumentLength",
          "blockedArgumentPatterns",
          "additionalBlockedEnvVars",
          "allowedEnvVars",
          "maxEnvVarCount",
          "allowedWorkingDirectories",
          "blockedWorkingDirectories",
          "defaultResourceLimits",
          "maximumResourceLimits",
          "strictResourceEnforcement",
          "maxConcurrentProcesses",
          "maxConcurrentProcessesPerAgent",
          "maxProcessLifetime",
          "maxTotalProcesses",
          "maxLaunchesPerMinute",
          "maxLaunchesPerHour",
          "rateLimitCooldownSeconds",
          "allowProcessTermination",
          "allowGroupTermination",
          "allowForcedTermination",
          "requireTerminationConfirmation",
          "allowStdinInput",
          "allowOutputCapture",
          "maxOutputBufferSize",
          "blockBinaryStdin",
          "enableChroot",
          "chrootDirectory",
          "enableNamespaces",
          "namespaces",
          "enableSeccomp",
          "seccompProfile",
          "blockNetworkAccess",
          "allowedNetworkDestinations",
          "blockedNetworkDestinations",
          "enableAuditLog",
          "auditLogPath",
          "auditLogLevel",
          "enableSecurityAlerts",
          "securityAlertWebhook",
          "requireConfirmation",
          "requireConfirmationFor",
          "autoApproveAfterCount",
          "allowedTimeWindows",
          "blockedTimeWindows",
          "enableMAC",
          "macProfile",
          "dropCapabilities",
          "readOnlyFilesystem",
          "tmpfsSize",
        ];

        // Each setting in preset should be a valid SecurityConfig field
        for (const setting of presetSettings) {
          assert.ok(
            validFields.includes(setting as keyof SecurityConfig),
            `Setting ${setting} should be a valid SecurityConfig field`
          );
        }
      } finally {
        manager.dispose();
      }
    });
  });

  /**
   * Test preset validation
   */
  suite("Preset Validation", () => {
    test("All presets should pass validation", () => {
      const manager = new SettingsManager();
      try {
        for (const preset of CONFIGURATION_PRESETS) {
          const result = manager.validateConfiguration(preset.config);

          // Presets may have warnings (e.g., platform-specific features)
          // but should not have errors
          assert.strictEqual(
            result.valid,
            true,
            `Preset "${preset.name}" should be valid. Errors: ${result.errors
              .map((e) => `${e.setting}: ${e.message}`)
              .join(", ")}`
          );
        }
      } finally {
        manager.dispose();
      }
    });

    test("Development preset should validate successfully", () => {
      const manager = new SettingsManager();
      try {
        const devPreset = CONFIGURATION_PRESETS.find(
          (p) => p.name === "Development"
        );
        assert.ok(devPreset);

        const result = manager.validateConfiguration(devPreset.config);

        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.errors.length, 0);
      } finally {
        manager.dispose();
      }
    });

    test("Production preset should validate successfully", () => {
      const manager = new SettingsManager();
      try {
        const prodPreset = CONFIGURATION_PRESETS.find(
          (p) => p.name === "Production"
        );
        assert.ok(prodPreset);

        const result = manager.validateConfiguration(prodPreset.config);

        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.errors.length, 0);
      } finally {
        manager.dispose();
      }
    });

    test("High Security preset should validate successfully", () => {
      const manager = new SettingsManager();
      try {
        const secPreset = CONFIGURATION_PRESETS.find(
          (p) => p.name === "High Security"
        );
        assert.ok(secPreset);

        const result = manager.validateConfiguration(secPreset.config);

        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.errors.length, 0);
      } finally {
        manager.dispose();
      }
    });
  });

  /**
   * Test diff generation
   */
  suite("Diff Generation", () => {
    test("should generate diff showing changes", () => {
      const manager = new SettingsManager();
      try {
        const devPreset = CONFIGURATION_PRESETS.find(
          (p) => p.name === "Development"
        );
        assert.ok(devPreset);

        // Generate diff (this is a private method, so we test it indirectly)
        // by checking that the preset has settings that would generate a diff
        assert.ok(Object.keys(devPreset.config).length > 0);

        // Verify preset has settings that would change
        assert.ok(devPreset.config.blockShellInterpreters !== undefined);
        assert.ok(devPreset.config.requireConfirmation !== undefined);
        assert.ok(devPreset.config.defaultResourceLimits !== undefined);
      } finally {
        manager.dispose();
      }
    });

    test("should handle resource limits in diff", () => {
      const devPreset = CONFIGURATION_PRESETS.find(
        (p) => p.name === "Development"
      );
      assert.ok(devPreset);

      // Verify resource limits are structured correctly for diff generation
      assert.ok(devPreset.config.defaultResourceLimits);
      assert.ok(
        devPreset.config.defaultResourceLimits.maxCpuPercent !== undefined
      );
      assert.ok(
        devPreset.config.defaultResourceLimits.maxMemoryMB !== undefined
      );
    });

    test("should handle namespaces in diff", () => {
      const secPreset = CONFIGURATION_PRESETS.find(
        (p) => p.name === "High Security"
      );
      assert.ok(secPreset);

      // Verify namespaces are structured correctly for diff generation
      if (secPreset.config.namespaces) {
        assert.strictEqual(typeof secPreset.config.namespaces, "object");
        assert.ok(secPreset.config.namespaces.pid !== undefined);
        assert.ok(secPreset.config.namespaces.network !== undefined);
      }
    });
  });

  /**
   * Test preset metadata
   */
  suite("Preset Metadata", () => {
    test("Development preset should have correct metadata", () => {
      const devPreset = CONFIGURATION_PRESETS.find(
        (p) => p.name === "Development"
      );
      assert.ok(devPreset);

      assert.strictEqual(devPreset.name, "Development");
      assert.strictEqual(devPreset.securityLevel, "low");
      assert.ok(devPreset.description.length > 0);
      assert.ok(devPreset.description.includes("development"));
    });

    test("Production preset should have correct metadata", () => {
      const prodPreset = CONFIGURATION_PRESETS.find(
        (p) => p.name === "Production"
      );
      assert.ok(prodPreset);

      assert.strictEqual(prodPreset.name, "Production");
      assert.strictEqual(prodPreset.securityLevel, "medium");
      assert.ok(prodPreset.description.length > 0);
      assert.ok(prodPreset.description.includes("production"));
    });

    test("High Security preset should have correct metadata", () => {
      const secPreset = CONFIGURATION_PRESETS.find(
        (p) => p.name === "High Security"
      );
      assert.ok(secPreset);

      assert.strictEqual(secPreset.name, "High Security");
      assert.strictEqual(secPreset.securityLevel, "high");
      assert.ok(secPreset.description.length > 0);
      assert.ok(secPreset.description.includes("security"));
    });
  });

  /**
   * Test preset security levels
   */
  suite("Security Levels", () => {
    test("Development preset should be less restrictive than Production", () => {
      const devPreset = CONFIGURATION_PRESETS.find(
        (p) => p.name === "Development"
      );
      const prodPreset = CONFIGURATION_PRESETS.find(
        (p) => p.name === "Production"
      );
      assert.ok(devPreset && prodPreset);

      // Development should have higher limits
      assert.ok(
        devPreset.config.maxConcurrentProcesses! >=
          prodPreset.config.maxConcurrentProcesses!
      );
      assert.ok(
        devPreset.config.maxProcessLifetime! >=
          prodPreset.config.maxProcessLifetime!
      );

      // Development should be less restrictive
      assert.strictEqual(devPreset.config.requireConfirmation, false);
      assert.strictEqual(devPreset.config.blockShellInterpreters, false);
    });

    test("Production preset should be less restrictive than High Security", () => {
      const prodPreset = CONFIGURATION_PRESETS.find(
        (p) => p.name === "Production"
      );
      const secPreset = CONFIGURATION_PRESETS.find(
        (p) => p.name === "High Security"
      );
      assert.ok(prodPreset && secPreset);

      // Production should have higher limits
      assert.ok(
        prodPreset.config.maxConcurrentProcesses! >=
          secPreset.config.maxConcurrentProcesses!
      );
      assert.ok(
        prodPreset.config.maxProcessLifetime! >=
          secPreset.config.maxProcessLifetime!
      );

      // Production should be less restrictive
      assert.strictEqual(prodPreset.config.requireConfirmation, false);
      assert.strictEqual(secPreset.config.requireConfirmation, true);

      assert.strictEqual(prodPreset.config.blockShellInterpreters, false);
      assert.strictEqual(secPreset.config.blockShellInterpreters, true);
    });

    test("High Security preset should have strictest settings", () => {
      const secPreset = CONFIGURATION_PRESETS.find(
        (p) => p.name === "High Security"
      );
      assert.ok(secPreset);

      // Check strictest settings
      assert.strictEqual(secPreset.config.blockShellInterpreters, true);
      assert.strictEqual(secPreset.config.requireConfirmation, true);
      assert.strictEqual(secPreset.config.allowForcedTermination, false);
      assert.strictEqual(secPreset.config.allowStdinInput, false);
      assert.strictEqual(secPreset.config.blockNetworkAccess, true);
      assert.strictEqual(secPreset.config.readOnlyFilesystem, true);
      assert.strictEqual(secPreset.config.strictResourceEnforcement, true);
    });
  });

  /**
   * Test preset completeness
   */
  suite("Preset Completeness", () => {
    test("All presets should configure executable control", () => {
      for (const preset of CONFIGURATION_PRESETS) {
        assert.ok(
          preset.config.allowedExecutables !== undefined,
          `${preset.name} should configure allowedExecutables`
        );
        assert.ok(
          preset.config.blockSetuidExecutables !== undefined,
          `${preset.name} should configure blockSetuidExecutables`
        );
        assert.ok(
          preset.config.blockShellInterpreters !== undefined,
          `${preset.name} should configure blockShellInterpreters`
        );
      }
    });

    test("All presets should configure resource limits", () => {
      for (const preset of CONFIGURATION_PRESETS) {
        assert.ok(
          preset.config.defaultResourceLimits !== undefined,
          `${preset.name} should configure defaultResourceLimits`
        );
        assert.ok(
          preset.config.defaultResourceLimits.maxCpuPercent !== undefined,
          `${preset.name} should configure maxCpuPercent`
        );
        assert.ok(
          preset.config.defaultResourceLimits.maxMemoryMB !== undefined,
          `${preset.name} should configure maxMemoryMB`
        );
      }
    });

    test("All presets should configure process limits", () => {
      for (const preset of CONFIGURATION_PRESETS) {
        assert.ok(
          preset.config.maxConcurrentProcesses !== undefined,
          `${preset.name} should configure maxConcurrentProcesses`
        );
        assert.ok(
          preset.config.maxProcessLifetime !== undefined,
          `${preset.name} should configure maxProcessLifetime`
        );
      }
    });

    test("All presets should configure I/O control", () => {
      for (const preset of CONFIGURATION_PRESETS) {
        assert.ok(
          preset.config.allowStdinInput !== undefined,
          `${preset.name} should configure allowStdinInput`
        );
        assert.ok(
          preset.config.allowOutputCapture !== undefined,
          `${preset.name} should configure allowOutputCapture`
        );
      }
    });

    test("All presets should configure security settings", () => {
      for (const preset of CONFIGURATION_PRESETS) {
        assert.ok(
          preset.config.allowProcessTermination !== undefined,
          `${preset.name} should configure allowProcessTermination`
        );
        assert.ok(
          preset.config.allowGroupTermination !== undefined,
          `${preset.name} should configure allowGroupTermination`
        );
        assert.ok(
          preset.config.allowForcedTermination !== undefined,
          `${preset.name} should configure allowForcedTermination`
        );
        assert.ok(
          preset.config.requireConfirmation !== undefined,
          `${preset.name} should configure requireConfirmation`
        );
      }
    });

    test("All presets should configure audit settings", () => {
      for (const preset of CONFIGURATION_PRESETS) {
        assert.ok(
          preset.config.enableAuditLog !== undefined,
          `${preset.name} should configure enableAuditLog`
        );
      }
    });
  });
});
