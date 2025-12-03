# MCP Process Manager for VS Code

Process management for AI agents with MCP integration and security boundaries. Launch, monitor, and control processes directly from VS Code with comprehensive security enforcement.

## 🔗 Repository

This package is part of the [AI Capabilities Suite](https://github.com/Digital-Defiance/ai-capabilities-suite) on GitHub.

## Features

### 🚀 Process Management

- **Launch Processes**: Start processes with custom arguments and environment variables
- **Monitor Resources**: Real-time CPU, memory, and I/O monitoring
- **Terminate Processes**: Graceful (SIGTERM) or forced (SIGKILL) termination
- **Process List**: View all running processes in a tree view
- **Process Statistics**: Detailed resource usage statistics in webview

### 🛡️ Security Boundaries

- **Executable Allowlist**: Only pre-approved executables can be launched
- **Resource Limits**: CPU, memory, and time limits enforced
- **Security Dashboard**: View all security boundaries in tree view
- **Audit Logging**: Complete operation tracking
- **Multi-Layer Validation**: 6 layers of security checks

### 📊 Visual Interface

- **Process Tree View**: See all running processes at a glance
- **Security Tree View**: Understand security boundaries
- **Statistics Webview**: Beautiful charts and metrics
- **Real-Time Updates**: Auto-refresh process list

### 🤖 AI Integration

- **MCP Protocol**: Works with AI agents like Kiro, Claude Desktop
- **GitHub Copilot Ready**: Copilot can manage processes
- **Secure by Default**: AI agents cannot bypass security

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "MCP Process Manager"
4. Click Install

### Install the MCP Process Server

The extension requires the MCP process server. Install it globally:

```bash
npm install -g @ai-capabilities-suite/mcp-process
```

Or use Docker:

```bash
docker pull digitaldefiance/mcp-process:latest
```

### From VSIX File

```bash
code --install-extension mcp-process-manager-1.0.0.vsix
```

## Quick Start

### 1. Configure the Server

Create a configuration file `mcp-process-config.json`:

```json
{
  "allowedExecutables": ["node", "python3", "npm", "git"],
  "defaultResourceLimits": {
    "maxCpuPercent": 80,
    "maxMemoryMB": 1024,
    "maxCpuTime": 300
  },
  "maxConcurrentProcesses": 10,
  "maxProcessLifetime": 3600,
  "enableAuditLog": true,
  "blockShellInterpreters": true,
  "blockSetuidExecutables": true
}
```

### 2. Configure VS Code Settings

Open VS Code settings (Ctrl+, / Cmd+,) and set:

```json
{
  "mcp-process.configPath": "/path/to/mcp-process-config.json",
  "mcp-process.autoStart": true,
  "mcp-process.refreshInterval": 2000,
  "mcp-process.showResourceUsage": true
}
```

### 3. Open the Process Manager

1. Click the MCP Process Manager icon in the Activity Bar (left sidebar)
2. View running processes in the "Running Processes" panel
3. View security boundaries in the "Security Boundaries" panel

### 4. Start a Process

**Option A: Use Command Palette**

1. Press `Ctrl+Shift+P` (Cmd+Shift+P on Mac)
2. Type "MCP Process: Start Process"
3. Enter executable name (e.g., "node")
4. Enter arguments (e.g., "--version")

**Option B: Use Tree View**

1. Click the play icon in the "Running Processes" panel title
2. Follow the prompts

## Usage Examples

### Example 1: Run a Node.js Script

1. Open Command Palette (Ctrl+Shift+P)
2. Select "MCP Process: Start Process"
3. Enter executable: `node`
4. Enter arguments: `script.js arg1 arg2`
5. View the process in the tree view
6. Click the graph icon to see statistics

### Example 2: Monitor Resource Usage

1. Start a process (see Example 1)
2. Click the graph icon next to the process
3. View real-time CPU, memory, and I/O statistics
4. Watch for resource limit violations

### Example 3: Terminate a Process

1. Find the process in the tree view
2. Click the stop icon next to the process
3. Choose "Graceful (SIGTERM)" or "Forced (SIGKILL)"
4. Process will be terminated

### Example 4: View Security Boundaries

1. Open the "Security Boundaries" panel
2. Expand "Allowed Executables" to see what can be launched
3. Expand "Resource Limits" to see limits
4. Expand "Security Features" to see protections

### Example 5: Configure Allowlist

1. Open Command Palette (Ctrl+Shift+P)
2. Select "MCP Process: Configure Executable Allowlist"
3. Edit the configuration file
4. Save and restart the server

## Configuration

### Extension Settings

| Setting                         | Type    | Default | Description                           |
| ------------------------------- | ------- | ------- | ------------------------------------- |
| `mcp-process.serverPath`        | string  | ""      | Path to MCP process server executable |
| `mcp-process.configPath`        | string  | ""      | Path to server configuration file     |
| `mcp-process.autoStart`         | boolean | true    | Auto-start server on VS Code startup  |
| `mcp-process.refreshInterval`   | number  | 2000    | Process list refresh interval (ms)    |
| `mcp-process.showResourceUsage` | boolean | true    | Show CPU/memory in process list       |
| `mcp-process.logLevel`          | string  | "info"  | Log level (debug, info, warn, error)  |

### Server Configuration

See the [MCP Process Server documentation](https://github.com/digital-defiance/ai-capabilities-suite/tree/main/packages/mcp-process) for detailed configuration options.

**Minimal Configuration:**

```json
{
  "allowedExecutables": ["node", "python3"],
  "defaultResourceLimits": {
    "maxCpuPercent": 80,
    "maxMemoryMB": 1024
  },
  "maxConcurrentProcesses": 10,
  "enableAuditLog": true
}
```

**Development Configuration:**

```json
{
  "allowedExecutables": [
    "node",
    "npm",
    "yarn",
    "python3",
    "pip3",
    "git",
    "jest",
    "eslint",
    "tsc"
  ],
  "defaultResourceLimits": {
    "maxCpuPercent": 90,
    "maxMemoryMB": 2048,
    "maxCpuTime": 600
  },
  "maxConcurrentProcesses": 20,
  "maxProcessLifetime": 7200,
  "enableAuditLog": true,
  "blockShellInterpreters": false,
  "blockSetuidExecutables": true
}
```

## Commands

| Command                                       | Description            | Shortcut |
| --------------------------------------------- | ---------------------- | -------- |
| `MCP Process: Start Process`                  | Launch a new process   | -        |
| `MCP Process: Terminate Process`              | Stop a running process | -        |
| `MCP Process: View All Processes`             | Show process list      | -        |
| `MCP Process: View Process Statistics`        | Show detailed stats    | -        |
| `MCP Process: Refresh Process List`           | Refresh the tree view  | -        |
| `MCP Process: Show Security Boundaries`       | View security config   | -        |
| `MCP Process: Configure Executable Allowlist` | Edit allowlist         | -        |

## Security

This extension enforces strict security boundaries:

### What AI Agents CANNOT Do

- Launch executables not in the allowlist
- Launch shell interpreters (bash, sh, cmd.exe) if blocked
- Launch dangerous executables (sudo, rm, dd, etc.)
- Launch setuid/setgid executables
- Modify PATH or dangerous environment variables
- Send signals to processes they didn't create
- Escalate privileges
- Bypass resource limits
- Launch unlimited concurrent processes
- Keep processes running indefinitely

### What AI Agents CAN Do (Within Allowlist)

- Launch approved executables with arguments
- Set safe environment variables
- Capture stdout/stderr
- Send stdin input
- Monitor resource usage
- Terminate processes they created
- Create process groups
- Set resource limits (within configured maximums)

### Security Layers

1. **Executable Allowlist**: Only pre-approved executables
2. **Argument Validation**: Injection attack prevention
3. **Environment Sanitization**: Dangerous variables removed
4. **Resource Limits**: CPU, memory, time limits
5. **Privilege Prevention**: No privilege escalation
6. **Audit Logging**: Complete operation tracking

## Troubleshooting

### Server Not Starting

**Problem**: Extension shows "Server not running"

**Solution**:

1. Check if Node.js is installed: `node --version`
2. Install MCP server: `npm install -g @ai-capabilities-suite/mcp-process`
3. Set `mcp-process.serverPath` in settings if needed
4. Check Output panel for errors
5. Restart VS Code

### Executable Not in Allowlist

**Problem**: "Executable not in allowlist" error

**Solution**:

1. Open Command Palette
2. Run "MCP Process: Configure Executable Allowlist"
3. Add the executable to `allowedExecutables`
4. Save and restart server

### Process Not Appearing

**Problem**: Started process doesn't appear in tree view

**Solution**:

1. Click the refresh icon in the tree view
2. Check if process exited immediately
3. Check Output panel for errors
4. Verify executable is in allowlist

### Resource Limit Exceeded

**Problem**: Process terminated with "CPU/Memory limit exceeded"

**Solution**:

1. Increase limits in configuration file
2. Or accept that the process is using too many resources
3. Check process statistics to see actual usage

### Configuration File Not Found

**Problem**: "Configuration file not found" error

**Solution**:

1. Set `mcp-process.configPath` in VS Code settings
2. Use absolute path to configuration file
3. Verify file exists and is readable
4. Check file permissions

## GitHub Copilot Integration

The MCP Process Manager works seamlessly with GitHub Copilot:

1. **Process Management**: Copilot can start and stop processes
2. **Resource Monitoring**: Copilot can check resource usage
3. **Security Awareness**: Copilot understands security boundaries
4. **Autonomous Operations**: Copilot can manage processes automatically

### Example Conversations

```
You: "Start a Node.js server on port 3000"
Copilot: [Uses MCP Process Manager to launch node server.js]

You: "Check if any processes are using too much memory"
Copilot: [Queries process statistics and reports high memory usage]

You: "Kill all Python processes"
Copilot: [Lists Python processes and terminates them]
```

## Requirements

- **VS Code**: Version 1.85.0 or higher
- **Node.js**: Version 18.x or higher
- **MCP Process Server**: Installed globally or specified in settings
- **Operating System**: Windows, macOS, or Linux

## Known Issues

- WebSocket connections may timeout on slow networks
- Process statistics may be delayed on high CPU load
- Some processes may not report accurate I/O statistics

## Release Notes

### 1.0.0

Initial release:

- Process management with MCP integration
- Real-time resource monitoring
- Security boundary visualization
- Tree view for processes and security
- Statistics webview
- GitHub Copilot integration
- Comprehensive security enforcement

## Contributing

Found a bug or have a feature request? Please open an issue on [GitHub](https://github.com/digital-defiance/ai-capabilities-suite/issues).

## License

MIT License - see [LICENSE](LICENSE) file for details.

## More Information

- [MCP Process Server](https://github.com/digital-defiance/ai-capabilities-suite/tree/main/packages/mcp-process)
- [AI Capabilities Suite](https://github.com/digital-defiance/ai-capabilities-suite)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [VS Code Extension API](https://code.visualstudio.com/api)

---

**Secure process management for AI agents! 🛡️**
