/**
 * Error Handling Module for MCP Process Manager VS Code Extension
 *
 * This module provides comprehensive error handling for:
 * - Validation errors (invalid settings)
 * - File operation errors (config file I/O)
 * - Server communication errors (connection, timeout, version mismatch)
 */

import * as vscode from "vscode";
import { ValidationError, ValidationWarning } from "./settingsManager";

/**
 * Error types for categorization
 */
export enum ErrorType {
  Validation = "validation",
  FileOperation = "file_operation",
  ServerCommunication = "server_communication",
  Unknown = "unknown",
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  Error = "error",
  Warning = "warning",
  Info = "info",
}

/**
 * Structured error information
 */
export interface ErrorInfo {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  suggestion?: string;
  details?: string;
  originalError?: Error;
}

/**
 * File operation error types
 */
export enum FileErrorType {
  NotFound = "not_found",
  ParseError = "parse_error",
  PermissionDenied = "permission_denied",
  WriteError = "write_error",
  Unknown = "unknown",
}

/**
 * Server communication error types
 */
export enum ServerErrorType {
  NotRunning = "not_running",
  ConnectionTimeout = "connection_timeout",
  InvalidResponse = "invalid_response",
  VersionMismatch = "version_mismatch",
  Unknown = "unknown",
}

/**
 * Validation Error Handler
 *
 * Handles validation errors by showing error notifications with helpful messages
 * and suggestions for fixes.
 */
export class ValidationErrorHandler {
  private outputChannel: vscode.LogOutputChannel;

  constructor(outputChannel: vscode.LogOutputChannel) {
    this.outputChannel = outputChannel;
  }

  /**
   * Handle a single validation error
   *
   * Shows an error notification with the error message and suggestion.
   * Prevents invalid values from being saved by guiding the user to fix the issue.
   */
  public async handleValidationError(error: ValidationError): Promise<void> {
    this.outputChannel.appendLine(
      `Validation error in ${error.setting}: ${error.message}`
    );

    const message = `Invalid setting: ${error.setting}\n\n${error.message}`;
    const actions: string[] = ["Open Settings"];

    if (error.suggestion) {
      actions.unshift("Show Suggestion");
    }

    const selection = await vscode.window.showErrorMessage(
      message,
      { modal: false },
      ...actions
    );

    if (selection === "Show Suggestion" && error.suggestion) {
      await vscode.window.showInformationMessage(
        `Suggestion: ${error.suggestion}`,
        { modal: false }
      );
    } else if (selection === "Open Settings") {
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        `@ext:DigitalDefiance.mcp-acs-process ${error.setting}`
      );
    }
  }

  /**
   * Handle multiple validation errors
   *
   * Shows a summary notification and displays all errors in the output channel.
   */
  public async handleValidationErrors(
    errors: ValidationError[]
  ): Promise<void> {
    if (errors.length === 0) {
      return;
    }

    this.outputChannel.appendLine(
      `Found ${errors.length} validation error(s):`
    );

    for (const error of errors) {
      this.outputChannel.appendLine(`  - ${error.setting}: ${error.message}`);
      if (error.suggestion) {
        this.outputChannel.appendLine(`    Suggestion: ${error.suggestion}`);
      }
    }

    const message =
      errors.length === 1
        ? `Configuration has 1 validation error. See output for details.`
        : `Configuration has ${errors.length} validation errors. See output for details.`;

    const selection = await vscode.window.showErrorMessage(
      message,
      { modal: false },
      "Show Output",
      "Open Settings"
    );

    if (selection === "Show Output") {
      this.outputChannel.show();
    } else if (selection === "Open Settings") {
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "@ext:DigitalDefiance.mcp-acs-process"
      );
    }
  }

  /**
   * Handle validation warnings
   *
   * Shows warnings to the user without blocking operations.
   */
  public async handleValidationWarnings(
    warnings: ValidationWarning[]
  ): Promise<void> {
    if (warnings.length === 0) {
      return;
    }

    this.outputChannel.appendLine(
      `Found ${warnings.length} validation warning(s):`
    );

    for (const warning of warnings) {
      this.outputChannel.appendLine(
        `  - [${warning.severity.toUpperCase()}] ${warning.setting}: ${
          warning.message
        }`
      );
    }

    // Only show notification for high severity warnings
    const highSeverityWarnings = warnings.filter((w) => w.severity === "high");

    if (highSeverityWarnings.length > 0) {
      const message =
        highSeverityWarnings.length === 1
          ? `Configuration has 1 high-severity warning. See output for details.`
          : `Configuration has ${highSeverityWarnings.length} high-severity warnings. See output for details.`;

      const selection = await vscode.window.showWarningMessage(
        message,
        { modal: false },
        "Show Output",
        "Dismiss"
      );

      if (selection === "Show Output") {
        this.outputChannel.show();
      }
    }
  }

  /**
   * Show validation error notification that prevents saving
   *
   * This is used when a user tries to save an invalid value.
   * The notification explains why the value is invalid and how to fix it.
   */
  public async showInvalidValueNotification(
    setting: string,
    value: any,
    reason: string,
    suggestion?: string
  ): Promise<void> {
    this.outputChannel.appendLine(
      `Invalid value for ${setting}: ${JSON.stringify(value)} - ${reason}`
    );

    let message = `Cannot save invalid value for ${setting}:\n\n${reason}`;

    if (suggestion) {
      message += `\n\nSuggestion: ${suggestion}`;
    }

    await vscode.window.showErrorMessage(message, { modal: false }, "OK");
  }
}

