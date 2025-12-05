import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  TextDocumentSyncKind,
  InitializeResult,
  Hover,
  CodeLens,
  Diagnostic,
  DiagnosticSeverity,
  ExecuteCommandParams,
  SignatureHelp,
  SemanticTokensBuilder,
  SemanticTokensLegend,
  InlayHint,
  InlayHintKind,
  CallHierarchyItem,
  CallHierarchyIncomingCall,
  CallHierarchyOutgoingCall,
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";

const connection = createConnection(ProposedFeatures.all);
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

// Semantic tokens legend
const tokenTypes = ["function", "variable", "parameter", "property", "keyword"];
const tokenModifiers = ["declaration", "readonly", "async"];
const legend: SemanticTokensLegend = {
  tokenTypes,
  tokenModifiers,
};

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      hoverProvider: true,
      codeLensProvider: {
        resolveProvider: true,
      },
      executeCommandProvider: {
        commands: [
          "mcp.process.start",
          "mcp.process.terminate",
          "mcp.process.getStats",
          "mcp.process.list",
          "mcp.process.sendStdin",
          "mcp.process.getOutput",
          "mcp.process.createGroup",
          "mcp.process.addToGroup",
          "mcp.process.terminateGroup",
          "mcp.process.startService",
          "mcp.process.stopService",
        ],
      },
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: [".", "(", ","],
      },
      definitionProvider: true,
      documentSymbolProvider: true,
      workspaceSymbolProvider: true,
      codeActionProvider: true,
      signatureHelpProvider: {
        triggerCharacters: ["(", ","],
      },
      renameProvider: {
        prepareProvider: true,
      },
      semanticTokensProvider: {
        legend,
        range: false,
        full: true,
      },
      inlayHintProvider: true,
      callHierarchyProvider: true,
    },
  };

  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }

  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined
    );
  }

  connection.console.log("MCP Process Language Server initialized");
});

documents.onDidOpen((event: any) => {
  validateTextDocument(event.document);
});

documents.onDidChangeContent((change: any) => {
  validateTextDocument(change.document);
});

documents.onDidClose((event: any) => {
  connection.sendDiagnostics({ uri: event.document.uri, diagnostics: [] });
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  const diagnostics: Diagnostic[] = [];
  const text = textDocument.getText();
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes("child_process.exec") || line.includes("exec(")) {
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: line.length },
        },
        message:
          "Consider using child_process.spawn instead of exec for better security.",
        source: "mcp-process",
      });
    }

    if (line.includes("shell: true")) {
      diagnostics.push({
        severity: DiagnosticSeverity.Warning,
        range: {
          start: { line: i, character: line.indexOf("shell: true") },
          end: {
            line: i,
            character: line.indexOf("shell: true") + "shell: true".length,
          },
        },
        message:
          "Using shell: true can introduce command injection vulnerabilities.",
        source: "mcp-process",
      });
    }
  }

  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onHover(async (params: any): Promise<Hover | null> => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const text = document.getText();
  const offset = document.offsetAt(params.position);
  const wordRange = getWordRangeAtPosition(text, offset);

  if (!wordRange) {
    return null;
  }

  const word = text.substring(wordRange.start, wordRange.end);

  if (word === "spawn" || word === "exec" || word === "fork") {
    return {
      contents: {
        kind: "markdown",
        value: [
          `**Process Management: ${word}**`,
          "",
          "MCP Process Manager provides secure process management.",
        ].join("\n"),
      },
    };
  }

  return null;
});

connection.onCodeLens(async (params: any): Promise<CodeLens[]> => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const codeLenses: CodeLens[] = [];
  const text = document.getText();
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // spawn() calls
    if (line.includes("spawn(") || line.includes(".spawn(")) {
      codeLenses.push({
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: line.length },
        },
        command: {
          title: "🚀 Launch with MCP",
          command: "mcp.process.start",
          arguments: [params.textDocument.uri, i + 1],
        },
      });
    }

    // kill() or terminate() calls
    if (line.includes(".kill(") || line.includes("terminate(")) {
      codeLenses.push({
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: line.length },
        },
        command: {
          title: "🛑 Terminate via MCP",
          command: "mcp.process.terminate",
          arguments: [params.textDocument.uri, i + 1],
        },
      });
    }

    // stdin.write() calls
    if (line.includes(".stdin.write(") || line.includes("stdin.write(")) {
      codeLenses.push({
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: line.length },
        },
        command: {
          title: "📝 Send via MCP",
          command: "mcp.process.sendStdin",
          arguments: [params.textDocument.uri, i + 1],
        },
      });
    }

    // stdout/stderr reading
    if (line.includes(".stdout") || line.includes(".stderr")) {
      codeLenses.push({
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: line.length },
        },
        command: {
          title: "📤 Get Output via MCP",
          command: "mcp.process.getOutput",
          arguments: [params.textDocument.uri, i + 1],
        },
      });
    }

    // Service-like patterns (long-running processes)
    if (
      (line.includes("spawn(") || line.includes(".spawn(")) &&
      (line.includes("detached") || line.includes("daemon"))
    ) {
      codeLenses.push({
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: line.length },
        },
        command: {
          title: "🔄 Start as Service",
          command: "mcp.process.startService",
          arguments: [params.textDocument.uri, i + 1],
        },
      });
    }

    // Resource monitoring patterns
    if (line.includes("for") || line.includes("while")) {
      const nextLine = i + 1 < lines.length ? lines[i + 1] : "";
      if (nextLine.includes("spawn(") || nextLine.includes("process")) {
        codeLenses.push({
          range: {
            start: { line: i, character: 0 },
            end: { line: i, character: line.length },
          },
          command: {
            title: "📊 Monitor Resources",
            command: "mcp.process.getStats",
            arguments: [params.textDocument.uri, i + 1],
          },
        });
      }
    }
  }

  return codeLenses;
});

