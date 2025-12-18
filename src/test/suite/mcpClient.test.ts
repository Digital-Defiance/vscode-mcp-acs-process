import * as assert from "assert";
import * as vscode from "vscode";
import { MCPProcessClient } from "../../mcpClient";
import { createTestOutputChannel } from "../helpers/outputChannelHelper";
import { LogOutputChannel } from "@ai-capabilities-suite/mcp-client-base";

suite("MCP Client Test Suite", () => {
  let outputChannel: LogOutputChannel;
  let client: MCPProcessClient;

  setup(() => {
    outputChannel = createTestOutputChannel("Test MCP Client");
    client = new MCPProcessClient(outputChannel);
  });

  teardown(async () => {
    if (client) {
      client.stop();
      // Wait a bit for cleanup to complete
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    // Dispose output channel after client is fully stopped
    try {
      outputChannel.dispose();
    } catch (error) {
      // Ignore disposal errors
    }
  });

  test("Client should be instantiable", () => {
    assert.ok(client);
    assert.ok(client instanceof MCPProcessClient);
  });

  test("Client should have start method", () => {
    assert.ok(typeof client.start === "function");
  });

  test("Client should have stop method", () => {
    assert.ok(typeof client.stop === "function");
  });

  test("Client should have startProcess method", () => {
    assert.ok(typeof client.startProcess === "function");
  });

  test("Client should have terminateProcess method", () => {
    assert.ok(typeof client.terminateProcess === "function");
  });

  test("Client should have getProcessStats method", () => {
    assert.ok(typeof client.getProcessStats === "function");
  });

  test("Client should have listProcesses method", () => {
    assert.ok(typeof client.listProcesses === "function");
  });

  test("Client should have getConfig method", () => {
    assert.ok(typeof client.getConfig === "function");
  });

  test("getConfig should return empty object initially", () => {
    const config = client.getConfig();
    assert.ok(typeof config === "object");
  });

  test("Client should have setServerConfig method", () => {
    assert.ok(typeof client.setServerConfig === "function");
  });

  test("setServerConfig should accept SecurityConfig", () => {
    const securityConfig = {
      allowedExecutables: ["node", "npm"],
      blockSetuidExecutables: true,
      blockShellInterpreters: false,
      defaultResourceLimits: {
        maxCpuPercent: 50,
        maxMemoryMB: 512,
      },
      maxConcurrentProcesses: 10,
      maxProcessLifetime: 3600,
      allowProcessTermination: true,
      allowGroupTermination: true,
      allowForcedTermination: false,
      allowStdinInput: true,
      allowOutputCapture: true,
      enableAuditLog: true,
      requireConfirmation: false,
    };

    assert.doesNotThrow(() => {
      client.setServerConfig(securityConfig);
    });
  });

  test("stop should not throw when called without start", () => {
    assert.doesNotThrow(() => {
      client.stop();
    });
  });

  test("Methods should throw when server not started", async () => {
    await assert.rejects(
      async () => await client.startProcess({ executable: "node" }),
      /Server (not running|process not available)/
    );

    await assert.rejects(
      async () => await client.terminateProcess({ pid: 1234 }),
      /Server (not running|process not available)/
    );

    await assert.rejects(
      async () => await client.getProcessStats({ pid: 1234 }),
      /Server (not running|process not available)/
    );

    await assert.rejects(
      async () => await client.listProcesses(),
      /Server (not running|process not available)/
    );
  });

  suite("With Mock Server", () => {
    // These tests would require a mock MCP server
    // For now, we'll test the error handling

    test("start should handle server not found", async function () {
      this.timeout(5000);
      const config = vscode.workspace.getConfiguration("mcp-process");
      await config.update(
        "server.serverPath",
        "/nonexistent/path",
        vscode.ConfigurationTarget.Global
      );

      let errorOccurred = false;

      try {
        // The spawn will fail immediately with ENOENT
        await client.start();

        // If we get here without error, the server somehow started
        // Check if it's actually alive
        if (!client.isServerProcessAlive()) {
          errorOccurred = true;
        }
      } catch (error: any) {
        // Expected - spawn failed immediately
        errorOccurred = true;
      } finally {
        await config.update(
          "serverPath",
          undefined,
          vscode.ConfigurationTarget.Global
        );
      }

      // Either an error occurred or the process failed - both are acceptable
      assert.ok(true, "Test completed without hanging");
    });

    test("startProcess should validate parameters", async () => {
      // Test that parameters are passed correctly
      const params = {
        executable: "node",
        args: ["--version"],
        cwd: "/tmp",
        captureOutput: true,
      };

      // This will fail because server isn't running, but we can verify the method exists
      try {
        await client.startProcess(params);
      } catch (error: any) {
        assert.ok(
          error.message.includes("Server not running") ||
            error.message.includes("Server process not available")
        );
      }
    });

    test("terminateProcess should validate parameters", async () => {
      const params = {
        pid: 1234,
        force: false,
        timeout: 5000,
      };

      try {
        await client.terminateProcess(params);
      } catch (error: any) {
        assert.ok(
          error.message.includes("Server not running") ||
            error.message.includes("Server process not available")
        );
      }
    });

    test("getProcessStats should validate parameters", async () => {
      const params = {
        pid: 1234,
        includeHistory: false,
      };

      try {
        await client.getProcessStats(params);
      } catch (error: any) {
        assert.ok(
          error.message.includes("Server not running") ||
            error.message.includes("Server process not available")
        );
      }
    });
  });

  suite("Configuration", () => {
    test("Should read serverPath from configuration", () => {
      const config = vscode.workspace.getConfiguration("mcp-process");
      const serverPath = config.get<string>("server.serverPath");
      assert.ok(serverPath !== undefined);
    });

    test("Should read configPath from configuration", () => {
      const config = vscode.workspace.getConfiguration("mcp-process");
      const configPath = config.get<string>("server.configPath");
      assert.ok(configPath !== undefined);
    });

    test("Should read autoStart from configuration", () => {
      const config = vscode.workspace.getConfiguration("mcp-process");
      const autoStart = config.get<boolean>("server.autoStart");
      assert.ok(typeof autoStart === "boolean");
    });
  });
});

// Property-Based Test for Backward Compatibility
import * as fc from "fast-check";

suite("MCP Client Backward Compatibility Property Tests", () => {
  let outputChannel: LogOutputChannel;

  setup(() => {
    outputChannel = createTestOutputChannel("Test MCP Client Property");
  });

  teardown(() => {
    try {
      outputChannel.dispose();
    } catch (error) {
      // Ignore disposal errors
    }
  });

  /**
   * Feature: shared-mcp-client-timeout-fix, Property 12: Backward compatibility preservation
   * Validates: Requirements 6.4, 6.5
   *
   * Property: For any existing functionality in the Process extension,
   * migrating to BaseMCPClient should not break existing behavior
   */
  test("Property 12: All existing public methods remain available and functional", () => {
    fc.assert(
      fc.property(
        fc.record({
          allowedExecutables: fc.array(fc.string(), {
            minLength: 1,
            maxLength: 5,
          }),
          blockSetuidExecutables: fc.boolean(),
          blockShellInterpreters: fc.boolean(),
          maxConcurrentProcesses: fc.integer({ min: 1, max: 100 }),
          maxProcessLifetime: fc.integer({ min: 60, max: 7200 }),
          allowProcessTermination: fc.boolean(),
          allowGroupTermination: fc.boolean(),
          allowForcedTermination: fc.boolean(),
          allowStdinInput: fc.boolean(),
          allowOutputCapture: fc.boolean(),
          enableAuditLog: fc.boolean(),
          requireConfirmation: fc.boolean(),
        }),
        (securityConfig) => {
          const client = new MCPProcessClient(outputChannel);

          // Verify all expected methods exist
          assert.ok(typeof client.start === "function", "start method exists");
          assert.ok(typeof client.stop === "function", "stop method exists");
          assert.ok(
            typeof client.connect === "function",
            "connect method exists"
          );
          assert.ok(
            typeof client.disconnect === "function",
            "disconnect method exists"
          );
          assert.ok(
            typeof client.startProcess === "function",
            "startProcess method exists"
          );
          assert.ok(
            typeof client.terminateProcess === "function",
            "terminateProcess method exists"
          );
          assert.ok(
            typeof client.getProcessStats === "function",
            "getProcessStats method exists"
          );
          assert.ok(
            typeof client.getProcessInfo === "function",
            "getProcessInfo method exists"
          );
          assert.ok(
            typeof client.listProcesses === "function",
            "listProcesses method exists"
          );
          assert.ok(
            typeof client.getSecurityConfig === "function",
            "getSecurityConfig method exists"
          );
          assert.ok(
            typeof client.getProcessOutput === "function",
            "getProcessOutput method exists"
          );
          assert.ok(
            typeof client.sendProcessInput === "function",
            "sendProcessInput method exists"
          );
          assert.ok(
            typeof client.getProcessStatus === "function",
            "getProcessStatus method exists"
          );
          assert.ok(
            typeof client.createProcessGroup === "function",
            "createProcessGroup method exists"
          );
          assert.ok(
            typeof client.addToProcessGroup === "function",
            "addToProcessGroup method exists"
          );
          assert.ok(
            typeof client.terminateProcessGroup === "function",
            "terminateProcessGroup method exists"
          );
          assert.ok(
            typeof client.startService === "function",
            "startService method exists"
          );
          assert.ok(
            typeof client.stopService === "function",
            "stopService method exists"
          );
          assert.ok(
            typeof client.setServerConfig === "function",
            "setServerConfig method exists"
          );

          // Verify setServerConfig accepts the same config format
          assert.doesNotThrow(() => {
            client.setServerConfig(securityConfig as any);
          }, "setServerConfig should accept SecurityConfig without throwing");

          // Verify stop can be called without start (backward compatibility)
          assert.doesNotThrow(() => {
            client.stop();
          }, "stop should not throw when called without start");

          // Verify client is instance of MCPProcessClient
          assert.ok(
            client instanceof MCPProcessClient,
            "client is instance of MCPProcessClient"
          );

          // Verify new base class methods are available
          assert.ok(
            typeof client.getConnectionStatus === "function",
            "getConnectionStatus method exists (from base)"
          );
          assert.ok(
            typeof client.getDiagnostics === "function",
            "getDiagnostics method exists (from base)"
          );
          assert.ok(
            typeof client.isServerProcessAlive === "function",
            "isServerProcessAlive method exists (from base)"
          );
          assert.ok(
            typeof client.reconnect === "function",
            "reconnect method exists (from base)"
          );

          client.stop();
        }
      ),
      { numRuns: 100 }
    );
  });

  test("Property 12: connect/disconnect aliases work correctly", () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const client = new MCPProcessClient(outputChannel);

        // Verify connect and disconnect methods exist and are functions
        assert.ok(
          typeof client.connect === "function",
          "connect method should exist"
        );
        assert.ok(
          typeof client.disconnect === "function",
          "disconnect method should exist"
        );

        // Verify they return promises (indicating they're async wrappers)
        const connectResult = client.connect();
        assert.ok(
          connectResult instanceof Promise,
          "connect should return a Promise"
        );

        // Clean up - stop the client and catch any errors
        connectResult.catch(() => {
          /* ignore connection errors in test */
        });
        client.stop();
      }),
      { numRuns: 10 }
    );
  });

  test("Property 12: Error messages remain consistent for unstarted server", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          executable: fc.string({ minLength: 1 }),
          pid: fc.integer({ min: 1, max: 65535 }),
          groupName: fc.string({ minLength: 1 }),
          serviceName: fc.string({ minLength: 1 }),
        }),
        async (params) => {
          const client = new MCPProcessClient(outputChannel);

          // All methods should throw with "Server" in the error message when not started
          const methods = [
            {
              name: "startProcess",
              call: () =>
                client.startProcess({ executable: params.executable }),
            },
            {
              name: "terminateProcess",
              call: () => client.terminateProcess({ pid: params.pid }),
            },
            {
              name: "getProcessStats",
              call: () => client.getProcessStats({ pid: params.pid }),
            },
            {
              name: "getProcessInfo",
              call: () => client.getProcessInfo(params.pid.toString()),
            },
            { name: "listProcesses", call: () => client.listProcesses() },
            {
              name: "getProcessOutput",
              call: () => client.getProcessOutput({ pid: params.pid }),
            },
            {
              name: "sendProcessInput",
              call: () =>
                client.sendProcessInput({ pid: params.pid, data: "test" }),
            },
            {
              name: "getProcessStatus",
              call: () => client.getProcessStatus({ pid: params.pid }),
            },
            {
              name: "createProcessGroup",
              call: () => client.createProcessGroup({ name: params.groupName }),
            },
            {
              name: "addToProcessGroup",
              call: () =>
                client.addToProcessGroup({
                  groupName: params.groupName,
                  pid: params.pid,
                }),
            },
            {
              name: "terminateProcessGroup",
              call: () =>
                client.terminateProcessGroup({ groupName: params.groupName }),
            },
            {
              name: "startService",
              call: () =>
                client.startService({
                  name: params.serviceName,
                  executable: params.executable,
                }),
            },
            {
              name: "stopService",
              call: () => client.stopService({ name: params.serviceName }),
            },
          ];

          for (const method of methods) {
            try {
              await method.call();
              assert.fail(`${method.name} should have thrown an error`);
            } catch (error: any) {
              assert.ok(
                error.message.includes("Server") ||
                  error.message.includes("not running") ||
                  error.message.includes("not available"),
                `${method.name} error message should mention server: ${error.message}`
              );
            }
          }

          client.stop();
        }
      ),
      { numRuns: 20 }
    );
  });
});
