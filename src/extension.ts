import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from "vscode-languageclient/node";
import { MCPProcessClient } from "./mcpClient";
import { ProcessTreeDataProvider } from "./processTreeProvider";
import { SecurityTreeDataProvider } from "./securityTreeProvider";
import { ProcessContextProvider } from "./processContextProvider";
import { SettingsManager } from "./settingsManager";
import { setPlatformContext, clearPlatformContext } from "./platformContext";
import { ErrorHandler } from "./errorHandling";

let mcpClient: MCPProcessClient | undefined;
let outputChannel: vscode.LogOutputChannel;
let processTreeProvider: ProcessTreeDataProvider;
let securityTreeProvider: SecurityTreeDataProvider;
let processContextProvider: ProcessContextProvider;
let settingsManager: SettingsManager | undefined;
let errorHandler: ErrorHandler | undefined;
let refreshInterval: NodeJS.Timeout | undefined;
let languageClient: LanguageClient | undefined;
let pendingRestart = false;
let statusBarItem: vscode.StatusBarItem | undefined;
let permanentStatusBarItem: vscode.StatusBarItem | undefined;

/**
 * Settings that require server restart when changed
 */
const RESTART_REQUIRED_SETTINGS = [
  "server.serverPath",
  "server.configPath",
  "server.useConfigFile",
  "executable.allowedExecutables",
  "executable.blockSetuidExecutables",
  "executable.blockShellInterpreters",
  "executable.additionalBlockedExecutables",
  "executable.maxArgumentCount",
  "executable.maxArgumentLength",
  "executable.blockedArgumentPatterns",
  "resources.defaultMaxCpuPercent",
  "resources.defaultMaxMemoryMB",
  "resources.defaultMaxFileDescriptors",
  "resources.defaultMaxCpuTime",
  "resources.defaultMaxProcesses",
  "resources.maximumMaxCpuPercent",
  "resources.maximumMaxMemoryMB",
  "resources.strictResourceEnforcement",
  "process.maxConcurrentProcesses",
  "process.maxConcurrentProcessesPerAgent",
  "process.maxProcessLifetime",
  "process.maxTotalProcesses",
  "process.maxLaunchesPerMinute",
  "process.maxLaunchesPerHour",
  "process.rateLimitCooldownSeconds",
  "security.allowProcessTermination",
  "security.allowGroupTermination",
  "security.allowForcedTermination",
  "security.requireTerminationConfirmation",
  "security.requireConfirmation",
  "security.requireConfirmationFor",
  "security.autoApproveAfterCount",
  "security.allowedWorkingDirectories",
  "security.blockedWorkingDirectories",
  "security.additionalBlockedEnvVars",
  "security.allowedEnvVars",
  "security.maxEnvVarCount",
  "security.advanced.enableChroot",
  "security.advanced.chrootDirectory",
  "security.advanced.enableNamespaces",
  "security.advanced.namespacesPid",
  "security.advanced.namespacesNetwork",
  "security.advanced.namespacesMount",
  "security.advanced.namespacesUts",
  "security.advanced.namespacesIpc",
  "security.advanced.namespacesUser",
  "security.advanced.enableSeccomp",
  "security.advanced.seccompProfile",
  "security.advanced.blockNetworkAccess",
  "security.advanced.allowedNetworkDestinations",
  "security.advanced.blockedNetworkDestinations",
  "security.advanced.enableMAC",
  "security.advanced.macProfile",
  "security.advanced.dropCapabilities",
  "security.advanced.readOnlyFilesystem",
  "security.advanced.tmpfsSize",
  "io.allowStdinInput",
  "io.allowOutputCapture",
  "io.maxOutputBufferSize",
  "io.blockBinaryStdin",
  "audit.enableAuditLog",
  "audit.auditLogPath",
  "audit.auditLogLevel",
  "audit.enableSecurityAlerts",
  "audit.securityAlertWebhook",
  "audit.allowedTimeWindows",
  "audit.blockedTimeWindows",
];

/**
 * Settings that can be applied immediately without restart
 */
const IMMEDIATE_SETTINGS = [
  "server.autoStart",
  "server.logLevel",
  "ui.refreshInterval",
  "ui.showResourceUsage",
  "ui.showSecurityWarnings",
  "ui.confirmDangerousOperations",
];

/**
 * Check if a configuration change requires server restart
 */
function requiresRestart(changes: any): boolean {
  for (const setting of RESTART_REQUIRED_SETTINGS) {
    if (changes.affectsConfiguration(`mcp-process.${setting}`)) {
      return true;
    }
  }
  return false;
}

/**
 * Handle configuration changes
 */
async function handleConfigurationChange(changes: any): Promise<void> {
  if (!settingsManager) {
    return;
  }

  // Check if restart is required
  if (requiresRestart(changes)) {
    pendingRestart = true;
    showRestartNotification();
  }

  // Handle immediate settings changes
  if (changes.affectsConfiguration("mcp-process.ui.refreshInterval")) {
    startAutoRefresh();
  }

  if (changes.affectsConfiguration("mcp-process.server.logLevel")) {
    const config = vscode.workspace.getConfiguration("mcp-process");
    const logLevel = config.get<string>("server.logLevel", "info");
    outputChannel.appendLine(`Log level changed to: ${logLevel}`);
  }
}

