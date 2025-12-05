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

### 🔍 Language Server Protocol (LSP) Integration

**17 LSP Features for Enhanced Development:**

- **Enhanced Code Lens**: 7 types of inline actions (Launch, Terminate, Send, Get Output, Start Service, Monitor)
- **Semantic Tokens**: Syntax highlighting for process functions, variables, and properties
- **Inlay Hints**: Parameter names and type hints (%, MB units)
- **Signature Help**: Function signatures with parameter documentation
- **Rename Support**: Safe refactoring of process variables
- **Call Hierarchy**: Navigate process call chains
- **Hover Information**: Contextual help for process-related code
- **Diagnostics**: Real-time security warnings and best practices
- **Code Completion**: Smart suggestions for process configuration
- **Code Actions**: Quick fixes and refactoring suggestions
- **Definition Provider**: Go to process definitions
- **Document Symbols**: Outline view of processes
- **11 Custom Commands**: Full MCP tool access for AI agents

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
- **GitHub Copilot Ready**: Copilot can manage processes through LSP
- **Code Lens Integration**: AI agents see inline process management actions
- **Diagnostics Integration**: AI agents see security warnings and suggestions
- **Context Providers**: AI agents have full visibility into running processes
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

## Language Server Protocol (LSP) Features

The extension provides comprehensive LSP integration with 17 features for enhanced development experience and AI assistance.

### LSP Features Overview

| Feature          | Description                 | AI Benefit                   |
| ---------------- | --------------------------- | ---------------------------- |
| Code Lens        | 7 types of inline actions   | AI sees available operations |
| Hover            | Contextual help on keywords | AI understands process APIs  |
| Diagnostics      | Security warnings           | AI learns best practices     |
| Completion       | Smart suggestions           | AI gets accurate completions |
| Signature Help   | Function signatures         | AI knows parameter types     |
| Semantic Tokens  | Syntax highlighting         | AI identifies process code   |
| Inlay Hints      | Parameter/type hints        | AI sees implicit information |
| Rename           | Refactor variables          | AI can rename safely         |
| Call Hierarchy   | Navigate call chains        | AI traces process flows      |
| Definition       | Go to definition            | AI finds declarations        |
| Document Symbols | Outline view                | AI understands structure     |
| Code Actions     | Quick fixes                 | AI suggests improvements     |

### 1. Enhanced Code Lens (7 Types)

Inline actions appear directly in your code for common process operations:

```javascript
const { spawn } = require("child_process");

// 🚀 Launch with MCP | 📊 Monitor Resources
const child = spawn("node", ["script.js"]);

// 📝 Send via MCP
child.stdin.write("input data\n");

// 📤 Get Output via MCP
child.stdout.on("data", (data) => {
  console.log(data);
});

// 🛑 Terminate via MCP
child.kill("SIGTERM");

// 🔄 Start as Service
const service = spawn("node", ["server.js"], { detached: true });
```

**Code Lens Types:**

- **🚀 Launch with MCP**: Appears on `spawn()` calls - launches process via MCP
- **🛑 Terminate via MCP**: Appears on `.kill()` calls - terminates via MCP
- **📝 Send via MCP**: Appears on `.stdin.write()` - sends input via MCP
- **📤 Get Output via MCP**: Appears on `.stdout`/`.stderr` - captures output via MCP
- **🔄 Start as Service**: Appears on detached processes - manages as service
- **📊 Monitor Resources**: Appears on process loops - tracks CPU/memory

### 2. Semantic Tokens

Syntax highlighting for process-related code helps identify process operations at a glance:

```javascript
// Functions highlighted: spawn, exec, fork, kill
const child = spawn("node", ["script.js"]);
const result = exec("ls -la");
const worker = fork("worker.js");
process.kill(child.pid);

// Variables highlighted: pid
const pid = child.pid;

// Properties highlighted: stdin, stdout, stderr, pid
child.stdin.write("data");
child.stdout.on("data", handler);
child.stderr.pipe(process.stderr);
```

**Highlighted Elements:**

- Process functions: `spawn`, `exec`, `fork`, `kill`
- Process variables: `pid`, `child`, `process`
- Process properties: `stdin`, `stdout`, `stderr`, `pid`