/**
 * File Operation Error Handler
 *
 * Handles errors related to configuration file operations.
 */
export class FileOperationErrorHandler {
  private outputChannel: vscode.LogOutputChannel;

  constructor(outputChannel: vscode.LogOutputChannel) {
    this.outputChannel = outputChannel;
  }

  /**
   * Classify a file operation error
   */
  private classifyFileError(error: Error): FileErrorType {
    const message = error.message.toLowerCase();

    if (
      message.includes("enoent") ||
      message.includes("not found") ||
      message.includes("no such file")
    ) {
      return FileErrorType.NotFound;
    }

    if (
      message.includes("json") ||
      message.includes("parse") ||
      message.includes("syntax")
    ) {
      return FileErrorType.ParseError;
    }

    if (
      message.includes("eacces") ||
      message.includes("permission") ||
      message.includes("access denied")
    ) {
      return FileErrorType.PermissionDenied;
    }

    if (
      message.includes("enospc") ||
      message.includes("write") ||
      message.includes("disk full")
    ) {
      return FileErrorType.WriteError;
    }

    return FileErrorType.Unknown;
  }

  /**
   * Handle config file not found error
   *
   * Offers to create a default configuration file.
   */
  public async handleFileNotFound(
    filePath: string,
    error: Error
  ): Promise<boolean> {
    this.outputChannel.appendLine(`Configuration file not found: ${filePath}`);

    const message = `Configuration file not found:\n${filePath}\n\nWould you like to create a default configuration file?`;

    const selection = await vscode.window.showErrorMessage(
      message,
      { modal: true },
      "Create Default Config",
      "Use VS Code Settings",
      "Cancel"
    );

    if (selection === "Create Default Config") {
      return true; // Caller should create the file
    } else if (selection === "Use VS Code Settings") {
      // Guide user to use VS Code settings instead
      await vscode.window
        .showInformationMessage(
          "You can configure all settings through VS Code Settings UI. " +
            "The extension will automatically generate the server configuration from your settings.",
          { modal: false },
          "Open Settings"
        )
        .then((result) => {
          if (result === "Open Settings") {
            vscode.commands.executeCommand(
              "workbench.action.openSettings",
              "@ext:DigitalDefiance.mcp-acs-process"
            );
          }
        });
    }

    return false;
  }

