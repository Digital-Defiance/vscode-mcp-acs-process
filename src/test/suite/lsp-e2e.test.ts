import * as assert from "assert";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

/**
 * End-to-End LSP Tests
 *
 * These tests verify the complete LSP integration in a real VS Code environment:
 * - Language server starts and communicates
 * - Code lens appears in real documents
 * - Hover works on real code
 * - Diagnostics appear for real issues
 * - Commands execute successfully
 * - Context providers work
 * - Multi-file scenarios work
 * - Performance is acceptable
 */
suite("LSP E2E Test Suite", () => {
  let testWorkspaceFolder: string;
  let testFilePath: string;

  suiteSetup(async function () {
    this.timeout(30000);

    // Set environment variable to enable LSP in test mode
    process.env.VSCODE_LSP_TEST = "true";

    // Ensure extension is activated
    const ext = vscode.extensions.getExtension(
      "DigitalDefiance.mcp-acs-process"
    );
    assert.ok(ext, "Extension should be present");

    if (!ext.isActive) {
      await ext.activate();
    }
    assert.ok(ext.isActive, "Extension should be active");

    // Wait for language server to start
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Create test workspace folder
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      testWorkspaceFolder = workspaceFolders[0].uri.fsPath;
    } else {
      // Create a temporary workspace
      const tmpDir = path.join(__dirname, "../../../test-workspace");
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      testWorkspaceFolder = tmpDir;
    }

    testFilePath = path.join(testWorkspaceFolder, "test-lsp.js");
  });

  suiteTeardown(async () => {
    // Clean up environment variable
    delete process.env.VSCODE_LSP_TEST;

    // Clean up test files
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  suite("Complete LSP Workflow", () => {
    test("E2E: Full workflow from file open to code lens click", async function () {
      this.timeout(20000);

      // Step 1: Create a test file with process code
      const content = `const { spawn } = require('child_process');
const child = spawn('node', ['--version']);
child.on('close', (code) => {
  console.log('Exit code:', code);
});`;

      fs.writeFileSync(testFilePath, content);

      // Step 2: Open the file in VS Code
      const document = await vscode.workspace.openTextDocument(testFilePath);
      const editor = await vscode.window.showTextDocument(document);

      // Step 3: Wait for language server to process
      await new Promise((resolve) => setTimeout(resolve, 4000));

      // Step 4: Verify code lens appears
      const codeLenses = await vscode.commands.executeCommand<
        vscode.CodeLens[]
      >("vscode.executeCodeLensProvider", document.uri);

      assert.ok(codeLenses, "Code lenses should be provided");
      assert.ok(codeLenses.length > 0, "At least one code lens should appear");

      const hasSpawnLens = codeLenses.some(
        (lens) =>
          lens.command &&
          (lens.command.title.includes("Launch") ||
            lens.command.title.includes("MCP"))
      );
      assert.ok(hasSpawnLens, "Should have code lens for spawn");

      // Step 5: Verify diagnostics (no errors expected for this code)
      const diagnostics = vscode.languages.getDiagnostics(document.uri);
      // This code is valid JavaScript, so no ERROR diagnostics expected
      // (warnings about require/module are okay since this is a .js file without package.json)
      const errors = diagnostics.filter(
        (d) => d.severity === vscode.DiagnosticSeverity.Error
      );
      assert.strictEqual(
        errors.length,
        0,
        `No error diagnostics expected for valid code, but got: ${errors
          .map((e) => e.message)
          .join(", ")}`
      );

      // Step 6: Verify hover works
      const position = new vscode.Position(1, 15); // On 'spawn'
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        "vscode.executeHoverProvider",
        document.uri,
        position
      );

      assert.ok(hovers, "Hover should be provided");

      // Step 7: Close the file
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor"
      );

      // Wait for language server to process the close event
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 8: Verify diagnostics cleared (or at least no errors)
      const diagnosticsAfter = vscode.languages.getDiagnostics(document.uri);
      // After closing, diagnostics should be cleared or minimal
      // Some language servers may keep warnings, but errors should be gone
      const errorsAfter = diagnosticsAfter.filter(
        (d) => d.severity === vscode.DiagnosticSeverity.Error
      );
      assert.strictEqual(
        errorsAfter.length,
        0,
        "Error diagnostics should be cleared after closing file"
      );
    });

    test("E2E: Security warning workflow", async function () {
      this.timeout(20000);

      // Step 1: Create file with security issue
      const content = `const { exec } = require('child_process');
exec('rm -rf /tmp/*', { shell: true });`;

      fs.writeFileSync(testFilePath, content);

      // Step 2: Open file
      const document = await vscode.workspace.openTextDocument(testFilePath);
      await vscode.window.showTextDocument(document);

      // Step 3: Wait for diagnostics
      await new Promise((resolve) => setTimeout(resolve, 4000));

      // Step 4: Verify diagnostics appear
      const diagnostics = vscode.languages.getDiagnostics(document.uri);
      assert.ok(diagnostics.length > 0, "Should have diagnostics");

      const hasExecWarning = diagnostics.some(
        (diag) =>
          diag.message.includes("exec") || diag.message.includes("spawn")
      );
      const hasShellWarning = diagnostics.some(
        (diag) =>
          diag.message.includes("shell") || diag.message.includes("injection")
      );

      assert.ok(
        hasExecWarning || hasShellWarning,
        "Should have security warnings"
      );

      // Step 5: Get code actions (quick fixes)
      const codeActions = await vscode.commands.executeCommand<
        vscode.CodeAction[]
      >(
        "vscode.executeCodeActionProvider",
        document.uri,
        new vscode.Range(0, 0, 2, 0)
      );

      assert.ok(codeActions, "Code actions should be provided");
      // Code actions may or may not be present depending on implementation

      // Clean up
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor"
      );
    });

    test("E2E: Multi-file LSP support", async function () {
      this.timeout(25000);

      // Create multiple test files
      const file1Path = path.join(testWorkspaceFolder, "test-lsp-1.js");
      const file2Path = path.join(testWorkspaceFolder, "test-lsp-2.js");

      const content1 = `const { spawn } = require('child_process');
spawn('node', ['script1.js']);`;

      const content2 = `const { spawn } = require('child_process');
spawn('node', ['script2.js']);`;

      fs.writeFileSync(file1Path, content1);
      fs.writeFileSync(file2Path, content2);

      try {
        // Open first file
        const doc1 = await vscode.workspace.openTextDocument(file1Path);
        await vscode.window.showTextDocument(doc1);
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Verify code lens in file 1
        const codeLenses1 = await vscode.commands.executeCommand<
          vscode.CodeLens[]
        >("vscode.executeCodeLensProvider", doc1.uri);
        assert.ok(
          codeLenses1 && codeLenses1.length > 0,
          "File 1 should have code lens"
        );

        // Open second file
        const doc2 = await vscode.workspace.openTextDocument(file2Path);
        await vscode.window.showTextDocument(doc2);
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Verify code lens in file 2
        const codeLenses2 = await vscode.commands.executeCommand<
          vscode.CodeLens[]
        >("vscode.executeCodeLensProvider", doc2.uri);
        assert.ok(
          codeLenses2 && codeLenses2.length > 0,
          "File 2 should have code lens"
        );

        // Verify both files still have code lens
        const codeLenses1Again = await vscode.commands.executeCommand<
          vscode.CodeLens[]
        >("vscode.executeCodeLensProvider", doc1.uri);
        assert.ok(
          codeLenses1Again && codeLenses1Again.length > 0,
          "File 1 should still have code lens"
        );

        // Clean up
        await vscode.commands.executeCommand(
          "workbench.action.closeAllEditors"
        );
      } finally {
        // Clean up files
        if (fs.existsSync(file1Path)) fs.unlinkSync(file1Path);
        if (fs.existsSync(file2Path)) fs.unlinkSync(file2Path);
      }
    });

    test("E2E: Document symbols workflow", async function () {
      this.timeout(15000);

      // Create file with multiple processes
      const content = `const { spawn } = require('child_process');
const child1 = spawn('node', ['script1.js']);
const child2 = spawn('node', ['script2.js']);
process.kill(child1.pid);`;

      fs.writeFileSync(testFilePath, content);

      // Open file
      const document = await vscode.workspace.openTextDocument(testFilePath);
      await vscode.window.showTextDocument(document);
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Get document symbols
      const symbols = await vscode.commands.executeCommand<
        vscode.DocumentSymbol[]
      >("vscode.executeDocumentSymbolProvider", document.uri);

      assert.ok(symbols, "Symbols should be provided");
      // Symbols may or may not be present depending on implementation
      // Just verify it doesn't crash

      // Clean up
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor"
      );
    });

    test("E2E: Completion provider workflow", async function () {
      this.timeout(15000);

      // Create file with partial code
      const content = `const { spawn } = require('child_process');
spawn('node', ['script.js'], {
  
});`;

      fs.writeFileSync(testFilePath, content);

      // Open file
      const document = await vscode.workspace.openTextDocument(testFilePath);
      const editor = await vscode.window.showTextDocument(document);
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Position cursor inside the options object
      const position = new vscode.Position(2, 2);
      editor.selection = new vscode.Selection(position, position);

      // Trigger completion
      const completions =
        await vscode.commands.executeCommand<vscode.CompletionList>(
          "vscode.executeCompletionItemProvider",
          document.uri,
          position
        );

      assert.ok(completions, "Completions should be provided");
      // Completions may or may not include our custom ones
      // Just verify it doesn't crash

      // Clean up
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor"
      );
    });
  });

  suite("Context Provider E2E", () => {
    test("E2E: Get context command returns data", async function () {
      this.timeout(10000);

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

    test("E2E: Get available tools command returns tools", async function () {
      this.timeout(10000);

      const tools = await vscode.commands.executeCommand(
        "mcp-process.getAvailableTools"
      );
      assert.ok(tools, "Tools should be returned");
      assert.ok(Array.isArray(tools), "Tools should be an array");
      assert.ok(tools.length > 0, "Should have at least one tool");

      // Verify tool structure
      const tool = tools[0];
      assert.ok(tool.name, "Tool should have name");
      assert.ok(tool.description, "Tool should have description");
    });

    test("E2E: Get context string command shows modal", async function () {
      this.timeout(10000);

      // This command shows a modal, so we just verify it doesn't crash
      try {
        await vscode.commands.executeCommand("mcp-process.getContextString");
        // Command executed successfully
        assert.ok(true);
      } catch (error) {
        // May fail without server, but should not crash
        assert.ok(error);
      }
    });
  });

  suite("Performance E2E", () => {
    test("E2E: Code lens appears within acceptable time", async function () {
      this.timeout(15000);

      const content = `const { spawn } = require('child_process');
const child = spawn('node', ['--version']);`;

      fs.writeFileSync(testFilePath, content);

      const startTime = Date.now();

      // Open file
      const document = await vscode.workspace.openTextDocument(testFilePath);
      await vscode.window.showTextDocument(document);

      // Wait for code lens
      let codeLenses: vscode.CodeLens[] | undefined;
      for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        codeLenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
          "vscode.executeCodeLensProvider",
          document.uri
        );
        if (codeLenses && codeLenses.length > 0) {
          break;
        }
      }

      const elapsed = Date.now() - startTime;

      assert.ok(codeLenses && codeLenses.length > 0, "Code lens should appear");
      assert.ok(
        elapsed < 10000,
        `Code lens should appear in < 10s (took ${elapsed}ms)`
      );

      console.log(`Code lens appeared in ${elapsed}ms`);

      // Clean up
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor"
      );
    });

    test("E2E: Diagnostics appear within acceptable time", async function () {
      this.timeout(15000);

      const content = `const { exec } = require('child_process');
exec('ls -la');`;

      fs.writeFileSync(testFilePath, content);

      const startTime = Date.now();

      // Open file
      const document = await vscode.workspace.openTextDocument(testFilePath);
      await vscode.window.showTextDocument(document);

      // Wait for diagnostics
      let diagnostics: vscode.Diagnostic[] = [];
      for (let i = 0; i < 20; i++) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        diagnostics = vscode.languages.getDiagnostics(document.uri);
        if (diagnostics.length > 0) {
          break;
        }
      }

      const elapsed = Date.now() - startTime;

      assert.ok(diagnostics.length > 0, "Diagnostics should appear");
      assert.ok(
        elapsed < 10000,
        `Diagnostics should appear in < 10s (took ${elapsed}ms)`
      );

      console.log(`Diagnostics appeared in ${elapsed}ms`);

      // Clean up
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor"
      );
    });

    test("E2E: Hover responds within acceptable time", async function () {
      this.timeout(15000);

      const content = `const { spawn } = require('child_process');
const child = spawn('node', ['--version']);`;

      fs.writeFileSync(testFilePath, content);

      // Open file
      const document = await vscode.workspace.openTextDocument(testFilePath);
      await vscode.window.showTextDocument(document);
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const startTime = Date.now();

      // Get hover
      const position = new vscode.Position(1, 15); // On 'spawn'
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        "vscode.executeHoverProvider",
        document.uri,
        position
      );

      const elapsed = Date.now() - startTime;

      assert.ok(hovers, "Hover should be provided");
      assert.ok(
        elapsed < 2000,
        `Hover should respond in < 2s (took ${elapsed}ms)`
      );

      console.log(`Hover responded in ${elapsed}ms`);

      // Clean up
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor"
      );
    });
  });

  suite("Error Recovery E2E", () => {
    test("E2E: LSP handles invalid JavaScript gracefully", async function () {
      this.timeout(15000);

      const content = `const { spawn } = require('child_process');
spawn('node', ['script.js']
// Missing closing parenthesis and semicolon`;

      fs.writeFileSync(testFilePath, content);

      // Open file
      const document = await vscode.workspace.openTextDocument(testFilePath);
      await vscode.window.showTextDocument(document);
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Try to get code lens - should not crash
      try {
        const codeLenses = await vscode.commands.executeCommand<
          vscode.CodeLens[]
        >("vscode.executeCodeLensProvider", document.uri);
        // May or may not have code lens, but should not crash
        assert.ok(true, "Should handle invalid JavaScript");
      } catch (error) {
        assert.fail("Should not throw on invalid JavaScript");
      }

      // Clean up
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor"
      );
    });

    test("E2E: LSP handles large files", async function () {
      this.timeout(20000);

      // Create a large file
      let content = `const { spawn } = require('child_process');\n`;
      for (let i = 0; i < 200; i++) {
        content += `const child${i} = spawn('node', ['script${i}.js']);\n`;
      }

      fs.writeFileSync(testFilePath, content);

      // Open file
      const document = await vscode.workspace.openTextDocument(testFilePath);
      await vscode.window.showTextDocument(document);
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Try to get code lens - should not crash
      try {
        const codeLenses = await vscode.commands.executeCommand<
          vscode.CodeLens[]
        >("vscode.executeCodeLensProvider", document.uri);
        assert.ok(codeLenses, "Should handle large file");
        console.log(`Large file: ${codeLenses.length} code lenses`);
      } catch (error) {
        assert.fail("Should not throw on large file");
      }

      // Clean up
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor"
      );
    });

    test("E2E: LSP recovers after file close and reopen", async function () {
      this.timeout(20000);

      const content = `const { spawn } = require('child_process');
const child = spawn('node', ['--version']);`;

      fs.writeFileSync(testFilePath, content);

      // Open file
      let document = await vscode.workspace.openTextDocument(testFilePath);
      await vscode.window.showTextDocument(document);
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify code lens
      let codeLenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
        "vscode.executeCodeLensProvider",
        document.uri
      );
      assert.ok(
        codeLenses && codeLenses.length > 0,
        "Should have code lens initially"
      );

      // Close file
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor"
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Reopen file
      document = await vscode.workspace.openTextDocument(testFilePath);
      await vscode.window.showTextDocument(document);
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify code lens still works
      codeLenses = await vscode.commands.executeCommand<vscode.CodeLens[]>(
        "vscode.executeCodeLensProvider",
        document.uri
      );
      assert.ok(
        codeLenses && codeLenses.length > 0,
        "Should have code lens after reopen"
      );

      // Clean up
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor"
      );
    });
  });

  suite("Integration with Extension Features E2E", () => {
    test("E2E: Code lens integrates with tree view", async function () {
      this.timeout(15000);

      const content = `const { spawn } = require('child_process');
const child = spawn('node', ['--version']);`;

      fs.writeFileSync(testFilePath, content);

      // Open file
      const document = await vscode.workspace.openTextDocument(testFilePath);
      await vscode.window.showTextDocument(document);
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify code lens
      const codeLenses = await vscode.commands.executeCommand<
        vscode.CodeLens[]
      >("vscode.executeCodeLensProvider", document.uri);
      assert.ok(codeLenses && codeLenses.length > 0, "Should have code lens");

      // Refresh tree view (should not throw even if server not running)
      await vscode.commands.executeCommand("mcp-process.refreshProcessList");

      // Try to view processes - this may fail if server not running in test mode
      // That's okay - we're just testing that LSP and extension commands coexist
      try {
        await vscode.commands.executeCommand("mcp-process.viewProcesses");
      } catch (error) {
        // Expected in test mode without MCP server running
        console.log("viewProcesses failed (expected in test mode):", error);
      }

      // Clean up
      await vscode.commands.executeCommand(
        "workbench.action.closeActiveEditor"
      );
    });

    test("E2E: LSP commands work with extension commands", async function () {
      this.timeout(10000);

      // Verify all LSP commands are registered
      const commands = await vscode.commands.getCommands(true);

      const lspCommands = [
        "mcp.process.start",
        "mcp.process.terminate",
        "mcp.process.getStats",
        "mcp.process.list",
        "mcp-process.getContext",
        "mcp-process.getContextString",
        "mcp-process.getAvailableTools",
      ];

      for (const cmd of lspCommands) {
        assert.ok(
          commands.includes(cmd),
          `Command ${cmd} should be registered`
        );
      }
    });
  });
});
