import * as vscode from "vscode";
import { MCPProcessClient, ProcessInfo } from "./mcpClient";
import {
  ConnectionState,
  ConnectionStatus,
} from "@ai-capabilities-suite/mcp-client-base";

export class ProcessTreeDataProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    vscode.TreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private mcpClient: MCPProcessClient | undefined;
  private processes: ProcessInfo[] = [];
  private connectionStatus: ConnectionStatus | undefined;
  private stateChangeDisposable: { dispose: () => void } | undefined;

  setMCPClient(client: MCPProcessClient): void {
    // Dispose previous subscription if exists
    if (this.stateChangeDisposable) {
      this.stateChangeDisposable.dispose();
    }

    this.mcpClient = client;

    // Subscribe to connection state changes
    this.stateChangeDisposable = client.onStateChange((status) => {
      this.connectionStatus = status;
      this.refresh();
    });

    // Get initial connection status
    this.connectionStatus = client.getConnectionStatus();
    this.refresh();
  }

  dispose(): void {
    if (this.stateChangeDisposable) {
      this.stateChangeDisposable.dispose();
    }
  }

  async refresh(): Promise<void> {
    if (this.mcpClient) {
      try {
        this.processes = await this.mcpClient.listProcesses();
      } catch (error) {
        console.error("Failed to refresh process list:", error);
        this.processes = [];
      }
    }
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (!this.mcpClient) {
      return [];
    }

    if (!element) {
      // Check connection status and show appropriate message
      if (this.connectionStatus) {
        switch (this.connectionStatus.state) {
          case ConnectionState.CONNECTING:
            return [
              new StatusTreeItem(
                "Connecting to server...",
                "Please wait",
                "sync~spin"
              ),
            ];

          case ConnectionState.TIMEOUT_RETRYING:
            const retryCount = this.connectionStatus.retryCount || 0;
            const maxRetries = 3; // From ReSyncConfig default
            return [
              new StatusTreeItem(
                `Connection timeout - retrying (${retryCount}/${maxRetries})`,
                "Attempting to reconnect",
                "warning"
              ),
            ];

          case ConnectionState.DISCONNECTED:
            return [
              new StatusTreeItem(
                "Server Not Running",
                "Start the MCP server to view processes",
                "debug-disconnect"
              ),
            ];

          case ConnectionState.ERROR:
            const errorMsg =
              this.connectionStatus.lastError?.message || "Unknown error";
            return [new StatusTreeItem("Connection Error", errorMsg, "error")];

          case ConnectionState.CONNECTED:
            // Show processes when connected
            return this.processes.map(
              (p) =>
                new ProcessTreeItem(p, vscode.TreeItemCollapsibleState.None)
            );
        }
      }

      // Fallback: show processes if we have them
      return this.processes.map(
        (p) => new ProcessTreeItem(p, vscode.TreeItemCollapsibleState.None)
      );
    }

    return [];
  }
}

export class ProcessTreeItem extends vscode.TreeItem {
  constructor(
    public readonly processInfo: ProcessInfo,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(`PID ${processInfo.pid}: ${processInfo.command}`, collapsibleState);

    this.tooltip = this.getTooltip();
    this.description = this.getDescription();
    this.iconPath = this.getIcon();
    this.contextValue = "process";
  }

  get pid(): number {
    return this.processInfo.pid || 0;
  }

  private getTooltip(): string {
    const p = this.processInfo;
    const uptimeSeconds = Math.floor(p.uptime / 1000);
    return [
      `PID: ${p.pid}`,
      `Command: ${p.command}`,
      `Args: ${p.args.join(" ")}`,
      `State: ${p.state}`,
      `Uptime: ${uptimeSeconds}s`,
    ].join("\n");
  }

  private getDescription(): string {
    const p = this.processInfo;
    const uptimeSeconds = Math.floor(p.uptime / 1000);

    let stateIcon = "";
    switch (p.state) {
      case "running":
        stateIcon = "▶️";
        break;
      case "stopped":
        stateIcon = "⏹️";
        break;
      case "crashed":
        stateIcon = "💥";
        break;
    }

    return `${stateIcon} ${p.state} | ${uptimeSeconds}s`;
  }

  private getIcon(): vscode.ThemeIcon {
    switch (this.processInfo.state) {
      case "running":
        return new vscode.ThemeIcon(
          "play",
          new vscode.ThemeColor("testing.iconPassed")
        );
      case "stopped":
        return new vscode.ThemeIcon(
          "debug-stop",
          new vscode.ThemeColor("testing.iconSkipped")
        );
      case "crashed":
        return new vscode.ThemeIcon(
          "error",
          new vscode.ThemeColor("testing.iconFailed")
        );
      default:
        return new vscode.ThemeIcon("question");
    }
  }
}

/**
 * StatusTreeItem - Displays connection status messages in the tree
 */
export class StatusTreeItem extends vscode.TreeItem {
  constructor(label: string, description: string, iconId: string) {
    super(label, vscode.TreeItemCollapsibleState.None);
    this.description = description;
    this.iconPath = new vscode.ThemeIcon(iconId);
    this.contextValue = "status";
  }
}