/**
 * Show restart notification with button
 */
function showRestartNotification(): void {
  // Skip UI notifications in test mode
  const isTestMode =
    process.env.VSCODE_TEST_MODE === "true" || process.env.NODE_ENV === "test";

  if (isTestMode) {
    outputChannel.appendLine(
      "Configuration change requires restart (test mode - skipping notification)"
    );
    return;
  }

  // Update status bar
  if (!statusBarItem) {
    statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    statusBarItem.text = "$(warning) MCP Process: Restart Required";
    statusBarItem.tooltip =
      "Configuration changes require server restart. Click to restart.";
    statusBarItem.command = "mcp-process.restartServer";
  }
  statusBarItem.show();

  // Show notification
  vscode.window
    .showWarningMessage(
      "MCP Process configuration changed. Server restart required for changes to take effect.",
      "Restart Now",
      "Restart Later"
    )
    .then((selection) => {
      if (selection === "Restart Now") {
        restartServer();
      }
    });
}

/**
 * Restart the MCP Process server
 */
async function restartServer(): Promise<void> {
  if (!settingsManager) {
    vscode.window.showErrorMessage("Settings manager not initialized");
    return;
  }

  try {
    outputChannel.appendLine("Restarting MCP Process server...");

    // Stop existing server
    if (mcpClient) {
      mcpClient.stop();
      mcpClient = undefined;
    }

    // Wait a moment for cleanup
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Start new server with updated configuration
    mcpClient = new MCPProcessClient(outputChannel);

    // Generate and pass server configuration from VS Code settings
    const serverConfig = settingsManager.generateServerConfig();
    mcpClient.setServerConfig(serverConfig);

    await mcpClient.start();

    // Update providers
    processTreeProvider.setMCPClient(mcpClient);
    securityTreeProvider.setMCPClient(mcpClient);
    processContextProvider.setMCPClient(mcpClient);

    // Clear pending restart flag
    pendingRestart = false;

    // Hide status bar item
    if (statusBarItem) {
      statusBarItem.hide();
    }

    outputChannel.appendLine("MCP Process server restarted successfully");
    vscode.window.showInformationMessage(
      "MCP Process server restarted successfully"
    );

    // Refresh process list
    await refreshProcessList();
  } catch (error: any) {
    outputChannel.appendLine(`Failed to restart MCP server: ${error}`);

    // Use error handler for better error messages
    if (errorHandler) {
      await errorHandler.server.handleServerError(error);
    } else {
      vscode.window.showErrorMessage(
        `Failed to restart MCP Process server: ${error.message || error}`
      );
    }
  }
}

/**
 * Apply a configuration preset
 */
async function applyConfigurationPreset(): Promise<void> {
  if (!settingsManager) {
    vscode.window.showErrorMessage("Settings manager not initialized");
    return;
  }

  // Import presets and types from settings manager
  const settingsModule = await import("./settingsManager.js");
  const CONFIGURATION_PRESETS = settingsModule.CONFIGURATION_PRESETS;
  type ConfigurationPreset = (typeof settingsModule.CONFIGURATION_PRESETS)[0];

  // Create quick pick items for each preset
  interface PresetQuickPickItem extends vscode.QuickPickItem {
    preset: ConfigurationPreset;
  }

  const presetItems: PresetQuickPickItem[] = CONFIGURATION_PRESETS.map(
    (preset: ConfigurationPreset) => ({
      label: preset.name,
      description: `Security Level: ${preset.securityLevel.toUpperCase()}`,
      detail: preset.description,
      preset,
    })
  );

  // Show quick pick
  const selected = await vscode.window.showQuickPick(presetItems, {
    placeHolder: "Select a configuration preset to apply",
    matchOnDescription: true,
    matchOnDetail: true,
  });

  if (!selected) {
    return;
  }

  try {
    // Apply the preset (this will show diff and confirmation dialog)
    const applied = await settingsManager.applyPreset(selected.preset);

    if (applied) {
      outputChannel.appendLine(
        `Applied configuration preset: ${selected.preset.name}`
      );
    } else {
      outputChannel.appendLine("Preset application cancelled by user");
    }
  } catch (error: any) {
    outputChannel.appendLine(
      `Failed to apply preset: ${error.message || error}`
    );
    vscode.window.showErrorMessage(
      `Failed to apply preset: ${error.message || error}`
    );
  }
}

/**
 * Export configuration to file
 */
async function exportConfiguration(): Promise<void> {
  if (!settingsManager) {
    vscode.window.showErrorMessage("Settings manager not initialized");
    return;
  }

  let uri: vscode.Uri | undefined;

  try {
    // Generate configuration JSON
    const configJson = await settingsManager.exportConfiguration();

    // Show save dialog
    uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file("mcp-process-config.json"),
      filters: {
        "JSON Files": ["json"],
        "All Files": ["*"],
      },
      saveLabel: "Export Configuration",
      title: "Export MCP Process Configuration",
    });

    if (!uri) {
      return;
    }

    // Write to file
    await vscode.workspace.fs.writeFile(uri, Buffer.from(configJson, "utf8"));

    outputChannel.appendLine(`Configuration exported to: ${uri.fsPath}`);
    vscode.window.showInformationMessage(
      `Configuration exported successfully to ${uri.fsPath}`
    );
  } catch (error: any) {
    outputChannel.appendLine(
      `Failed to export configuration: ${error.message || error}`
    );

    // Use error handler for better error messages
    if (errorHandler) {
      await errorHandler.file.handleFileError(
        uri?.fsPath || "unknown",
        error,
        "write"
      );
    } else {
      vscode.window.showErrorMessage(
        `Failed to export configuration: ${error.message || error}`
      );
    }
  }
}

