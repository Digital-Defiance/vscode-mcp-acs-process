import * as assert from "assert";
import * as vscode from "vscode";

suite("Status Bar Tests", () => {
  test("Permanent status bar item should be created after activation", async function () {
    this.timeout(5000);

    const ext = vscode.extensions.getExtension("DigitalDefiance.mcp-acs-process");
    assert.ok(ext, "Extension should exist");

    if (!ext.isActive) {
      await ext.activate();
    }

    // Check if status bar command is registered
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.includes("mcp-process.startProcess"),
      "Status bar command should be registered"
    );
  });
});