connection.onExecuteCommand(
  async (params: ExecuteCommandParams): Promise<any> => {
    connection.console.log(`Command requested: ${params.command}`);
    return {
      message: "Command forwarded to extension",
      command: params.command,
    };
  }
);

function getWordRangeAtPosition(
  text: string,
  offset: number
): { start: number; end: number } | null {
  const wordPattern = /\b\w+\b/g;
  let match;

  while ((match = wordPattern.exec(text)) !== null) {
    if (match.index <= offset && offset <= match.index + match[0].length) {
      return {
        start: match.index,
        end: match.index + match[0].length,
      };
    }
  }

  return null;
}

documents.listen(connection);
connection.listen();

// Completion provider for MCP process functions
connection.onCompletion(async (params: any): Promise<any[]> => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const text = document.getText();
  const position = params.position;
  const line = text.split("\n")[position.line];

  const completions: any[] = [];

  // Suggest spawn options
  if (line.includes("spawn(") && line.includes("{")) {
    completions.push(
      {
        label: "captureOutput",
        kind: 10, // Property
        detail: "boolean",
        documentation: "Capture stdout and stderr from the process",
        insertText: "captureOutput: true",
      },
      {
        label: "resourceLimits",
        kind: 10,
        detail: "object",
        documentation: "Set CPU and memory limits for the process",
        insertText: "resourceLimits: { maxCpuPercent: 80, maxMemoryMB: 1024 }",
      },
      {
        label: "timeout",
        kind: 10,
        detail: "number",
        documentation: "Timeout in milliseconds",
        insertText: "timeout: 30000",
      }
    );
  }

  // Suggest MCP process methods
  if (line.includes("mcpClient.")) {
    completions.push(
      {
        label: "startProcess",
        kind: 2, // Method
        detail: "(config: ProcessConfig) => Promise<number>",
        documentation: "Launch a new process with security validation",
        insertText: "startProcess({ executable: '', args: [] })",
      },
      {
        label: "terminateProcess",
        kind: 2,
        detail: "(options: TerminateOptions) => Promise<void>",
        documentation: "Terminate a running process",
        insertText: "terminateProcess({ pid: 0, force: false })",
      },
      {
        label: "getProcessStats",
        kind: 2,
        detail: "(options: StatsOptions) => Promise<ProcessStats>",
        documentation: "Get resource usage statistics",
        insertText: "getProcessStats({ pid: 0 })",
      },
      {
        label: "listProcesses",
        kind: 2,
        detail: "() => Promise<ProcessInfo[]>",
        documentation: "List all managed processes",
        insertText: "listProcesses()",
      }
    );
  }

  return completions;
});

// Definition provider - go to process definition
connection.onDefinition(async (params: any): Promise<any> => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const text = document.getText();
  const offset = document.offsetAt(params.position);
  const wordRange = getWordRangeAtPosition(text, offset);

  if (!wordRange) {
    return null;
  }

  const word = text.substring(wordRange.start, wordRange.end);

  // If hovering over a PID, try to find where it was defined
  if (word === "pid" || /^\d+$/.test(word)) {
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("spawn(") && lines[i].includes(".pid")) {
        return {
          uri: params.textDocument.uri,
          range: {
            start: { line: i, character: 0 },
            end: { line: i, character: lines[i].length },
          },
        };
      }
    }
  }

  return null;
});

