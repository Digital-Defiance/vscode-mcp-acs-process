# MCP ACS Process Manager for VS Code

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
3. Search for "MCP ACS Process Manager"
4. Click Install

### Install the MCP ACS Process Server

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

1. Click the MCP ACS Process Manager icon in the Activity Bar (left sidebar)
2. View running processes in the "Running Processes" panel
3. View security boundaries in the "Security Boundaries" panel

### 4. Start a Process

**Option A: Use Command Palette**

1. Press `Ctrl+Shift+P` (Cmd+Shift+P on Mac)
2. Type "MCP ACS Process: Start Process"
3. Enter executable name (e.g., "node")
4. Enter arguments (e.g., "--version")

**Option B: Use Tree View**

1. Click the play icon in the "Running Processes" panel title
2. Follow the prompts

## Usage Examples

### Example 1: Run a Node.js Script

1. Open Command Palette (Ctrl+Shift+P)
2. Select "MCP ACS Process: Start Process"
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
2. Select "MCP ACS Process: Configure Executable Allowlist"
3. Edit the configuration file
4. Save and restart the server

## Configuration

The MCP ACS Process Manager provides comprehensive configuration through VS Code's native settings UI. All 50+ settings are organized into 8 logical categories for easy discovery and management.

### Quick Configuration

**Recommended Approach:** Use VS Code Settings UI (Ctrl+, / Cmd+,) and search for "mcp-process" to configure all settings visually.

**Alternative:** Edit `settings.json` directly for advanced configuration.

### Configuration Categories

#### 1. Server Settings (`mcp-process.server.*`)

Controls server connection and startup behavior.

| Setting         | Type    | Default | Description                                    |
| --------------- | ------- | ------- | ---------------------------------------------- |
| `serverPath`    | string  | ""      | Path to server executable (empty = bundled)    |
| `useConfigFile` | boolean | false   | Use external config file (advanced users only) |
| `configPath`    | string  | ""      | Path to config file (when useConfigFile=true)  |
| `autoStart`     | boolean | true    | Auto-start server on VS Code startup           |
| `logLevel`      | enum    | "info"  | Log level: debug, info, warn, error            |

**Example:**

```json
{
  "mcp-process.server.autoStart": true,
  "mcp-process.server.logLevel": "info"
}
```

#### 2. Executable Control (`mcp-process.executable.*`)

Controls which executables can be launched and how arguments are validated.

| Setting                        | Type     | Default | Description                               |
| ------------------------------ | -------- | ------- | ----------------------------------------- |
| `allowedExecutables`           | string[] | []      | Allowed executables (paths or patterns)   |
| `blockSetuidExecutables`       | boolean  | true    | Block setuid/setgid executables           |
| `blockShellInterpreters`       | boolean  | false   | Block shell interpreters (bash, sh, etc.) |
| `additionalBlockedExecutables` | string[] | []      | Additional blocked executables            |
| `maxArgumentCount`             | number   | 100     | Maximum number of arguments               |
| `maxArgumentLength`            | number   | 4096    | Maximum length of any argument (bytes)    |
| `blockedArgumentPatterns`      | string[] | []      | Regex patterns to block in arguments      |

**Example - Development Environment:**

```json
{
  "mcp-process.executable.allowedExecutables": [
    "node",
    "npm",
    "yarn",
    "python3",
    "git"
  ],
  "mcp-process.executable.blockShellInterpreters": false,
  "mcp-process.executable.blockSetuidExecutables": true
}
```

**Example - Production Environment:**

```json
{
  "mcp-process.executable.allowedExecutables": [
    "/usr/bin/node",
    "/usr/bin/python3"
  ],
  "mcp-process.executable.blockShellInterpreters": true,
  "mcp-process.executable.blockSetuidExecutables": true,
  "mcp-process.executable.blockedArgumentPatterns": [
    ".*\\|.*",
    ".*>.*",
    ".*\\$\\(.*\\).*"
  ]
}
```

#### 3. Resource Limits (`mcp-process.resources.*`)

Controls CPU, memory, and other resource limits for spawned processes.