  /**
   * Handle JSON parse error
   *
   * Shows the error with line number if available and suggests fixes.
   */
  public async handleParseError(filePath: string, error: Error): Promise<void> {
    this.outputChannel.appendLine(
      `Failed to parse configuration file: ${filePath}`
    );
    this.outputChannel.appendLine(`Error: ${error.message}`);

    // Try to extract line number from error message
    const lineMatch = error.message.match(/line (\d+)/i);
    const lineNumber = lineMatch ? lineMatch[1] : null;

    let message = `Failed to parse configuration file:\n${filePath}\n\n${error.message}`;

    if (lineNumber) {
      message += `\n\nError at line ${lineNumber}`;
    }

    message += "\n\nCommon JSON errors:\n";
    message += "• Missing or extra commas\n";
    message += "• Unquoted property names\n";
    message += "• Trailing commas in arrays/objects\n";
    message += "• Unclosed brackets or braces";

    const selection = await vscode.window.showErrorMessage(
      message,
      { modal: true },
      "Open File",
      "Validate JSON Online",
      "Cancel"
    );

    if (selection === "Open File") {
      const document = await vscode.workspace.openTextDocument(filePath);
      const editor = await vscode.window.showTextDocument(document);

      // Jump to error line if available
      if (lineNumber) {
        const line = parseInt(lineNumber) - 1;
        const position = new vscode.Position(line, 0);
        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
          new vscode.Range(position, position),
          vscode.TextEditorRevealType.InCenter
        );
      }
    } else if (selection === "Validate JSON Online") {
      await vscode.env.openExternal(vscode.Uri.parse("https://jsonlint.com/"));
    }
  }

  /**
   * Handle permission error
   *
   * Suggests fixes for permission issues.
   */
  public async handlePermissionError(
    filePath: string,
    error: Error,
    operation: "read" | "write"
  ): Promise<void> {
    this.outputChannel.appendLine(
      `Permission denied for ${operation} operation: ${filePath}`
    );
    this.outputChannel.appendLine(`Error: ${error.message}`);

    const message =
      `Permission denied when trying to ${operation} configuration file:\n${filePath}\n\n` +
      `Possible solutions:\n` +
      `• Check file permissions (should be readable/writable by your user)\n` +
      `• Try running VS Code with appropriate permissions\n` +
      `• Move the configuration file to a location you have access to\n` +
      `• Use VS Code Settings instead of external config file`;

    const selection = await vscode.window.showErrorMessage(
      message,
      { modal: true },
      "Use VS Code Settings",
      "Choose Different Location",
      "Cancel"
    );

    if (selection === "Use VS Code Settings") {
      // Update setting to not use config file
      const config = vscode.workspace.getConfiguration("mcp-process");
      await config.update(
        "server.useConfigFile",
        false,
        vscode.ConfigurationTarget.Global
      );

      await vscode.window.showInformationMessage(
        "Switched to VS Code Settings mode. You can now configure all settings through the Settings UI.",
        { modal: false }
      );
    } else if (selection === "Choose Different Location") {
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file("mcp-process-config.json"),
        filters: {
          "JSON Files": ["json"],
        },
        saveLabel: "Choose Config Location",
      });

      if (uri) {
        const config = vscode.workspace.getConfiguration("mcp-process");
        await config.update(
          "server.configPath",
          uri.fsPath,
          vscode.ConfigurationTarget.Global
        );

        await vscode.window.showInformationMessage(
          `Configuration file location updated to: ${uri.fsPath}`,
          { modal: false }
        );
      }
    }
  }

  /**
   * Handle write error
   *
   * Suggests alternative locations or actions.
   */
  public async handleWriteError(filePath: string, error: Error): Promise<void> {
    this.outputChannel.appendLine(
      `Failed to write configuration file: ${filePath}`
    );
    this.outputChannel.appendLine(`Error: ${error.message}`);

    const message =
      `Failed to write configuration file:\n${filePath}\n\n${error.message}\n\n` +
      `Possible solutions:\n` +
      `• Check available disk space\n` +
      `• Verify write permissions for the directory\n` +
      `• Try saving to a different location\n` +
      `• Use VS Code Settings instead of external config file`;

    const selection = await vscode.window.showErrorMessage(
      message,
      { modal: true },
      "Save to Different Location",
      "Use VS Code Settings",
      "Cancel"
    );

    if (selection === "Save to Different Location") {
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file("mcp-process-config.json"),
        filters: {
          "JSON Files": ["json"],
        },
        saveLabel: "Save Config File",
      });

      if (uri) {
        const config = vscode.workspace.getConfiguration("mcp-process");
        await config.update(
          "server.configPath",
          uri.fsPath,
          vscode.ConfigurationTarget.Global
        );

        await vscode.window.showInformationMessage(
          `Configuration file location updated to: ${uri.fsPath}. Please try the operation again.`,
          { modal: false }
        );
      }
    } else if (selection === "Use VS Code Settings") {
      const config = vscode.workspace.getConfiguration("mcp-process");
      await config.update(
        "server.useConfigFile",
        false,
        vscode.ConfigurationTarget.Global
      );

      await vscode.window.showInformationMessage(
        "Switched to VS Code Settings mode. Configuration will be managed through Settings UI.",
        { modal: false }
      );
    }
  }

  /**
   * Handle generic file operation error
   *
   * Routes to specific handlers based on error type.
   */
  public async handleFileError(
    filePath: string,
    error: Error,
    operation: "read" | "write" | "parse"
  ): Promise<boolean> {
    const errorType = this.classifyFileError(error);

    switch (errorType) {
      case FileErrorType.NotFound:
        return await this.handleFileNotFound(filePath, error);

      case FileErrorType.ParseError:
        await this.handleParseError(filePath, error);
        return false;

      case FileErrorType.PermissionDenied:
        await this.handlePermissionError(filePath, error, operation as any);
        return false;

      case FileErrorType.WriteError:
        await this.handleWriteError(filePath, error);
        return false;

      default:
        // Unknown error - show generic message
        this.outputChannel.appendLine(
          `File operation error (${operation}): ${filePath}`
        );
        this.outputChannel.appendLine(`Error: ${error.message}`);

        await vscode.window.showErrorMessage(
          `Failed to ${operation} configuration file:\n${filePath}\n\n${error.message}`,
          { modal: false },
          "OK"
        );
        return false;
    }
  }
}

