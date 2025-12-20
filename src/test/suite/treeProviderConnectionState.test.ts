import * as assert from "assert";
import * as vscode from "vscode";
import {
  ProcessTreeDataProvider,
  ProcessTreeItem,
} from "../../processTreeProvider";
import { SecurityTreeDataProvider } from "../../securityTreeProvider";
import { MCPProcessClient, ProcessInfo } from "../../mcpClient";
import {
  ConnectionState,
  ConnectionStatus,
} from "@ai-capabilities-suite/mcp-client-base";

/**
 * Unit tests for tree provider connection state integration
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
suite("Tree Provider Connection State Test Suite", () => {
  let outputChannel: vscode.LogOutputChannel;

  setup(() => {
    outputChannel = vscode.window.createOutputChannel("Test", { log: true });
  });

  teardown(() => {
    outputChannel.dispose();
  });

  suite("ProcessTreeDataProvider Connection State", () => {
    let provider: ProcessTreeDataProvider;
    let mockClient: any;
    let stateChangeCallback: ((status: ConnectionStatus) => void) | undefined;

    setup(() => {
      provider = new ProcessTreeDataProvider();

      // Create mock client with state change subscription
      mockClient = {
        onStateChange: (listener: (status: ConnectionStatus) => void) => {
          stateChangeCallback = listener;
          return {
            dispose: () => {
              stateChangeCallback = undefined;
            },
          };
        },
        getConnectionStatus: () => ({
          state: ConnectionState.DISCONNECTED,
          message: "Disconnected",
          serverProcessRunning: false,
          timestamp: Date.now(),
        }),
        listProcesses: async () => [],
      };
    });

    test("Should show connecting message during initialization", async () => {
      // Requirement 5.1: WHEN the server is initializing THEN the Tree Providers SHALL display a "Connecting to server..." message
      provider.setMCPClient(mockClient as MCPProcessClient);

      // Simulate connecting state
      if (stateChangeCallback) {
        stateChangeCallback({
          state: ConnectionState.CONNECTING,
          message: "Connecting to server...",
          serverProcessRunning: true,
          timestamp: Date.now(),
        });
      }

      const children = await provider.getChildren();

      // Should show a connecting message item
      assert.strictEqual(children.length, 1);
      assert.ok(children[0].label);
      assert.ok(
        typeof children[0].label === "string" &&
          children[0].label.toLowerCase().includes("connecting")
      );
    });

    test("Should show timeout message with retry count", async () => {
      // Requirement 5.2: WHEN the server connection times out THEN the Tree Providers SHALL display "Connection timeout - retrying..." with retry count
      provider.setMCPClient(mockClient as MCPProcessClient);

      // Simulate timeout retrying state
      if (stateChangeCallback) {
        stateChangeCallback({
          state: ConnectionState.TIMEOUT_RETRYING,
          message: "Connection timeout - retrying...",
          retryCount: 2,
          serverProcessRunning: true,
          timestamp: Date.now(),
        });
      }

      const children = await provider.getChildren();

      // Should show a timeout message with retry count
      assert.strictEqual(children.length, 1);
      assert.ok(children[0].label);
      const label = children[0].label as string;
      assert.ok(
        label.toLowerCase().includes("timeout") ||
          label.toLowerCase().includes("retry")
      );
      assert.ok(
        label.includes("2") ||
          (children[0].description &&
            (children[0].description as string).includes("2"))
      );
    });

    test("Should show connected state with data", async () => {
      // Requirement 5.3: WHEN the server is connected THEN the Tree Providers SHALL display process and security information
      const mockProcesses: ProcessInfo[] = [
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
      ];

      // Set listProcesses BEFORE calling setMCPClient
      mockClient.listProcesses = async () => mockProcesses;

      // Update getConnectionStatus to return CONNECTED state
      mockClient.getConnectionStatus = () => ({
        state: ConnectionState.CONNECTED,
        message: "Connected",
        serverProcessRunning: true,
        timestamp: Date.now(),
      });

      provider.setMCPClient(mockClient as MCPProcessClient);

      // Wait for initial refresh to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate connected state (this will trigger a refresh)
      if (stateChangeCallback) {
        stateChangeCallback({
          state: ConnectionState.CONNECTED,
          message: "Connected",
          serverProcessRunning: true,
          timestamp: Date.now(),
        });
      }

      // Wait a bit for the refresh to complete
      await new Promise((resolve) => setTimeout(resolve, 200));

      const children = await provider.getChildren();

      // Should show actual process data
      assert.strictEqual(children.length, 2);
      assert.ok(children[0] instanceof ProcessTreeItem);
      assert.ok(children[1] instanceof ProcessTreeItem);
      assert.strictEqual((children[0] as ProcessTreeItem).pid, 1234);
      assert.strictEqual((children[1] as ProcessTreeItem).pid, 5678);
    });

    test("Should auto-refresh on state change", (done) => {
      // Requirement 5.5: WHEN re-synchronization succeeds THEN the Tree Providers SHALL automatically refresh to display current data

      let refreshCount = 0;
      const disposable = provider.onDidChangeTreeData(() => {
        refreshCount++;

        // First refresh is from setMCPClient, second should be from state change
        if (refreshCount === 2) {
          disposable.dispose();
          assert.ok(true, "Tree refreshed on state change");
          done();
        }
      });

      // Set client AFTER setting up the listener
      provider.setMCPClient(mockClient as MCPProcessClient);

      // Trigger state change after a small delay to ensure listener is set up
      setTimeout(() => {
        if (stateChangeCallback) {
          stateChangeCallback({
            state: ConnectionState.CONNECTED,
            message: "Connected",
            serverProcessRunning: true,
            timestamp: Date.now(),
          });
        } else {
          // If callback wasn't set up, fail the test
          disposable.dispose();
          done(new Error("State change callback was not set up"));
        }
      }, 100);
    });

    test("Should show disconnected state", async () => {
      // Requirement 5.4: WHEN the server connection is lost THEN the Tree Providers SHALL immediately update to show disconnected state
      provider.setMCPClient(mockClient as MCPProcessClient);

      // Simulate disconnected state
      if (stateChangeCallback) {
        stateChangeCallback({
          state: ConnectionState.DISCONNECTED,
          message: "Disconnected",
          serverProcessRunning: false,
          timestamp: Date.now(),
        });
      }

      const children = await provider.getChildren();

      // Should show a disconnected message
      assert.strictEqual(children.length, 1);
      assert.ok(children[0].label);
      assert.ok(
        typeof children[0].label === "string" &&
          (children[0].label.toLowerCase().includes("disconnect") ||
            children[0].label.toLowerCase().includes("not running"))
      );
    });

    test("Should show error state", async () => {
      provider.setMCPClient(mockClient as MCPProcessClient);

      // Simulate error state
      if (stateChangeCallback) {
        stateChangeCallback({
          state: ConnectionState.ERROR,
          message: "Connection error",
          lastError: new Error("Failed to connect"),
          serverProcessRunning: false,
          timestamp: Date.now(),
        });
      }

      const children = await provider.getChildren();

      // Should show an error message
      assert.strictEqual(children.length, 1);
      assert.ok(children[0].label);
      assert.ok(
        typeof children[0].label === "string" &&
          children[0].label.toLowerCase().includes("error")
      );
    });
  });

  suite("SecurityTreeDataProvider Connection State", () => {
    let provider: SecurityTreeDataProvider;
    let mockClient: any;
    let stateChangeCallback: ((status: ConnectionStatus) => void) | undefined;

    setup(() => {
      provider = new SecurityTreeDataProvider();

      // Create mock client with state change subscription
      mockClient = {
        onStateChange: (listener: (status: ConnectionStatus) => void) => {
          stateChangeCallback = listener;
          return {
            dispose: () => {
              stateChangeCallback = undefined;
            },
          };
        },
        getConnectionStatus: () => ({
          state: ConnectionState.DISCONNECTED,
          message: "Disconnected",
          serverProcessRunning: false,
          timestamp: Date.now(),
        }),
        getConfig: () => ({
          allowedExecutables: ["node", "python3"],
          blockSetuidExecutables: true,
          blockShellInterpreters: false,
          defaultResourceLimits: {
            maxCpuPercent: 80,
            maxMemoryMB: 512,
          },
        }),
      };
    });

    test("Should show connecting message during initialization", async () => {
      // Requirement 5.1
      provider.setMCPClient(mockClient as MCPProcessClient);

      // Simulate connecting state
      if (stateChangeCallback) {
        stateChangeCallback({
          state: ConnectionState.CONNECTING,
          message: "Connecting to server...",
          serverProcessRunning: true,
          timestamp: Date.now(),
        });
      }

      const children = await provider.getChildren();

      // Should show a connecting message
      assert.ok(children.length > 0);
      const firstChild = children[0];
      assert.ok(
        typeof firstChild.label === "string" &&
          firstChild.label.toLowerCase().includes("connecting")
      );
    });

    test("Should show timeout message with retry count", async () => {
      // Requirement 5.2
      provider.setMCPClient(mockClient as MCPProcessClient);

      // Simulate timeout retrying state
      if (stateChangeCallback) {
        stateChangeCallback({
          state: ConnectionState.TIMEOUT_RETRYING,
          message: "Connection timeout - retrying...",
          retryCount: 1,
          serverProcessRunning: true,
          timestamp: Date.now(),
        });
      }

      const children = await provider.getChildren();

      // Should show a timeout message
      assert.ok(children.length > 0);
      const firstChild = children[0];
      const label = firstChild.label as string;
      assert.ok(
        label.toLowerCase().includes("timeout") ||
          label.toLowerCase().includes("retry")
      );
    });

    test("Should show connected state with security data", async () => {
      // Requirement 5.3
      provider.setMCPClient(mockClient as MCPProcessClient);

      // Simulate connected state
      if (stateChangeCallback) {
        stateChangeCallback({
          state: ConnectionState.CONNECTED,
          message: "Connected",
          serverProcessRunning: true,
          timestamp: Date.now(),
        });
      }

      const children = await provider.getChildren();

      // Should show security categories
      assert.ok(children.length >= 3);
      const labels = children.map((c) => c.label as string);
      assert.ok(
        labels.some(
          (l) => l.includes("Allowed Executables") || l.includes("executables")
        )
      );
      assert.ok(
        labels.some(
          (l) => l.includes("Resource Limits") || l.includes("limits")
        )
      );
      assert.ok(
        labels.some(
          (l) => l.includes("Security Features") || l.includes("security")
        )
      );
    });

    test("Should auto-refresh on state change", (done) => {
      // Requirement 5.5

      let refreshCount = 0;
      const disposable = provider.onDidChangeTreeData(() => {
        refreshCount++;

        // First refresh is from setMCPClient, second should be from state change
        if (refreshCount === 2) {
          disposable.dispose();
          assert.ok(true, "Tree refreshed on state change");
          done();
        }
      });

      // Set client AFTER setting up the listener
      provider.setMCPClient(mockClient as MCPProcessClient);

      // Trigger state change after a small delay to ensure listener is set up
      setTimeout(() => {
        if (stateChangeCallback) {
          stateChangeCallback({
            state: ConnectionState.CONNECTED,
            message: "Connected",
            serverProcessRunning: true,
            timestamp: Date.now(),
          });
        } else {
          // If callback wasn't set up, fail the test
          disposable.dispose();
          done(new Error("State change callback was not set up"));
        }
      }, 100);
    });

    test("Should show disconnected state", async () => {
      // Requirement 5.4
      provider.setMCPClient(mockClient as MCPProcessClient);

      // Simulate disconnected state
      if (stateChangeCallback) {
        stateChangeCallback({
          state: ConnectionState.DISCONNECTED,
          message: "Disconnected",
          serverProcessRunning: false,
          timestamp: Date.now(),
        });
      }

      const children = await provider.getChildren();

      // Should show a disconnected/not running message
      assert.ok(children.length > 0);
      const firstChild = children[0];
      assert.ok(
        typeof firstChild.label === "string" &&
          (firstChild.label.toLowerCase().includes("not running") ||
            firstChild.label.toLowerCase().includes("disconnect"))
      );
    });
  });
});
