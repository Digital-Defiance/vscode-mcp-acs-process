/**
 * Helper to create a properly typed LogOutputChannel for tests
 *
 * VS Code's test environment may not provide all LogOutputChannel methods,
 * so we wrap it to ensure compatibility with BaseMCPClient's expectations.
 */

import * as vscode from "vscode";
import { LogOutputChannel } from "@ai-capabilities-suite/mcp-client-base";

/**
 * Create a test-compatible LogOutputChannel
 *
 * Wraps vscode.LogOutputChannel to ensure all required methods exist,
 * even if the test environment doesn't provide them.
 */
export function createTestOutputChannel(name: string): LogOutputChannel {
  const channel = vscode.window.createOutputChannel(name, { log: true });

  // Ensure all required methods exist
  const wrappedChannel: LogOutputChannel = {
    trace: (message: string, ...args: unknown[]) => {
      if (typeof (channel as any).trace === "function") {
        (channel as any).trace(message, ...args);
      } else {
        channel.appendLine(`[TRACE] ${message}`);
      }
    },
    debug: (message: string, ...args: unknown[]) => {
      if (typeof (channel as any).debug === "function") {
        (channel as any).debug(message, ...args);
      } else {
        channel.appendLine(`[DEBUG] ${message}`);
      }
    },
    info: (message: string, ...args: unknown[]) => {
      if (typeof (channel as any).info === "function") {
        (channel as any).info(message, ...args);
      } else {
        channel.appendLine(`[INFO] ${message}`);
      }
    },
    warn: (message: string, ...args: unknown[]) => {
      if (typeof (channel as any).warn === "function") {
        (channel as any).warn(message, ...args);
      } else {
        channel.appendLine(`[WARN] ${message}`);
      }
    },
    error: (message: string | Error, ...args: unknown[]) => {
      if (typeof (channel as any).error === "function") {
        (channel as any).error(message, ...args);
      } else {
        const errorMsg = message instanceof Error ? message.message : message;
        channel.appendLine(`[ERROR] ${errorMsg}`);
      }
    },
    append: (value: string) => channel.append(value),
    appendLine: (value: string) => channel.appendLine(value),
    clear: () => channel.clear(),
    show: (preserveFocus?: boolean) => channel.show(preserveFocus),
    hide: () => channel.hide(),
    dispose: () => channel.dispose(),
  };

  return wrappedChannel;
}