/**
 * Server Communication Error Handler
 *
 * Handles errors related to MCP Process Server communication.
 */
export class ServerCommunicationErrorHandler {
  private outputChannel: vscode.LogOutputChannel;

  constructor(outputChannel: vscode.LogOutputChannel) {
    this.outputChannel = outputChannel;
  }

  /**
   * Classify a server communication error
   */
  private classifyServerError(error: Error): ServerErrorType {
    const message = error.message.toLowerCase();

    if (
      message.includes("not running") ||
      message.includes("not started") ||
      message.includes("econnrefused")
    ) {
      return ServerErrorType.NotRunning;
    }

    if (
      message.includes("timeout") ||
      message.includes("timed out") ||
      message.includes("etimedout")
    ) {
      return ServerErrorType.ConnectionTimeout;
    }

    if (
      message.includes("invalid response") ||
      message.includes("unexpected response") ||
      message.includes("malformed")
    ) {
      return ServerErrorType.InvalidResponse;
    }

    if (
      message.includes("version") ||
      message.includes("incompatible") ||
      message.includes("mismatch")
    ) {
      return ServerErrorType.VersionMismatch;
    }

    return ServerErrorType.Unknown;
  }

  /**
   * Handle server not running error
   *
   * Shows a notification with a button to start the server.
   */
  public async handleServerNotRunning(error: Error): Promise<void> {
    this.outputChannel.appendLine("MCP Process server is not running");
    this.outputChannel.appendLine(`Error: ${error.message}`);

    // In test mode, just throw the error instead of showing UI
    const isTestMode =
      process.env.VSCODE_TEST_MODE === "true" ||
      process.env.NODE_ENV === "test";

    if (isTestMode) {
      throw error;
    }

    const message =
      "MCP Process server is not running.\n\n" +
      "The server needs to be started before you can manage processes.";

    const selection = await vscode.window.showErrorMessage(
      message,
      { modal: false },
      "Start Server",
      "Check Auto-Start Setting",
      "Cancel"
    );

    if (selection === "Start Server") {
      // Trigger server start (caller should handle this)
      await vscode.commands.executeCommand("mcp-process.restartServer");
    } else if (selection === "Check Auto-Start Setting") {
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "@ext:DigitalDefiance.mcp-acs-process server.autoStart"
      );
    }
  }

  /**
   * Handle connection timeout error
   *
   * Suggests checking logs and restarting the server.
   */
  public async handleConnectionTimeout(error: Error): Promise<void> {
    this.outputChannel.appendLine("Connection to MCP Process server timed out");
    this.outputChannel.appendLine(`Error: ${error.message}`);

    // In test mode, just throw the error instead of showing UI
    const isTestMode =
      process.env.VSCODE_TEST_MODE === "true" ||
      process.env.NODE_ENV === "test";

    if (isTestMode) {
      throw error;
    }

    const message =
      "Connection to MCP Process server timed out.\n\n" +
      "The server may be unresponsive or overloaded.\n\n" +
      "Possible solutions:\n" +
      "• Check the server logs for errors\n" +
      "• Restart the server\n" +
      "• Check if the server process is running";

    const selection = await vscode.window.showErrorMessage(
      message,
      { modal: false },
      "Show Logs",
      "Restart Server",
      "Cancel"
    );

    if (selection === "Show Logs") {
      this.outputChannel.show();
    } else if (selection === "Restart Server") {
      await vscode.commands.executeCommand("mcp-process.restartServer");
    }
  }

  /**
   * Handle invalid response error
   *
   * Suggests restarting the server.
   */
  public async handleInvalidResponse(error: Error): Promise<void> {
    this.outputChannel.appendLine(
      "Received invalid response from MCP Process server"
    );
    this.outputChannel.appendLine(`Error: ${error.message}`);

    const message =
      "Received invalid response from MCP Process server.\n\n" +
      "The server may be in an inconsistent state.\n\n" +
      "Recommended action: Restart the server";

    const selection = await vscode.window.showErrorMessage(
      message,
      { modal: false },
      "Restart Server",
      "Show Logs",
      "Cancel"
    );

    if (selection === "Restart Server") {
      await vscode.commands.executeCommand("mcp-process.restartServer");
    } else if (selection === "Show Logs") {
      this.outputChannel.show();
    }
  }

  /**
   * Handle version mismatch error
   *
   * Shows a warning about incompatible versions.
   */
  public async handleVersionMismatch(
    error: Error,
    extensionVersion?: string,
    serverVersion?: string
  ): Promise<void> {
    this.outputChannel.appendLine(
      "Version mismatch between extension and server"
    );
    this.outputChannel.appendLine(`Error: ${error.message}`);

    if (extensionVersion && serverVersion) {
      this.outputChannel.appendLine(`Extension version: ${extensionVersion}`);
      this.outputChannel.appendLine(`Server version: ${serverVersion}`);
    }

    let message =
      "Version mismatch detected between the extension and MCP Process server.\n\n";

    if (extensionVersion && serverVersion) {
      message += `Extension version: ${extensionVersion}\n`;
      message += `Server version: ${serverVersion}\n\n`;
    }

    message +=
      "This may cause compatibility issues.\n\n" +
      "Recommended actions:\n" +
      "• Update the extension to the latest version\n" +
      "• Update the server to the latest version\n" +
      "• Ensure both are from the same release";

    const selection = await vscode.window.showWarningMessage(
      message,
      { modal: true },
      "Check for Updates",
      "Continue Anyway",
      "Show Logs"
    );

    if (selection === "Check for Updates") {
      await vscode.commands.executeCommand(
        "workbench.extensions.action.checkForUpdates"
      );
    } else if (selection === "Show Logs") {
      this.outputChannel.show();
    }
  }

  /**
   * Handle generic server communication error
   *
   * Routes to specific handlers based on error type.
   */
  public async handleServerError(error: Error): Promise<void> {
    const errorType = this.classifyServerError(error);

    switch (errorType) {
      case ServerErrorType.NotRunning:
        await this.handleServerNotRunning(error);
        break;

      case ServerErrorType.ConnectionTimeout:
        await this.handleConnectionTimeout(error);
        break;

      case ServerErrorType.InvalidResponse:
        await this.handleInvalidResponse(error);
        break;

      case ServerErrorType.VersionMismatch:
        await this.handleVersionMismatch(error);
        break;

      default:
        // Unknown error - show generic message
        this.outputChannel.appendLine(
          `Server communication error: ${error.message}`
        );

        await vscode.window
          .showErrorMessage(
            `Failed to communicate with MCP Process server:\n\n${error.message}\n\n` +
              `Try restarting the server or check the logs for more details.`,
            { modal: false },
            "Restart Server",
            "Show Logs"
          )
          .then((selection) => {
            if (selection === "Restart Server") {
              vscode.commands.executeCommand("mcp-process.restartServer");
            } else if (selection === "Show Logs") {
              this.outputChannel.show();
            }
          });
        break;
    }
  }
}

