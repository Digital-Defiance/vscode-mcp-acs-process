import * as assert from "assert";
import * as vscode from "vscode";
import {
  ProcessTreeDataProvider,
  ProcessTreeItem,
} from "../../processTreeProvider";
import { MCPProcessClient, ProcessInfo } from "../../mcpClient";

suite("Process Tree Provider Test Suite", () => {
  let provider: ProcessTreeDataProvider;
  let outputChannel: vscode.OutputChannel;

  setup(() => {
    provider = new ProcessTreeDataProvider();
    outputChannel = vscode.window.createOutputChannel("Test Process Tree");
  });

  teardown(() => {
    outputChannel.dispose();
  });

  test("Provider should be instantiable", () => {
    assert.ok(provider);
    assert.ok(provider instanceof ProcessTreeDataProvider);
  });

  test("Provider should implement TreeDataProvider", () => {
    assert.ok(typeof provider.getTreeItem === "function");
    assert.ok(typeof provider.getChildren === "function");
    assert.ok(provider.onDidChangeTreeData);
  });

  test("Provider should have refresh method", () => {
    assert.ok(typeof provider.refresh === "function");
  });

  test("Provider should have setMCPClient method", () => {
    assert.ok(typeof provider.setMCPClient === "function");
  });

  test("getChildren should return empty array without client", async () => {
    const children = await provider.getChildren();
    assert.ok(Array.isArray(children));
    assert.strictEqual(children.length, 0);
  });

  test("getChildren should return empty array for child elements", async () => {
    const mockProcess: ProcessInfo = {
      id: "1234",
      pid: 1234,
      executable: "node",
      command: "node",
      args: ["--version"],
      status: "running",
      state: "running",
      uptime: 1000,
      startTime: new Date().toISOString(),
    };

    const item = new ProcessTreeItem(
      mockProcess,
      vscode.TreeItemCollapsibleState.None
    );
    const children = await provider.getChildren(item);
    assert.ok(Array.isArray(children));
    assert.strictEqual(children.length, 0);
  });

  test("refresh should not throw", async () => {
    await assert.doesNotReject(async () => {
      await provider.refresh();
    });
  });

  test("refresh should fire onDidChangeTreeData event", (done) => {
    let eventFired = false;

    const disposable = provider.onDidChangeTreeData(() => {
      eventFired = true;
      disposable.dispose();
      assert.ok(eventFired);
      done();
    });

    provider.refresh();
  });

  suite("ProcessTreeItem", () => {
    test("Should create item with running state", () => {
      const mockProcess: ProcessInfo = {
        id: "1234",
        pid: 1234,
        executable: "node",
        command: "node",
        args: ["--version"],
        status: "running",
        state: "running",
        uptime: 5000,
        startTime: new Date().toISOString(),
      };

      const item = new ProcessTreeItem(
        mockProcess,
        vscode.TreeItemCollapsibleState.None
      );

      assert.ok(item);
      assert.strictEqual(item.label, "PID 1234: node");
      assert.strictEqual(item.contextValue, "process");
      assert.strictEqual(item.pid, 1234);
      assert.ok(item.description);
      assert.ok(item.tooltip);
    });

    test("Should create item with stopped state", () => {
      const mockProcess: ProcessInfo = {
        id: "5678",
        pid: 5678,
        executable: "python3",
        command: "python3",
        args: ["script.py"],
        status: "stopped",
        state: "stopped",
        uptime: 10000,
        startTime: new Date().toISOString(),
      };

      const item = new ProcessTreeItem(
        mockProcess,
        vscode.TreeItemCollapsibleState.None
      );

      assert.ok(item);
      assert.strictEqual(item.label, "PID 5678: python3");
      assert.ok(
        typeof item.description === "string" &&
          item.description.includes("stopped")
      );
    });

    test("Should create item with crashed state", () => {
      const mockProcess: ProcessInfo = {
        id: "9999",
        pid: 9999,
        executable: "npm",
        command: "npm",
        args: ["test"],
        status: "crashed",
        state: "crashed",
        uptime: 2000,
        startTime: new Date().toISOString(),
      };

      const item = new ProcessTreeItem(
        mockProcess,
        vscode.TreeItemCollapsibleState.None
      );

      assert.ok(item);
      assert.strictEqual(item.label, "PID 9999: npm");
      assert.ok(
        typeof item.description === "string" &&
          item.description.includes("crashed")
      );
    });

    test("Should format uptime correctly", () => {
      const mockProcess: ProcessInfo = {
        id: "1111",
        pid: 1111,
        executable: "node",
        command: "node",
        args: [],
        status: "running",
        state: "running",
        uptime: 65000,
        startTime: new Date().toISOString(), // 65 seconds
      };

      const item = new ProcessTreeItem(
        mockProcess,
        vscode.TreeItemCollapsibleState.None
      );

      assert.ok(
        typeof item.description === "string" && item.description.includes("65s")
      );
    });

    test("Should include args in tooltip", () => {
      const mockProcess: ProcessInfo = {
        id: "2222",
        pid: 2222,
        executable: "node",
        command: "node",
        args: ["--inspect", "server.js"],
        status: "running",
        state: "running",
        uptime: 1000,
        startTime: new Date().toISOString(),
      };

      const item = new ProcessTreeItem(
        mockProcess,
        vscode.TreeItemCollapsibleState.None
      );

      assert.ok(item.tooltip);
      assert.ok(
        typeof item.tooltip === "string" && item.tooltip.includes("--inspect")
      );
      assert.ok(
        typeof item.tooltip === "string" && item.tooltip.includes("server.js")
      );
    });

    test("Should have correct icon for running state", () => {
      const mockProcess: ProcessInfo = {
        id: "3333",
        pid: 3333,
        executable: "node",
        command: "node",
        args: [],
        status: "running",
        state: "running",
        uptime: 1000,
        startTime: new Date().toISOString(),
      };

      const item = new ProcessTreeItem(
        mockProcess,
        vscode.TreeItemCollapsibleState.None
      );

      assert.ok(item.iconPath);
      assert.ok(item.iconPath instanceof vscode.ThemeIcon);
    });

    test("Should handle empty args array", () => {
      const mockProcess: ProcessInfo = {
        id: "4444",
        pid: 4444,
        executable: "node",
        command: "node",
        args: [],
        status: "running",
        state: "running",
        uptime: 1000,
        startTime: new Date().toISOString(),
      };

      const item = new ProcessTreeItem(
        mockProcess,
        vscode.TreeItemCollapsibleState.None
      );

      assert.ok(item);
      assert.ok(item.tooltip);
    });

    test("Should handle long command names", () => {
      const mockProcess: ProcessInfo = {
        id: "5555",
        pid: 5555,
        executable: "very-long-command-name-that-might-be-truncated",
        command: "very-long-command-name-that-might-be-truncated",
        args: ["arg1", "arg2", "arg3"],
        status: "running",
        state: "running",
        uptime: 1000,
        startTime: new Date().toISOString(),
      };

      const item = new ProcessTreeItem(
        mockProcess,
        vscode.TreeItemCollapsibleState.None
      );

      assert.ok(item);
      assert.ok(
        item.label &&
          typeof item.label === "string" &&
          item.label.includes("very-long-command-name")
      );
    });
  });

  suite("With Mock Client", () => {
    let mockClient: any;

    setup(() => {
      mockClient = {
        listProcesses: async () => [
          {
            id: "1234",
            pid: 1234,
            executable: "node",
            command: "node",
            args: ["--version"],
            status: "running",
            state: "running",
            uptime: 5000,
            startTime: new Date().toISOString(),
          },
          {
            id: "5678",
            pid: 5678,
            executable: "python3",
            command: "python3",
            args: ["script.py"],
            status: "running",
            state: "running",
            uptime: 10000,
            startTime: new Date().toISOString(),
          },
        ],
        onStateChange: () => ({
          dispose: () => {},
        }),
        getConnectionStatus: () => ({
          state: "connected" as any,
          message: "Connected",
          serverProcessRunning: true,
          timestamp: Date.now(),
        }),
      };
    });

    test("Should populate tree with processes from client", async () => {
      provider.setMCPClient(mockClient as MCPProcessClient);
      await provider.refresh();

      const children = await provider.getChildren();
      assert.strictEqual(children.length, 2);
      assert.ok(children[0] instanceof ProcessTreeItem);
      assert.ok(children[1] instanceof ProcessTreeItem);
      assert.strictEqual((children[0] as ProcessTreeItem).pid, 1234);
      assert.strictEqual((children[1] as ProcessTreeItem).pid, 5678);
    });

    test("Should handle client errors gracefully", async () => {
      const errorClient = {
        listProcesses: async () => {
          throw new Error("Connection failed");
        },
        onStateChange: () => ({
          dispose: () => {},
        }),
        getConnectionStatus: () => ({
          state: "connected" as any,
          message: "Connected",
          serverProcessRunning: true,
          timestamp: Date.now(),
        }),
      };

      provider.setMCPClient(errorClient as unknown as MCPProcessClient);
      await provider.refresh();

      const children = await provider.getChildren();
      assert.strictEqual(children.length, 0);
    });

    test("Should handle empty process list", async () => {
      const emptyClient = {
        listProcesses: async () => [],
        onStateChange: () => ({
          dispose: () => {},
        }),
        getConnectionStatus: () => ({
          state: "connected" as any,
          message: "Connected",
          serverProcessRunning: true,
          timestamp: Date.now(),
        }),
      };

      provider.setMCPClient(emptyClient as unknown as MCPProcessClient);
      await provider.refresh();

      const children = await provider.getChildren();
      assert.strictEqual(children.length, 0);
    });
  });
});
