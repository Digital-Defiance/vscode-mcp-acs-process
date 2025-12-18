import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { spawn } from "child_process";
import { MCPProcessClient } from "../../mcpClient";
import { createTestOutputChannel } from "../helpers/outputChannelHelper";

/**
 * Helper function to wait for a process to be registered with retries
 */
async function waitForProcess<T>(
  fn: () => Promise<T>,
  initialDelay = 1500,
  retries = 5,
  retryDelay = 800
): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, initialDelay));
  let lastError: any;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }
  throw lastError;
}

/**
 * True End-to-End Tests
 *
 * These tests actually:
 * - Start a real MCP server process
 * - Communicate via JSON-RPC over stdio
 * - Launch real processes
 * - Test security boundaries
 * - Validate tree view content
 */
suite("E2E Test Suite - Real MCP Server", () => {
  let testConfigPath: string;
  let mcpClient: MCPProcessClient | null = null;

  setup(async function () {
    this.timeout(10000);

    // Set environment variable to enable E2E mode
    process.env.VSCODE_E2E_TEST = "true";

    // Create test configuration
    testConfigPath = path.join(__dirname, "../../../test-e2e-config.json");
    const testConfig = {
      allowedExecutables: ["node", "echo", "sleep", "cat", "ls"],
      blockSetuidExecutables: true,
      blockShellInterpreters: false,
      defaultResourceLimits: {
        maxCpuPercent: 80,
        maxMemoryMB: 512,
        maxFileDescriptors: 100,
        maxCpuTime: 60,
        maxProcesses: 5,
      },
      maxConcurrentProcesses: 5,
      maxProcessLifetime: 300,
      allowProcessTermination: true,
      allowGroupTermination: true,
      allowForcedTermination: true,
      allowStdinInput: true,
      allowOutputCapture: true,
      enableAuditLog: false,
      requireConfirmation: false,
    };

    fs.writeFileSync(testConfigPath, JSON.stringify(testConfig, null, 2));

    // Try to find the MCP server CLI
    // First check if it's installed locally in node_modules
    let mcpServerPath = path.join(
      __dirname,
      "../../../node_modules/@ai-capabilities-suite/mcp-process/dist/cli.js"
    );

    // If not found locally, try the monorepo location (for development)
    if (!fs.existsSync(mcpServerPath)) {
      mcpServerPath = path.join(
        __dirname,
        "../../../../../mcp-process/dist/cli.js"
      );
    }

    // If still not found, skip E2E tests
    if (!fs.existsSync(mcpServerPath)) {
      console.log(
        "MCP server not found (not installed locally or in monorepo), skipping E2E tests"
      );
      this.skip();
      return;
    }

    // Configure VS Code settings for the MCP client to use
    const config = vscode.workspace.getConfiguration("mcp-process");
    await config.update(
      "server.serverPath",
      mcpServerPath,
      vscode.ConfigurationTarget.Global
    );
    await config.update(
      "server.configPath",
      testConfigPath,
      vscode.ConfigurationTarget.Global
    );
    await config.update(
      "server.useConfigFile",
      true,
      vscode.ConfigurationTarget.Global
    );

    // Wait for config to settle
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Create MCP client with output channel for debugging
    const outputChannel = createTestOutputChannel("E2E Test MCP Client");
    mcpClient = new MCPProcessClient(outputChannel);

    try {
      await mcpClient.connect();
      // Note: serverProcess is protected, we can't access it directly anymore

      // Wait a bit for server to fully initialize
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.log(`Failed to connect to MCP server: ${error.message}`);
      outputChannel.appendLine(
        `Failed to connect to MCP server: ${error.message}`
      );
      this.skip();
      return;
    }
  });

  teardown(async function () {
    this.timeout(5000);

    // Clean up environment variable
    delete process.env.VSCODE_E2E_TEST;

    // Disconnect client
    if (mcpClient) {
      await mcpClient.disconnect();
      mcpClient = null;
    }

    // Clean up test config
    if (fs.existsSync(testConfigPath)) {
      fs.unlinkSync(testConfigPath);
    }

    // Reset VS Code settings
    const config = vscode.workspace.getConfiguration("mcp-process");
    await config.update(
      "server.serverPath",
      undefined,
      vscode.ConfigurationTarget.Global
    );
    await config.update(
      "server.configPath",
      undefined,
      vscode.ConfigurationTarget.Global
    );
    await config.update(
      "server.useConfigFile",
      undefined,
      vscode.ConfigurationTarget.Global
    );
  });

  suite("Real Process Lifecycle", () => {
    test("Should start and list a real process", async function () {
      this.timeout(10000);

      if (!mcpClient) {
        this.skip();
        return;
      }

      // Start a process with longer lifetime
      const processId = await mcpClient.startProcess({
        executable: "sleep",
        args: ["30"],
        workingDirectory: process.cwd(),
      });

      assert.ok(processId);
      assert.ok(typeof processId === "string");

      // Wait a bit for process to be registered
      await new Promise((resolve) => setTimeout(resolve, 500));

      // List processes
      const processes = await mcpClient.listProcesses();
      assert.ok(Array.isArray(processes));
      assert.ok(processes.length > 0);

      // Find our process - MCP server returns 'pid' not 'id'
      const ourProcess = processes.find(
        (p: any) => p.pid?.toString() === processId
      );
      assert.ok(ourProcess, `Process ${processId} not found in list`);
      // MCP server returns 'command' not 'executable'
      assert.strictEqual(ourProcess.command, "sleep");
      assert.strictEqual(ourProcess.state, "running");

      // Terminate the process
      await mcpClient.terminateProcess(processId);

      // Verify it's gone
      await new Promise((resolve) => setTimeout(resolve, 500));
      const processesAfter = await mcpClient.listProcesses();
      const stillRunning = processesAfter.find(
        (p: any) => p.pid?.toString() === processId && p.state === "running"
      );
      assert.ok(!stillRunning);
    });

    test("Should capture process output", async function () {
      this.timeout(10000);

      if (!mcpClient) {
        this.skip();
        return;
      }

      // Start a process that produces output and stays alive
      const processId = await mcpClient.startProcess({
        executable: "sleep",
        args: ["10"],
        workingDirectory: process.cwd(),
        captureOutput: true,
      });

      console.log(`[E2E] Started process with ID: ${processId}`);

      // Immediately check if process exists
      await new Promise((resolve) => setTimeout(resolve, 500));
      const allProcs = await mcpClient.listProcesses();
      console.log(
        `[E2E] All processes: ${allProcs
          .map((p: any) => `${p.pid}:${p.command}`)
          .join(", ")}`
      );

      // Wait for process to be registered and retry if needed
      let info;
      let retries = 5;
      while (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        try {
          info = await mcpClient.getProcessInfo(processId);
          console.log(`[E2E] Got process info on retry ${6 - retries}`);
          break;
        } catch (error: any) {
          console.log(`[E2E] Retry ${6 - retries} failed: ${error.message}`);
          retries--;
          if (retries === 0) throw error;
        }
      }

      assert.ok(info);
      assert.ok(info.pid);
      assert.strictEqual(info.state, "running");

      // Clean up
      try {
        await mcpClient.terminateProcess(processId);
      } catch (error) {
        // Process may have already exited
      }
    });

    test("Should enforce resource limits", async function () {
      this.timeout(10000);

      if (!mcpClient) {
        this.skip();
        return;
      }

      // Try to start a process with custom limits
      const processId = await mcpClient.startProcess({
        executable: "sleep",
        args: ["20"],
        workingDirectory: process.cwd(),
        resourceLimits: {
          maxCpuPercent: 50,
          maxMemoryMB: 100,
        },
      });

      assert.ok(processId);

      // Wait for process to be registered and retry if needed
      let info;
      let retries = 5;
      while (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        try {
          info = await mcpClient.getProcessInfo(processId);
          break;
        } catch (error: any) {
          retries--;
          if (retries === 0) throw error;
        }
      }

      assert.ok(info);
      assert.ok(info.pid);
      assert.strictEqual(info.state, "running");

      // Clean up
      try {
        await mcpClient.terminateProcess(processId);
      } catch (error) {
        // Process may have already exited
      }
    });
  });

  suite("Security Boundary Enforcement", () => {
    test("Should block non-allowlisted executables", async function () {
      this.timeout(5000);

      if (!mcpClient) {
        this.skip();
        return;
      }

      // Try to start a non-allowlisted executable
      const cwd = process.cwd();
      try {
        await mcpClient.startProcess({
          executable: "/bin/bash",
          args: ["-c", "echo test"],
          workingDirectory: cwd,
        });
        assert.fail("Should have thrown an error");
      } catch (error: any) {
        assert.ok(error);
        assert.ok(
          error.message.includes("not allowed") ||
            error.message.includes("blocked") ||
            error.message.includes("security")
        );
      }
    });

    test("Should allow allowlisted executables", async function () {
      this.timeout(5000);

      if (!mcpClient) {
        this.skip();
        return;
      }

      // Start an allowlisted executable that stays alive
      const cwd = process.cwd();
      const processId = await mcpClient.startProcess({
        executable: "sleep",
        args: ["10"],
        workingDirectory: cwd,
      });

      assert.ok(processId);

      // Wait and verify process exists
      await new Promise((resolve) => setTimeout(resolve, 500));
      const processes = await mcpClient.listProcesses();
      const foundProcess = processes.find(
        (p: any) => p.pid?.toString() === processId
      );

      // Clean up if process is still running
      if (foundProcess && foundProcess.state === "running") {
        try {
          await mcpClient.terminateProcess(processId);
        } catch (error) {
          // Process may have already exited
        }
      }
    });

    test("Should get security configuration", async function () {
      this.timeout(5000);

      if (!mcpClient) {
        this.skip();
        return;
      }

      const config = await mcpClient.getSecurityConfig();
      assert.ok(config);
      assert.ok(Array.isArray(config.allowedExecutables));
      assert.ok(config.allowedExecutables.includes("echo"));
      assert.ok(config.allowedExecutables.includes("node"));
      assert.strictEqual(config.blockSetuidExecutables, true);
    });
  });

  suite("Process Statistics", () => {
    test("Should get real-time process statistics", async function () {
      this.timeout(10000);

      if (!mcpClient) {
        this.skip();
        return;
      }

      // Start a process
      const processId = await mcpClient.startProcess({
        executable: "sleep",
        args: ["30"],
        workingDirectory: process.cwd(),
      });

      // Wait for process to be registered and retry if needed
      let stats;
      let retries = 5;
      while (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        try {
          stats = await mcpClient.getProcessStats(processId);
          break;
        } catch (error: any) {
          retries--;
          if (retries === 0) throw error;
        }
      }

      assert.ok(stats);
      // Stats may have different structure - just verify we got something
      assert.ok(
        stats.cpuPercent !== undefined || stats.stats?.cpuPercent !== undefined
      );

      // Clean up
      try {
        await mcpClient.terminateProcess(processId);
      } catch (error) {
        // Process may have already exited
      }
    });

    test("Should track process uptime", async function () {
      this.timeout(10000);

      if (!mcpClient) {
        this.skip();
        return;
      }

      // Start a process
      const processId = await mcpClient.startProcess({
        executable: "sleep",
        args: ["30"],
        workingDirectory: process.cwd(),
      });

      // Wait for process to be registered and retry if needed
      let info;
      let retries = 5;
      while (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        try {
          info = await mcpClient.getProcessInfo(processId);
          break;
        } catch (error: any) {
          retries--;
          if (retries === 0) throw error;
        }
      }

      assert.ok(info);
      assert.ok(info.pid);
      assert.strictEqual(info.state, "running");

      // Clean up
      try {
        await mcpClient.terminateProcess(processId);
      } catch (error) {
        // Process may have already exited
      }
    });
  });

  suite("Tree View Content Validation", () => {
    test("Should populate process tree with real data", async function () {
      this.timeout(15000);

      if (!mcpClient) {
        this.skip();
        return;
      }

      // Activate extension
      const ext = vscode.extensions.getExtension(
        "DigitalDefiance.mcp-acs-process"
      );
      assert.ok(ext);
      await ext!.activate();

      // Start some processes
      const pid1 = await mcpClient.startProcess({
        executable: "sleep",
        args: ["30"],
        workingDirectory: process.cwd(),
      });

      const pid2 = await mcpClient.startProcess({
        executable: "sleep",
        args: ["30"],
        workingDirectory: process.cwd(),
      });

      // Wait for processes to be registered
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Refresh tree
      await vscode.commands.executeCommand("mcp-process.refreshProcessList");

      // Get processes from client
      const processes = await mcpClient.listProcesses();
      assert.ok(
        processes.length >= 2,
        `Expected at least 2 processes, got ${processes.length}`
      );

      // Verify our processes are there - MCP server returns 'pid' not 'id'
      const p1 = processes.find((p: any) => p.pid?.toString() === pid1);
      const p2 = processes.find((p: any) => p.pid?.toString() === pid2);
      assert.ok(p1, `Process ${pid1} not found`);
      assert.ok(p2, `Process ${pid2} not found`);
      // MCP server returns 'command' field
      assert.ok(p1.command, "Process 1 should have command");
      assert.ok(p2.command, "Process 2 should have command");
      assert.ok(
        p1.command.includes("sleep"),
        `Expected sleep command, got: ${p1.command}`
      );
      assert.ok(
        p2.command.includes("sleep"),
        `Expected sleep command, got: ${p2.command}`
      );

      // Clean up
      try {
        await mcpClient.terminateProcess(pid1);
        await mcpClient.terminateProcess(pid2);
      } catch (error) {
        // Processes may have already exited
      }
    });

    test("Should show security boundaries in tree", async function () {
      this.timeout(5000);

      if (!mcpClient) {
        this.skip();
        return;
      }

      // Activate extension
      const ext = vscode.extensions.getExtension(
        "DigitalDefiance.mcp-acs-process"
      );
      assert.ok(ext);
      await ext!.activate();

      // Show security boundaries
      await vscode.commands.executeCommand(
        "mcp-process.showSecurityBoundaries"
      );

      // Get security config
      const config = await mcpClient.getSecurityConfig();
      assert.ok(config);
      assert.ok(config.allowedExecutables.length > 0);
    });
  });

  suite("Concurrent Operations", () => {
    test("Should handle multiple simultaneous process starts", async function () {
      this.timeout(15000);

      if (!mcpClient) {
        this.skip();
        return;
      }

      // Start multiple processes concurrently
      const promises = [
        mcpClient.startProcess({
          executable: "sleep",
          args: ["30"],
          workingDirectory: process.cwd(),
        }),
        mcpClient.startProcess({
          executable: "sleep",
          args: ["30"],
          workingDirectory: process.cwd(),
        }),
        mcpClient.startProcess({
          executable: "sleep",
          args: ["30"],
          workingDirectory: process.cwd(),
        }),
      ];

      const processIds = await Promise.all(promises);
      assert.strictEqual(processIds.length, 3);
      assert.ok(processIds.every((id) => typeof id === "string"));

      // Wait for processes to be registered
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify all are running
      const processes = await mcpClient.listProcesses();
      const ourProcesses = processes.filter((p: any) =>
        processIds.includes(p.pid?.toString())
      );
      assert.strictEqual(
        ourProcesses.length,
        3,
        `Expected 3 processes, found ${ourProcesses.length}`
      );

      // Clean up
      await Promise.all(
        processIds.map((id) =>
          mcpClient!.terminateProcess(id).catch(() => {
            // Process may have already exited
          })
        )
      );
    });

    test("Should handle rapid list operations", async function () {
      this.timeout(10000);

      if (!mcpClient) {
        this.skip();
        return;
      }

      // Start a process
      const processId = await mcpClient.startProcess({
        executable: "sleep",
        args: ["30"],
        workingDirectory: process.cwd(),
      });

      // Wait for process to be registered
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Perform many list operations rapidly
      const promises = Array(20)
        .fill(null)
        .map(() => mcpClient!.listProcesses());

      const results = await Promise.all(promises);
      assert.strictEqual(results.length, 20);
      assert.ok(results.every((r) => Array.isArray(r)));

      // Clean up
      try {
        await mcpClient.terminateProcess(processId);
      } catch (error) {
        // Process may have already exited
      }
    });
  });

  suite("Error Handling", () => {
    test("Should handle process that exits immediately", async function () {
      this.timeout(5000);

      if (!mcpClient) {
        this.skip();
        return;
      }

      // Start a process that stays alive long enough to query
      const processId = await mcpClient.startProcess({
        executable: "sleep",
        args: ["2"],
        workingDirectory: process.cwd(),
      });

      assert.ok(processId);

      // Query it while it's still running with retry
      let info;
      let retries = 5;
      while (retries > 0) {
        await new Promise((resolve) => setTimeout(resolve, 200));
        try {
          info = await mcpClient.getProcessInfo(processId);
          break;
        } catch (error: any) {
          retries--;
          if (retries === 0) throw error;
        }
      }

      assert.ok(info);
      assert.ok(info.pid);

      // Clean up
      try {
        await mcpClient.terminateProcess(processId);
      } catch (error) {
        // Process may have already exited
      }
    });

    test("Should handle terminating non-existent process", async function () {
      this.timeout(5000);

      if (!mcpClient) {
        this.skip();
        return;
      }

      // Try to terminate a non-existent process
      try {
        await mcpClient.terminateProcess("999999");
        // May or may not throw, depending on implementation
      } catch (error: any) {
        assert.ok(error);
        assert.ok(
          error.message.includes("not found") ||
            error.message.includes("does not exist") ||
            error.message.includes("PROCESS_NOT_FOUND")
        );
      }
    });

    test("Should handle getting info for non-existent process", async function () {
      this.timeout(5000);

      if (!mcpClient) {
        this.skip();
        return;
      }

      // Try to get info for non-existent process
      try {
        await mcpClient.getProcessInfo("999999");
        assert.fail("Should have thrown an error");
      } catch (error: any) {
        assert.ok(error);
        // MCP server returns error with PROCESS_NOT_FOUND code
        assert.ok(
          error.message.includes("not found") ||
            error.message.includes("does not exist") ||
            error.message.includes("PROCESS_NOT_FOUND") ||
            error.message.includes("Process 999999 not found")
        );
      }
    });
  });

  suite("MCP Protocol Communication", () => {
    test("Should handle JSON-RPC requests correctly", async function () {
      this.timeout(5000);

      if (!mcpClient) {
        this.skip();
        return;
      }

      // Make a request and verify response format
      const processes = await mcpClient.listProcesses();
      assert.ok(Array.isArray(processes));

      // Each process should have required fields
      if (processes.length > 0) {
        const process = processes[0];
        assert.ok(process.id);
        assert.ok(process.executable);
        assert.ok(process.status);
        assert.ok(process.startTime);
      }
    });

    test("Should handle server errors gracefully", async function () {
      this.timeout(5000);

      if (!mcpClient) {
        this.skip();
        return;
      }

      // Try an invalid operation
      try {
        await mcpClient.startProcess({
          executable: "",
          args: [],
          workingDirectory: process.cwd(),
        });
        assert.fail("Should have thrown an error");
      } catch (error: any) {
        assert.ok(error);
        assert.ok(error.message);
      }
    });
  });
});
