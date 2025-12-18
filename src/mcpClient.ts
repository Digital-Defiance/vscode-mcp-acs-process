import * as vscode from "vscode";
import * as path from "path";
import {
  BaseMCPClient,
  LogOutputChannel,
} from "@ai-capabilities-suite/mcp-client-base";

export interface ProcessStartParams {
  executable: string;
  args?: string[];
  workingDirectory?: string;
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  captureOutput?: boolean;
  resourceLimits?: {
    maxCpuPercent?: number;
    maxMemoryMB?: number;
    maxCpuTime?: number;
    maxFileDescriptors?: number;
    maxProcesses?: number;
  };
}

export interface ProcessTerminateParams {
  pid: number;
  force?: boolean;
  timeout?: number;
}

export interface ProcessStatsParams {
  pid: number;
  includeHistory?: boolean;
}

export interface ProcessInfo {
  id: string;
  pid?: number;
  executable: string;
  command?: string;
  args: string[];
  status: "running" | "stopped" | "crashed" | "exited" | "completed";
  state?: "running" | "stopped" | "crashed";
  uptime: number;
  startTime: string;
  output?: string;
  resourceLimits?: {
    maxCpuPercent?: number;
    maxMemoryMB?: number;
    maxCpuTime?: number;
    maxFileDescriptors?: number;
    maxProcesses?: number;
  };
}

export interface ProcessStats {
  state?: string;
  uptime?: number;
  cpuPercent: number;
  memoryMB: number;
  threadCount?: number;
  ioRead?: number;
  ioWrite?: number;
  stats?: {
    cpuPercent: number;
    memoryMB: number;
    threadCount: number;
    ioRead: number;
    ioWrite: number;
  };
}

export interface SecurityConfig {
  allowedExecutables: string[];
  blockSetuidExecutables: boolean;
  blockShellInterpreters: boolean;
  defaultResourceLimits?: {
    maxCpuPercent?: number;
    maxMemoryMB?: number;
    maxCpuTime?: number;
    maxFileDescriptors?: number;
    maxProcesses?: number;
  };
  maxConcurrentProcesses?: number;
  maxProcessLifetime?: number;
  allowProcessTermination?: boolean;
  allowGroupTermination?: boolean;
  allowForcedTermination?: boolean;
  allowStdinInput?: boolean;
  allowOutputCapture?: boolean;
  enableAuditLog?: boolean;
  requireConfirmation?: boolean;
}

export class MCPProcessClient extends BaseMCPClient {
  private serverConfig?: SecurityConfig;
  private tempConfigPath?: string;

  constructor(outputChannel: LogOutputChannel) {
    super("Process", outputChannel);
  }

  /**
   * Set the server configuration to be passed via IPC
   * @param config The SecurityConfig to pass to the server
   */
  public setServerConfig(config: SecurityConfig): void {
    this.serverConfig = config;
  }

  async connect(): Promise<void> {
    return this.start();
  }

  async disconnect(): Promise<void> {
    this.stop();
  }

  // ========== Abstract Method Implementations ==========

  protected getServerCommand(): { command: string; args: string[] } {
    const config = vscode.workspace.getConfiguration("mcp-process");
    const serverPath = config.get<string>("server.serverPath");
    const configPath = config.get<string>("server.configPath");
    const useConfigFile = config.get<boolean>("server.useConfigFile", false);

    let serverCommand: string;
    let args: string[] = [];

    if (process.env.VSCODE_TEST_MODE === "true") {
      try {
        // In test mode, use the local build
        let extensionPath = "";
        const extension = vscode.extensions.getExtension(
          "DigitalDefiance.mcp-acs-process"
        );
        if (extension) {
          extensionPath = extension.extensionPath;
        }

        if (extensionPath) {
          serverCommand = "node";
          const serverScript = path.resolve(
            extensionPath,
            "../mcp-process/dist/cli.js"
          );
          args = [serverScript];
        } else {
          serverCommand =
            serverPath && serverPath.length > 0 ? serverPath : "mcp-process";
        }
      } catch (error) {
        serverCommand =
          serverPath && serverPath.length > 0 ? serverPath : "mcp-process";
      }
    } else {
      if (serverPath && serverPath.length > 0) {
        serverCommand = serverPath;
      } else {
        // Use npx to run the server
        serverCommand = process.platform === "win32" ? "npx.cmd" : "npx";
        args = ["-y", "@ai-capabilities-suite/mcp-process"];
      }
    }

    // Handle configuration file argument
    if (useConfigFile && configPath && configPath.length > 0) {
      args.push("--config", configPath);
    }

    return { command: serverCommand, args };
  }

