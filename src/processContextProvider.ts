import { MCPProcessClient } from "./mcpClient";

export class ProcessContextProvider {
  private mcpClient: MCPProcessClient | undefined;

  setMCPClient(client: MCPProcessClient) {
    this.mcpClient = client;
  }

  async getContext(): Promise<any> {
    if (!this.mcpClient) {
      return {
        serverRunning: false,
        processes: [],
        securityBoundaries: null,
      };
    }

    try {
      const processes = await this.mcpClient.listProcesses();
      const config = this.mcpClient.getConfig();

      return {
        serverRunning: true,
        processes: processes.map((p) => ({
          pid: p.pid,
          command: p.command,
          args: p.args,
          state: p.state,
          uptime: p.uptime,
        })),
        securityBoundaries: {
          allowedExecutables: config.allowedExecutables || [],
          maxConcurrentProcesses: config.maxConcurrentProcesses || 10,
        },
      };
    } catch (error) {
      return {
        serverRunning: false,
        processes: [],
        securityBoundaries: null,
        error: String(error),
      };
    }
  }

  async getContextString(): Promise<string> {
    const context = await this.getContext();

    if (!context.serverRunning) {
      return "MCP ACS Process Manager: Server not running";
    }

    const lines: string[] = [
      "=== MCP ACS Process Manager Context ===",
      "",
      `Running Processes: ${context.processes.length}`,
    ];

    return lines.join("\n");
  }

  getAvailableTools(): any[] {
    return [
      {
        name: "process_start",
        description: "Launch a new process with security validation",
      },
      {
        name: "process_terminate",
        description: "Terminate a running process",
      },
      {
        name: "process_get_stats",
        description: "Get resource usage statistics",
      },
    ];
  }
}
