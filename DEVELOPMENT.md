# Development Guide

This guide explains how to develop and contribute to the MCP Process Manager extension.

## Project Structure

```
vscode-mcp-acs-process/
├── src/
│   ├── extension.ts              # Main extension entry point
│   ├── mcpClient.ts              # MCP server client
│   ├── processTreeProvider.ts   # Process tree view provider
│   ├── securityTreeProvider.ts  # Security tree view provider
│   └── test/
│       ├── runTest.ts            # Test runner
│       └── suite/
│           ├── index.ts          # Test suite index
│           └── extension.test.ts # Extension tests
├── images/
│   └── README.md                 # Icon placeholder
├── out/                          # Compiled JavaScript (generated)
├── node_modules/                 # Dependencies (generated)
├── package.json                  # Extension manifest
├── tsconfig.json                 # TypeScript configuration
├── .vscodeignore                 # Files to exclude from package
├── .gitignore                    # Git ignore rules
├── .yarnrc.yml                   # Yarn configuration
├── README.md                     # User documentation
├── CHANGELOG.md                  # Version history
├── INSTALLATION.md               # Installation guide
├── PUBLISHING.md                 # Publishing guide
├── DEVELOPMENT.md                # This file
├── LICENSE                       # MIT license
└── project.json                  # Nx project configuration
```

## Prerequisites

- Node.js 18.x or higher
- npm or yarn
- VS Code 1.85.0 or higher
- TypeScript 5.3.3 or higher

## Setup Development Environment

### 1. Clone Repository

```bash
git clone https://github.com/digital-defiance/ai-capabilities-suite.git
cd ai-capabilities-suite/packages/vscode-mcp-acs-process
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Install MCP Process Server

```bash
npm install -g @ai-capabilities-suite/mcp-process
```

### 4. Create Test Configuration

Create `test-config.json`:

```json
{
  "allowedExecutables": ["node", "npm", "echo", "cat"],
  "defaultResourceLimits": {
    "maxCpuPercent": 80,
    "maxMemoryMB": 1024
  },
  "maxConcurrentProcesses": 5,
  "enableAuditLog": true,
  "blockShellInterpreters": false,
  "blockSetuidExecutables": true
}
```

## Development Workflow

### Compile TypeScript

```bash
npm run compile
# or
yarn compile
```

This compiles TypeScript to JavaScript in the `out/` directory.

### Watch Mode

For continuous compilation during development:

```bash
npm run watch
# or
yarn watch
```

### Run Extension

1. Open the project in VS Code
2. Press `F5` to launch Extension Development Host
3. A new VS Code window opens with the extension loaded
4. Test your changes in this window

### Debug Extension

1. Set breakpoints in TypeScript files
2. Press `F5` to start debugging
3. Breakpoints will be hit in the Extension Development Host
4. Use Debug Console to inspect variables

### Run Tests

```bash
npm test
# or
yarn test
```

Tests run in a headless VS Code instance.

## Code Structure

### extension.ts

Main extension entry point. Handles:

- Extension activation/deactivation
- Command registration
- Tree view registration
- MCP client initialization
- Auto-refresh setup

Key functions:

- `activate()`: Called when extension activates
- `deactivate()`: Called when extension deactivates
- `startProcess()`: Start a new process
- `terminateProcess()`: Terminate a process
- `viewStats()`: Show process statistics
- `showSecurityBoundaries()`: Display security config

### mcpClient.ts

MCP server client. Handles:

- Server process spawning
- JSON-RPC communication
- Request/response handling
- Tool invocation

Key methods:

- `start()`: Start MCP server
- `stop()`: Stop MCP server
- `startProcess()`: Call process_start tool
- `terminateProcess()`: Call process_terminate tool
- `getProcessStats()`: Call process_get_stats tool
- `listProcesses()`: Call process_list tool

### processTreeProvider.ts

Process tree view provider. Handles:

- Process list display
- Tree item creation
- Refresh logic
- Icon and tooltip generation

Key classes:

- `ProcessTreeDataProvider`: Tree data provider
- `ProcessTreeItem`: Individual tree item

### securityTreeProvider.ts

Security tree view provider. Handles:

- Security boundary display
- Configuration visualization
- Tree structure for security info

Key classes:

- `SecurityTreeDataProvider`: Tree data provider
- `SecurityTreeItem`: Individual tree item

## Adding Features

### Add a New Command

1. Register command in `package.json`:

```json
{
  "contributes": {
    "commands": [
      {
        "command": "mcp-process.myCommand",
        "title": "MCP Process: My Command"
      }
    ]
  }
}
```

2. Implement command in `extension.ts`:

```typescript
context.subscriptions.push(
  vscode.commands.registerCommand("mcp-process.myCommand", async () => {
    // Implementation
  })
);
```

### Add a New Tree View

1. Register view in `package.json`:

```json
{
  "contributes": {
    "views": {
      "mcp-process-explorer": [
        {
          "id": "my-view",
          "name": "My View"
        }
      ]
    }
  }
}
```

2. Create tree provider:

```typescript
class MyTreeProvider implements vscode.TreeDataProvider<MyTreeItem> {
  // Implementation
}
```

3. Register in `extension.ts`:

```typescript
const provider = new MyTreeProvider();
context.subscriptions.push(
  vscode.window.registerTreeDataProvider("my-view", provider)
);
```

### Add a New MCP Tool Call

1. Add method to `mcpClient.ts`:

```typescript
async myTool(params: any): Promise<any> {
  return await this.callTool('my_tool', params);
}
```

2. Use in commands:

```typescript
const result = await mcpClient.myTool({ param: "value" });
```

## Testing

### Unit Tests

Create test files in `src/test/suite/`:

```typescript
import * as assert from "assert";
import * as vscode from "vscode";