/**
 * Import configuration from file
 */
async function importConfiguration(): Promise<void> {
  if (!settingsManager) {
    vscode.window.showErrorMessage("Settings manager not initialized");
    return;
  }

  let uris: vscode.Uri[] | undefined;

  try {
    // Show open dialog
    uris = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      filters: {
        "JSON Files": ["json"],
        "All Files": ["*"],
      },
      openLabel: "Import Configuration",
      title: "Import MCP Process Configuration",
    });

    if (!uris || uris.length === 0) {
      return;
    }

    const uri = uris[0];

    // Read file
    const fileContent = await vscode.workspace.fs.readFile(uri);
    const configJson = Buffer.from(fileContent).toString("utf8");

    // Import configuration (this will validate and show warnings)
    await settingsManager.importConfiguration(configJson);

    outputChannel.appendLine(`Configuration imported from: ${uri.fsPath}`);
  } catch (error: any) {
    outputChannel.appendLine(
      `Failed to import configuration: ${error.message || error}`
    );

    // Use error handler for better error messages
    if (errorHandler) {
      await errorHandler.file.handleFileError(
        uris?.[0]?.fsPath || "unknown",
        error,
        "read"
      );
    } else {
      vscode.window.showErrorMessage(
        `Failed to import configuration: ${error.message || error}`
      );
    }
  }
}

/**
 * Check for first run and show welcome experience
 */
async function checkFirstRunExperience(
  context: vscode.ExtensionContext
): Promise<void> {
  // Check if this is the first run
  const hasSeenWelcome = context.globalState.get<boolean>(
    "mcp-process.hasSeenWelcome",
    false
  );

  if (hasSeenWelcome) {
    // Not first run, skip welcome experience
    return;
  }

  // Check if user has configured any settings
  const config = vscode.workspace.getConfiguration("mcp-process");
  const hasConfiguredSettings = isConfigurationCustomized(config);

  if (hasConfiguredSettings) {
    // User has already configured settings, mark as seen and skip
    await context.globalState.update("mcp-process.hasSeenWelcome", true);
    return;
  }

  // This is the first run with no custom settings - show welcome experience
  outputChannel.appendLine("First run detected - showing welcome experience");

  // Show welcome notification with preset options
  const selection = await vscode.window.showInformationMessage(
    "Welcome to MCP Process Manager! 🚀\n\n" +
      "To get started, you can apply a configuration preset optimized for your use case, " +
      "or configure settings manually.\n\n" +
      "Presets provide pre-configured security and resource settings:\n" +
      "• Development: Permissive settings for local development\n" +
      "• Production: Balanced settings for production use\n" +
      "• High Security: Strict settings for maximum security",
    { modal: false },
    "Apply Development Preset",
    "Apply Production Preset",
    "Apply High Security Preset",
    "Configure Manually",
    "Skip"
  );

  // Mark as seen regardless of selection
  await context.globalState.update("mcp-process.hasSeenWelcome", true);

  if (!selection || selection === "Skip") {
    outputChannel.appendLine("Welcome experience skipped by user");
    return;
  }

  if (selection === "Configure Manually") {
    // Open settings UI
    outputChannel.appendLine("Opening settings UI for manual configuration");
    await vscode.commands.executeCommand(
      "workbench.action.openSettings",
      "mcp-process"
    );
    return;
  }

  // User selected a preset - apply it
  if (!settingsManager) {
    vscode.window.showErrorMessage("Settings manager not initialized");
    return;
  }

  try {
    // Import presets from settings manager
    const settingsModule = await import("./settingsManager.js");
    const CONFIGURATION_PRESETS = settingsModule.CONFIGURATION_PRESETS;

    // Find the selected preset
    let selectedPreset;
    if (selection === "Apply Development Preset") {
      selectedPreset = CONFIGURATION_PRESETS.find(
        (p) => p.name === "Development"
      );
    } else if (selection === "Apply Production Preset") {
      selectedPreset = CONFIGURATION_PRESETS.find(
        (p) => p.name === "Production"
      );
    } else if (selection === "Apply High Security Preset") {
      selectedPreset = CONFIGURATION_PRESETS.find(
        (p) => p.name === "High Security"
      );
    }

    if (!selectedPreset) {
      vscode.window.showErrorMessage("Selected preset not found");
      return;
    }

    outputChannel.appendLine(`Applying preset: ${selectedPreset.name}`);

    // Apply the preset (this will show diff and confirmation dialog)
    const applied = await settingsManager.applyPreset(selectedPreset);

    if (applied) {
      outputChannel.appendLine(
        `Successfully applied ${selectedPreset.name} preset`
      );
      vscode.window.showInformationMessage(
        `${selectedPreset.name} preset applied successfully! You can customize settings anytime in VS Code Settings.`
      );
    } else {
      outputChannel.appendLine("Preset application cancelled by user");
    }
  } catch (error: any) {
    outputChannel.appendLine(
      `Failed to apply preset: ${error.message || error}`
    );
    vscode.window.showErrorMessage(
      `Failed to apply preset: ${error.message || error}`
    );
  }
}

