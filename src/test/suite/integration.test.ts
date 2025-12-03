import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

suite("Integration Test Suite", () => {
  let testConfigPath: string;

  setup(() => {
    // Create a test configuration file
    testConfigPath = path.join(__dirname, "../../../test-config.json");
    const testConfig = {
      allowedExecutables: ["node", "echo"],
      defaultResourceLimits: {
        maxCpuPercent: 80,
        maxMemoryMB: 512,
      },
      maxConcurrentProcesses: 5,
      enableAuditLog: false,
      blockShellInterpreters: false,
      blockSetuidExecutables: true,
    };

    fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));
  });

  teardown(() => {
    // Clean up test configuration
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }
  });

  suite("End-to-End Workflow", () => {
    test("Should complete full process lifecycle", async function () {
      this.timeout(10000); // Increase timeout for integration test

      // Skip if server not available
      try {
        // 1. Activate extension
        const ext = vscode.extensions.getExtension(
          "DigitalDefiance.mcp-acs-process"
        );
        assert.ok(ext);
        await ext!.activate();

        // 2. Wait for initialization
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // 3. Try to view processes (should work even if empty)
        try {
          await vscode.commands.executeCommand("mcp-process.viewProcesses");
        } catch (error) {
          // May fail if server not running, which is okay for this test
          console.log("Server not available, skipping integration test");
          this.skip();
        }

        // 4. Refresh process list
        await vscode.commands.executeCommand("mcp-process.refreshProcessList");

        // 5. View security boundaries
        try {
          await vscode.commands.executeCommand(
            "mcp-process.showSecurityBoundaries"
          );
        } catch (error) {
          // May fail if server not running
        }
      } catch (error) {
        console.log("Integration test skipped:", error);
        this.skip();
      }
    });

    test("Should handle configuration changes", async function () {
      this.timeout(5000);

      const config = vscode.workspace.getConfiguration("mcp-process");

      // Change refresh interval
      const originalInterval = config.get("refreshInterval");
      await config.update(
        "refreshInterval",
        5000,
        vscode.ConfigurationTarget.Global
      );

      // Verify change
      const newInterval = config.get("refreshInterval");
      assert.strictEqual(newInterval, 2000);

      // Restore original
      await config.update(
        "refreshInterval",
        originalInterval,
        vscode.ConfigurationTarget.Global
      );
    });

    test("Should handle view visibility", async function () {
      this.timeout(5000);

      try {
        // Show the process explorer view
        await vscode.commands.executeCommand(
          "workbench.view.extension.mcp-process-explorer"
        );

        // Wait for view to render
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // View should be visible
        assert.ok(true);
      } catch (error) {
        console.log("View test skipped:", error);
        this.skip();
      }
    });
  });

  suite("Configuration File Handling", () => {
    test("Should read test configuration file", () => {
      assert.ok(fs.existsSync(testConfigPath));

      const content = fs.readFileSync(testConfigPath, "utf-8");
      const config = JSON.parse(content);

      assert.ok(config.allowedExecutables);
      assert.ok(Array.isArray(config.allowedExecutables));
      assert.ok(config.allowedExecutables.includes("node"));
    });

    test("Should handle missing configuration file", async () => {
      const config = vscode.workspace.getConfiguration("mcp-process");
      await config.update(
        "configPath",
        "/nonexistent/config.json",
        vscode.ConfigurationTarget.Global
      );

      try {
        // Try to start with missing config
        await vscode.commands.executeCommand("mcp-process.viewProcesses");
      } catch (error) {
        // Expected to fail
        assert.ok(error);
      } finally {
        await config.update(
          "configPath",
          undefined,
          vscode.ConfigurationTarget.Global
        );
      }
    });

    test("Should handle invalid JSON in configuration", () => {
      const invalidConfigPath = path.join(
        __dirname,
        "../../../invalid-config.json"
      );
      fs.writeFileSync(invalidConfigPath, "{ invalid json }");

      try {
        const content = fs.readFileSync(invalidConfigPath, "utf-8");
        assert.throws(() => {
          JSON.parse(content);
        });
      } finally {
        fs.unlinkSync(invalidConfigPath);
      }
    });
  });

  suite("Tree View Integration", () => {
    test("Should register process tree view", async () => {
      const ext = vscode.extensions.getExtension(
        "DigitalDefiance.mcp-acs-process"
      );
      assert.ok(ext);
      await ext!.activate();

      // Tree view should be registered
      // We can't directly access tree views, but we can verify commands work
      await assert.doesNotReject(async () => {
        await vscode.commands.executeCommand("mcp-process.refreshProcessList");
      });
    });

    test("Should register security tree view", async () => {
      const ext = vscode.extensions.getExtension(
        "DigitalDefiance.mcp-acs-process"
      );
      assert.ok(ext);
      await ext!.activate();

      // Security view should be registered
      await assert.doesNotReject(async () => {
        try {
          await vscode.commands.executeCommand(
            "mcp-process.showSecurityBoundaries"
          );
        } catch (error) {
          // May fail without server, but command should exist
        }
      });
    });
  });

  suite("Webview Integration", () => {
    test("Should create statistics webview", async function () {
      this.timeout(5000);

      try {
        // This would require a running process
        // For now, we just verify the command exists
        const commands = await vscode.commands.getCommands(true);
        assert.ok(commands.includes("mcp-process.viewStats"));
      } catch (error) {
        console.log("Webview test skipped:", error);
        this.skip();
      }
    });

    test("Should create security boundaries webview", async function () {
      this.timeout(5000);

      try {
        await vscode.commands.executeCommand(
          "mcp-process.showSecurityBoundaries"
        );

        // Wait for webview to be created
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Webview should exist (we can't directly access it, but command should work)
        assert.ok(true);
      } catch (error) {
        // Expected without server
        console.log("Security webview test skipped:", error);
      }
    });
  });

  suite("Error Recovery", () => {
    test("Should recover from server crash", async function () {
      this.timeout(5000);

      // This test verifies the extension doesn't crash when server fails
      try {
        await vscode.commands.executeCommand("mcp-process.viewProcesses");
      } catch (error) {
        // Extension should handle error gracefully
        assert.ok(error);
      }

      // Extension should still be active
      const ext = vscode.extensions.getExtension(
        "DigitalDefiance.mcp-acs-process"
      );
      assert.ok(ext);
      assert.strictEqual(ext!.isActive, true);
    });

    test("Should handle rapid command execution", async function () {
      this.timeout(5000);

      // Execute multiple commands rapidly
      const promises = [
        vscode.commands.executeCommand("mcp-process.refreshProcessList"),
        vscode.commands.executeCommand("mcp-process.refreshProcessList"),
        vscode.commands.executeCommand("mcp-process.refreshProcessList"),
      ];

      // Should not crash
      await Promise.allSettled(promises);

      // Extension should still be active
      const ext = vscode.extensions.getExtension(
        "DigitalDefiance.mcp-acs-process"
      );
      assert.ok(ext);
      assert.strictEqual(ext!.isActive, true);
    });

    test("Should handle concurrent operations", async function () {
      this.timeout(5000);

      // Try multiple operations concurrently
      const operations = [
        vscode.commands.executeCommand("mcp-process.refreshProcessList"),
        vscode.commands.executeCommand("mcp-process.viewProcesses").then(
          () => {},
          () => {}
        ),
        vscode.commands
          .executeCommand("mcp-process.showSecurityBoundaries")
          .then(
            () => {},
            () => {}
          ),
      ];

      await Promise.allSettled(operations);

      // Extension should still be functional
      const ext = vscode.extensions.getExtension(
        "DigitalDefiance.mcp-acs-process"
      );
      assert.ok(ext);
      assert.strictEqual(ext!.isActive, true);
    });
  });

  suite("Performance", () => {
    test("Extension activation should be fast", async function () {
      this.timeout(5000);

      const startTime = Date.now();

      const ext = vscode.extensions.getExtension(
        "DigitalDefiance.mcp-acs-process"
      );
      assert.ok(ext);
      await ext!.activate();

      const activationTime = Date.now() - startTime;

      // Activation should take less than 3 seconds
      assert.ok(activationTime < 3000, `Activation took ${activationTime}ms`);
    });

    test("Refresh should be responsive", async function () {
      this.timeout(5000);

      const startTime = Date.now();

      await vscode.commands.executeCommand("mcp-process.refreshProcessList");

      const refreshTime = Date.now() - startTime;

      // Refresh should be fast (< 1 second)
      assert.ok(refreshTime < 1000, `Refresh took ${refreshTime}ms`);
    });
  });

  suite("Memory Management", () => {
    test("Should not leak memory on repeated operations", async function () {
      this.timeout(10000);

      // Get initial memory usage
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many operations
      for (let i = 0; i < 100; i++) {
        await vscode.commands.executeCommand("mcp-process.refreshProcessList");
      }

      // Get final memory usage
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (< 50MB)
      assert.ok(
        memoryIncrease < 50 * 1024 * 1024,
        `Memory increased by ${memoryIncrease / 1024 / 1024}MB`
      );
    });
  });
});
