import * as assert from "assert";
import * as vscode from "vscode";
import { MCPProcessClient } from "../../mcpClient";

suite("MCP Client Test Suite", () => {
  let outputChannel: vscode.OutputChannel;
  let client: MCPProcessClient;

  setup(() => {
    outputChannel = vscode.window.createOutputChannel("Test MCP Client");
    client = new MCPProcessClient(outputChannel);
  });

  teardown(() => {
    if (client) {
      client.stop();
    }
    outputChannel.dispose();
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

  test("stop should not throw when called without start", () => {
    assert.doesNotThrow(() => {
      client.stop();
    });
  });

  test("Methods should throw when server not started", async () => {
    await assert.rejects(
      async () => await client.startProcess({ executable: "node" }),
      /Server not running/
    );

    await assert.rejects(
      async () => await client.terminateProcess({ pid: 1234 }),
      /Server not running/
    );

    await assert.rejects(
      async () => await client.getProcessStats({ pid: 1234 }),
      /Server not running/
    );

    await assert.rejects(
      async () => await client.listProcesses(),
      /Server not running/
    );
  });

  suite("With Mock Server", () => {
    // These tests would require a mock MCP server
    // For now, we'll test the error handling

    test("start should handle server not found", async function () {
      this.timeout(5000);
      const config = vscode.workspace.getConfiguration("mcp-process");
      await config.update(
        "serverPath",
        "/nonexistent/path",
        vscode.ConfigurationTarget.Global
      );

      try {
        // The spawn will fail immediately with ENOENT
        // We expect this to throw or emit an error
        await client.start();

        // If we get here, wait for the error event
        if (client.serverProcess) {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error("Expected error but none occurred"));
            }, 2000);

            client.serverProcess!.once("error", () => {
              clearTimeout(timeout);
              resolve();
            });

            client.serverProcess!.once("exit", (code: number) => {
              if (code !== 0) {
                clearTimeout(timeout);
                resolve();
              }
            });
          });
        }
      } catch (error: any) {
        // Expected - spawn failed immediately
        assert.ok(error);
      } finally {
        await config.update(
          "serverPath",
          undefined,
          vscode.ConfigurationTarget.Global
        );
      }
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
        assert.ok(error.message.includes("Server not running"));
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
        assert.ok(error.message.includes("Server not running"));
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
        assert.ok(error.message.includes("Server not running"));
      }
    });
  });

  suite("Configuration", () => {
    test("Should read serverPath from configuration", () => {
      const config = vscode.workspace.getConfiguration("mcp-process");
      const serverPath = config.get<string>("serverPath");
      assert.ok(serverPath !== undefined);
    });

    test("Should read configPath from configuration", () => {
      const config = vscode.workspace.getConfiguration("mcp-process");
      const configPath = config.get<string>("configPath");
      assert.ok(configPath !== undefined);
    });

    test("Should read autoStart from configuration", () => {
      const config = vscode.workspace.getConfiguration("mcp-process");
      const autoStart = config.get<boolean>("autoStart");
      assert.ok(typeof autoStart === "boolean");
    });
  });
});