/**
 * Check if the user has customized any MCP Process settings
 */
function isConfigurationCustomized(
  config: vscode.WorkspaceConfiguration
): boolean {
  // Check a few key settings to see if they've been customized from defaults
  // If any of these have non-default values, we consider the configuration customized

  // Check executable settings
  const allowedExecutables = config.get<string[]>(
    "executable.allowedExecutables",
    []
  );
  if (allowedExecutables.length > 0) {
    return true;
  }

  // Check if blockShellInterpreters has been explicitly set to true (default is false)
  const blockShellInterpreters = config.get<boolean>(
    "executable.blockShellInterpreters"
  );
  if (blockShellInterpreters === true) {
    return true;
  }

  // Check if any resource limits have been customized
  const defaultMaxCpuPercent = config.get<number>(
    "resources.defaultMaxCpuPercent"
  );
  if (defaultMaxCpuPercent !== undefined && defaultMaxCpuPercent !== 50) {
    return true;
  }

  const defaultMaxMemoryMB = config.get<number>("resources.defaultMaxMemoryMB");
  if (defaultMaxMemoryMB !== undefined && defaultMaxMemoryMB !== 512) {
    return true;
  }

  // Check if any advanced security features have been enabled
  const enableChroot = config.get<boolean>("security.advanced.enableChroot");
  if (enableChroot === true) {
    return true;
  }

  const enableNamespaces = config.get<boolean>(
    "security.advanced.enableNamespaces"
  );
  if (enableNamespaces === true) {
    return true;
  }

  const enableSeccomp = config.get<boolean>("security.advanced.enableSeccomp");
  if (enableSeccomp === true) {
    return true;
  }

  // Check if audit settings have been customized
  const enableAuditLog = config.get<boolean>("audit.enableAuditLog");
  if (enableAuditLog === false) {
    // Default is true, so false means customized
    return true;
  }

  // Check if confirmation is required (default is false)
  const requireConfirmation = config.get<boolean>(
    "security.requireConfirmation"
  );
  if (requireConfirmation === true) {
    return true;
  }

  // No customizations detected
  return false;
}

/**
 * Validate current configuration
 */
async function validateConfiguration(): Promise<void> {
  if (!settingsManager) {
    vscode.window.showErrorMessage("Settings manager not initialized");
    return;
  }

  try {
    // Run validation
    const result = settingsManager.validateConfiguration();

    // Show results in output panel
    outputChannel.clear();
    outputChannel.show(true);

    outputChannel.appendLine("=".repeat(80));
    outputChannel.appendLine("MCP Process Configuration Validation");
    outputChannel.appendLine("=".repeat(80));
    outputChannel.appendLine("");

    if (result.valid) {
      outputChannel.appendLine("✅ Configuration is valid!");
      outputChannel.appendLine("");

      if (result.warnings.length > 0) {
        outputChannel.appendLine(
          `⚠️  Found ${result.warnings.length} warning(s):`
        );
        outputChannel.appendLine("");

        for (const warning of result.warnings) {
          outputChannel.appendLine(
            `  [${warning.severity.toUpperCase()}] ${warning.setting}`
          );
          outputChannel.appendLine(`    ${warning.message}`);
          outputChannel.appendLine("");
        }
      } else {
        outputChannel.appendLine("No warnings found.");
      }

      vscode.window.showInformationMessage(
        result.warnings.length > 0
          ? `Configuration is valid with ${result.warnings.length} warning(s). Check output for details.`
          : "Configuration is valid with no warnings!"
      );
    } else {
      outputChannel.appendLine("❌ Configuration has errors!");
      outputChannel.appendLine("");

      outputChannel.appendLine(`Found ${result.errors.length} error(s):`);
      outputChannel.appendLine("");

      for (const error of result.errors) {
        outputChannel.appendLine(`  ❌ ${error.setting}`);
        outputChannel.appendLine(`    ${error.message}`);
        if (error.suggestion) {
          outputChannel.appendLine(`    💡 Suggestion: ${error.suggestion}`);
        }
        outputChannel.appendLine("");
      }

      if (result.warnings.length > 0) {
        outputChannel.appendLine("");
        outputChannel.appendLine(
          `Also found ${result.warnings.length} warning(s):`
        );
        outputChannel.appendLine("");

        for (const warning of result.warnings) {
          outputChannel.appendLine(
            `  [${warning.severity.toUpperCase()}] ${warning.setting}`
          );
          outputChannel.appendLine(`    ${warning.message}`);
          outputChannel.appendLine("");
        }
      }

      vscode.window
        .showErrorMessage(
          `Configuration has ${result.errors.length} error(s). Check output for details.`,
          "Show Output"
        )
        .then((selection) => {
          if (selection === "Show Output") {
            outputChannel.show();
          }
        });
    }

    outputChannel.appendLine("=".repeat(80));
  } catch (error: any) {
    outputChannel.appendLine(
      `Failed to validate configuration: ${error.message || error}`
    );
    vscode.window.showErrorMessage(
      `Failed to validate configuration: ${error.message || error}`
    );
  }
}