| Setting                     | Type    | Default | Description                              |
| --------------------------- | ------- | ------- | ---------------------------------------- |
| `defaultMaxCpuPercent`      | number  | 50      | Default max CPU usage (0-100)            |
| `defaultMaxMemoryMB`        | number  | 512     | Default max memory in MB                 |
| `defaultMaxFileDescriptors` | number  | 1024    | Default max file descriptors             |
| `defaultMaxCpuTime`         | number  | 300     | Default max CPU time in seconds          |
| `defaultMaxProcesses`       | number  | 10      | Default max processes in tree            |
| `maximumMaxCpuPercent`      | number  | 100     | Hard limit on CPU usage                  |
| `maximumMaxMemoryMB`        | number  | 2048    | Hard limit on memory usage               |
| `strictResourceEnforcement` | boolean | false   | Terminate immediately on limit violation |

**Example - Generous Limits:**

```json
{
  "mcp-process.resources.defaultMaxCpuPercent": 80,
  "mcp-process.resources.defaultMaxMemoryMB": 2048,
  "mcp-process.resources.defaultMaxCpuTime": 600,
  "mcp-process.resources.strictResourceEnforcement": false
}
```

**Example - Strict Limits:**

```json
{
  "mcp-process.resources.defaultMaxCpuPercent": 25,
  "mcp-process.resources.defaultMaxMemoryMB": 256,
  "mcp-process.resources.defaultMaxCpuTime": 60,
  "mcp-process.resources.strictResourceEnforcement": true
}
```

#### 4. Process Limits (`mcp-process.process.*`)

Controls process concurrency and rate limiting.

| Setting                          | Type   | Default | Description                           |
| -------------------------------- | ------ | ------- | ------------------------------------- |
| `maxConcurrentProcesses`         | number | 10      | Max concurrent processes (global)     |
| `maxConcurrentProcessesPerAgent` | number | 5       | Max concurrent processes per agent    |
| `maxProcessLifetime`             | number | 3600    | Max process lifetime in seconds       |
| `maxTotalProcesses`              | number | 1000    | Max total processes (server lifetime) |
| `maxLaunchesPerMinute`           | number | 10      | Max launches per minute per agent     |
| `maxLaunchesPerHour`             | number | 100     | Max launches per hour per agent       |
| `rateLimitCooldownSeconds`       | number | 60      | Cooldown after rate limit hit         |

**Example:**

```json
{
  "mcp-process.process.maxConcurrentProcesses": 20,
  "mcp-process.process.maxConcurrentProcessesPerAgent": 10,
  "mcp-process.process.maxProcessLifetime": 7200,
  "mcp-process.process.maxLaunchesPerMinute": 20
}
```

#### 5. I/O Control (`mcp-process.io.*`)

Controls stdin/stdout behavior and buffer sizes.

| Setting               | Type    | Default | Description                        |
| --------------------- | ------- | ------- | ---------------------------------- |
| `allowStdinInput`     | boolean | true    | Allow stdin input to processes     |
| `allowOutputCapture`  | boolean | true    | Allow stdout/stderr capture        |
| `maxOutputBufferSize` | number  | 1048576 | Max buffer size per stream (bytes) |
| `blockBinaryStdin`    | boolean | true    | Block binary data in stdin         |

**Example:**

```json
{
  "mcp-process.io.allowStdinInput": true,
  "mcp-process.io.allowOutputCapture": true,
  "mcp-process.io.maxOutputBufferSize": 2097152,
  "mcp-process.io.blockBinaryStdin": true
}
```

#### 6. Security Settings (`mcp-process.security.*`)

Controls process termination, confirmation, and access control.