### 3. Inlay Hints

Parameter names and type hints appear inline for better code understanding:

```javascript
// Parameter hints show what each argument is
const child = spawn(executable: "node", args: ["script.js"]);

// Type hints show units for resource limits
const config = {
  maxCpuPercent: 80%,    // Shows % unit
  maxMemoryMB: 1024MB,   // Shows MB unit
  timeout: 30000
};
```

**Hint Types:**

- Parameter names for `spawn()`, `exec()`, `fork()`
- Units for resource limits (%, MB, seconds)
- Type information for configuration objects

### 4. Signature Help

Function signatures with parameter documentation appear as you type:

```javascript
// Typing spawn( shows:
// spawn(executable: string, args: string[], options?: SpawnOptions)
//       ^^^^^^^^^^^^^^^^^^^
const child = spawn("node", ["script.js"], { cwd: "/tmp" });

// Typing mcpClient.startProcess( shows:
// startProcess(config: ProcessConfig): Promise<number>
//              ^^^^^^^^^^^^^^^^^^^^^^
const pid = await mcpClient.startProcess({
  executable: "node",
  args: ["script.js"],
});
```

**Supported Functions:**

- `spawn()`, `exec()`, `fork()` - Node.js child_process
- `startProcess()`, `terminateProcess()` - MCP client methods
- `getProcessStats()`, `listProcesses()` - MCP monitoring

### 5. Enhanced Rename Support

Safely rename process-related variables across your entire file:

```javascript
// Right-click on 'child' and select Rename
const child = spawn("node", ["script.js"]);
child.stdout.on("data", (data) => console.log(data));
child.on("exit", (code) => console.log(`Exit: ${code}`));
// All instances of 'child' renamed together

// Works for: process, child, pid, worker, etc.
```

**Renameable Symbols:**

- Process variables: `child`, `process`, `worker`
- PID variables: `pid`, `processId`
- Related identifiers across the file

### 6. Call Hierarchy

Navigate process call chains to understand how processes are created and used:

```javascript
// Right-click on spawn() and select "Show Call Hierarchy"
function startServer() {
  return spawn("node", ["server.js"]); // ← Outgoing call
}

function main() {
  const server = startServer(); // ← Incoming call
}
```

**Navigation:**

- **Incoming Calls**: Find where a process is created
- **Outgoing Calls**: Find what a process calls
- Works across functions and files

### 7. Hover Information

Contextual help appears when hovering over process-related keywords:

```javascript
const child = spawn("node", ["script.js"]);
//            ^^^^^ Hover shows:
//            Process Management: spawn
//            MCP Process Manager provides secure process management.
```

### 8. Diagnostics

Real-time warnings for security issues and best practices:

```javascript
// ⚠️ Warning: Consider using child_process.spawn instead of exec for better security
const result = exec("ls -la");

// ⚠️ Warning: Using shell: true can introduce command injection vulnerabilities
const child = spawn("node", ["script.js"], { shell: true });
```

**Diagnostic Types:**

- Security warnings for `exec()` usage
- Command injection warnings for `shell: true`
- Best practice suggestions

### 9. Code Completion

Smart suggestions for process configuration and MCP methods:

```javascript
// Typing spawn("node", [], { shows:
const child = spawn("node", ["script.js"], {
  captureOutput: true,        // ← Suggested
  resourceLimits: { ... },    // ← Suggested
  timeout: 30000              // ← Suggested
});

// Typing mcpClient. shows:
mcpClient.startProcess()      // ← Suggested
mcpClient.terminateProcess()  // ← Suggested
mcpClient.getProcessStats()   // ← Suggested
```

### 10. Code Actions

Quick fixes and refactoring suggestions:

```javascript
// Diagnostic: "Consider using spawn instead of exec"
// Quick Fix: "Replace exec with spawn"
const result = exec("ls -la"); // ← Click lightbulb for fix

// Refactoring: "Convert to MCP Process Manager"
const child = spawn("node", ["script.js"]); // ← Select and refactor
```

### Custom Commands

All 11 MCP commands are accessible via LSP:

**Process Lifecycle:**

