# Settings Migration Guide

This guide helps you migrate from the external configuration file (`mcp-process-config.json`) to VS Code settings, or understand when to use each approach.

## Overview

The MCP Process Manager extension supports two configuration methods:

1. **VS Code Settings** (Recommended) - Configure everything through VS Code's native settings UI
2. **External Config File** (Advanced) - Use a JSON configuration file for standalone server or programmatic control

## Why Migrate to VS Code Settings?

**Benefits of VS Code Settings:**

- ✅ **Visual UI**: Configure settings through familiar VS Code Settings interface
- ✅ **Validation**: Real-time validation with helpful error messages
- ✅ **Search**: Easily find settings by name, description, or category
- ✅ **Documentation**: Inline descriptions and examples for every setting
- ✅ **Sync**: Settings sync across devices with VS Code Settings Sync
- ✅ **No File Management**: No need to create or maintain separate config files
- ✅ **Presets**: Apply pre-configured presets for common scenarios
- ✅ **Import/Export**: Share configurations as JSON files when needed

**When to Use External Config File:**

- Running the MCP Process Server standalone (without VS Code)
- Programmatic configuration management
- Advanced users who prefer file-based configuration
- CI/CD pipelines that need to inject configuration

## Migration Steps

### Step 1: Locate Your Current Configuration

Find your existing `mcp-process-config.json` file. Common locations:

- `~/.mcp-process/config.json` (default)
- Custom path specified in `mcp-process.server.configPath`
- Project-specific location

### Step 2: Open VS Code Settings

1. Open VS Code Settings: `Ctrl+,` (Windows/Linux) or `Cmd+,` (Mac)
2. Search for "mcp-process"
3. You'll see all available settings organized by category

### Step 3: Map Configuration to Settings

Use the mapping table below to convert your config file settings to VS Code settings.

## Configuration Mapping

### Executable Control

| Config File Property           | VS Code Setting                                       | Notes                  |
| ------------------------------ | ----------------------------------------------------- | ---------------------- |
| `allowedExecutables`           | `mcp-process.executable.allowedExecutables`           | Array of strings       |
| `blockSetuidExecutables`       | `mcp-process.executable.blockSetuidExecutables`       | Boolean                |
| `blockShellInterpreters`       | `mcp-process.executable.blockShellInterpreters`       | Boolean                |
| `additionalBlockedExecutables` | `mcp-process.executable.additionalBlockedExecutables` | Array of strings       |
| `maxArgumentCount`             | `mcp-process.executable.maxArgumentCount`             | Number                 |
| `maxArgumentLength`            | `mcp-process.executable.maxArgumentLength`            | Number (bytes)         |
| `blockedArgumentPatterns`      | `mcp-process.executable.blockedArgumentPatterns`      | Array of regex strings |

### Resource Limits

| Config File Property                       | VS Code Setting                                   | Notes            |
| ------------------------------------------ | ------------------------------------------------- | ---------------- |
| `defaultResourceLimits.maxCpuPercent`      | `mcp-process.resources.defaultMaxCpuPercent`      | Number (0-100)   |
| `defaultResourceLimits.maxMemoryMB`        | `mcp-process.resources.defaultMaxMemoryMB`        | Number (MB)      |
| `defaultResourceLimits.maxFileDescriptors` | `mcp-process.resources.defaultMaxFileDescriptors` | Number           |
| `defaultResourceLimits.maxCpuTime`         | `mcp-process.resources.defaultMaxCpuTime`         | Number (seconds) |
| `defaultResourceLimits.maxProcesses`       | `mcp-process.resources.defaultMaxProcesses`       | Number           |
| `maximumResourceLimits.maxCpuPercent`      | `mcp-process.resources.maximumMaxCpuPercent`      | Number (0-100)   |
| `maximumResourceLimits.maxMemoryMB`        | `mcp-process.resources.maximumMaxMemoryMB`        | Number (MB)      |
| `strictResourceEnforcement`                | `mcp-process.resources.strictResourceEnforcement` | Boolean          |

### Process Limits

