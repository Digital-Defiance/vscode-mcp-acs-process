import * as vscode from "vscode";
import { MCPProcessClient } from "./mcpClient";
import { ProcessTreeDataProvider } from "./processTreeProvider";
import { SecurityTreeDataProvider } from "./securityTreeProvider";

let mcpClient: MCPProcessClient | undefined;
let outputChannel: vscode.OutputChannel;
let processTreeProvider: ProcessTreeDataProvider;
let securityTreeProvider: SecurityTreeDataProvider;
let refreshInterval: NodeJS.Timeout | undefined;

export async function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("MCP Process Manager");
  outputChannel.appendLine("MCP Process Manager extension activating...");

  // Initialize tree data providers
  processTreeProvider = new ProcessTreeDataProvider();
  securityTreeProvider = new SecurityTreeDataProvider();

  // Register tree views
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      "mcp-process-list",
      processTreeProvider
    )
  );
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      "mcp-process-security",
      securityTreeProvider
    )
  );

  // Initialize MCP client
  const config = vscode.workspace.getConfiguration("mcp-process");
  const autoStart = config.get<boolean>("autoStart", true);

  if (autoStart) {
    try {
      mcpClient = new MCPProcessClient(outputChannel);
      await mcpClient.start();

      processTreeProvider.setMCPClient(mcpClient);
      securityTreeProvider.setMCPClient(mcpClient);

      outputChannel.appendLine("MCP Process server started successfully");

      // Start auto-refresh
      startAutoRefresh();
    } catch (error: any) {
      outputChannel.appendLine(`Failed to start MCP server: ${error}`);
      vscode.window
        .showErrorMessage(
          "Failed to start MCP Process server. Check output for details.",
          "Show Output"
        )
        .then((selection) => {
          if (selection === "Show Output") {
            outputChannel.show();
          }
        });
    }
  }

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("mcp-process.startProcess", async () => {
      await startProcess();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mcp-process.terminateProcess",
      async (item) => {
        await terminateProcess(item);
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("mcp-process.viewProcesses", async () => {
      await viewProcesses();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("mcp-process.viewStats", async (item) => {
      await viewStats(item);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mcp-process.refreshProcessList",
      async () => {
        await refreshProcessList();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mcp-process.showSecurityBoundaries",
      async () => {
        await showSecurityBoundaries();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mcp-process.configureAllowlist",
      async () => {
        await configureAllowlist();
      }
    )
  );

  outputChannel.appendLine("MCP Process Manager extension activated");
}

export async function deactivate() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  if (mcpClient) {
    mcpClient.stop();
  }
  outputChannel.dispose();
}

function startAutoRefresh() {
  const config = vscode.workspace.getConfiguration("mcp-process");
  const interval = config.get<number>("refreshInterval", 2000);

  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  refreshInterval = setInterval(async () => {
    await processTreeProvider.refresh();
  }, interval) as NodeJS.Timeout;
}

async function startProcess() {
  if (!mcpClient) {
    vscode.window.showErrorMessage("MCP Process server not running");
    return;
  }

  // Get executable from user
  const executable = await vscode.window.showInputBox({
    prompt: "Enter executable name or path",
    placeHolder: "e.g., node, python3, npm",
    validateInput: (value) => {
      if (!value || value.trim().length === 0) {
        return "Executable cannot be empty";
      }
      return null;
    },
  });

  if (!executable) {
    return;
  }

  // Get arguments
  const argsInput = await vscode.window.showInputBox({
    prompt: "Enter command-line arguments (space-separated)",
    placeHolder: "e.g., --version, script.js arg1 arg2",
  });

  const args = argsInput
    ? argsInput.split(" ").filter((a) => a.length > 0)
    : [];

  // Get working directory
  const workspaceFolders = vscode.workspace.workspaceFolders;
  const cwd = workspaceFolders ? workspaceFolders[0].uri.fsPath : undefined;

  try {
    const result = await mcpClient.startProcess({
      executable,
      args,
      cwd,
      captureOutput: true,
    });

    vscode.window.showInformationMessage(`Process started: ID ${result}`);

    await refreshProcessList();
  } catch (error: any) {
    vscode.window.showErrorMessage(
      `Failed to start process: ${error.message || error}`
    );
  }
}

async function terminateProcess(item: any) {
  if (!mcpClient) {
    vscode.window.showErrorMessage("MCP Process server not running");
    return;
  }

  const pid = item.pid;
  if (!pid) {
    return;
  }

  const action = await vscode.window.showQuickPick(
    ["Graceful (SIGTERM)", "Forced (SIGKILL)"],
    {
      placeHolder: "Select termination method",
    }
  );

  if (!action) {
    return;
  }

  const force = action.includes("Forced");

  try {
    await mcpClient.terminateProcess({
      pid,
      force,
      timeout: 5000,
    });

    vscode.window.showInformationMessage(
      `Process ${pid} terminated ${force ? "forcefully" : "gracefully"}`
    );

    await refreshProcessList();
  } catch (error: any) {
    vscode.window.showErrorMessage(
      `Failed to terminate process: ${error.message || error}`
    );
  }
}

async function viewProcesses() {
  if (!mcpClient) {
    vscode.window.showErrorMessage("MCP Process server not running");
    return;
  }

  try {
    const processes = await mcpClient.listProcesses();

    if (processes.length === 0) {
      vscode.window.showInformationMessage("No processes running");
      return;
    }

    const items = processes.map((p) => ({
      label: `PID ${p.pid}: ${p.command}`,
      description: `${p.state} | Uptime: ${Math.floor(p.uptime / 1000)}s`,
      detail: p.args.join(" "),
      pid: p.pid,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: "Select a process to view details",
    });

    if (selected) {
      await viewStats({ pid: selected.pid });
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(
      `Failed to list processes: ${error.message || error}`
    );
  }
}

async function viewStats(item: any) {
  if (!mcpClient) {
    vscode.window.showErrorMessage("MCP Process server not running");
    return;
  }

  const pid = item.pid;
  if (!pid) {
    return;
  }

  try {
    const stats = await mcpClient.getProcessStats({
      pid,
      includeHistory: false,
    });

    const panel = vscode.window.createWebviewPanel(
      "processStats",
      `Process ${pid} Statistics`,
      vscode.ViewColumn.One,
      {}
    );

    panel.webview.html = getStatsHTML(pid, stats);
  } catch (error: any) {
    vscode.window.showErrorMessage(
      `Failed to get process stats: ${error.message || error}`
    );
  }
}

async function refreshProcessList() {
  await processTreeProvider.refresh();
}

async function showSecurityBoundaries() {
  if (!mcpClient) {
    vscode.window.showErrorMessage("MCP Process server not running");
    return;
  }

  const config = mcpClient.getConfig();

  const panel = vscode.window.createWebviewPanel(
    "securityBoundaries",
    "MCP Process Security Boundaries",
    vscode.ViewColumn.One,
    {}
  );

  panel.webview.html = getSecurityHTML(config);
}

async function configureAllowlist() {
  const config = vscode.workspace.getConfiguration("mcp-process");
  const configPath = config.get<string>("configPath");

  if (!configPath) {
    vscode.window
      .showInformationMessage(
        "No configuration file path set. Set mcp-process.configPath in settings.",
        "Open Settings"
      )
      .then((selection) => {
        if (selection === "Open Settings") {
          vscode.commands.executeCommand(
            "workbench.action.openSettings",
            "mcp-process.configPath"
          );
        }
      });
    return;
  }

  try {
    const uri = vscode.Uri.file(configPath);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);
  } catch (error: any) {
    vscode.window.showErrorMessage(
      `Failed to open configuration file: ${error.message || error}`
    );
  }
}

function getStatsHTML(pid: number, stats: any): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: var(--vscode-font-family);
          padding: 20px;
          color: var(--vscode-foreground);
          background-color: var(--vscode-editor-background);
        }
        h1 {
          color: var(--vscode-textLink-foreground);
          border-bottom: 1px solid var(--vscode-panel-border);
          padding-bottom: 10px;
        }
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-top: 20px;
        }
        .stat-card {
          background: var(--vscode-editor-inactiveSelectionBackground);
          padding: 15px;
          border-radius: 5px;
          border: 1px solid var(--vscode-panel-border);
        }
        .stat-label {
          font-size: 12px;
          color: var(--vscode-descriptionForeground);
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: var(--vscode-textLink-foreground);
        }
        .stat-unit {
          font-size: 14px;
          color: var(--vscode-descriptionForeground);
          margin-left: 5px;
        }
      </style>
    </head>
    <body>
      <h1>📊 Process ${pid} Statistics</h1>
      
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-label">State</div>
          <div class="stat-value">${stats.state}</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-label">Uptime</div>
          <div class="stat-value">
            ${Math.floor(stats.uptime / 1000)}
            <span class="stat-unit">seconds</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-label">CPU Usage</div>
          <div class="stat-value">
            ${stats.stats.cpuPercent.toFixed(2)}
            <span class="stat-unit">%</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-label">Memory Usage</div>
          <div class="stat-value">
            ${stats.stats.memoryMB.toFixed(2)}
            <span class="stat-unit">MB</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-label">Thread Count</div>
          <div class="stat-value">${stats.stats.threadCount}</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-label">I/O Read</div>
          <div class="stat-value">
            ${(stats.stats.ioRead / 1024 / 1024).toFixed(2)}
            <span class="stat-unit">MB</span>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-label">I/O Write</div>
          <div class="stat-value">
            ${(stats.stats.ioWrite / 1024 / 1024).toFixed(2)}
            <span class="stat-unit">MB</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getSecurityHTML(config: any): string {
  const allowedExecs = config.allowedExecutables || [];
  const blockedExecs = [
    "sudo",
    "su",
    "doas",
    "chmod",
    "chown",
    "chgrp",
    "rm",
    "rmdir",
    "dd",
    "mkfs",
    "fdisk",
    "parted",
    "iptables",
    "nft",
    "systemctl",
    "service",
    "reboot",
    "shutdown",
    "halt",
  ];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: var(--vscode-font-family);
          padding: 20px;
          color: var(--vscode-foreground);
          background-color: var(--vscode-editor-background);
        }
        h1 {
          color: var(--vscode-textLink-foreground);
          border-bottom: 1px solid var(--vscode-panel-border);
          padding-bottom: 10px;
        }
        h2 {
          color: var(--vscode-textLink-foreground);
          margin-top: 30px;
        }
        .section {
          margin: 20px 0;
          padding: 15px;
          background: var(--vscode-editor-inactiveSelectionBackground);
          border-radius: 5px;
          border: 1px solid var(--vscode-panel-border);
        }
        .allowed {
          color: var(--vscode-testing-iconPassed);
        }
        .blocked {
          color: var(--vscode-testing-iconFailed);
        }
        .list {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 10px;
        }
        .item {
          padding: 5px 10px;
          background: var(--vscode-button-secondaryBackground);
          border-radius: 3px;
          font-family: monospace;
        }
        .limit {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid var(--vscode-panel-border);
        }
        .limit:last-child {
          border-bottom: none;
        }
      </style>
    </head>
    <body>
      <h1>🛡️ Security Boundaries</h1>
      
      <div class="section">
        <h2 class="allowed">✅ Allowed Executables</h2>
        <p>Only these executables can be launched by AI agents:</p>
        <div class="list">
          ${allowedExecs
            .map((exec: string) => `<div class="item">${exec}</div>`)
            .join("")}
        </div>
        ${
          allowedExecs.length === 0
            ? "<p><em>No executables allowed (server will not start)</em></p>"
            : ""
        }
      </div>
      
      <div class="section">
        <h2 class="blocked">❌ Always Blocked Executables</h2>
        <p>These executables are always blocked for security:</p>
        <div class="list">
          ${blockedExecs
            .map((exec: string) => `<div class="item">${exec}</div>`)
            .join("")}
        </div>
      </div>
      
      <div class="section">
        <h2>⚙️ Resource Limits</h2>
        <div class="limit">
          <span>Max CPU Usage:</span>
          <strong>${config.defaultResourceLimits?.maxCpuPercent || 80}%</strong>
        </div>
        <div class="limit">
          <span>Max Memory:</span>
          <strong>${
            config.defaultResourceLimits?.maxMemoryMB || 1024
          } MB</strong>
        </div>
        <div class="limit">
          <span>Max CPU Time:</span>
          <strong>${
            config.defaultResourceLimits?.maxCpuTime || 300
          } seconds</strong>
        </div>
        <div class="limit">
          <span>Max Concurrent Processes:</span>
          <strong>${config.maxConcurrentProcesses || 10}</strong>
        </div>
        <div class="limit">
          <span>Max Process Lifetime:</span>
          <strong>${config.maxProcessLifetime || 3600} seconds</strong>
        </div>
      </div>
      
      <div class="section">
        <h2>🔒 Security Features</h2>
        <div class="limit">
          <span>Block Shell Interpreters:</span>
          <strong>${config.blockShellInterpreters ? "Yes" : "No"}</strong>
        </div>
        <div class="limit">
          <span>Block Setuid Executables:</span>
          <strong>${config.blockSetuidExecutables ? "Yes" : "No"}</strong>
        </div>
        <div class="limit">
          <span>Audit Logging:</span>
          <strong>${config.enableAuditLog ? "Enabled" : "Disabled"}</strong>
        </div>
      </div>
    </body>
    </html>
  `;
}