/**
 * Add this MCP server to the workspace mcp.json configuration
 */
async function configureMcpServer(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    const choice = await vscode.window.showWarningMessage(
      "No workspace folder open. Would you like to add the MCP server to your user settings instead?",
      "Add to User Settings",
      "Cancel"
    );
    if (choice === "Add to User Settings") {
      await vscode.commands.executeCommand("workbench.action.openSettingsJson");
      vscode.window.showInformationMessage(
        "Add the MCP server configuration manually. See the extension README for details."
      );
    }
    return;
  }

  const workspaceFolder = workspaceFolders[0];
  const vscodePath = path.join(workspaceFolder.uri.fsPath, ".vscode");
  const mcpJsonPath = path.join(vscodePath, "mcp.json");

  // Ensure .vscode directory exists
  if (!fs.existsSync(vscodePath)) {
    fs.mkdirSync(vscodePath, { recursive: true });
  }

  // Read existing mcp.json or create new one
  let mcpConfig: { servers?: Record<string, any> } = { servers: {} };
  if (fs.existsSync(mcpJsonPath)) {
    try {
      const content = fs.readFileSync(mcpJsonPath, "utf8");
      mcpConfig = JSON.parse(content);
      if (!mcpConfig.servers) {
        mcpConfig.servers = {};
      }
    } catch (error) {
      outputChannel.appendLine(`Error reading mcp.json: ${error}`);
    }
  }

  // Add our server configuration
  const serverName = "mcp-process";
  if (mcpConfig.servers && mcpConfig.servers[serverName]) {
    const choice = await vscode.window.showWarningMessage(
      `MCP server "${serverName}" is already configured. Do you want to replace it?`,
      "Replace",
      "Cancel"
    );
    if (choice !== "Replace") {
      return;
    }
  }

  mcpConfig.servers = mcpConfig.servers || {};
  mcpConfig.servers[serverName] = {
    type: "stdio",
    command: "npx",
    args: ["-y", "@ai-capabilities-suite/mcp-process"],
  };

  // Write the updated configuration
  fs.writeFileSync(mcpJsonPath, JSON.stringify(mcpConfig, null, 2));

  // Open the file to show the user
  const doc = await vscode.workspace.openTextDocument(mcpJsonPath);
  await vscode.window.showTextDocument(doc);

  vscode.window.showInformationMessage(
    `MCP Process Manager server added to ${mcpJsonPath}. Restart the MCP server to use it with Copilot.`
  );
}

