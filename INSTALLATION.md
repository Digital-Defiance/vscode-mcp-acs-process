# Installation Guide

This guide will help you install and configure the MCP ACS Process Manager extension for VS Code.

## Prerequisites

Before installing the extension, ensure you have:

1. **VS Code**: Version 1.85.0 or higher
2. **Node.js**: Version 18.x or higher
3. **npm or yarn**: For installing the MCP ACS Process Server

## Step 1: Install the Extension

### From VS Code Marketplace

1. Open VS Code
2. Click the Extensions icon in the Activity Bar (or press `Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search for "MCP ACS Process Manager"
4. Click the "Install" button
5. Wait for installation to complete
6. Reload VS Code if prompted

### From VSIX File

If you have a `.vsix` file:

```bash
code --install-extension mcp-process-manager-1.0.0.vsix
```

Or in VS Code:

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "Extensions: Install from VSIX"
3. Select the `.vsix` file
4. Wait for installation to complete

## Step 2: Install the MCP ACS Process Server

The extension requires the MCP ACS Process Server to function.

### Option A: Global Installation (Recommended)

```bash
npm install -g @ai-capabilities-suite/mcp-process
```

This makes the `mcp-process` command available system-wide.

### Option B: Local Installation

```bash
npm install @ai-capabilities-suite/mcp-process
```

Then set `mcp-process.serverPath` in VS Code settings to point to the local installation:

```json
{
  "mcp-process.serverPath": "${workspaceFolder}/node_modules/.bin/mcp-process"
}
```

### Option C: Docker

```bash
docker pull digitaldefiance/mcp-process:latest
```

See [Docker documentation](https://github.com/digital-defiance/ai-capabilities-suite/tree/main/packages/mcp-process/DOCKER.md) for details.

## Step 3: Create Configuration File

Create a configuration file for the MCP ACS Process Server:

```bash
# Create config directory
mkdir -p ~/.mcp-process

# Create configuration file
cat > ~/.mcp-process/config.json << EOF
{
  "allowedExecutables": [
    "node",
    "npm",
    "yarn",
    "python3",
    "pip3",
    "git"
  ],
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
EOF
```

**Important**: Customize the `allowedExecutables` list based on your needs. Only executables in this list can be launched.

## Step 4: Configure VS Code Settings

Open VS Code settings (`Ctrl+,` / `Cmd+,`) and add:

```json
{
  "mcp-process.configPath": "~/.mcp-process/config.json",
  "mcp-process.autoStart": true,
  "mcp-process.refreshInterval": 2000,
  "mcp-process.showResourceUsage": true,
  "mcp-process.logLevel": "info"
}
```

Or use the Settings UI:

1. Open Settings (`Ctrl+,` / `Cmd+,`)
2. Search for "mcp-process"
3. Configure each setting

### Settings Explained

| Setting             | Description                          | Default |
| ------------------- | ------------------------------------ | ------- |
| `configPath`        | Path to server configuration file    | ""      |
| `autoStart`         | Auto-start server on VS Code startup | true    |
| `refreshInterval`   | Process list refresh interval (ms)   | 2000    |
| `showResourceUsage` | Show CPU/memory in tree view         | true    |
| `logLevel`          | Logging level                        | "info"  |
| `serverPath`        | Custom server executable path        | ""      |

## Step 5: Verify Installation

1. Restart VS Code
2. Look for the MCP ACS Process Manager icon in the Activity Bar (left sidebar)
3. Click the icon to open the extension
4. Check the Output panel (View → Output → MCP ACS Process Manager) for any errors
5. You should see two panels:
   - "Running Processes" (initially empty)
   - "Security Boundaries" (showing your configuration)

## Step 6: Test the Extension

### Test 1: View Security Boundaries

1. Open the "Security Boundaries" panel
2. Expand "Allowed Executables"
3. Verify your executables are listed
4. Expand "Resource Limits"
5. Verify limits are correct

### Test 2: Start a Process

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "MCP ACS Process: Start Process"
3. Enter executable: `node`
4. Enter arguments: `--version`
5. Check the "Running Processes" panel
6. You should see the process appear

### Test 3: View Process Statistics

1. Find the process in the "Running Processes" panel
2. Click the graph icon next to the process
3. A webview should open showing CPU, memory, and I/O statistics

## Troubleshooting

### Extension Not Appearing

**Problem**: MCP ACS Process Manager icon not in Activity Bar

**Solution**:

1. Check if extension is installed: Extensions → Installed
2. Reload VS Code: Developer → Reload Window
3. Check for errors: Help → Toggle Developer Tools → Console

### Server Not Starting

**Problem**: "Server not running" message

**Solution**:

1. Check if Node.js is installed: `node --version`
2. Check if MCP server is installed: `mcp-process --version`
3. Check Output panel for errors: View → Output → MCP ACS Process Manager
4. Verify configuration file exists and is valid JSON
5. Try manual start: `mcp-process --config ~/.mcp-process/config.json`

### Configuration File Not Found

**Problem**: "Configuration file not found" error

**Solution**:

1. Verify file path in settings is correct
2. Use absolute path instead of `~` if needed
3. Check file permissions: `ls -la ~/.mcp-process/config.json`
4. Verify file is valid JSON: `cat ~/.mcp-process/config.json | jq`

### Executable Not in Allowlist

**Problem**: "Executable not in allowlist" error

**Solution**:

1. Open configuration file
2. Add executable to `allowedExecutables` array
3. Save file
4. Restart VS Code or reload window

### Permission Denied

**Problem**: "Permission denied" when starting server

**Solution**:

1. Check file permissions on server executable
2. If using global install, may need sudo: `sudo npm install -g @ai-capabilities-suite/mcp-process`
3. Or use local install instead

## Advanced Configuration

### Workspace-Specific Configuration

Create `.vscode/settings.json` in your workspace:

```json
{
  "mcp-process.configPath": "${workspaceFolder}/.mcp-process-config.json",
  "mcp-process.autoStart": true
}
```

### Multiple Configurations

Use different configurations for different projects:

```json
{
  "mcp-process.configPath": "${workspaceFolder}/config/mcp-process.json"
}
```

### Custom Server Path

If using a custom server installation:

```json
{
  "mcp-process.serverPath": "/custom/path/to/mcp-process"
}
```

## Next Steps

1. Read the [README](README.md) for usage examples
2. Check the [Security Documentation](https://github.com/digital-defiance/ai-capabilities-suite/tree/main/packages/mcp-process/SECURITY.md)
3. Explore the [MCP ACS Process Server Documentation](https://github.com/digital-defiance/ai-capabilities-suite/tree/main/packages/mcp-process)
4. Try the [GitHub Copilot Integration](README.md#github-copilot-integration)

## Getting Help

If you encounter issues:

1. Check the Output panel: View → Output → MCP ACS Process Manager
2. Check the [Troubleshooting](README.md#troubleshooting) section
3. Open an issue on [GitHub](https://github.com/digital-defiance/ai-capabilities-suite/issues)
4. Include:
   - VS Code version
   - Extension version
   - Node.js version
   - Operating system
   - Error messages from Output panel
   - Configuration file (remove sensitive data)

## Uninstallation

To uninstall the extension:

1. Open Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
2. Find "MCP ACS Process Manager"
3. Click the gear icon
4. Select "Uninstall"
5. Reload VS Code

To also remove the server:

```bash
npm uninstall -g @ai-capabilities-suite/mcp-process
```

And remove configuration:

```bash
rm -rf ~/.mcp-process
```
