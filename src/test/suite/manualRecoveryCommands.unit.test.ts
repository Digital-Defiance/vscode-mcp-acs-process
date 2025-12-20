import * as assert from "assert";
import * as vscode from "vscode";

suite("Manual Recovery Commands Unit Tests", () => {
  suite("Command Registration", () => {
    test("reconnectToServer command should be registered", async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(
        commands.includes("mcp-process.reconnectToServer"),
        "reconnectToServer command should be registered"
      );
    });

    test("showDiagnostics command should be registered", async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(
        commands.includes("mcp-process.showDiagnostics"),
        "showDiagnostics command should be registered"
      );
    });

    test("restartServer command should be registered", async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(
        commands.includes("mcp-process.restartServer"),
        "restartServer command should be registered"
      );
    });
  });

  suite("Reconnect Command", () => {
    test("Should be executable without throwing", async () => {
      // The command should handle errors gracefully
      try {
        await vscode.commands.executeCommand("mcp-process.reconnectToServer");
        // Command executed successfully or handled error gracefully
        assert.ok(true);
      } catch (error) {
        // Should not throw unhandled errors
        assert.fail("Command should handle errors gracefully");
      }
    });

    test("Should handle server not running gracefully", async () => {
      // Execute command when server is not running
      try {
        await vscode.commands.executeCommand("mcp-process.reconnectToServer");
        // Should complete without throwing
        assert.ok(true);
      } catch (error) {
        assert.fail("Command should not throw when server not running");
      }
    });
  });

  suite("Show Diagnostics Command", () => {
    test("Should be executable without throwing", async () => {
      // The command should handle errors gracefully
      try {
        await vscode.commands.executeCommand("mcp-process.showDiagnostics");
        // Command executed successfully or handled error gracefully
        assert.ok(true);
      } catch (error) {
        // Should not throw unhandled errors
        assert.fail("Command should handle errors gracefully");
      }
    });

    test("Should handle server not running gracefully", async () => {
      // Execute command when server is not running
      try {
        await vscode.commands.executeCommand("mcp-process.showDiagnostics");
        // Should complete without throwing
        assert.ok(true);
      } catch (error) {
        assert.fail("Command should not throw when server not running");
      }
    });
  });

  suite("Restart Server Command", () => {
    test("Should be executable", async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(
        commands.includes("mcp-process.restartServer"),
        "restartServer command should be registered"
      );
    });

    test("Should handle restart gracefully when server not initialized", async () => {
      // The command should handle the case where server is not initialized
      try {
        await vscode.commands.executeCommand("mcp-process.restartServer");
        // Should complete without throwing
        assert.ok(true);
      } catch (error) {
        // Should not throw unhandled errors
        assert.fail("Command should handle errors gracefully");
      }
    });
  });

  suite("Command Availability", () => {
    test("All manual recovery commands should be available in command palette", async () => {
      const commands = await vscode.commands.getCommands(true);

      const recoveryCommands = [
        "mcp-process.reconnectToServer",
        "mcp-process.showDiagnostics",
        "mcp-process.restartServer",
      ];

      for (const cmd of recoveryCommands) {
        assert.ok(
          commands.includes(cmd),
          `Command ${cmd} should be available in command palette`
        );
      }
    });
  });

  suite("Error Handling", () => {
    test("Commands should not crash extension when server unavailable", async () => {
      const ext = vscode.extensions.getExtension(
        "DigitalDefiance.mcp-acs-process"
      );
      assert.ok(ext);

      // Execute all recovery commands
      const commands = [
        "mcp-process.reconnectToServer",
        "mcp-process.showDiagnostics",
        "mcp-process.restartServer",
      ];

      for (const cmd of commands) {
        try {
          await vscode.commands.executeCommand(cmd);
        } catch (error) {
          // Commands may fail but should not crash
        }

        // Extension should still be active
        assert.ok(ext.isActive, `Extension should remain active after ${cmd}`);
      }
    });
  });

  suite("Command Execution Flow", () => {
    test("reconnectToServer should execute without blocking", async function () {
      this.timeout(5000);
      const startTime = Date.now();

      try {
        await vscode.commands.executeCommand("mcp-process.reconnectToServer");
      } catch (error) {
        // Expected to fail without server
      }

      const duration = Date.now() - startTime;
      // Command should complete quickly (not hang)
      assert.ok(duration < 3000, "Command should complete within 3 seconds");
    });

    test("showDiagnostics should execute without blocking", async function () {
      this.timeout(5000);
      const startTime = Date.now();

      try {
        await vscode.commands.executeCommand("mcp-process.showDiagnostics");
      } catch (error) {
        // Expected to fail without server
      }

      const duration = Date.now() - startTime;
      // Command should complete quickly (not hang)
      assert.ok(duration < 3000, "Command should complete within 3 seconds");
    });

    test("restartServer should execute without blocking", async function () {
      this.timeout(10000);
      const startTime = Date.now();

      try {
        await vscode.commands.executeCommand("mcp-process.restartServer");
      } catch (error) {
        // Expected to fail without server
      }

      const duration = Date.now() - startTime;
      // Restart may take longer but should not hang indefinitely
      assert.ok(duration < 8000, "Command should complete within 8 seconds");
    });
  });

  suite("Integration with Extension Lifecycle", () => {
    test("Commands should be available after extension activation", async () => {
      const ext = vscode.extensions.getExtension(
        "DigitalDefiance.mcp-acs-process"
      );
      assert.ok(ext);

      // Ensure extension is activated
      await ext.activate();
      assert.ok(ext.isActive);

      // Check commands are registered
      const commands = await vscode.commands.getCommands(true);
      assert.ok(commands.includes("mcp-process.reconnectToServer"));
      assert.ok(commands.includes("mcp-process.showDiagnostics"));
      assert.ok(commands.includes("mcp-process.restartServer"));
    });
  });
});