// Document symbols - show process-related symbols
connection.onDocumentSymbol(async (params: any): Promise<any[]> => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const text = document.getText();
  const lines = text.split("\n");
  const symbols: any[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Find spawn calls
    if (line.includes("spawn(")) {
      const match = line.match(/const\s+(\w+)\s*=/);
      const name = match ? match[1] : "spawn";

      symbols.push({
        name: `Process: ${name}`,
        kind: 13, // Variable
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: line.length },
        },
        selectionRange: {
          start: { line: i, character: 0 },
          end: { line: i, character: line.length },
        },
      });
    }

    // Find process.kill calls
    if (line.includes("process.kill(") || line.includes(".kill(")) {
      symbols.push({
        name: "Process Termination",
        kind: 12, // Function
        range: {
          start: { line: i, character: 0 },
          end: { line: i, character: line.length },
        },
        selectionRange: {
          start: { line: i, character: 0 },
          end: { line: i, character: line.length },
        },
      });
    }
  }

  return symbols;
});

// Code actions - quick fixes for diagnostics
connection.onCodeAction(async (params: any): Promise<any[]> => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const codeActions: any[] = [];
  const diagnostics = params.context.diagnostics;

  for (const diagnostic of diagnostics) {
    // Quick fix for exec -> spawn
    if (diagnostic.message.includes("exec")) {
      codeActions.push({
        title: "Replace exec with spawn",
        kind: "quickfix",
        diagnostics: [diagnostic],
        edit: {
          changes: {
            [params.textDocument.uri]: [
              {
                range: diagnostic.range,
                newText: "// TODO: Replace exec with spawn for better security",
              },
            ],
          },
        },
      });
    }

    // Quick fix for shell: true
    if (diagnostic.message.includes("shell")) {
      codeActions.push({
        title: "Remove shell: true",
        kind: "quickfix",
        diagnostics: [diagnostic],
        edit: {
          changes: {
            [params.textDocument.uri]: [
              {
                range: diagnostic.range,
                newText:
                  "// TODO: Remove shell: true to prevent command injection",
              },
            ],
          },
        },
      });
    }

    // Add error handling
    if (diagnostic.message.includes("error handling")) {
      codeActions.push({
        title: "Add error handling",
        kind: "quickfix",
        diagnostics: [diagnostic],
        command: {
          title: "Add error handling",
          command: "mcp.process.addErrorHandling",
          arguments: [params.textDocument.uri, diagnostic.range],
        },
      });
    }
  }

  // Refactoring actions
  const text = document.getText();
  const range = params.range;
  const selectedText = document.getText(range);

  if (selectedText.includes("spawn(")) {
    codeActions.push({
      title: "Convert to MCP Process Manager",
      kind: "refactor",
      edit: {
        changes: {
          [params.textDocument.uri]: [
            {
              range: range,
              newText:
                "// TODO: Use MCP Process Manager for secure process execution",
            },
          ],
        },
      },
    });
  }

  return codeActions;
});

// Signature help - show function signatures
connection.onSignatureHelp(
  async (params: any): Promise<SignatureHelp | null> => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      return null;
    }

    const text = document.getText();
    const offset = document.offsetAt(params.position);
    const line = text.substring(0, offset).split("\n").pop() || "";

    // spawn() signature
    if (line.includes("spawn(")) {
      return {
        signatures: [
          {
            label:
              "spawn(executable: string, args: string[], options?: SpawnOptions)",
            documentation:
              "Launch a new process with the specified executable and arguments",
            parameters: [
              {
                label: "executable: string",
                documentation: "Path to the executable to run",
              },
              {
                label: "args: string[]",
                documentation: "Array of command-line arguments",
              },
              {
                label: "options?: SpawnOptions",
                documentation: "Optional spawn options (cwd, env, etc.)",
              },
            ],
          },
        ],
        activeSignature: 0,
        activeParameter: (line.match(/,/g) || []).length,
      };
    }

    // MCP client methods
    if (line.includes("startProcess(")) {
      return {
        signatures: [
          {
            label: "startProcess(config: ProcessConfig): Promise<number>",
            documentation:
              "Launch a new process via MCP with security validation",
            parameters: [
              {
                label: "config: ProcessConfig",
                documentation:
                  "Process configuration with executable, args, limits, etc.",
              },
            ],
          },
        ],
        activeSignature: 0,
        activeParameter: 0,
      };
    }

    if (line.includes("terminateProcess(")) {
      return {
        signatures: [
          {
            label:
              "terminateProcess(options: { pid: number, force?: boolean }): Promise<void>",
            documentation: "Terminate a running process",
            parameters: [
              {
                label: "options",
                documentation: "Termination options with PID and force flag",
              },
            ],
          },
        ],
        activeSignature: 0,
        activeParameter: 0,
      };
    }

    return null;
  }
);

// Rename support - rename process variables
connection.onPrepareRename(async (params: any): Promise<any> => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const text = document.getText();
  const offset = document.offsetAt(params.position);
  const wordRange = getWordRangeAtPosition(text, offset);

  if (!wordRange) {
    return null;
  }

  const word = text.substring(wordRange.start, wordRange.end);

  // Only allow renaming process-related variables
  if (
    word.includes("process") ||
    word.includes("child") ||
    word.includes("pid")
  ) {
    return {
      range: {
        start: document.positionAt(wordRange.start),
        end: document.positionAt(wordRange.end),
      },
      placeholder: word,
    };
  }

  return null;
});

