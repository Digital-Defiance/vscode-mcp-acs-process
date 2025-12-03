import * as vscode from "vscode";
import { MCPProcessClient } from "./mcpClient";

export class SecurityTreeDataProvider
  implements vscode.TreeDataProvider<SecurityTreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    SecurityTreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private mcpClient: MCPProcessClient | undefined;

  setMCPClient(client: MCPProcessClient): void {
    this.mcpClient = client;
    this.refresh();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SecurityTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: SecurityTreeItem): Promise<SecurityTreeItem[]> {
    if (!this.mcpClient) {
      return [
        new SecurityTreeItem(
          "Server Not Running",
          "Start the MCP server to view security boundaries",
          vscode.TreeItemCollapsibleState.None,
          "warning"
        ),
      ];
    }

    const config = this.mcpClient.getConfig();

    if (!element) {
      // Root level - show security categories
      return [
        new SecurityTreeItem(
          "Allowed Executables",
          `${config.allowedExecutables?.length || 0} executables`,
          vscode.TreeItemCollapsibleState.Collapsed,
          "allowed-executables"
        ),
        new SecurityTreeItem(
          "Resource Limits",
          "CPU, Memory, Time limits",
          vscode.TreeItemCollapsibleState.Collapsed,
          "resource-limits"
        ),
        new SecurityTreeItem(
          "Security Features",
          "Protection mechanisms",
          vscode.TreeItemCollapsibleState.Collapsed,
          "security-features"
        ),
      ];
    }

    // Child items based on category
    switch (element.contextValue) {
      case "allowed-executables":
        return this.getAllowedExecutablesChildren(config);
      case "resource-limits":
        return this.getResourceLimitsChildren(config);
      case "security-features":
        return this.getSecurityFeaturesChildren(config);
      default:
        return [];
    }
  }

  private getAllowedExecutablesChildren(config: any): SecurityTreeItem[] {
    const executables = config.allowedExecutables || [];

    if (executables.length === 0) {
      return [
        new SecurityTreeItem(
          "No executables allowed",
          "Server will not start",
          vscode.TreeItemCollapsibleState.None,
          "error"
        ),
      ];
    }

    return executables.map(
      (exec: string) =>
        new SecurityTreeItem(
          exec,
          "Allowed",
          vscode.TreeItemCollapsibleState.None,
          "executable"
        )
    );
  }

  private getResourceLimitsChildren(config: any): SecurityTreeItem[] {
    const limits = config.defaultResourceLimits || {};

    return [
      new SecurityTreeItem(
        "Max CPU Usage",
        `${limits.maxCpuPercent || 80}%`,
        vscode.TreeItemCollapsibleState.None,
        "limit"
      ),
      new SecurityTreeItem(
        "Max Memory",
        `${limits.maxMemoryMB || 1024} MB`,
        vscode.TreeItemCollapsibleState.None,
        "limit"
      ),
      new SecurityTreeItem(
        "Max CPU Time",
        `${limits.maxCpuTime || 300} seconds`,
        vscode.TreeItemCollapsibleState.None,
        "limit"
      ),
      new SecurityTreeItem(
        "Max Concurrent Processes",
        `${config.maxConcurrentProcesses || 10}`,
        vscode.TreeItemCollapsibleState.None,
        "limit"
      ),
      new SecurityTreeItem(
        "Max Process Lifetime",
        `${config.maxProcessLifetime || 3600} seconds`,
        vscode.TreeItemCollapsibleState.None,
        "limit"
      ),
    ];
  }

  private getSecurityFeaturesChildren(config: any): SecurityTreeItem[] {
    return [
      new SecurityTreeItem(
        "Block Shell Interpreters",
        config.blockShellInterpreters ? "Enabled" : "Disabled",
        vscode.TreeItemCollapsibleState.None,
        config.blockShellInterpreters ? "enabled" : "disabled"
      ),
      new SecurityTreeItem(
        "Block Setuid Executables",
        config.blockSetuidExecutables ? "Enabled" : "Disabled",
        vscode.TreeItemCollapsibleState.None,
        config.blockSetuidExecutables ? "enabled" : "disabled"
      ),
      new SecurityTreeItem(
        "Audit Logging",
        config.enableAuditLog ? "Enabled" : "Disabled",
        vscode.TreeItemCollapsibleState.None,
        config.enableAuditLog ? "enabled" : "disabled"
      ),
      new SecurityTreeItem(
        "Executable Allowlist",
        "Required",
        vscode.TreeItemCollapsibleState.None,
        "enabled"
      ),
      new SecurityTreeItem(
        "Argument Validation",
        "Always Active",
        vscode.TreeItemCollapsibleState.None,
        "enabled"
      ),
      new SecurityTreeItem(
        "Environment Sanitization",
        "Always Active",
        vscode.TreeItemCollapsibleState.None,
        "enabled"
      ),
    ];
  }
}

export class SecurityTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly contextValue: string
  ) {
    super(label, collapsibleState);
    this.description = description;
    this.iconPath = this.getIcon();
    this.tooltip = this.getTooltip();
  }

  private getIcon(): vscode.ThemeIcon {
    switch (this.contextValue) {
      case "allowed-executables":
        return new vscode.ThemeIcon("checklist");
      case "resource-limits":
        return new vscode.ThemeIcon("dashboard");
      case "security-features":
        return new vscode.ThemeIcon("shield");
      case "executable":
        return new vscode.ThemeIcon(
          "file-binary",
          new vscode.ThemeColor("testing.iconPassed")
        );
      case "limit":
        return new vscode.ThemeIcon("gauge");
      case "enabled":
        return new vscode.ThemeIcon(
          "check",
          new vscode.ThemeColor("testing.iconPassed")
        );
      case "disabled":
        return new vscode.ThemeIcon(
          "circle-slash",
          new vscode.ThemeColor("testing.iconSkipped")
        );
      case "error":
        return new vscode.ThemeIcon(
          "error",
          new vscode.ThemeColor("testing.iconFailed")
        );
      case "warning":
        return new vscode.ThemeIcon(
          "warning",
          new vscode.ThemeColor("testing.iconQueued")
        );
      default:
        return new vscode.ThemeIcon("info");
    }
  }

  private getTooltip(): string {
    switch (this.contextValue) {
      case "allowed-executables":
        return "Only these executables can be launched by AI agents";
      case "resource-limits":
        return "Resource limits enforced on all processes";
      case "security-features":
        return "Security mechanisms protecting the system";
      case "executable":
        return `${this.label} is allowed to be executed`;
      case "limit":
        return `${this.label}: ${this.description}`;
      case "enabled":
        return `${this.label} is enabled`;
      case "disabled":
        return `${this.label} is disabled`;
      default:
        return this.label;
    }
  }
}