| Setting                          | Type     | Default | Description                               |
| -------------------------------- | -------- | ------- | ----------------------------------------- |
| `allowProcessTermination`        | boolean  | true    | Allow agents to terminate processes       |
| `allowGroupTermination`          | boolean  | true    | Allow agents to terminate groups          |
| `allowForcedTermination`         | boolean  | false   | Allow forced termination (SIGKILL)        |
| `requireTerminationConfirmation` | boolean  | false   | Require confirmation for termination      |
| `requireConfirmation`            | boolean  | false   | Require confirmation for all launches     |
| `requireConfirmationFor`         | string[] | []      | Executables requiring confirmation        |
| `autoApproveAfterCount`          | number   | 0       | Auto-approve after N successful launches  |
| `allowedWorkingDirectories`      | string[] | []      | Allowed working directories               |
| `blockedWorkingDirectories`      | string[] | []      | Blocked working directories               |
| `additionalBlockedEnvVars`       | string[] | []      | Additional blocked environment variables  |
| `allowedEnvVars`                 | string[] | []      | Allowed environment variables (whitelist) |
| `maxEnvVarCount`                 | number   | 100     | Maximum number of environment variables   |

**Example - High Security:**

```json
{
  "mcp-process.security.allowForcedTermination": false,
  "mcp-process.security.requireConfirmation": true,
  "mcp-process.security.requireConfirmationFor": ["rm", "dd", "mkfs"],
  "mcp-process.security.blockedWorkingDirectories": ["/etc", "/root"],
  "mcp-process.security.allowedEnvVars": ["PATH", "HOME", "USER"]
}
```

#### 7. Advanced Security (`mcp-process.security.advanced.*`)

Advanced isolation features (Linux-specific).

| Setting                      | Type     | Default    | Description                                   |
| ---------------------------- | -------- | ---------- | --------------------------------------------- |
| `enableChroot`               | boolean  | false      | Enable chroot jail (Unix/Linux)               |
| `chrootDirectory`            | string   | ""         | Chroot directory path                         |
| `enableNamespaces`           | boolean  | false      | Enable Linux namespaces                       |
| `namespacesPid`              | boolean  | false      | Enable PID namespace                          |
| `namespacesNetwork`          | boolean  | false      | Enable network namespace                      |
| `namespacesMount`            | boolean  | false      | Enable mount namespace                        |
| `namespacesUts`              | boolean  | false      | Enable UTS namespace                          |
| `namespacesIpc`              | boolean  | false      | Enable IPC namespace                          |
| `namespacesUser`             | boolean  | false      | Enable user namespace                         |
| `enableSeccomp`              | boolean  | false      | Enable seccomp filtering                      |
| `seccompProfile`             | enum     | "moderate" | Seccomp profile: strict, moderate, permissive |
| `blockNetworkAccess`         | boolean  | false      | Block network access                          |
| `allowedNetworkDestinations` | string[] | []         | Allowed network destinations                  |
| `blockedNetworkDestinations` | string[] | []         | Blocked network destinations                  |
| `enableMAC`                  | boolean  | false      | Enable mandatory access control               |
| `macProfile`                 | string   | ""         | SELinux context or AppArmor profile           |
| `dropCapabilities`           | string[] | []         | Linux capabilities to drop                    |
| `readOnlyFilesystem`         | boolean  | false      | Mount filesystem as read-only                 |
| `tmpfsSize`                  | number   | 64         | Temporary filesystem size in MB               |

**Example - Maximum Isolation (Linux):**

```json
{
  "mcp-process.security.advanced.enableNamespaces": true,
  "mcp-process.security.advanced.namespacesPid": true,
  "mcp-process.security.advanced.namespacesNetwork": true,
  "mcp-process.security.advanced.namespacesMount": true,
  "mcp-process.security.advanced.enableSeccomp": true,
  "mcp-process.security.advanced.seccompProfile": "strict",
  "mcp-process.security.advanced.dropCapabilities": [
    "CAP_NET_RAW",
    "CAP_SYS_ADMIN"
  ]
}
```

#### 8. Audit & Monitoring (`mcp-process.audit.*`)

Controls audit logging and security alerts.

| Setting                | Type     | Default | Description                         |
| ---------------------- | -------- | ------- | ----------------------------------- |
| `enableAuditLog`       | boolean  | true    | Enable audit logging                |
| `auditLogPath`         | string   | ""      | Audit log file path                 |
| `auditLogLevel`        | enum     | "info"  | Log level: error, warn, info, debug |
| `enableSecurityAlerts` | boolean  | false   | Enable real-time security alerts    |
| `securityAlertWebhook` | string   | ""      | Alert webhook URL                   |
| `allowedTimeWindows`   | string[] | []      | Allowed time windows (cron syntax)  |
| `blockedTimeWindows`   | string[] | []      | Blocked time windows (cron syntax)  |