connection.onRenameRequest(async (params: any): Promise<any> => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const text = document.getText();
  const offset = document.offsetAt(params.position);
  const wordRange = getWordRangeAtPosition(text, offset);

  if (!wordRange) {
    return null;
  }

  const oldName = text.substring(wordRange.start, wordRange.end);
  const newName = params.newName;

  // Find all occurrences
  const changes: any[] = [];
  const regex = new RegExp(`\\b${oldName}\\b`, "g");
  let match;

  while ((match = regex.exec(text)) !== null) {
    changes.push({
      range: {
        start: document.positionAt(match.index),
        end: document.positionAt(match.index + match[0].length),
      },
      newText: newName,
    });
  }

  return {
    changes: {
      [params.textDocument.uri]: changes,
    },
  };
});

// Call hierarchy - show process call chains
connection.languages.callHierarchy.onPrepare(
  async (params: any): Promise<CallHierarchyItem[] | null> => {
    const document = documents.get(params.textDocument.uri);
    if (!document) {
      return null;
    }

    const text = document.getText();
    const offset = document.offsetAt(params.position);
    const wordRange = getWordRangeAtPosition(text, offset);

    if (!wordRange) {
      return null;
    }

    const word = text.substring(wordRange.start, wordRange.end);

    // Only for spawn/exec/fork
    if (word === "spawn" || word === "exec" || word === "fork") {
      return [
        {
          name: word,
          kind: 12, // Function
          uri: params.textDocument.uri,
          range: {
            start: document.positionAt(wordRange.start),
            end: document.positionAt(wordRange.end),
          },
          selectionRange: {
            start: document.positionAt(wordRange.start),
            end: document.positionAt(wordRange.end),
          },
        },
      ];
    }

    return null;
  }
);

connection.languages.callHierarchy.onIncomingCalls(
  async (params: any): Promise<CallHierarchyIncomingCall[]> => {
    // Find where this process is called from
    return [];
  }
);

connection.languages.callHierarchy.onOutgoingCalls(
  async (params: any): Promise<CallHierarchyOutgoingCall[]> => {
    // Find what this process calls
    return [];
  }
);

// Semantic tokens - highlight process-related code
connection.languages.semanticTokens.on(async (params: any): Promise<any> => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return { data: [] };
  }

  const builder = new SemanticTokensBuilder();
  const text = document.getText();
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Highlight spawn, exec, fork as functions
    const functionMatches = line.matchAll(/\b(spawn|exec|fork|kill)\b/g);
    for (const match of functionMatches) {
      if (match.index !== undefined) {
        builder.push(i, match.index, match[0].length, 0, 0); // function type
      }
    }

    // Highlight pid as variable
    const pidMatches = line.matchAll(/\bpid\b/g);
    for (const match of pidMatches) {
      if (match.index !== undefined) {
        builder.push(i, match.index, match[0].length, 1, 0); // variable type
      }
    }

    // Highlight process properties
    const propertyMatches = line.matchAll(/\.(stdin|stdout|stderr|pid)\b/g);
    for (const match of propertyMatches) {
      if (match.index !== undefined) {
        builder.push(i, match.index + 1, match[0].length - 1, 3, 0); // property type
      }
    }
  }

  return builder.build();
});

// Inlay hints - show parameter names and types
connection.languages.inlayHint.on(async (params: any): Promise<InlayHint[]> => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const hints: InlayHint[] = [];
  const text = document.getText();
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // spawn() parameter hints
    const spawnMatch = line.match(/spawn\s*\(\s*['"]([^'"]+)['"]\s*,\s*\[/);
    if (spawnMatch && spawnMatch.index !== undefined) {
      hints.push({
        position: { line: i, character: spawnMatch.index + 6 },
        label: "executable:",
        kind: InlayHintKind.Parameter,
        paddingRight: true,
      });
    }

    // Resource limit hints
    if (line.includes("maxCpuPercent") || line.includes("maxMemoryMB")) {
      const match = line.match(/:\s*(\d+)/);
      if (match && match.index !== undefined) {
        if (line.includes("maxCpuPercent")) {
          hints.push({
            position: { line: i, character: match.index + match[0].length },
            label: "%",
            kind: InlayHintKind.Type,
            paddingLeft: true,
          });
        } else if (line.includes("maxMemoryMB")) {
          hints.push({
            position: { line: i, character: match.index + match[0].length },
            label: "MB",
            kind: InlayHintKind.Type,
            paddingLeft: true,
          });
        }
      }
    }
  }

  return hints;
});
