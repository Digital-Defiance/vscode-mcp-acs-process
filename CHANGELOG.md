# Change Log

All notable changes to the "MCP ACS Process Manager" extension will be documented in this file.

## [1.0.0] - 2024-12-04

### Added

- Initial release of MCP ACS Process Manager extension
- Process management panel with tree view
- Security boundaries panel with tree view
- Real-time process monitoring with auto-refresh
- Process statistics webview with detailed metrics
- Security boundaries webview with configuration display
- Commands for starting, terminating, and monitoring processes
- Integration with MCP ACS Process Server via stdio transport
- Support for executable allowlist configuration
- Resource usage display (CPU, memory, I/O)
- Graceful and forced process termination
- Configuration file editing from extension
- Auto-start server on VS Code startup
- Comprehensive error handling and user feedback
- GitHub Copilot integration support
- Security-first design with multi-layer validation

### Features

- **Process Tree View**: Visual representation of all running processes
- **Security Tree View**: Display of security boundaries and limits
- **Statistics Webview**: Beautiful charts and metrics for process resources
- **Auto-Refresh**: Configurable automatic refresh of process list
- **Command Palette Integration**: All commands accessible via command palette
- **Context Menus**: Right-click actions on processes
- **Icon Indicators**: Visual status indicators for process state
- **Tooltips**: Detailed information on hover
- **Error Messages**: Clear error messages with actionable suggestions

### Security

- Executable allowlist enforcement
- Resource limit display and monitoring
- Security feature visualization
- Audit logging support
- Multi-layer security validation
- Protection against privilege escalation
- Environment variable sanitization
- Argument injection prevention

### Configuration

- `mcp-process.serverPath`: Custom server executable path
- `mcp-process.configPath`: Server configuration file path
- `mcp-process.autoStart`: Auto-start server on VS Code startup
- `mcp-process.refreshInterval`: Process list refresh interval
- `mcp-process.showResourceUsage`: Show CPU/memory in tree view
- `mcp-process.logLevel`: Logging level configuration

### Documentation

- Comprehensive README with examples
- Quick start guide
- Configuration guide
- Troubleshooting section
- Security documentation
- GitHub Copilot integration guide

## [Unreleased]

### Planned Features

- Process output streaming in terminal
- Process group management UI
- Service management panel
- Health check visualization
- Performance profiling integration
- Process timeline view
- Export statistics to CSV
- Custom process templates
- Keyboard shortcuts
- Dark/light theme support for webviews