suite("My Test Suite", () => {
  test("My test", () => {
    assert.strictEqual(1 + 1, 2);
  });
});
```

### Integration Tests

Test with actual MCP server:

```typescript
test("Start process", async () => {
  const ext = vscode.extensions.getExtension(
    "DigitalDefiance.mcp-process-manager"
  );
  await ext!.activate();

  await vscode.commands.executeCommand("mcp-process.startProcess");
  // Verify process started
});
```

### Manual Testing

1. Launch Extension Development Host (F5)
2. Test each command
3. Check Output panel for errors
4. Verify tree views update correctly
5. Test with different configurations

## Code Style

### TypeScript

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use async/await over promises
- Add JSDoc comments for public APIs
- Use meaningful variable names

### Formatting

- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Trailing commas in objects/arrays

### Naming Conventions

- Classes: PascalCase
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Interfaces: PascalCase with 'I' prefix (optional)

## Debugging Tips

### Enable Debug Logging

Set log level to debug:

```json
{
  "mcp-process.logLevel": "debug"
}
```

### View Server Output

Check Output panel:

1. View → Output
2. Select "MCP Process Manager" from dropdown

### Inspect MCP Messages

Add logging in `mcpClient.ts`:

```typescript
private handleMessage(message: any): void {
  console.log('Received:', JSON.stringify(message, null, 2));
  // ...
}
```

### Debug Server Process

Start server manually with debug logging:

```bash
DEBUG=* mcp-process --config test-config.json
```

## Performance Optimization

### Reduce Refresh Rate

Increase refresh interval:

```json
{
  "mcp-process.refreshInterval": 5000
}
```

### Lazy Loading

Load tree items only when expanded:

```typescript
getChildren(element?: TreeItem): TreeItem[] {
  if (!element) {
    return this.getRootItems();
  }
  return this.getChildItems(element);
}
```

### Caching

Cache expensive operations:

```typescript
private cache = new Map<string, any>();

async getData(key: string): Promise<any> {
  if (this.cache.has(key)) {
    return this.cache.get(key);
  }
  const data = await this.fetchData(key);
  this.cache.set(key, data);
  return data;
}
```

## Common Issues

### Extension Not Activating

**Cause**: Activation event not triggered

**Solution**: Check `activationEvents` in package.json

### Commands Not Registered

**Cause**: Command not in package.json or not registered in code

**Solution**: Add to both package.json and extension.ts

### Tree View Not Updating

**Cause**: Not firing `onDidChangeTreeData` event

**Solution**: Call `this._onDidChangeTreeData.fire()`

### Server Not Starting

**Cause**: Server not installed or wrong path

**Solution**: Install server globally or set `serverPath`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Update documentation
6. Submit a pull request

### Pull Request Guidelines

- Follow code style
- Add tests for new features
- Update CHANGELOG.md
- Update README.md if needed
- Ensure all tests pass
- Keep commits atomic and well-described

## Release Process

1. Update version in package.json
2. Update CHANGELOG.md
3. Commit changes
4. Create git tag
5. Push to GitHub
6. Publish to marketplace
7. Create GitHub release

See [PUBLISHING.md](PUBLISHING.md) for details.

## Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [VS Code Extension Samples](https://github.com/microsoft/vscode-extension-samples)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [MCP Protocol](https://modelcontextprotocol.io)
- [MCP Process Server](https://github.com/digital-defiance/ai-capabilities-suite/tree/main/packages/mcp-process)

## Support

- GitHub Issues: https://github.com/digital-defiance/ai-capabilities-suite/issues
- Email: info@digitaldefiance.org
- Discord: [Join our server](https://discord.gg/digitaldefiance)