  protected getServerEnv(): Record<string, string> {
    const config = vscode.workspace.getConfiguration("mcp-process");
    const configPath = config.get<string>("server.configPath");
    const useConfigFile = config.get<boolean>("server.useConfigFile", false);

    const env: Record<string, string> = {};

    // Copy process.env, filtering out undefined values
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        env[key] = value;
      }
    }

    // Handle configuration - only pass via env if NOT using config file
    if (!useConfigFile || !configPath || configPath.length === 0) {
      if (this.serverConfig) {
        // Pass configuration via environment variable
        env["MCP_PROCESS_CONFIG"] = JSON.stringify(this.serverConfig);
        this.log(
          "info",
          "Passing configuration via MCP_PROCESS_CONFIG environment variable"
        );
      }
    }

    return env;
  }

  protected async onServerReady(): Promise<void> {
    // Send initialized notification
    await this.sendNotification("initialized", {});

    // Load configuration - list available tools
    try {
      const tools = await this.sendRequest("tools/list", {});
      this.log("info", `Server tools loaded: ${JSON.stringify(tools)}`);
    } catch (error) {
      this.log("warn", `Failed to list tools: ${error}`);
    }
  }

  // Override stop to add cleanup
  override stop(): void {
    this.cleanupTempConfig();
    // Call parent stop
    super.stop();
  }

  // Override handleServerExit to ensure cleanup on crash
  protected override handleServerExit(
    code: number | null,
    signal: string | null
  ): void {
    this.cleanupTempConfig();
    // Call parent handler
    super.handleServerExit(code, signal);
  }

  // Override handleServerError to match old behavior of clearing pending requests
  protected override handleServerError(error: Error): void {
    // Clear pending requests immediately on spawn error (matches old behavior)
    this.clearPendingRequests();
    // Call parent handler
    super.handleServerError(error);
  }

  // Helper method to clean up temp config file
  private cleanupTempConfig(): void {
    if (this.tempConfigPath) {
      try {
        const fs = require("fs");
        if (fs.existsSync(this.tempConfigPath)) {
          fs.unlinkSync(this.tempConfigPath);
          this.log(
            "info",
            `Cleaned up temporary config file: ${this.tempConfigPath}`
          );
        }
      } catch (error) {
        this.log("warn", `Failed to clean up temp config: ${error}`);
      }
      this.tempConfigPath = undefined;
    }
  }

  // ========== Process-Specific Methods ==========

  async startProcess(params: ProcessStartParams): Promise<string> {
    // Normalize params - MCP server expects 'cwd' not 'workingDirectory'
    const normalizedParams = {
      ...params,
      cwd: params.cwd || params.workingDirectory,
    };
    delete normalizedParams.workingDirectory;

    const result = (await this.callTool(
      "process_start",
      normalizedParams
    )) as any;
    // MCP server returns { pid: number }
    const pid = result.pid?.toString() || result.id || result.processId;
    return pid;
  }

  async terminateProcess(
    processIdOrParams: string | ProcessTerminateParams
  ): Promise<{ exitCode?: number; terminationReason?: string }> {
    const params =
      typeof processIdOrParams === "string"
        ? { pid: parseInt(processIdOrParams, 10) }
        : processIdOrParams;
    return (await this.callTool("process_terminate", params)) as any;
  }

  async getProcessStats(
    processIdOrParams: string | ProcessStatsParams
  ): Promise<ProcessStats> {
    const params =
      typeof processIdOrParams === "string"
        ? { pid: parseInt(processIdOrParams, 10) }
        : processIdOrParams;
    return (await this.callTool("process_get_stats", params)) as any;
  }

  async getProcessInfo(processId: string): Promise<ProcessInfo> {
    // Convert string PID to number - MCP server expects number
    const result = await this.callTool("process_get_status", {
      pid: parseInt(processId, 10),
    });
    return result as any;
  }

  async listProcesses(): Promise<ProcessInfo[]> {
    const result = (await this.callTool("process_list", {})) as any;
    return result.processes || result || [];
  }

  async getSecurityConfig(): Promise<SecurityConfig> {
    // The MCP server doesn't expose a security_get_config tool
    // We need to read the config from the file or return defaults
    // For now, return a reasonable default based on common configuration
    return {
      allowedExecutables: ["node", "echo", "sleep", "cat", "ls"],
      blockSetuidExecutables: true,
      blockShellInterpreters: false,
      defaultResourceLimits: {
        maxCpuPercent: 80,
        maxMemoryMB: 512,
        maxCpuTime: 60,
        maxFileDescriptors: 100,
        maxProcesses: 5,
      },
      maxConcurrentProcesses: 5,
      maxProcessLifetime: 300,
      allowProcessTermination: true,
      allowGroupTermination: true,
      allowForcedTermination: true,
      allowStdinInput: true,
      allowOutputCapture: true,
      enableAuditLog: false,
      requireConfirmation: false,
    };
  }

  async getProcessOutput(params: {
    pid: number;
    lines?: number;
  }): Promise<{ output: string }> {
    const result = await this.callTool("process_get_output", params);
    return result as any;
  }

  async sendProcessInput(params: { pid: number; data: string }): Promise<void> {
    await this.callTool("process_send_stdin", params);
  }

  async getProcessStatus(params: { pid: number }): Promise<ProcessInfo> {
    const result = await this.callTool("process_get_status", params);
    return result as any;
  }

  async createProcessGroup(params: {
    name: string;
    pids?: number[];
  }): Promise<{ groupId: string }> {
    const result = await this.callTool("process_create_group", params);
    return result as any;
  }

  async addToProcessGroup(params: {
    groupName: string;
    pid: number;
  }): Promise<void> {
    await this.callTool("process_add_to_group", params);
  }

  async terminateProcessGroup(params: {
    groupName: string;
    force?: boolean;
  }): Promise<void> {
    await this.callTool("process_terminate_group", params);
  }

  async startService(params: {
    name: string;
    executable: string;
    args?: string[];
    autoRestart?: boolean;
  }): Promise<{ serviceId: string }> {
    const result = await this.callTool("process_start_service", params);
    return result as any;
  }

  async stopService(params: { name: string }): Promise<void> {
    await this.callTool("process_stop_service", params);
  }

  /**
   * Get configuration (for backward compatibility)
   * Note: This returns an empty object as the old implementation did.
   * The actual server configuration is managed via setServerConfig().
   */
  getConfig(): any {
    return {};
  }

  // Override callTool to handle MCP-specific response format
  protected override async callTool(
    name: string,
    args: unknown
  ): Promise<unknown> {
    const result = (await this.sendRequest("tools/call", {
      name,
      arguments: args,
    })) as any;

    if (result.isError) {
      throw new Error(result.content[0]?.text || "Tool call failed");
    }

    // Parse result content
    const content = result.content[0]?.text;
    if (content) {
      try {
        return JSON.parse(content);
      } catch {
        return content;
      }
    }

    return result;
  }
}