**Example:**

```json
{
  "mcp-process.audit.enableAuditLog": true,
  "mcp-process.audit.auditLogLevel": "info",
  "mcp-process.audit.enableSecurityAlerts": true,
  "mcp-process.audit.securityAlertWebhook": "https://hooks.slack.com/services/YOUR/WEBHOOK",
  "mcp-process.audit.allowedTimeWindows": ["0 9-17 * * 1-5"]
}
```

#### 9. UI Preferences (`mcp-process.ui.*`)

Controls UI behavior and display options.

| Setting                      | Type    | Default | Description                            |
| ---------------------------- | ------- | ------- | -------------------------------------- |
| `refreshInterval`            | number  | 2000    | Process list refresh interval (ms)     |
| `showResourceUsage`          | boolean | true    | Show CPU/memory in process list        |
| `showSecurityWarnings`       | boolean | true    | Show security warnings in UI           |
| `confirmDangerousOperations` | boolean | true    | Require confirmation for dangerous ops |

**Example:**

```json
{
  "mcp-process.ui.refreshInterval": 1000,
  "mcp-process.ui.showResourceUsage": true,
  "mcp-process.ui.showSecurityWarnings": true
}
```

### Configuration Presets

The extension provides three built-in configuration presets for common use cases:

#### Development Preset

Permissive settings for local development with minimal restrictions.

**Use when:** Developing locally, need flexibility, trust all code

**Apply:** Command Palette → "MCP ACS Process: Apply Configuration Preset" → "Development"

#### Production Preset

Balanced settings for production use with reasonable security.

**Use when:** Running in production, need security without breaking functionality

**Apply:** Command Palette → "MCP ACS Process: Apply Configuration Preset" → "Production"

#### High Security Preset

Strict settings for maximum security with strong isolation.

**Use when:** Handling untrusted code, maximum security required

**Apply:** Command Palette → "MCP ACS Process: Apply Configuration Preset" → "High Security"

### Import/Export Configuration

**Export Configuration:**

1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Run "MCP ACS Process: Export Configuration"
3. Choose save location
4. Configuration saved as JSON with metadata

**Import Configuration:**

1. Open Command Palette
2. Run "MCP ACS Process: Import Configuration"
3. Select configuration JSON file
4. Review changes and confirm
5. Settings applied to VS Code

**Note:** Exported configurations include platform metadata. Importing cross-platform configs will show warnings for platform-specific settings.

### Validate Configuration

To check your configuration for errors and conflicts:

1. Open Command Palette
2. Run "MCP ACS Process: Validate Configuration"
3. Review validation results in Output panel
4. Fix any errors or warnings
5. Re-validate until clean

### Server Configuration

**Important:** When using the extension, VS Code settings are the primary configuration method. The external config file (`mcp-process-config.json`) is only needed for:

- Running the server standalone (without VS Code)
- Advanced users who prefer file-based configuration
- Overriding specific settings programmatically

To use an external config file, set:

```json
{
  "mcp-process.server.useConfigFile": true,
  "mcp-process.server.configPath": "/path/to/mcp-process-config.json"
}
```

