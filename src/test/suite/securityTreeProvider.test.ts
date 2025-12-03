import * as assert from "assert";
import * as vscode from "vscode";
import {
  SecurityTreeDataProvider,
  SecurityTreeItem,
} from "../../securityTreeProvider";
import { MCPProcessClient } from "../../mcpClient";

suite("Security Tree Provider Test Suite", () => {
  let provider: SecurityTreeDataProvider;

  setup(() => {
    provider = new SecurityTreeDataProvider();
  });

  test("Provider should be instantiable", () => {
    assert.ok(provider);
    assert.ok(provider instanceof SecurityTreeDataProvider);
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

  test("getChildren should show warning without client", async () => {
    const children = await provider.getChildren();
    assert.ok(Array.isArray(children));
    assert.strictEqual(children.length, 1);
    assert.strictEqual(children[0].label, "Server Not Running");
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

  suite("SecurityTreeItem", () => {
    test("Should create item with label and description", () => {
      const item = new SecurityTreeItem(
        "Test Label",
        "Test Description",
        vscode.TreeItemCollapsibleState.None,
        "test-context"
      );

      assert.ok(item);
      assert.strictEqual(item.label, "Test Label");
      assert.strictEqual(item.description, "Test Description");
      assert.strictEqual(item.contextValue, "test-context");
    });

    test("Should have icon for allowed-executables context", () => {
      const item = new SecurityTreeItem(
        "Allowed Executables",
        "5 executables",
        vscode.TreeItemCollapsibleState.Collapsed,
        "allowed-executables"
      );

      assert.ok(item.iconPath);
      assert.ok(item.iconPath instanceof vscode.ThemeIcon);
    });

    test("Should have icon for resource-limits context", () => {
      const item = new SecurityTreeItem(
        "Resource Limits",
        "CPU, Memory, Time",
        vscode.TreeItemCollapsibleState.Collapsed,
        "resource-limits"
      );

      assert.ok(item.iconPath);
      assert.ok(item.iconPath instanceof vscode.ThemeIcon);
    });

    test("Should have icon for security-features context", () => {
      const item = new SecurityTreeItem(
        "Security Features",
        "Protection mechanisms",
        vscode.TreeItemCollapsibleState.Collapsed,
        "security-features"
      );

      assert.ok(item.iconPath);
      assert.ok(item.iconPath instanceof vscode.ThemeIcon);
    });

    test("Should have icon for executable context", () => {
      const item = new SecurityTreeItem(
        "node",
        "Allowed",
        vscode.TreeItemCollapsibleState.None,
        "executable"
      );

      assert.ok(item.iconPath);
      assert.ok(item.iconPath instanceof vscode.ThemeIcon);
    });

    test("Should have icon for enabled context", () => {
      const item = new SecurityTreeItem(
        "Audit Logging",
        "Enabled",
        vscode.TreeItemCollapsibleState.None,
        "enabled"
      );

      assert.ok(item.iconPath);
      assert.ok(item.iconPath instanceof vscode.ThemeIcon);
    });

    test("Should have icon for disabled context", () => {
      const item = new SecurityTreeItem(
        "Shell Interpreters",
        "Disabled",
        vscode.TreeItemCollapsibleState.None,
        "disabled"
      );

      assert.ok(item.iconPath);
      assert.ok(item.iconPath instanceof vscode.ThemeIcon);
    });

    test("Should have tooltip", () => {
      const item = new SecurityTreeItem(
        "Test",
        "Description",
        vscode.TreeItemCollapsibleState.None,
        "test"
      );

      assert.ok(item.tooltip);
      assert.strictEqual(item.tooltip, "Test");
    });
  });

  suite("With Mock Client", () => {
    let mockClient: any;

    setup(() => {
      mockClient = {
        getConfig: () => ({
          allowedExecutables: ["node", "python3", "npm"],
          defaultResourceLimits: {
            maxCpuPercent: 80,
            maxMemoryMB: 1024,
            maxCpuTime: 300,
          },
          maxConcurrentProcesses: 10,
          maxProcessLifetime: 3600,
          enableAuditLog: true,
          blockShellInterpreters: true,
          blockSetuidExecutables: true,
        }),
      };
    });

    test("Should show root categories with client", async () => {
      provider.setMCPClient(mockClient as MCPProcessClient);

      const children = await provider.getChildren();
      assert.strictEqual(children.length, 3);
      assert.strictEqual(children[0].label, "Allowed Executables");
      assert.strictEqual(children[1].label, "Resource Limits");
      assert.strictEqual(children[2].label, "Security Features");
    });

    test("Should show allowed executables", async () => {
      provider.setMCPClient(mockClient as MCPProcessClient);

      const root = await provider.getChildren();
      const allowedExecsItem = root[0];

      const children = await provider.getChildren(allowedExecsItem);
      assert.strictEqual(children.length, 3);
      assert.strictEqual(children[0].label, "node");
      assert.strictEqual(children[1].label, "python3");
      assert.strictEqual(children[2].label, "npm");
    });

    test("Should show resource limits", async () => {
      provider.setMCPClient(mockClient as MCPProcessClient);

      const root = await provider.getChildren();
      const limitsItem = root[1];

      const children = await provider.getChildren(limitsItem);
      assert.strictEqual(children.length, 5);
      assert.ok(children[0].label.includes("CPU"));
      assert.ok(children[1].label.includes("Memory"));
      assert.ok(children[2].label.includes("CPU Time"));
      assert.ok(children[3].label.includes("Concurrent"));
      assert.ok(children[4].label.includes("Lifetime"));
    });

    test("Should show security features", async () => {
      provider.setMCPClient(mockClient as MCPProcessClient);

      const root = await provider.getChildren();
      const featuresItem = root[2];

      const children = await provider.getChildren(featuresItem);
      assert.ok(children.length >= 6);

      const labels = children.map((c) => c.label);
      assert.ok(labels.some((l) => l.includes("Shell Interpreters")));
      assert.ok(labels.some((l) => l.includes("Setuid")));
      assert.ok(labels.some((l) => l.includes("Audit")));
      assert.ok(labels.some((l) => l.includes("Allowlist")));
    });

    test("Should handle empty allowlist", async () => {
      const emptyClient = {
        getConfig: () => ({
          allowedExecutables: [],
          defaultResourceLimits: {},
          maxConcurrentProcesses: 10,
        }),
      };

      provider.setMCPClient(emptyClient as MCPProcessClient);

      const root = await provider.getChildren();
      const allowedExecsItem = root[0];

      const children = await provider.getChildren(allowedExecsItem);
      assert.strictEqual(children.length, 1);
      assert.ok(children[0].label.includes("No executables"));
    });

    test("Should handle missing config values", async () => {
      const minimalClient = {
        getConfig: () => ({
          allowedExecutables: ["node"],
        }),
      };

      provider.setMCPClient(minimalClient as MCPProcessClient);

      const root = await provider.getChildren();
      assert.strictEqual(root.length, 3);

      // Should use defaults for missing values
      const limitsItem = root[1];
      const limits = await provider.getChildren(limitsItem);
      assert.ok(limits.length > 0);
    });

    test("Should show correct descriptions for limits", async () => {
      provider.setMCPClient(mockClient as MCPProcessClient);

      const root = await provider.getChildren();
      const limitsItem = root[1];
      const children = await provider.getChildren(limitsItem);

      assert.ok(children[0].description?.includes("80%"));
      assert.ok(children[1].description?.includes("1024"));
      assert.ok(children[2].description?.includes("300"));
    });

    test("Should show enabled/disabled status correctly", async () => {
      provider.setMCPClient(mockClient as MCPProcessClient);

      const root = await provider.getChildren();
      const featuresItem = root[2];
      const children = await provider.getChildren(featuresItem);

      const shellItem = children.find((c) =>
        c.label.includes("Shell Interpreters")
      );
      assert.ok(shellItem);
      assert.strictEqual(shellItem.description, "Enabled");
      assert.strictEqual(shellItem.contextValue, "enabled");
    });
  });

  suite("Tree Structure", () => {
    test("Root items should be collapsible", async () => {
      const mockClient = {
        getConfig: () => ({
          allowedExecutables: ["node"],
        }),
      };

      provider.setMCPClient(mockClient as MCPProcessClient);
      const children = await provider.getChildren();

      for (const child of children) {
        assert.strictEqual(
          child.collapsibleState,
          vscode.TreeItemCollapsibleState.Collapsed
        );
      }
    });

    test("Leaf items should not be collapsible", async () => {
      const mockClient = {
        getConfig: () => ({
          allowedExecutables: ["node", "python3"],
        }),
      };

      provider.setMCPClient(mockClient as MCPProcessClient);
      const root = await provider.getChildren();
      const allowedExecsItem = root[0];
      const executables = await provider.getChildren(allowedExecsItem);

      for (const exec of executables) {
        assert.strictEqual(
          exec.collapsibleState,
          vscode.TreeItemCollapsibleState.None
        );
      }
    });

    test("Should return empty array for leaf items", async () => {
      const mockClient = {
        getConfig: () => ({
          allowedExecutables: ["node"],
        }),
      };

      provider.setMCPClient(mockClient as MCPProcessClient);
      const root = await provider.getChildren();
      const allowedExecsItem = root[0];
      const executables = await provider.getChildren(allowedExecsItem);
      const leafItem = executables[0];

      const children = await provider.getChildren(leafItem);
      assert.strictEqual(children.length, 0);
    });
  });
});