- `mcp.process.start` - Launch processes
- `mcp.process.terminate` - Terminate processes
- `mcp.process.list` - List all processes
- `mcp.process.getStats` - Get resource statistics

**I/O Management:**

- `mcp.process.sendStdin` - Send input to process
- `mcp.process.getOutput` - Capture stdout/stderr

**Process Groups:**

- `mcp.process.createGroup` - Create process group
- `mcp.process.addToGroup` - Add process to group
- `mcp.process.terminateGroup` - Terminate entire group

**Service Management:**

- `mcp.process.startService` - Start long-running service
- `mcp.process.stopService` - Stop service

See [COPILOT-INTEGRATION.md](COPILOT-INTEGRATION.md) for detailed AI integration documentation.

## GitHub Copilot Integration

The MCP Process Manager works seamlessly with GitHub Copilot and other AI assistants through comprehensive LSP integration:

### How LSP Features Enhance AI Assistance

1. **Code Lens Awareness**: AI sees all 7 types of inline actions and can invoke them
2. **Semantic Tokens**: AI identifies process-related code through syntax highlighting
3. **Inlay Hints**: AI understands parameter types and units without explicit documentation
4. **Signature Help**: AI knows exact function signatures and parameter types
5. **Diagnostic Awareness**: AI sees security warnings and suggests fixes automatically
6. **Call Hierarchy**: AI can trace process creation and usage across files
7. **Rename Support**: AI can safely refactor process variables
8. **Code Completion**: AI gets accurate suggestions for process configuration
9. **Process Context**: AI has full visibility into running processes
10. **Security Awareness**: AI understands security boundaries and limitations
11. **Command Access**: AI can invoke all 11 MCP commands through LSP

### Example AI Interactions

**Process Management:**

```
You: "Start a Node.js server on port 3000"
AI: [Sees spawn() code lens, uses mcp.process.start command]
    ✓ Launched node server.js with PID 12345

You: "Monitor the server's resource usage"
AI: [Clicks "📊 Monitor Resources" code lens]
    ✓ CPU: 15%, Memory: 256MB, Uptime: 2m 30s
```

**Security Assistance:**

```
You: "This code has a security warning, how do I fix it?"
AI: [Sees diagnostic: "shell: true can introduce command injection"]
    [Suggests quick fix: "Remove shell: true"]

    Before: spawn("ls", ["-la"], { shell: true })
    After:  spawn("ls", ["-la"])
```

**Code Understanding:**

```
You: "What does this process code do?"
AI: [Uses semantic tokens to identify spawn, pid, stdout]
    [Uses call hierarchy to trace process flow]
    [Uses hover to understand each operation]

    "This code spawns a Node.js process, captures its PID,
     monitors stdout, and terminates it after 30 seconds."
```

**Refactoring:**

```
You: "Rename this process variable to 'worker'"
AI: [Uses rename support to change all occurrences]
    ✓ Renamed 'child' to 'worker' in 8 locations

You: "Convert this to use MCP Process Manager"
AI: [Uses code action: "Convert to MCP Process Manager"]
    [Wraps spawn() with mcpClient.startProcess()]
```

**Process Groups:**

```
You: "Start 3 worker processes and manage them as a group"
AI: [Uses mcp.process.createGroup]
    [Uses mcp.process.start for each worker]
    [Uses mcp.process.addToGroup]
    ✓ Created group 'workers' with 3 processes
```

### AI Capabilities with LSP

With the comprehensive LSP integration, AI assistants can:

- **Understand** process code through semantic tokens and hover information
- **Navigate** process flows using call hierarchy and definitions
- **Suggest** improvements using diagnostics and code actions
- **Complete** code accurately with signature help and completions
- **Refactor** safely using rename support
- **Execute** operations using all 11 MCP commands
- **Monitor** resources through code lens actions
- **Enforce** security by understanding boundaries

### Autonomous Operations

AI assistants can manage processes autonomously:

1. **Launch processes** with proper configuration
2. **Monitor resources** and detect issues
3. **Terminate processes** when needed
4. **Manage process groups** for complex workflows
5. **Handle I/O** with stdin/stdout operations
6. **Start services** for long-running tasks
7. **Apply security best practices** automatically

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
