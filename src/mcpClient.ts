import * as vscode from "vscode";
import * as child_process from "child_process";
import * as path from "path";

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

export class MCPProcessClient {
  public serverProcess: child_process.ChildProcess | undefined;
  public requestId = 0;
  public pendingRequests = new Map<
    number,
    {
      resolve: (value: any) => void;
      reject: (error: any) => void;
    }
  >();
  public config: any = {};
  private outputChannel?: vscode.OutputChannel;

  constructor(configOrOutputChannel?: any) {
    if (configOrOutputChannel && configOrOutputChannel.appendLine) {
      this.outputChannel = configOrOutputChannel;
    } else if (configOrOutputChannel) {
      this.config = configOrOutputChannel;
    }
  }

  async connect(): Promise<void> {
    return this.start();
  }

  async disconnect(): Promise<void> {
    this.stop();
  }

  async start(): Promise<void> {
    const config = vscode.workspace.getConfiguration("mcp-process");
    const serverPath = config.get<string>("serverPath");
    const configPath = config.get<string>("configPath");

    // Determine server executable
    let serverCommand: string;
    if (serverPath && serverPath.length > 0) {
      serverCommand = serverPath;
    } else {
      // Try to use global installation
      serverCommand = "mcp-process";
    }

    // Build arguments
    const args: string[] = [];
    if (configPath && configPath.length > 0) {
      args.push("--config", configPath);
    }

    if (this.outputChannel) {
      this.outputChannel.appendLine(
        `Starting MCP server: ${serverCommand} ${args.join(" ")}`
      );
    }

    // Spawn server process
    this.serverProcess = child_process.spawn(serverCommand, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Handle spawn errors immediately
    this.serverProcess.on("error", (error: Error) => {
      if (this.outputChannel) {
        this.outputChannel.appendLine(`Server spawn error: ${error.message}`);
      }
      // Reject all pending requests
      for (const [id, { reject }] of this.pendingRequests) {
        reject(error);
      }
      this.pendingRequests.clear();
    });

    if (
      !this.serverProcess.stdin ||
      !this.serverProcess.stdout ||
      !this.serverProcess.stderr
    ) {
      throw new Error("Failed to create server process stdio streams");
    }

    // Handle server output
    let buffer = "";
    this.serverProcess.stdout.on("data", (data: Buffer) => {
      buffer += data.toString();

      // Process complete JSON-RPC messages
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim().length === 0) {
          continue;
        }

        try {
          const message = JSON.parse(line);
          this.handleMessage(message);
        } catch (error) {
          if (this.outputChannel) {
            this.outputChannel.appendLine(`Failed to parse message: ${line}`);
          }
        }
      }
    });

    this.serverProcess.stderr.on("data", (data: Buffer) => {
      if (this.outputChannel) {
        this.outputChannel.appendLine(`Server stderr: ${data.toString()}`);
      }
    });

    this.serverProcess.on("exit", (code, signal) => {
      if (this.outputChannel) {
        this.outputChannel.appendLine(
          `Server exited with code ${code}, signal ${signal}`
        );
      }
      this.serverProcess = undefined;

      // Reject all pending requests
      for (const [id, { reject }] of this.pendingRequests) {
        reject(new Error("Server process exited"));
      }
      this.pendingRequests.clear();
    });

    // Initialize MCP protocol
    await this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "vscode-mcp-process",
        version: "1.0.0",
      },
    });

    // Send initialized notification
    await this.sendNotification("initialized", {});

    // Load configuration
    try {
      const tools = await this.sendRequest("tools/list", {});
      if (this.outputChannel) {
        this.outputChannel.appendLine(`Server tools: ${JSON.stringify(tools)}`);
      }
    } catch (error) {
      if (this.outputChannel) {
        this.outputChannel.appendLine(`Failed to list tools: ${error}`);
      }
    }
  }

  stop(): void {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = undefined;
    }
  }

  async startProcess(params: ProcessStartParams): Promise<string> {
    // Normalize params - MCP server expects 'cwd' not 'workingDirectory'
    const normalizedParams = {
      ...params,
      cwd: params.cwd || params.workingDirectory,
    };
    delete normalizedParams.workingDirectory;

    const result = await this.callTool("process_start", normalizedParams);
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
    return await this.callTool("process_terminate", params);
  }

  async getProcessStats(
    processIdOrParams: string | ProcessStatsParams
  ): Promise<ProcessStats> {
    const params =
      typeof processIdOrParams === "string"
        ? { pid: parseInt(processIdOrParams, 10) }
        : processIdOrParams;
    return await this.callTool("process_get_stats", params);
  }

  async getProcessInfo(processId: string): Promise<ProcessInfo> {
    // Convert string PID to number - MCP server expects number
    const result = await this.callTool("process_get_status", {
      pid: parseInt(processId, 10),
    });
    return result;
  }

  async listProcesses(): Promise<ProcessInfo[]> {
    const result = await this.callTool("process_list", {});
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

  getConfig(): any {
    return this.config;
  }

  private async callTool(name: string, args: any): Promise<any> {
    const result = await this.sendRequest("tools/call", {
      name,
      arguments: args,
    });

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

  private async sendRequest(method: string, params: any): Promise<any> {
    if (!this.serverProcess || !this.serverProcess.stdin) {
      throw new Error("Server not running");
    }

    const id = ++this.requestId;
    const request = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });

      const message = JSON.stringify(request) + "\n";
      this.serverProcess!.stdin!.write(message);

      // Set timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error("Request timeout"));
        }
      }, 30000);
    });
  }

  private async sendNotification(method: string, params: any): Promise<void> {
    if (!this.serverProcess || !this.serverProcess.stdin) {
      throw new Error("Server not running");
    }

    const notification = {
      jsonrpc: "2.0",
      method,
      params,
    };

    const message = JSON.stringify(notification) + "\n";
    this.serverProcess.stdin.write(message);
  }

  private handleMessage(message: any): void {
    if (message.id !== undefined) {
      // Response to a request
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        this.pendingRequests.delete(message.id);

        if (message.error) {
          pending.reject(new Error(message.error.message || "Request failed"));
        } else {
          pending.resolve(message.result);
        }
      }
    } else {
      // Notification from server
      if (this.outputChannel) {
        this.outputChannel.appendLine(
          `Server notification: ${JSON.stringify(message)}`
        );
      }
    }
  }
}
