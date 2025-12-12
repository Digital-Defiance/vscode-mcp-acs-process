# Quick Reference Guide

## Installation

```bash
# Install MCP server
npm install -g @ai-capabilities-suite/mcp-process

# Install extension from marketplace
# Search "MCP ACS Process Manager" in VS Code Extensions
```

## Configuration

Create `~/.mcp-process/config.json`:

```json
{
  "allowedExecutables": ["node", "python3", "npm"],
  "defaultResourceLimits": {
    "maxCpuPercent": 80,
    "maxMemoryMB": 1024
  },
  "maxConcurrentProcesses": 10,
  "enableAuditLog": true
}
```

Set in VS Code settings:

```json
{
  "mcp-process.configPath": "~/.mcp-process/config.json",
  "mcp-process.autoStart": true
}
```

## Commands

| Command             | Shortcut | Description              |
| ------------------- | -------- | ------------------------ |
| Start Process       | -        | Launch a new process     |
| Terminate Process   | -        | Stop a running process   |
| View Processes      | -        | Show all processes       |
| View Stats          | -        | Show process statistics  |
| Refresh List        | -        | Refresh process list     |
| Show Security       | -        | View security boundaries |
| Configure Allowlist | -        | Edit configuration       |

## Tree Views

### Running Processes

- Shows all managed processes
- Real-time updates every 2 seconds
- Click graph icon for statistics
- Click stop icon to terminate

### Security Boundaries

- Allowed Executables
- Resource Limits
- Security Features

## Common Tasks

### Start a Process

1. Click play icon in tree view
2. Enter executable (e.g., `node`)
3. Enter arguments (e.g., `--version`)
4. Process appears in tree view

### Monitor Resources

1. Find process in tree view
2. Click graph icon
3. View CPU, memory, I/O stats

### Terminate Process

1. Find process in tree view
2. Click stop icon
3. Choose graceful or forced
4. Process is terminated

### View Security

1. Open Security Boundaries panel
2. Expand categories
3. View configuration

### Edit Allowlist

1. Command Palette → "Configure Allowlist"
2. Edit configuration file
3. Save and restart

## Troubleshooting

| Problem                | Solution                    |
| ---------------------- | --------------------------- |
| Server not starting    | Install MCP server globally |
| Executable not allowed | Add to allowlist in config  |
| Process not appearing  | Click refresh icon          |
| High resource usage    | Increase limits in config   |

## Keyboard Shortcuts

- `Ctrl+Shift+P` / `Cmd+Shift+P` - Command Palette
- `Ctrl+,` / `Cmd+,` - Settings
- `F5` - Debug extension (development)

## Settings

| Setting             | Default | Description           |
| ------------------- | ------- | --------------------- |
| `configPath`        | ""      | Path to config file   |
| `autoStart`         | true    | Auto-start server     |
| `refreshInterval`   | 2000    | Refresh interval (ms) |
| `showResourceUsage` | true    | Show CPU/memory       |
| `logLevel`          | "info"  | Log level             |

## Security

### What AI Agents CAN Do

- Launch allowed executables
- Monitor resource usage
- Terminate their processes
- Set resource limits

### What AI Agents CANNOT Do

- Launch blocked executables
- Bypass allowlist
- Escalate privileges
- Modify PATH
- Launch unlimited processes

## Resources

- [Full Documentation](README.md)
- [Installation Guide](INSTALLATION.md)
- [Development Guide](DEVELOPMENT.md)
- [Publishing Guide](PUBLISHING.md)
- [GitHub Repository](https://github.com/digital-defiance/ai-capabilities-suite)