| Config File Property                | VS Code Setting                                      | Notes            |
| ----------------------------------- | ---------------------------------------------------- | ---------------- |
| `maxConcurrentProcesses`            | `mcp-process.process.maxConcurrentProcesses`         | Number           |
| `maxConcurrentProcessesPerAgent`    | `mcp-process.process.maxConcurrentProcessesPerAgent` | Number           |
| `maxProcessLifetime`                | `mcp-process.process.maxProcessLifetime`             | Number (seconds) |
| `maxTotalProcesses`                 | `mcp-process.process.maxTotalProcesses`              | Number           |
| `rateLimiting.maxLaunchesPerMinute` | `mcp-process.process.maxLaunchesPerMinute`           | Number           |
| `rateLimiting.maxLaunchesPerHour`   | `mcp-process.process.maxLaunchesPerHour`             | Number           |
| `rateLimiting.cooldownSeconds`      | `mcp-process.process.rateLimitCooldownSeconds`       | Number           |

### I/O Control

| Config File Property  | VS Code Setting                      | Notes          |
| --------------------- | ------------------------------------ | -------------- |
| `allowStdinInput`     | `mcp-process.io.allowStdinInput`     | Boolean        |
| `allowOutputCapture`  | `mcp-process.io.allowOutputCapture`  | Boolean        |
| `maxOutputBufferSize` | `mcp-process.io.maxOutputBufferSize` | Number (bytes) |
| `blockBinaryStdin`    | `mcp-process.io.blockBinaryStdin`    | Boolean        |

### Security Settings

| Config File Property             | VS Code Setting                                       | Notes            |
| -------------------------------- | ----------------------------------------------------- | ---------------- |
| `allowProcessTermination`        | `mcp-process.security.allowProcessTermination`        | Boolean          |
| `allowGroupTermination`          | `mcp-process.security.allowGroupTermination`          | Boolean          |
| `allowForcedTermination`         | `mcp-process.security.allowForcedTermination`         | Boolean          |
| `requireTerminationConfirmation` | `mcp-process.security.requireTerminationConfirmation` | Boolean          |
| `requireConfirmation`            | `mcp-process.security.requireConfirmation`            | Boolean          |
| `requireConfirmationFor`         | `mcp-process.security.requireConfirmationFor`         | Array of strings |
| `autoApproveAfterCount`          | `mcp-process.security.autoApproveAfterCount`          | Number           |
| `allowedWorkingDirectories`      | `mcp-process.security.allowedWorkingDirectories`      | Array of strings |
| `blockedWorkingDirectories`      | `mcp-process.security.blockedWorkingDirectories`      | Array of strings |
| `additionalBlockedEnvVars`       | `mcp-process.security.additionalBlockedEnvVars`       | Array of strings |
| `allowedEnvVars`                 | `mcp-process.security.allowedEnvVars`                 | Array of strings |
| `maxEnvVarCount`                 | `mcp-process.security.maxEnvVarCount`                 | Number           |

### Advanced Security (Linux)

| Config File Property         | VS Code Setting                                            | Notes                            |
| ---------------------------- | ---------------------------------------------------------- | -------------------------------- |
| `enableChroot`               | `mcp-process.security.advanced.enableChroot`               | Boolean (Unix/Linux)             |
| `chrootDirectory`            | `mcp-process.security.advanced.chrootDirectory`            | String (path)                    |
| `enableNamespaces`           | `mcp-process.security.advanced.enableNamespaces`           | Boolean (Linux)                  |
| `namespaces.pid`             | `mcp-process.security.advanced.namespacesPid`              | Boolean (Linux)                  |
| `namespaces.network`         | `mcp-process.security.advanced.namespacesNetwork`          | Boolean (Linux)                  |
| `namespaces.mount`           | `mcp-process.security.advanced.namespacesMount`            | Boolean (Linux)                  |
| `namespaces.uts`             | `mcp-process.security.advanced.namespacesUts`              | Boolean (Linux)                  |
| `namespaces.ipc`             | `mcp-process.security.advanced.namespacesIpc`              | Boolean (Linux)                  |
| `namespaces.user`            | `mcp-process.security.advanced.namespacesUser`             | Boolean (Linux)                  |
| `enableSeccomp`              | `mcp-process.security.advanced.enableSeccomp`              | Boolean (Linux)                  |
| `seccompProfile`             | `mcp-process.security.advanced.seccompProfile`             | Enum: strict/moderate/permissive |
| `blockNetworkAccess`         | `mcp-process.security.advanced.blockNetworkAccess`         | Boolean                          |
| `allowedNetworkDestinations` | `mcp-process.security.advanced.allowedNetworkDestinations` | Array of strings                 |
| `blockedNetworkDestinations` | `mcp-process.security.advanced.blockedNetworkDestinations` | Array of strings                 |
| `enableMAC`                  | `mcp-process.security.advanced.enableMAC`                  | Boolean (Linux)                  |
| `macProfile`                 | `mcp-process.security.advanced.macProfile`                 | String (SELinux/AppArmor)        |
| `dropCapabilities`           | `mcp-process.security.advanced.dropCapabilities`           | Array of strings (Linux)         |
| `readOnlyFilesystem`         | `mcp-process.security.advanced.readOnlyFilesystem`         | Boolean (Unix/Linux)             |
| `tmpfsSize`                  | `mcp-process.security.advanced.tmpfsSize`                  | Number (MB, Unix/Linux)          |