export async function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel("MCP Process Manager", {
    log: true,
  });
  outputChannel.appendLine("MCP Process Manager extension activating...");

  // Check if we're running in test mode
  const isTestMode =
    process.env.VSCODE_TEST_MODE === "true" ||
    process.env.NODE_ENV === "test" ||
    context.extensionMode === vscode.ExtensionMode.Test;

  // Check if LSP tests are running (they need the language server)
  const isLSPTest = process.env.VSCODE_LSP_TEST === "true";

  if (isTestMode && !isLSPTest) {
    outputChannel.appendLine(
      "Running in test mode - skipping server initialization"
    );
  }

  // Register MCP server definition provider (for future MCP protocol support)
  try {
    const mcpProviderId = "mcp-acs-process.mcp-provider";
    const mcpProvider: vscode.McpServerDefinitionProvider = {
      provideMcpServerDefinitions: async (token) => {
        const config = vscode.workspace.getConfiguration("mcp-process");
        const serverPath = config.get<string>("server.serverPath", "");
        const command = serverPath || "npx";
        const args = serverPath
          ? []
          : ["-y", "@ai-capabilities-suite/mcp-process"];

        return [
          new vscode.McpStdioServerDefinition(
            "MCP Process Manager",
            command,
            args
          ),
        ];
      },
      resolveMcpServerDefinition: async (server, token) => {
        return server;
      },
    };

    context.subscriptions.push(
      vscode.lm.registerMcpServerDefinitionProvider(mcpProviderId, mcpProvider)
    );
    outputChannel.appendLine("MCP server definition provider registered");
  } catch (error) {
    outputChannel.appendLine(
      `MCP provider registration skipped (API not available): ${error}`
    );
  }

  // Register chat participant for Copilot integration
  const participant = vscode.chat.createChatParticipant(
    "mcp-acs-process.participant",
    async (request, context, stream, token) => {
      if (!mcpClient) {
        stream.markdown(
          "MCP Process Manager is not running. Please start it first."
        );
        return;
      }

      const prompt = request.prompt;
      stream.markdown(`Processing: ${prompt}\n\n`);

      if (prompt.includes("start") || prompt.includes("launch")) {
        stream.markdown("Starting process...");
      } else if (prompt.includes("list") || prompt.includes("show")) {
        const processes = await mcpClient.listProcesses();
        stream.markdown(`Found ${processes.length} running processes`);
      } else if (prompt.includes("terminate") || prompt.includes("kill")) {
        stream.markdown("Terminating process...");
      } else {
        stream.markdown(
          "Available commands:\n- Start process\n- List processes\n- Terminate process\n- View statistics"
        );
      }
    }
  );

  context.subscriptions.push(participant);

  // Register language model tools
  try {
    const tools = [
      {
        name: "process_start",
        tool: {
          description: "Start a new process with security boundaries",
          inputSchema: {
            type: "object",
            properties: {
              executable: { type: "string", description: "Executable to run" },
              args: {
                type: "array",
                items: { type: "string" },
                description: "Arguments",
              },
            },
            required: ["executable"],
          },
          invoke: async (
            options: vscode.LanguageModelToolInvocationOptions<any>,
            token: vscode.CancellationToken
          ) => {
            await startProcess();
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart("Process started"),
            ]);
          },
        },
      },
      {
        name: "process_list",
        tool: {
          description: "List all running managed processes",
          inputSchema: { type: "object", properties: {} },
          invoke: async (
            options: vscode.LanguageModelToolInvocationOptions<any>,
            token: vscode.CancellationToken
          ) => {
            await viewProcesses();
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart("Processes listed"),
            ]);
          },
        },
      },
      {
        name: "process_terminate",
        tool: {
          description: "Terminate a running process",
          inputSchema: {
            type: "object",
            properties: {
              pid: { type: "number", description: "Process ID" },
            },
            required: ["pid"],
          },
          invoke: async (
            options: vscode.LanguageModelToolInvocationOptions<any>,
            token: vscode.CancellationToken
          ) => {
            const pid = options.input.pid;
            await terminateProcess({ pid });
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(`Process ${pid} terminated`),
            ]);
          },
        },
      },
      {
        name: "process_get_stats",
        tool: {
          description: "Get resource usage statistics for a process",
          inputSchema: {
            type: "object",
            properties: {
              pid: { type: "number", description: "Process ID" },
            },
            required: ["pid"],
          },
          invoke: async (
            options: vscode.LanguageModelToolInvocationOptions<any>,
            token: vscode.CancellationToken
          ) => {
            const pid = options.input.pid;
            await viewStats({ pid });
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(`Stats for process ${pid}`),
            ]);
          },
        },
      },
      {
        name: "process_get_output",
        tool: {
          description: "Get captured output from a process",
          inputSchema: {
            type: "object",
            properties: {
              pid: { type: "number", description: "Process ID" },
              lines: { type: "number", description: "Number of lines" },
            },
            required: ["pid"],
          },
          invoke: async (
            options: vscode.LanguageModelToolInvocationOptions<any>,
            token: vscode.CancellationToken
          ) => {
            if (!mcpClient) {
              throw new Error("MCP Process server not running");
            }
            const output = await mcpClient.getProcessOutput(options.input);
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(JSON.stringify(output)),
            ]);
          },
        },
      },
      {
        name: "process_send_stdin",
        tool: {
          description: "Send input to process stdin",
          inputSchema: {
            type: "object",
            properties: {
              pid: { type: "number", description: "Process ID" },
              data: { type: "string", description: "Data to send" },
            },
            required: ["pid", "data"],
          },
          invoke: async (
            options: vscode.LanguageModelToolInvocationOptions<any>,
            token: vscode.CancellationToken
          ) => {
            if (!mcpClient) {
              throw new Error("MCP Process server not running");
            }
            await mcpClient.sendProcessInput(options.input);
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart("Input sent"),
            ]);
          },
        },
      },
      {
        name: "process_get_status",
        tool: {
          description: "Get status of a process",
          inputSchema: {
            type: "object",
            properties: {
              pid: { type: "number", description: "Process ID" },
            },
            required: ["pid"],
          },
          invoke: async (
            options: vscode.LanguageModelToolInvocationOptions<any>,
            token: vscode.CancellationToken
          ) => {
            if (!mcpClient) {
              throw new Error("MCP Process server not running");
            }
            const status = await mcpClient.getProcessStatus(options.input);
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(JSON.stringify(status)),
            ]);
          },
        },
      },
      {
        name: "process_create_group",
        tool: {
          description: "Create a process group or pipeline",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string", description: "Group name" },
              pids: {
                type: "array",
                items: { type: "number" },
                description: "Process IDs",
              },
            },
            required: ["name"],
          },
          invoke: async (
            options: vscode.LanguageModelToolInvocationOptions<any>,
            token: vscode.CancellationToken
          ) => {
            if (!mcpClient) {
              throw new Error("MCP Process server not running");
            }
            await mcpClient.createProcessGroup(options.input);
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(
                `Group ${options.input.name} created`
              ),
            ]);
          },
        },
      },
      {
        name: "process_add_to_group",
        tool: {
          description: "Add process to existing group",
          inputSchema: {
            type: "object",
            properties: {
              groupName: { type: "string", description: "Group name" },
              pid: { type: "number", description: "Process ID" },
            },
            required: ["groupName", "pid"],
          },
          invoke: async (
            options: vscode.LanguageModelToolInvocationOptions<any>,
            token: vscode.CancellationToken
          ) => {
            if (!mcpClient) {
              throw new Error("MCP Process server not running");
            }
            await mcpClient.addToProcessGroup(options.input);
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(`Process added to group`),
            ]);
          },
        },
      },
      {
        name: "process_terminate_group",
        tool: {
          description: "Terminate all processes in a group",
          inputSchema: {
            type: "object",
            properties: {
              groupName: { type: "string", description: "Group name" },
              force: { type: "boolean", description: "Force termination" },
            },
            required: ["groupName"],
          },
          invoke: async (
            options: vscode.LanguageModelToolInvocationOptions<any>,
            token: vscode.CancellationToken
          ) => {
            if (!mcpClient) {
              throw new Error("MCP Process server not running");
            }
            await mcpClient.terminateProcessGroup(options.input);
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(`Group terminated`),
            ]);
          },
        },
      },
      {
        name: "process_start_service",
        tool: {
          description: "Start long-running service with auto-restart",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string", description: "Service name" },
              executable: { type: "string", description: "Executable" },
              args: {
                type: "array",
                items: { type: "string" },
                description: "Arguments",
              },
              autoRestart: { type: "boolean", description: "Auto-restart" },
            },
            required: ["name", "executable"],
          },
          invoke: async (
            options: vscode.LanguageModelToolInvocationOptions<any>,
            token: vscode.CancellationToken
          ) => {
            if (!mcpClient) {
              throw new Error("MCP Process server not running");
            }
            await mcpClient.startService(options.input);
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(
                `Service ${options.input.name} started`
              ),
            ]);
          },
        },
      },
      {
        name: "process_stop_service",
        tool: {
          description: "Stop service and disable auto-restart",
          inputSchema: {
            type: "object",
            properties: {
              name: { type: "string", description: "Service name" },
            },
            required: ["name"],
          },
          invoke: async (
            options: vscode.LanguageModelToolInvocationOptions<any>,
            token: vscode.CancellationToken
          ) => {
            if (!mcpClient) {
              throw new Error("MCP Process server not running");
            }
            await mcpClient.stopService(options.input);
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart(
                `Service ${options.input.name} stopped`
              ),
            ]);
          },
        },
      },
    ];

    for (const { name, tool } of tools) {
      context.subscriptions.push(vscode.lm.registerTool(name, tool));
    }
    outputChannel.appendLine(`Registered ${tools.length} language model tools`);
  } catch (error) {
    outputChannel.appendLine(
      `Tool registration skipped (API not available): ${error}`
    );
  }

  // Register task provider
  const taskProvider = vscode.tasks.registerTaskProvider("mcp-process", {
    provideTasks: () => {
      const tasks: vscode.Task[] = [];
      const config = vscode.workspace.getConfiguration("mcp-process");
      const allowedExecs = config.get<string[]>(
        "executable.allowedExecutables",
        []
      );

      for (const exec of allowedExecs.slice(0, 5)) {
        const task = new vscode.Task(
          { type: "mcp-process", exec },
          vscode.TaskScope.Workspace,
          `Run ${exec}`,
          "mcp-process",
          new vscode.ShellExecution(exec)
        );
        tasks.push(task);
      }
      return tasks;
    },
    resolveTask: () => undefined,
  });
  context.subscriptions.push(taskProvider);

  // Set platform context keys for conditional settings visibility
  await setPlatformContext();

  // Start Language Server (always start - it's lightweight and LSP tests need it)
  await startLanguageServer(context);

  // Initialize Error Handler
  errorHandler = new ErrorHandler(outputChannel);

  // Initialize Settings Manager
  settingsManager = new SettingsManager();
  context.subscriptions.push(settingsManager);

  // Listen for configuration changes
  settingsManager.onConfigurationChanged(async (changes) => {
    await handleConfigurationChange(changes);
  });

  // Initialize status bar item (will be shown when restart is needed)
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  context.subscriptions.push(statusBarItem);

  // Create permanent status bar item
  permanentStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    98
  );
  permanentStatusBarItem.text = "$(terminal) Process";
  permanentStatusBarItem.tooltip = "MCP Process Manager - Click to start process";
  permanentStatusBarItem.command = "mcp-process.startProcess";
  permanentStatusBarItem.backgroundColor = undefined;
  permanentStatusBarItem.show();
  context.subscriptions.push(permanentStatusBarItem);

  // Check for first run and show welcome experience (skip in test mode unless LSP tests)
  if (!isTestMode || isLSPTest) {
    await checkFirstRunExperience(context);
  }

  // Initialize providers
  processTreeProvider = new ProcessTreeDataProvider();
  securityTreeProvider = new SecurityTreeDataProvider();
  processContextProvider = new ProcessContextProvider();

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

  // Initialize MCP client (skip in test mode unless LSP tests or E2E tests)
  const config = vscode.workspace.getConfiguration("mcp-process");
  const autoStart = config.get<boolean>("server.autoStart", true);
  const isE2ETest = process.env.VSCODE_E2E_TEST === "true";

  if (autoStart && (!isTestMode || isLSPTest || isE2ETest)) {
    try {
      mcpClient = new MCPProcessClient(outputChannel);

      // Generate and pass server configuration from VS Code settings
      const serverConfig = settingsManager.generateServerConfig();
      mcpClient.setServerConfig(serverConfig);

      await mcpClient.start();

      processTreeProvider.setMCPClient(mcpClient);
      securityTreeProvider.setMCPClient(mcpClient);
      processContextProvider.setMCPClient(mcpClient);

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
    vscode.commands.registerCommand("mcp-process.configureMcp", async () => {
      await configureMcpServer();
    })
  );

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

  context.subscriptions.push(
    vscode.commands.registerCommand("mcp-process.restartServer", async () => {
      await restartServer();
    })
  );

  // Configuration management commands
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mcp-process.applyConfigurationPreset",
      async () => {
        await applyConfigurationPreset();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mcp-process.exportConfiguration",
      async () => {
        await exportConfiguration();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mcp-process.importConfiguration",
      async () => {
        await importConfiguration();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mcp-process.validateConfiguration",
      async () => {
        await validateConfiguration();
      }
    )
  );

  // Copilot integration commands
  context.subscriptions.push(
    vscode.commands.registerCommand("mcp-process.getContext", async () => {
      return await processContextProvider.getContext();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mcp-process.getContextString",
      async () => {
        const contextString = await processContextProvider.getContextString();
        vscode.window.showInformationMessage(contextString, { modal: true });
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "mcp-process.getAvailableTools",
      async () => {
        return processContextProvider.getAvailableTools();
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
  if (settingsManager) {
    settingsManager.dispose();
  }
  if (statusBarItem) {
    statusBarItem.dispose();
  }
  if (permanentStatusBarItem) {
    permanentStatusBarItem.dispose();
  }
  if (languageClient) {
    await languageClient.stop();
  }
  // Clear platform context keys
  await clearPlatformContext();
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
    if (errorHandler) {
      await errorHandler.server.handleServerNotRunning(
        new Error("MCP Process server not running")
      );
    } else {
      vscode.window.showErrorMessage("MCP Process server not running");
    }
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
    outputChannel.appendLine(
      `Failed to start process: ${error.message || error}`
    );

    if (errorHandler) {
      await errorHandler.server.handleServerError(error);
    } else {
      vscode.window.showErrorMessage(
        `Failed to start process: ${error.message || error}`
      );
    }
  }
}

async function terminateProcess(item: any) {
  if (!mcpClient) {
    if (errorHandler) {
      await errorHandler.server.handleServerNotRunning(
        new Error("MCP Process server not running")
      );
    } else {
      vscode.window.showErrorMessage("MCP Process server not running");
    }
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
    outputChannel.appendLine(
      `Failed to terminate process: ${error.message || error}`
    );

    if (errorHandler) {
      await errorHandler.server.handleServerError(error);
    } else {
      vscode.window.showErrorMessage(
        `Failed to terminate process: ${error.message || error}`
      );
    }
  }
}

async function viewProcesses() {
  if (!mcpClient) {
    if (errorHandler) {
      await errorHandler.server.handleServerNotRunning(
        new Error("MCP Process server not running")
      );
    } else {
      vscode.window.showErrorMessage("MCP Process server not running");
    }
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

async function startLanguageServer(context: vscode.ExtensionContext) {
  try {
    const serverModule = context.asAbsolutePath(
      path.join("out", "languageServer.js")
    );

    const fs = require("fs");
    if (!fs.existsSync(serverModule)) {
      outputChannel.appendLine(
        `Language server module not found at: ${serverModule}`
      );
      outputChannel.appendLine("Skipping language server startup");
      return;
    }

    const debugOptions = { execArgv: ["--nolazy", "--inspect=6010"] };

    const serverOptions: ServerOptions = {
      run: { module: serverModule, transport: TransportKind.ipc },
      debug: {
        module: serverModule,
        transport: TransportKind.ipc,
        options: debugOptions,
      },
    };

    const clientOptions: LanguageClientOptions = {
      documentSelector: [
        { scheme: "file", language: "javascript" },
        { scheme: "file", language: "typescript" },
        { scheme: "file", language: "javascriptreact" },
        { scheme: "file", language: "typescriptreact" },
      ],
      synchronize: {
        fileEvents: vscode.workspace.createFileSystemWatcher("**/*.{js,ts}"),
      },
      outputChannel: outputChannel,
    };

    languageClient = new LanguageClient(
      "mcpProcessLanguageServer",
      "MCP Process Language Server",
      serverOptions,
      clientOptions
    );

    await languageClient.start();

    outputChannel.appendLine("Language Server started successfully");

    // Register LSP command handlers
    context.subscriptions.push(
      vscode.commands.registerCommand(
        "mcp.process.start",
        async (uri: string, line: number) => {
          await startProcess();
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        "mcp.process.terminate",
        async (uri: string, line: number) => {
          const processes = await mcpClient?.listProcesses();
          if (processes && processes.length > 0) {
            const items = processes.map((p) => ({
              label: `PID ${p.pid}: ${p.command}`,
              pid: p.pid,
            }));
            const selected = await vscode.window.showQuickPick(items);
            if (selected) {
              await terminateProcess({ pid: selected.pid });
            }
          }
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        "mcp.process.getStats",
        async (uri: string, line: number) => {
          await viewProcesses();
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand("mcp.process.list", async () => {
        await viewProcesses();
      })
    );
  } catch (error) {
    outputChannel.appendLine(`Failed to start language server: ${error}`);
    outputChannel.appendLine(
      "Extension will continue without language server features"
    );
  }
}
