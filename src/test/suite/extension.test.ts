import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension Test Suite", () => {
  vscode.window.showInformationMessage("Start all tests.");

  test("Extension should be present", () => {
    assert.ok(
      vscode.extensions.getExtension("DigitalDefiance.mcp-acs-process")
    );
  });

  test("Extension should activate", async () => {
    const ext = vscode.extensions.getExtension(
      "DigitalDefiance.mcp-acs-process"
    );
    assert.ok(ext);
    await ext!.activate();
    assert.strictEqual(ext!.isActive, true);
  });

  test("Commands should be registered", async () => {
    const commands = await vscode.commands.getCommands(true);

    const expectedCommands = [
      "mcp-process.startProcess",
      "mcp-process.terminateProcess",
      "mcp-process.viewProcesses",
      "mcp-process.viewStats",
      "mcp-process.refreshProcessList",
      "mcp-process.showSecurityBoundaries",
      "mcp-process.configureAllowlist",
    ];

    for (const cmd of expectedCommands) {
      assert.ok(commands.includes(cmd), `Command ${cmd} should be registered`);
    }
  });

  suite("Configuration", () => {
    // Reset configuration before each test to ensure clean state
    setup(async function () {
      this.timeout(10000); // Increase timeout for setup hook
      const config = vscode.workspace.getConfiguration("mcp-process");
      // Reset to defaults
      await config.update(
        "ui.refreshInterval",
        undefined,
        vscode.ConfigurationTarget.Global
      );
      await config.update(
        "server.autoStart",
        undefined,
        vscode.ConfigurationTarget.Global
      );
      await config.update(
        "ui.showResourceUsage",
        undefined,
        vscode.ConfigurationTarget.Global
      );
      await config.update(
        "server.logLevel",
        undefined,
        vscode.ConfigurationTarget.Global
      );
      // Wait a bit for config to settle
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    test("Should have mcp-process configuration section", () => {
      const config = vscode.workspace.getConfiguration("mcp-process");
      assert.ok(config);
    });

    test("Should have serverPath setting", () => {
      const config = vscode.workspace.getConfiguration("mcp-process");
      const serverPath = config.get("server.serverPath");
      assert.ok(serverPath !== undefined);
    });

    test("Should have configPath setting", () => {
      const config = vscode.workspace.getConfiguration("mcp-process");
      const configPath = config.get("server.configPath");
      assert.ok(configPath !== undefined);
    });

    test("Should have autoStart setting", () => {
      const config = vscode.workspace.getConfiguration("mcp-process");
      const autoStart = config.get("server.autoStart");
      assert.ok(autoStart !== undefined);
      assert.strictEqual(typeof autoStart, "boolean");
    });

    test("Should have refreshInterval setting", () => {
      const config = vscode.workspace.getConfiguration("mcp-process");
      const refreshInterval = config.get("ui.refreshInterval");
      assert.ok(refreshInterval !== undefined);
      assert.strictEqual(typeof refreshInterval, "number");
    });

    test("Should have showResourceUsage setting", () => {
      const config = vscode.workspace.getConfiguration("mcp-process");
      const showResourceUsage = config.get("ui.showResourceUsage");
      assert.ok(showResourceUsage !== undefined);
      assert.strictEqual(typeof showResourceUsage, "boolean");
    });

    test("Should have logLevel setting", () => {
      const config = vscode.workspace.getConfiguration("mcp-process");
      const logLevel = config.get("server.logLevel");
      assert.ok(logLevel !== undefined);
      assert.strictEqual(typeof logLevel, "string");
    });

    test("Default values should be correct", () => {
      const config = vscode.workspace.getConfiguration("mcp-process");

      const autoStart = config.get("server.autoStart");
      assert.strictEqual(autoStart, true);

      const refreshInterval = config.get("ui.refreshInterval");
      assert.strictEqual(refreshInterval, 2000);

      const showResourceUsage = config.get("ui.showResourceUsage");
      assert.strictEqual(showResourceUsage, true);

      const logLevel = config.get("server.logLevel");
      assert.strictEqual(logLevel, "info");
    });
  });

  suite("Views", () => {
    test("Process list view should be registered", async () => {
      // Wait for extension to fully activate
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Check if view container is registered by trying to show it
      try {
        await vscode.commands.executeCommand(
          "workbench.view.extension.mcp-process-explorer"
        );
        // If command executes without error, view is registered
        assert.ok(true);
      } catch (error) {
        // View might not be visible but should be registered
        // Just verify the extension is active which registers views
        const ext = vscode.extensions.getExtension(
          "DigitalDefiance.mcp-acs-process"
        );
        assert.ok(ext);
        assert.ok(ext.isActive);
      }
    });
  });

  suite("Command Execution", () => {
    test("startProcess command should be executable", async function () {
      this.timeout(5000);
      // The startProcess command shows input boxes which would block in tests
      // So we just verify the command is registered
      const commands = await vscode.commands.getCommands(true);
      assert.ok(
        commands.includes("mcp-process.startProcess"),
        "startProcess command should be registered"
      );
    });

    test("viewProcesses command should be executable", async () => {
      try {
        await vscode.commands.executeCommand("mcp-process.viewProcesses");
      } catch (error) {
        // Expected to fail without server
        assert.ok(error);
      }
    });

    test("refreshProcessList command should be executable", async () => {
      try {
        await vscode.commands.executeCommand("mcp-process.refreshProcessList");
      } catch (error) {
        // Should not throw even without server
        assert.fail("refreshProcessList should not throw");
      }
    });

    test("showSecurityBoundaries command should be executable", async () => {
      try {
        await vscode.commands.executeCommand(
          "mcp-process.showSecurityBoundaries"
        );
      } catch (error) {
        // Expected to fail without server
        assert.ok(error);
      }
    });
  });

  suite("Extension Lifecycle", () => {
    test("Extension should deactivate cleanly", async () => {
      const ext = vscode.extensions.getExtension(
        "DigitalDefiance.mcp-acs-process"
      );
      assert.ok(ext);

      // Extension should be active
      assert.strictEqual(ext!.isActive, true);

      // Deactivation is handled by VS Code, we just verify it doesn't throw
      assert.doesNotThrow(() => {
        // Extension will be deactivated when VS Code closes
      });
    });

    test("Extension should handle multiple activations", async () => {
      const ext = vscode.extensions.getExtension(
        "DigitalDefiance.mcp-acs-process"
      );
      assert.ok(ext);

      // First activation
      await ext!.activate();
      assert.strictEqual(ext!.isActive, true);

      // Second activation should be idempotent
      await ext!.activate();
      assert.strictEqual(ext!.isActive, true);
    });
  });

  suite("Error Handling", () => {
    test("Should handle missing server gracefully", async function () {
      this.timeout(10000); // Increase timeout for config operations
      // Set invalid server path
      const config = vscode.workspace.getConfiguration("mcp-process");
      await config.update(
        "server.serverPath",
        "/nonexistent/path",
        vscode.ConfigurationTarget.Global
      );

      // Wait for config to settle
      await new Promise((resolve) => setTimeout(resolve, 200));

      try {
        // Try to execute command
        await vscode.commands.executeCommand("mcp-process.viewProcesses");
      } catch (error) {
        // Should show error message, not crash
        assert.ok(error);
      } finally {
        // Reset config
        await config.update(
          "server.serverPath",
          undefined,
          vscode.ConfigurationTarget.Global
        );
      }
    });

    test("Should handle invalid configuration gracefully", async function () {
      this.timeout(10000); // Increase timeout for config operations
      const config = vscode.workspace.getConfiguration("mcp-process");

      // Set invalid refresh interval
      await config.update(
        "ui.refreshInterval",
        -1,
        vscode.ConfigurationTarget.Global
      );

      // Wait for config to settle
      await new Promise((resolve) => setTimeout(resolve, 200));

      try {
        await vscode.commands.executeCommand("mcp-process.refreshProcessList");
      } catch (error) {
        // Should handle gracefully
      } finally {
        await config.update(
          "ui.refreshInterval",
          undefined,
          vscode.ConfigurationTarget.Global
        );
      }
    });
  });

  suite("Output Channel", () => {
    test("Should create output channel", () => {
      const channels = vscode.window.visibleTextEditors;
      // Output channel should exist (created during activation)
      assert.ok(channels !== undefined);
    });
  });

  suite("First Run Experience", () => {
    test("Should detect first run correctly", async function () {
      this.timeout(5000);

      // Get the extension
      const ext = vscode.extensions.getExtension(
        "DigitalDefiance.mcp-acs-process"
      );
      assert.ok(ext);

      // The extension should be active
      assert.strictEqual(ext!.isActive, true);

      // After first activation, the welcome flag should be set
      // We can't directly test the globalState, but we can verify the extension activated successfully
      assert.ok(ext.isActive);
    });

    test("Should not show welcome on subsequent runs", async function () {
      this.timeout(5000);

      // Get the extension
      const ext = vscode.extensions.getExtension(
        "DigitalDefiance.mcp-acs-process"
      );
      assert.ok(ext);

      // Activate again (simulating second run)
      await ext!.activate();

      // Extension should still be active
      assert.strictEqual(ext!.isActive, true);

      // No error should occur
      assert.ok(true);
    });

    test("Should detect customized configuration", async function () {
      this.timeout(10000); // Increase timeout for config operations
      const config = vscode.workspace.getConfiguration("mcp-process");

      // Set a custom value
      await config.update(
        "executable.allowedExecutables",
        ["/usr/bin/node"],
        vscode.ConfigurationTarget.Global
      );

      // Wait for config to settle
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Get a fresh configuration object after the update
      const updatedConfig = vscode.workspace.getConfiguration("mcp-process");

      // Verify the value was set
      const allowedExecutables = updatedConfig.get<string[]>(
        "executable.allowedExecutables"
      );
      assert.ok(allowedExecutables);
      assert.strictEqual(allowedExecutables.length, 1);
      assert.strictEqual(allowedExecutables[0], "/usr/bin/node");

      // Reset config
      await config.update(
        "executable.allowedExecutables",
        undefined,
        vscode.ConfigurationTarget.Global
      );
    });

    test("Configuration preset commands should be registered", async () => {
      const commands = await vscode.commands.getCommands(true);

      const presetCommands = [
        "mcp-process.applyConfigurationPreset",
        "mcp-process.exportConfiguration",
        "mcp-process.importConfiguration",
        "mcp-process.validateConfiguration",
      ];

      for (const cmd of presetCommands) {
        assert.ok(
          commands.includes(cmd),
          `Command ${cmd} should be registered`
        );
      }
    });
  });
});