### Audit & Monitoring

| Config File Property   | VS Code Setting                          | Notes                       |
| ---------------------- | ---------------------------------------- | --------------------------- |
| `enableAuditLog`       | `mcp-process.audit.enableAuditLog`       | Boolean                     |
| `auditLogPath`         | `mcp-process.audit.auditLogPath`         | String (path)               |
| `auditLogLevel`        | `mcp-process.audit.auditLogLevel`        | Enum: error/warn/info/debug |
| `enableSecurityAlerts` | `mcp-process.audit.enableSecurityAlerts` | Boolean                     |
| `securityAlertWebhook` | `mcp-process.audit.securityAlertWebhook` | String (URL)                |
| `allowedTimeWindows`   | `mcp-process.audit.allowedTimeWindows`   | Array of cron strings       |
| `blockedTimeWindows`   | `mcp-process.audit.blockedTimeWindows`   | Array of cron strings       |

## Migration Examples

### Example 1: Basic Development Configuration

**Before (config file):**

```json
{
  "allowedExecutables": ["node", "npm", "python3", "git"],
  "defaultResourceLimits": {
    "maxCpuPercent": 80,
    "maxMemoryMB": 1024,
    "maxCpuTime": 300
  },
  "maxConcurrentProcesses": 10,
  "enableAuditLog": true,
  "blockShellInterpreters": false
}
```

**After (VS Code settings.json):**

```json
{
  "mcp-process.executable.allowedExecutables": [
    "node",
    "npm",
    "python3",
    "git"
  ],
  "mcp-process.resources.defaultMaxCpuPercent": 80,
  "mcp-process.resources.defaultMaxMemoryMB": 1024,
  "mcp-process.resources.defaultMaxCpuTime": 300,
  "mcp-process.process.maxConcurrentProcesses": 10,
  "mcp-process.audit.enableAuditLog": true,
  "mcp-process.executable.blockShellInterpreters": false
}
```

### Example 2: High Security Configuration

**Before (config file):**

```json
{
  "allowedExecutables": ["/usr/bin/node", "/usr/bin/python3"],
  "blockShellInterpreters": true,
  "blockSetuidExecutables": true,
  "defaultResourceLimits": {
    "maxCpuPercent": 50,
    "maxMemoryMB": 512
  },
  "strictResourceEnforcement": true,
  "requireConfirmation": true,
  "blockedWorkingDirectories": ["/etc", "/root"],
  "enableAuditLog": true,
  "auditLogLevel": "info"
}
```

**After (VS Code settings.json):**

```json
{
  "mcp-process.executable.allowedExecutables": [
    "/usr/bin/node",
    "/usr/bin/python3"
  ],
  "mcp-process.executable.blockShellInterpreters": true,
  "mcp-process.executable.blockSetuidExecutables": true,
  "mcp-process.resources.defaultMaxCpuPercent": 50,
  "mcp-process.resources.defaultMaxMemoryMB": 512,
  "mcp-process.resources.strictResourceEnforcement": true,
  "mcp-process.security.requireConfirmation": true,
  "mcp-process.security.blockedWorkingDirectories": ["/etc", "/root"],
  "mcp-process.audit.enableAuditLog": true,
  "mcp-process.audit.auditLogLevel": "info"
}
```

