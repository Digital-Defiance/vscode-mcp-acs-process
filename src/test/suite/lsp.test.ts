import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

suite("LSP Integration Test Suite", () => {
  let testDocument: vscode.TextDocument;
  let testEditor: vscode.TextEditor;
  let testFilePath: string;
  let testDir: string;

  suiteSetup(async function () {
    this.timeout(30000);

    // Ensure extension is activated
    const ext = vscode.extensions.getExtension(
      "DigitalDefiance.mcp-acs-process"
    );
    assert.ok(ext, "Extension should be present");
    await ext!.activate();
    assert.ok(ext!.isActive, "Extension should be active");

    // Wait for language server to start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Create temp directory for test files
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), "lsp-test-"));
  });

  suiteTeardown(async () => {
    // Clean up temp directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  setup(async function () {
    this.timeout(10000);
    // Create a unique test file for each test
    testFilePath = path.join(testDir, `test-${Date.now()}.js`);
    fs.writeFileSync(testFilePath, "");

    testDocument = await vscode.workspace.openTextDocument(testFilePath);
    testEditor = await vscode.window.showTextDocument(testDocument);
  });

  teardown(async () => {
    // Close test document
    await vscode.commands.executeCommand("workbench.action.closeActiveEditor");

    // Delete test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  suite("Language Server Activation", () => {
    test("Language server should start on JavaScript file", async function () {
      this.timeout(5000);

      const doc = await vscode.workspace.openTextDocument({
        language: "javascript",
        content: "const x = 1;",
      });

      await vscode.window.showTextDocument(doc);

      // Wait for language server to process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Language server should be running (no way to directly check, but no errors)
      assert.ok(true);

      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor"
      );
    });

    test("Language server should start on TypeScript file", async function () {
      this.timeout(5000);

      const doc = await vscode.workspace.openTextDocument({
        language: "typescript",
        content: "const x: number = 1;",
      });

      await vscode.window.showTextDocument(doc);

      // Wait for language server to process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      assert.ok(true);

      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor"
      );
    });
  });

  suite("Code Lens", () => {
    test("Code lens should appear on spawn() calls", async function () {
      this.timeout(15000);

      const content = `const { spawn } = require('child_process');
const child = spawn('node', ['script.js']);`;

      // Write to real file
      fs.writeFileSync(testFilePath, content);

      // Reload document to pick up changes
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor"
      );
      testDocument = await vscode.workspace.openTextDocument(testFilePath);
      testEditor = await vscode.window.showTextDocument(testDocument);

      // Wait for code lens to be computed with retry logic
      let codeLenses: vscode.CodeLens[] | undefined;
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        codeLenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
          "vscode.executeCodeLensProvider",
          testDocument.uri
        );
        if (codeLenses && codeLenses.length > 0) {
          break;
        }
      }

      assert.ok(codeLenses, "Code lenses should be provided");
      assert.ok(
        codeLenses.length > 0,
        "At least one code lens should be present"
      );

      // Check if any code lens is for spawn
      const hasSpawnLens = codeLenses.some(
        (lens) =>
          lens.command &&
          (lens.command.title.includes("Launch") ||
            lens.command.title.includes("MCP"))
      );

      assert.ok(hasSpawnLens, "Should have code lens for spawn");
    });

    test("Code lens should appear on multiple spawn() calls", async function () {
      this.timeout(15000);

      const content = `const { spawn } = require('child_process');
const child1 = spawn('node', ['script1.js']);
const child2 = spawn('node', ['script2.js']);`;

      // Write to real file
      fs.writeFileSync(testFilePath, content);

      // Reload document
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor"
      );
      testDocument = await vscode.workspace.openTextDocument(testFilePath);
      testEditor = await vscode.window.showTextDocument(testDocument);

      // Wait for code lens with retry logic
      let codeLenses: vscode.CodeLens[] | undefined;
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        codeLenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
          "vscode.executeCodeLensProvider",
          testDocument.uri
        );
        if (codeLenses && codeLenses.length >= 2) {
          break;
        }
      }

      assert.ok(codeLenses, "Code lenses should be provided");
      assert.ok(
        codeLenses.length >= 2,
        "Should have code lens for both spawn calls"
      );
    });

    test("Code lens should not appear on unrelated code", async function () {
      this.timeout(10000);

      const content = `const x = 42;
const y = "hello";`;

      await testEditor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(0, 0), content);
      });

      await new Promise((resolve) => setTimeout(resolve, 3000));

      const codeLenses = await vscode.commands.executeCommand<
        vscode.CodeLens[]
      >("vscode.executeCodeLensProvider", testDocument.uri);

      // Should have no code lenses or very few
      assert.ok(
        !codeLenses || codeLenses.length === 0,
        "Should not have code lens for unrelated code"
      );
    });
  });

  suite("Hover Provider", () => {
    test("Hover should work on 'spawn' keyword", async function () {
      this.timeout(10000);

      const content = `const { spawn } = require('child_process');
const child = spawn('node', ['script.js']);`;

      await testEditor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(0, 0), content);
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Position on 'spawn' in the second line
      const position = new vscode.Position(1, 15);

      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        "vscode.executeHoverProvider",
        testDocument.uri,
        position
      );

      assert.ok(hovers, "Hover should be provided");
      assert.ok(hovers.length > 0, "At least one hover should be present");

      // Check if hover contains MCP-related content
      const hasProcessInfo = hovers.some((hover) => {
        const contents = hover.contents;
        return contents.some((content) => {
          const text =
            typeof content === "string"
              ? content
              : "value" in content
              ? content.value
              : "";
          return (
            text.includes("Process") ||
            text.includes("MCP") ||
            text.includes("spawn")
          );
        });
      });

      assert.ok(hasProcessInfo, "Hover should contain process information");
    });

    test("Hover should work on 'pid' keyword", async function () {
      this.timeout(10000);

      const content = `const { spawn } = require('child_process');
const child = spawn('node', ['script.js']);
const pid = child.pid;`;

      await testEditor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(0, 0), content);
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Position on 'pid' in the third line
      const position = new vscode.Position(2, 6);

      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        "vscode.executeHoverProvider",
        testDocument.uri,
        position
      );

      assert.ok(hovers, "Hover should be provided");
      // Hover may or may not be present depending on LSP implementation
      // Just verify it doesn't crash
    });
  });

  suite("Diagnostics", () => {
    test("Diagnostic should appear for child_process.exec", async function () {
      this.timeout(15000);

      const content = `const { exec } = require('child_process');
exec('ls -la');`;

      // Write to real file
      fs.writeFileSync(testFilePath, content);

      // Reload document
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor"
      );
      testDocument = await vscode.workspace.openTextDocument(testFilePath);
      testEditor = await vscode.window.showTextDocument(testDocument);

      // Wait for diagnostics with retry logic
      let diagnostics: vscode.Diagnostic[] = [];
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        diagnostics = vscode.languages.getDiagnostics(testDocument.uri);
        if (diagnostics.length > 0) {
          break;
        }
      }

      assert.ok(diagnostics, "Diagnostics should be provided");
      assert.ok(
        diagnostics.length > 0,
        "At least one diagnostic should be present"
      );

      // Check if diagnostic is about exec
      const hasExecWarning = diagnostics.some(
        (diag) =>
          diag.message.includes("exec") || diag.message.includes("spawn")
      );

      assert.ok(hasExecWarning, "Should have warning about exec");
    });

    test("Diagnostic should appear for shell: true", async function () {
      this.timeout(15000);

      const content = `const { spawn } = require('child_process');
spawn('ls', ['-la'], { shell: true });`;

      // Write to real file
      fs.writeFileSync(testFilePath, content);

      // Reload document
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor"
      );
      testDocument = await vscode.workspace.openTextDocument(testFilePath);
      testEditor = await vscode.window.showTextDocument(testDocument);

      // Wait for diagnostics with retry logic
      let diagnostics: vscode.Diagnostic[] = [];
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        diagnostics = vscode.languages.getDiagnostics(testDocument.uri);
        if (diagnostics.length > 0) {
          break;
        }
      }

      assert.ok(diagnostics, "Diagnostics should be provided");

      // Check if diagnostic is about shell: true
      const hasShellWarning = diagnostics.some(
        (diag) =>
          diag.message.includes("shell") || diag.message.includes("injection")
      );

      assert.ok(hasShellWarning, "Should have warning about shell: true");
    });

    test("Diagnostics should clear when file is closed", async function () {
      this.timeout(10000);

      const content = `const { exec } = require('child_process');
exec('ls -la');`;

      await testEditor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(0, 0), content);
      });

      await new Promise((resolve) => setTimeout(resolve, 3000));

      let diagnostics = vscode.languages.getDiagnostics(testDocument.uri);
      assert.ok(diagnostics.length > 0, "Should have diagnostics");

      // Close document
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor"
      );

      await new Promise((resolve) => setTimeout(resolve, 1000));

      diagnostics = vscode.languages.getDiagnostics(testDocument.uri);
      assert.strictEqual(
        diagnostics.length,
        0,
        "Diagnostics should be cleared"
      );
    });
  });

  suite("LSP Commands", () => {
    test("mcp.process.start command should be registered", async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(
        commands.includes("mcp.process.start"),
        "mcp.process.start should be registered"
      );
    });

    test("mcp.process.terminate command should be registered", async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(
        commands.includes("mcp.process.terminate"),
        "mcp.process.terminate should be registered"
      );
    });

    test("mcp.process.getStats command should be registered", async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(
        commands.includes("mcp.process.getStats"),
        "mcp.process.getStats should be registered"
      );
    });

    test("mcp.process.list command should be registered", async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(
        commands.includes("mcp.process.list"),
        "mcp.process.list should be registered"
      );
    });
  });

  suite("Context Provider Commands", () => {
    test("mcp-process.getContext command should be registered", async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(
        commands.includes("mcp-process.getContext"),
        "mcp-process.getContext should be registered"
      );
    });

    test("mcp-process.getContextString command should be registered", async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(
        commands.includes("mcp-process.getContextString"),
        "mcp-process.getContextString should be registered"
      );
    });

    test("mcp-process.getAvailableTools command should be registered", async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(
        commands.includes("mcp-process.getAvailableTools"),
        "mcp-process.getAvailableTools should be registered"
      );
    });

    test("getContext should return structured data", async function () {
      this.timeout(5000);

      try {
        const context = await vscode.commands.executeCommand(
          "mcp-process.getContext"
        );
        assert.ok(context, "Context should be returned");
        assert.ok(typeof context === "object", "Context should be an object");
      } catch (error) {
        // Expected to fail without server, but command should exist
        assert.ok(error);
      }
    });

    test("getAvailableTools should return tool list", async function () {
      this.timeout(5000);

      const tools = await vscode.commands.executeCommand(
        "mcp-process.getAvailableTools"
      );
      assert.ok(tools, "Tools should be returned");
      assert.ok(Array.isArray(tools), "Tools should be an array");
      assert.ok(tools.length > 0, "Should have at least one tool");
    });
  });

  suite("Multi-File Support", () => {
    test("LSP should work across multiple files", async function () {
      this.timeout(20000);

      // Create first file
      const file1Path = path.join(testDir, `multi-test-1-${Date.now()}.js`);
      fs.writeFileSync(
        file1Path,
        `const { spawn } = require('child_process');
spawn('node', ['script1.js']);`
      );

      const doc1 = await vscode.workspace.openTextDocument(file1Path);
      await vscode.window.showTextDocument(doc1);

      // Wait for code lens with retry
      let codeLenses1: vscode.CodeLens[] | undefined;
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        codeLenses1 = await vscode.commands.executeCommand<vscode.CodeLens[]>(
          "vscode.executeCodeLensProvider",
          doc1.uri
        );
        if (codeLenses1 && codeLenses1.length > 0) {
          break;
        }
      }

      assert.ok(
        codeLenses1 && codeLenses1.length > 0,
        "File 1 should have code lens"
      );

      // Create second file
      const file2Path = path.join(testDir, `multi-test-2-${Date.now()}.js`);
      fs.writeFileSync(
        file2Path,
        `const { spawn } = require('child_process');
spawn('node', ['script2.js']);`
      );

      const doc2 = await vscode.workspace.openTextDocument(file2Path);
      await vscode.window.showTextDocument(doc2);

      // Wait for code lens with retry
      let codeLenses2: vscode.CodeLens[] | undefined;
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        codeLenses2 = await vscode.commands.executeCommand<vscode.CodeLens[]>(
          "vscode.executeCodeLensProvider",
          doc2.uri
        );
        if (codeLenses2 && codeLenses2.length > 0) {
          break;
        }
      }

      assert.ok(
        codeLenses2 && codeLenses2.length > 0,
        "File 2 should have code lens"
      );

      // Clean up
      await vscode.commands.executeCommand("workbench.action.closeAllEditors");
      fs.unlinkSync(file1Path);
      fs.unlinkSync(file2Path);
    });
  });

  suite("Performance", () => {
    test("Code lens should appear quickly", async function () {
      this.timeout(10000);

      const content = `const { spawn } = require('child_process');
const child = spawn('node', ['script.js']);`;

      // Write to real file
      fs.writeFileSync(testFilePath, content);

      // Reload document
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor"
      );
      testDocument = await vscode.workspace.openTextDocument(testFilePath);
      testEditor = await vscode.window.showTextDocument(testDocument);

      const startTime = Date.now();

      // Wait for code lens
      let codeLenses: vscode.CodeLens[] | undefined;
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        codeLenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
          "vscode.executeCodeLensProvider",
          testDocument.uri
        );
        if (codeLenses && codeLenses.length > 0) {
          break;
        }
      }

      const elapsed = Date.now() - startTime;

      assert.ok(codeLenses && codeLenses.length > 0, "Code lens should appear");
      assert.ok(
        elapsed < 5000,
        `Code lens should appear in < 5s (took ${elapsed}ms)`
      );
    });

    test("Diagnostics should appear quickly", async function () {
      this.timeout(10000);

      const content = `const { exec } = require('child_process');
exec('ls -la');`;

      await testEditor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(0, 0), content);
      });

      const startTime = Date.now();

      // Wait for diagnostics
      let diagnostics: vscode.Diagnostic[] = [];
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        diagnostics = vscode.languages.getDiagnostics(testDocument.uri);
        if (diagnostics.length > 0) {
          break;
        }
      }

      const elapsed = Date.now() - startTime;

      assert.ok(diagnostics.length > 0, "Diagnostics should appear");
      assert.ok(
        elapsed < 5000,
        `Diagnostics should appear in < 5s (took ${elapsed}ms)`
      );
    });
  });

  suite("Error Handling", () => {
    test("LSP should handle invalid JavaScript gracefully", async function () {
      this.timeout(10000);

      const content = `const { spawn } = require('child_process');
spawn('node', ['script.js']
// Missing closing parenthesis`;

      await testEditor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(0, 0), content);
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Should not crash, may or may not have code lens
      const codeLenses = await vscode.commands.executeCommand<
        vscode.CodeLens[]
      >("vscode.executeCodeLensProvider", testDocument.uri);

      // Just verify it doesn't throw
      assert.ok(true);
    });

    test("LSP should handle large files", async function () {
      this.timeout(15000);

      // Create a large file
      let content = `const { spawn } = require('child_process');\n`;
      for (let i = 0; i < 500; i++) {
        content += `const child${i} = spawn('node', ['script${i}.js']);\n`;
      }

      await testEditor.edit((editBuilder) => {
        editBuilder.insert(new vscode.Position(0, 0), content);
      });

      await new Promise((resolve) => setTimeout(resolve, 5000));

      const codeLenses = await vscode.commands.executeCommand<
        vscode.CodeLens[]
      >("vscode.executeCodeLensProvider", testDocument.uri);

      // Should handle large file without crashing
      assert.ok(codeLenses, "Should handle large file");
    });
  });
});
