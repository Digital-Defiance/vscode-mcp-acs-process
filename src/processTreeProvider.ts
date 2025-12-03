import * as vscode from "vscode";
import { MCPProcessClient, ProcessInfo } from "./mcpClient";

export class ProcessTreeDataProvider
  implements vscode.TreeDataProvider<ProcessTreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    ProcessTreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private mcpClient: MCPProcessClient | undefined;
  private processes: ProcessInfo[] = [];

  setMCPClient(client: MCPProcessClient): void {
    this.mcpClient = client;
    this.refresh();
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

  getTreeItem(element: ProcessTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ProcessTreeItem): Promise<ProcessTreeItem[]> {
    if (!this.mcpClient) {
      return [];
    }

    if (!element) {
      // Root level - show all processes
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