### Example 3: Linux with Namespaces

**Before (config file):**

```json
{
  "allowedExecutables": ["node"],
  "enableNamespaces": true,
  "namespaces": {
    "pid": true,
    "network": true,
    "mount": true
  },
  "enableSeccomp": true,
  "seccompProfile": "strict",
  "dropCapabilities": ["CAP_NET_RAW", "CAP_SYS_ADMIN"]
}
```

**After (VS Code settings.json):**

```json
{
  "mcp-process.executable.allowedExecutables": ["node"],
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

## Step 4: Disable Config File Mode

After migrating your settings, disable config file mode:

1. Open VS Code Settings
2. Search for "mcp-process.server.useConfigFile"
3. Set to `false` (or remove the setting, as `false` is the default)
4. Restart the server: Command Palette → "MCP Process: Restart Server"

## Step 5: Verify Configuration

1. Run "MCP Process: Validate Configuration" from Command Palette
2. Check for any errors or warnings
3. Fix any issues reported
4. Test process launching to ensure everything works

## Using Both Methods (Advanced)

You can use both VS Code settings and a config file simultaneously:

1. Set `mcp-process.server.useConfigFile: true`
2. Set `mcp-process.server.configPath` to your config file
3. The server will read from the config file
4. VS Code settings will be ignored (except server connection settings)

**Use case:** You want to manage most settings through VS Code but override specific settings programmatically via the config file.

## Automated Migration Tool

For complex configurations, you can use the import feature:

1. Keep your existing config file
2. Run "MCP Process: Import Configuration" from Command Palette
3. Select your `mcp-process-config.json` file
4. Review the changes
5. Confirm to apply settings to VS Code
6. The tool automatically maps config file properties to VS Code settings

## When to Use Config File vs VS Code Settings

### Use VS Code Settings When:

- ✅ Using the extension in VS Code (primary use case)
- ✅ Want visual configuration UI
- ✅ Need real-time validation
- ✅ Want to sync settings across devices
- ✅ Prefer integrated documentation

### Use Config File When:

- ✅ Running server standalone (without VS Code)
- ✅ Programmatic configuration management
- ✅ CI/CD pipelines
- ✅ Multiple environments with different configs
- ✅ Advanced automation scenarios

## Troubleshooting Migration

### Settings Not Taking Effect

**Problem:** Changed VS Code settings but server still uses old config

**Solution:**

1. Verify `mcp-process.server.useConfigFile` is `false`
2. Restart server: "MCP Process: Restart Server"
3. Check Output panel for configuration errors

### Missing Settings

**Problem:** Some config file settings don't have VS Code equivalents

**Solution:**
All config file settings have corresponding VS Code settings. Use the mapping table above to find the correct setting name.

### Validation Errors After Migration

**Problem:** Validation shows errors after migrating

**Solution:**

1. Run "MCP Process: Validate Configuration"
2. Read error messages carefully
3. Common issues:
   - Dependency violations (e.g., `enableChroot` requires `chrootDirectory`)
   - Platform-specific settings on wrong platform
   - Invalid values (out of range, wrong type)
4. Fix issues in VS Code Settings UI
5. Re-validate

### Config File Still Being Used

**Problem:** Server ignores VS Code settings and uses config file

**Solution:**

1. Check `mcp-process.server.useConfigFile` is `false`
2. If `true`, set to `false`
3. Restart server
4. Delete or rename old config file to prevent confusion

## Best Practices

1. **Start Fresh**: Use presets as a starting point, then customize
2. **Validate Often**: Run validation after making changes
3. **Document Changes**: Use VS Code's settings sync to track changes
4. **Test Incrementally**: Change a few settings at a time and test
5. **Keep Backups**: Export your configuration before major changes
6. **Use Presets**: Apply Development/Production/High Security presets as templates

## Getting Help

If you encounter issues during migration:

1. Check the [README](README.md) for detailed setting descriptions
2. Run "MCP Process: Validate Configuration" for specific errors
3. Check the Output panel for detailed error messages
4. Open an issue on [GitHub](https://github.com/digital-defiance/ai-capabilities-suite/issues)
