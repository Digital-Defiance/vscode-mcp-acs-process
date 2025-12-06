/**
 * Platform Context Module
 *
 * Sets VS Code context keys for platform-specific features.
 * These context keys are used in package.json "when" clauses to show/hide settings.
 */

import * as vscode from "vscode";
import {
  detectPlatformCapabilities,
  PlatformCapabilities,
} from "./platformDetection";

/**
 * Context keys for platform capabilities
 */
export const CONTEXT_KEYS = {
  PLATFORM: "mcp-process.platform",
  SUPPORTS_CHROOT: "mcp-process.supportsChroot",
  SUPPORTS_NAMESPACES: "mcp-process.supportsNamespaces",
  SUPPORTS_SECCOMP: "mcp-process.supportsSeccomp",
  SUPPORTS_MAC: "mcp-process.supportsMAC",
  SUPPORTS_FILE_DESCRIPTOR_LIMITS: "mcp-process.supportsFileDescriptorLimits",
  SUPPORTS_SETUID_BLOCKING: "mcp-process.supportsSetuidBlocking",
  SUPPORTS_CAPABILITIES: "mcp-process.supportsCapabilities",
} as const;

/**
 * Set platform context keys in VS Code
 *
 * This function sets context keys that can be used in package.json "when" clauses
 * to conditionally show/hide settings based on platform capabilities.
 *
 * @param capabilities Optional capabilities object (defaults to current platform)
 */
export async function setPlatformContext(
  capabilities?: PlatformCapabilities
): Promise<void> {
  const caps = capabilities || detectPlatformCapabilities();

  // Set all context keys
  await vscode.commands.executeCommand(
    "setContext",
    CONTEXT_KEYS.PLATFORM,
    caps.platform
  );

  await vscode.commands.executeCommand(
    "setContext",
    CONTEXT_KEYS.SUPPORTS_CHROOT,
    caps.supportsChroot
  );

  await vscode.commands.executeCommand(
    "setContext",
    CONTEXT_KEYS.SUPPORTS_NAMESPACES,
    caps.supportsNamespaces
  );

  await vscode.commands.executeCommand(
    "setContext",
    CONTEXT_KEYS.SUPPORTS_SECCOMP,
    caps.supportsSeccomp
  );

  await vscode.commands.executeCommand(
    "setContext",
    CONTEXT_KEYS.SUPPORTS_MAC,
    caps.supportsMAC
  );

  await vscode.commands.executeCommand(
    "setContext",
    CONTEXT_KEYS.SUPPORTS_FILE_DESCRIPTOR_LIMITS,
    caps.supportsFileDescriptorLimits
  );

  await vscode.commands.executeCommand(
    "setContext",
    CONTEXT_KEYS.SUPPORTS_SETUID_BLOCKING,
    caps.supportsSetuidBlocking
  );

  await vscode.commands.executeCommand(
    "setContext",
    CONTEXT_KEYS.SUPPORTS_CAPABILITIES,
    caps.supportsCapabilities
  );
}

/**
 * Clear all platform context keys
 */
export async function clearPlatformContext(): Promise<void> {
  for (const key of Object.values(CONTEXT_KEYS)) {
    await vscode.commands.executeCommand("setContext", key, undefined);
  }
}