See the [MCP ACS Process Server documentation](https://github.com/digital-defiance/ai-capabilities-suite/tree/main/packages/mcp-process) for config file format.

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
| `MCP ACS Process: Start Process`                  | Launch a new process   | -        |
| `MCP ACS Process: Terminate Process`              | Stop a running process | -        |
| `MCP ACS Process: View All Processes`             | Show process list      | -        |
| `MCP ACS Process: View Process Statistics`        | Show detailed stats    | -        |
| `MCP ACS Process: Refresh Process List`           | Refresh the tree view  | -        |
| `MCP ACS Process: Show Security Boundaries`       | View security config   | -        |
| `MCP ACS Process: Configure Executable Allowlist` | Edit allowlist         | -        |

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
3. Set `mcp-process.server.serverPath` in settings if needed
4. Check Output panel for errors
5. Restart VS Code

### Executable Not in Allowlist

**Problem**: "Executable not in allowlist" error

**Solution**:

1. Open VS Code Settings (Ctrl+, / Cmd+,)
2. Search for "mcp-process.executable.allowedExecutables"
3. Add the executable to the array
4. Server will automatically reload with new settings

**Alternative:**

1. Open Command Palette
2. Run "MCP ACS Process: Configure Executable Allowlist"
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

1. Open VS Code Settings
2. Search for "mcp-process.resources"
3. Increase `defaultMaxCpuPercent` or `defaultMaxMemoryMB`
4. Check process statistics to see actual usage
5. Consider if the process legitimately needs more resources

### Settings Not Taking Effect

**Problem**: Changed settings but behavior hasn't changed

**Solution**:

1. Check if the setting requires server restart (look for "Note: Changes require server restart" in description)
2. If restart required, click the notification button or run "MCP ACS Process: Restart Server"
3. Check Output panel for configuration errors
4. Run "MCP ACS Process: Validate Configuration" to check for issues

### Configuration Validation Errors

**Problem**: Validation shows errors or warnings

**Solution**:

1. Read the error message carefully - it explains what's wrong
2. Common issues:
   - `enableChroot` requires `chrootDirectory` to be set
   - `enableSecurityAlerts` requires `securityAlertWebhook` to be set
   - Platform-specific settings (namespaces, chroot) only work on Linux/Unix
3. Fix the settings in VS Code Settings UI
4. Re-run validation to confirm fixes

### Import Configuration Failed

**Problem**: Cannot import configuration file

**Solution**:

1. Verify the JSON file is valid (use a JSON validator)
2. Check that the file contains valid setting names
3. Review warnings about platform-specific settings
4. If importing from different platform, some settings may not apply
5. Check Output panel for detailed error messages

### Platform-Specific Features Not Working

**Problem**: Linux namespaces, chroot, or other platform features not working

**Solution**:

1. Verify you're on the correct platform (Linux for namespaces, Unix/Linux for chroot)
2. Check if you have required permissions (root or capabilities)
3. Verify kernel support for the feature
4. Check Output panel for specific error messages
5. Consider using Docker for consistent cross-platform behavior

### Configuration File Not Found

**Problem**: "Configuration file not found" error (when using `useConfigFile: true`)

**Solution**:

1. Set `mcp-process.server.configPath` in VS Code settings
2. Use absolute path to configuration file
3. Verify file exists and is readable
4. Check file permissions
5. **Recommended:** Use VS Code settings instead by setting `useConfigFile: false`

### Settings UI Not Showing All Settings

**Problem**: Cannot find certain settings in VS Code Settings UI

**Solution**:

1. Make sure you're searching for "mcp-process" (with hyphen)
2. Try searching for specific category: "mcp-process.executable", "mcp-process.security", etc.
3. Check if settings are hidden due to platform (some Linux-only settings won't show on Windows/Mac)
4. Restart VS Code if settings were just installed
5. Check that extension is activated (look for MCP ACS Process Manager in Activity Bar)

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
//            MCP ACS Process Manager provides secure process management.
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

// Refactoring: "Convert to MCP ACS Process Manager"
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

The MCP ACS Process Manager works seamlessly with GitHub Copilot and other AI assistants through comprehensive LSP integration:

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

You: "Convert this to use MCP ACS Process Manager"
AI: [Uses code action: "Convert to MCP ACS Process Manager"]
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
- **MCP ACS Process Server**: Installed globally or specified in settings
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

- [MCP ACS Process Server](https://github.com/digital-defiance/ai-capabilities-suite/tree/main/packages/mcp-process)
- [AI Capabilities Suite](https://github.com/digital-defiance/ai-capabilities-suite)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [VS Code Extension API](https://code.visualstudio.com/api)

---

**Secure process management for AI agents! 🛡️**