/**
 * Unified Error Handler
 *
 * Provides a single interface for handling all types of errors.
 */
export class ErrorHandler {
  private validationHandler: ValidationErrorHandler;
  private fileHandler: FileOperationErrorHandler;
  private serverHandler: ServerCommunicationErrorHandler;
  private outputChannel: vscode.LogOutputChannel;

  constructor(outputChannel: vscode.LogOutputChannel) {
    this.outputChannel = outputChannel;
    this.validationHandler = new ValidationErrorHandler(outputChannel);
    this.fileHandler = new FileOperationErrorHandler(outputChannel);
    this.serverHandler = new ServerCommunicationErrorHandler(outputChannel);
  }

  /**
   * Get the validation error handler
   */
  public get validation(): ValidationErrorHandler {
    return this.validationHandler;
  }

  /**
   * Get the file operation error handler
   */
  public get file(): FileOperationErrorHandler {
    return this.fileHandler;
  }

  /**
   * Get the server communication error handler
   */
  public get server(): ServerCommunicationErrorHandler {
    return this.serverHandler;
  }

  /**
   * Handle any error with automatic classification
   */
  public async handleError(
    error: Error | ErrorInfo,
    context?: string
  ): Promise<void> {
    if (context) {
      this.outputChannel.appendLine(
        `Error in ${context}: ${error.message || error}`
      );
    } else {
      this.outputChannel.appendLine(`Error: ${error.message || error}`);
    }

    // If it's already an ErrorInfo, use the type
    if ("type" in error && "severity" in error) {
      const errorInfo = error as ErrorInfo;

      switch (errorInfo.type) {
        case ErrorType.Validation:
          // Handle as validation error
          await this.validationHandler.handleValidationError({
            setting: context || "unknown",
            message: errorInfo.message,
            suggestion: errorInfo.suggestion,
          });
          break;

        case ErrorType.FileOperation:
          // Handle as file error
          if (errorInfo.originalError) {
            await this.fileHandler.handleFileError(
              context || "unknown",
              errorInfo.originalError,
              "read"
            );
          }
          break;

        case ErrorType.ServerCommunication:
          // Handle as server error
          if (errorInfo.originalError) {
            await this.serverHandler.handleServerError(errorInfo.originalError);
          }
          break;

        default:
          // Show generic error
          await vscode.window.showErrorMessage(
            errorInfo.message,
            { modal: false },
            "OK"
          );
          break;
      }
    } else {
      // Try to classify the error automatically
      const err = error as Error;
      const message = err.message.toLowerCase();

      if (
        message.includes("validation") ||
        message.includes("invalid") ||
        message.includes("must be")
      ) {
        await this.validationHandler.handleValidationError({
          setting: context || "unknown",
          message: err.message,
        });
      } else if (
        message.includes("file") ||
        message.includes("enoent") ||
        message.includes("eacces") ||
        message.includes("parse")
      ) {
        await this.fileHandler.handleFileError(
          context || "unknown",
          err,
          "read"
        );
      } else if (
        message.includes("server") ||
        message.includes("connection") ||
        message.includes("timeout")
      ) {
        await this.serverHandler.handleServerError(err);
      } else {
        // Generic error
        await vscode.window.showErrorMessage(
          `Error${context ? ` in ${context}` : ""}: ${err.message}`,
          { modal: false },
          "OK"
        );
      }
    }
  }
}
