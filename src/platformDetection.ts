/**
 * Platform Detection Module
 *
 * Detects the current platform and its capabilities for security features.
 * This module helps determine which platform-specific settings are available.
 */

import * as os from "os";
import * as fs from "fs";

/**
 * Supported platforms
 */
export type Platform = "windows" | "macos" | "linux" | "unknown";

/**
 * Platform capabilities for security features
 */
export interface PlatformCapabilities {
  // Platform identification
  platform: Platform;
  platformName: string;
  architecture: string;
  release: string;

  // Isolation capabilities
  supportsChroot: boolean;
  supportsNamespaces: boolean;
  supportsSeccomp: boolean;
  supportsMAC: boolean; // SELinux or AppArmor

  // Resource limit capabilities
  supportsFileDescriptorLimits: boolean;
  supportsCpuLimits: boolean;
  supportsMemoryLimits: boolean;

  // Other capabilities
  supportsSetuidBlocking: boolean;
  supportsCapabilities: boolean; // Linux capabilities

  // MAC-specific details
  macType?: "selinux" | "apparmor" | null;
  macEnabled?: boolean;
}

/**
 * Platform metadata for exports
 */
export interface PlatformMetadata {
  platform: Platform;
  platformName: string;
  architecture: string;
  release: string;
  nodeVersion: string;
  timestamp: string;
}

/**
 * Detect the current platform
 */
export function detectPlatform(): Platform {
  const platform = process.platform;

  switch (platform) {
    case "win32":
      return "windows";
    case "darwin":
      return "macos";
    case "linux":
      return "linux";
    default:
      return "unknown";
  }
}

/**
 * Detect platform capabilities
 *
 * This function detects which security features are available on the current platform.
 */
export function detectPlatformCapabilities(): PlatformCapabilities {
  const platform = detectPlatform();
  const platformName = os.platform();
  const architecture = os.arch();
  const release = os.release();

  // Base capabilities object
  const capabilities: PlatformCapabilities = {
    platform,
    platformName,
    architecture,
    release,

    // Default all to false, then enable based on platform
    supportsChroot: false,
    supportsNamespaces: false,
    supportsSeccomp: false,
    supportsMAC: false,
    supportsFileDescriptorLimits: false,
    supportsCpuLimits: false,
    supportsMemoryLimits: false,
    supportsSetuidBlocking: false,
    supportsCapabilities: false,
    macType: null,
    macEnabled: false,
  };

  // Platform-specific capabilities
  switch (platform) {
    case "linux":
      capabilities.supportsChroot = true;
      capabilities.supportsNamespaces = checkLinuxNamespaceSupport();
      capabilities.supportsSeccomp = checkSeccompSupport();
      capabilities.supportsMAC = checkMACSupport();
      capabilities.supportsFileDescriptorLimits = true;
      capabilities.supportsCpuLimits = true;
      capabilities.supportsMemoryLimits = true;
      capabilities.supportsSetuidBlocking = true;
      capabilities.supportsCapabilities = true;

      // Detect MAC type
      const macInfo = detectMACType();
      capabilities.macType = macInfo.type;
      capabilities.macEnabled = macInfo.enabled;
      break;

    case "macos":
      capabilities.supportsChroot = true;
      capabilities.supportsFileDescriptorLimits = true;
      capabilities.supportsCpuLimits = true;
      capabilities.supportsMemoryLimits = true;
      capabilities.supportsSetuidBlocking = true;
      // macOS doesn't support Linux namespaces, seccomp, or SELinux/AppArmor
      break;

    case "windows":
      // Windows has limited support for Unix-style security features
      capabilities.supportsCpuLimits = true;
      capabilities.supportsMemoryLimits = true;
      // Windows doesn't support chroot, namespaces, seccomp, MAC, or file descriptor limits
      break;

    case "unknown":
      // Unknown platform - assume no special capabilities
      break;
  }

  return capabilities;
}

/**
 * Check if Linux namespaces are supported
 *
 * Linux namespaces require kernel support. We check for the existence of
 * /proc/self/ns directory which indicates namespace support.
 */
function checkLinuxNamespaceSupport(): boolean {
  try {
    // Check if /proc/self/ns exists (indicates namespace support)
    return fs.existsSync("/proc/self/ns");
  } catch {
    return false;
  }
}

/**
 * Check if seccomp is supported
 *
 * Seccomp requires kernel support. We check for the existence of
 * /proc/self/status and look for Seccomp field.
 */
function checkSeccompSupport(): boolean {
  try {
    // Check if /proc/self/status exists and contains Seccomp field
    if (fs.existsSync("/proc/self/status")) {
      const status = fs.readFileSync("/proc/self/status", "utf8");
      return status.includes("Seccomp:");
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Check if Mandatory Access Control (MAC) is supported
 *
 * This checks for SELinux or AppArmor support on Linux.
 */
function checkMACSupport(): boolean {
  const macInfo = detectMACType();
  return macInfo.type !== null;
}

/**
 * Detect the type of MAC system in use
 *
 * Returns the MAC type (selinux or apparmor) and whether it's enabled.
 */
function detectMACType(): {
  type: "selinux" | "apparmor" | null;
  enabled: boolean;
} {
  // Check for SELinux
  try {
    if (fs.existsSync("/sys/fs/selinux")) {
      // SELinux is present, check if it's enabled
      if (fs.existsSync("/sys/fs/selinux/enforce")) {
        const enforce = fs
          .readFileSync("/sys/fs/selinux/enforce", "utf8")
          .trim();
        return {
          type: "selinux",
          enabled: enforce === "1",
        };
      }
      return {
        type: "selinux",
        enabled: false,
      };
    }
  } catch {
    // Ignore errors
  }

  // Check for AppArmor
  try {
    if (fs.existsSync("/sys/kernel/security/apparmor")) {
      // AppArmor is present, check if it's enabled
      if (fs.existsSync("/sys/module/apparmor/parameters/enabled")) {
        const enabled = fs
          .readFileSync("/sys/module/apparmor/parameters/enabled", "utf8")
          .trim();
        return {
          type: "apparmor",
          enabled: enabled === "Y",
        };
      }
      return {
        type: "apparmor",
        enabled: true, // Assume enabled if directory exists
      };
    }
  } catch {
    // Ignore errors
  }

  return {
    type: null,
    enabled: false,
  };
}

/**
 * Generate platform metadata for exports
 *
 * This metadata is included in exported configurations to help identify
 * platform-specific settings when importing.
 */
export function generatePlatformMetadata(): PlatformMetadata {
  const platform = detectPlatform();
  const platformName = os.platform();
  const architecture = os.arch();
  const release = os.release();
  const nodeVersion = process.version;
  const timestamp = new Date().toISOString();

  return {
    platform,
    platformName,
    architecture,
    release,
    nodeVersion,
    timestamp,
  };
}

/**
 * Check if a setting is supported on the current platform
 *
 * This function checks if a specific setting is supported based on the
 * current platform's capabilities.
 *
 * @param settingPath The VS Code setting path (e.g., "security.advanced.enableChroot")
 * @param capabilities Optional capabilities object (defaults to current platform)
 * @returns true if the setting is supported, false otherwise
 */
export function isSettingSupported(
  settingPath: string,
  capabilities?: PlatformCapabilities
): boolean {
  const caps = capabilities || detectPlatformCapabilities();

  // Map settings to capability checks
  const settingCapabilityMap: Record<string, boolean> = {
    "security.advanced.enableChroot": caps.supportsChroot,
    "security.advanced.chrootDirectory": caps.supportsChroot,
    "security.advanced.enableNamespaces": caps.supportsNamespaces,
    "security.advanced.namespacesPid": caps.supportsNamespaces,
    "security.advanced.namespacesNetwork": caps.supportsNamespaces,
    "security.advanced.namespacesMount": caps.supportsNamespaces,
    "security.advanced.namespacesUts": caps.supportsNamespaces,
    "security.advanced.namespacesIpc": caps.supportsNamespaces,
    "security.advanced.namespacesUser": caps.supportsNamespaces,
    "security.advanced.enableSeccomp": caps.supportsSeccomp,
    "security.advanced.seccompProfile": caps.supportsSeccomp,
    "security.advanced.enableMAC": caps.supportsMAC,
    "security.advanced.macProfile": caps.supportsMAC,
    "security.advanced.dropCapabilities": caps.supportsCapabilities,
    "security.advanced.readOnlyFilesystem": caps.supportsChroot, // Requires Unix-like system
    "security.advanced.tmpfsSize": caps.supportsChroot, // Requires Unix-like system
    "resources.defaultMaxFileDescriptors": caps.supportsFileDescriptorLimits,
    "executable.blockSetuidExecutables": caps.supportsSetuidBlocking,
  };

  // Check if the setting has a capability requirement
  if (settingPath in settingCapabilityMap) {
    return settingCapabilityMap[settingPath];
  }

  // If no specific capability requirement, assume supported
  return true;
}

/**
 * Get a list of unsupported settings on the current platform
 *
 * @param capabilities Optional capabilities object (defaults to current platform)
 * @returns Array of setting paths that are not supported
 */
export function getUnsupportedSettings(
  capabilities?: PlatformCapabilities
): string[] {
  const caps = capabilities || detectPlatformCapabilities();
  const unsupportedSettings: string[] = [];

  // List of all platform-specific settings
  const platformSpecificSettings = [
    "security.advanced.enableChroot",
    "security.advanced.chrootDirectory",
    "security.advanced.enableNamespaces",
    "security.advanced.namespacesPid",
    "security.advanced.namespacesNetwork",
    "security.advanced.namespacesMount",
    "security.advanced.namespacesUts",
    "security.advanced.namespacesIpc",
    "security.advanced.namespacesUser",
    "security.advanced.enableSeccomp",
    "security.advanced.seccompProfile",
    "security.advanced.enableMAC",
    "security.advanced.macProfile",
    "security.advanced.dropCapabilities",
    "security.advanced.readOnlyFilesystem",
    "security.advanced.tmpfsSize",
    "resources.defaultMaxFileDescriptors",
    "executable.blockSetuidExecutables",
  ];

  // Check each setting
  for (const setting of platformSpecificSettings) {
    if (!isSettingSupported(setting, caps)) {
      unsupportedSettings.push(setting);
    }
  }

  return unsupportedSettings;
}

/**
 * Get a human-readable description of why a setting is not supported
 *
 * @param settingPath The VS Code setting path
 * @param capabilities Optional capabilities object (defaults to current platform)
 * @returns Description of why the setting is not supported, or null if it is supported
 */
export function getUnsupportedReason(
  settingPath: string,
  capabilities?: PlatformCapabilities
): string | null {
  const caps = capabilities || detectPlatformCapabilities();

  if (isSettingSupported(settingPath, caps)) {
    return null;
  }

  // Map settings to reasons
  const reasonMap: Record<string, string> = {
    "security.advanced.enableChroot": `Chroot is not supported on ${caps.platformName}. This feature requires Unix/Linux.`,
    "security.advanced.chrootDirectory": `Chroot is not supported on ${caps.platformName}. This feature requires Unix/Linux.`,
    "security.advanced.enableNamespaces": `Linux namespaces are not supported on ${caps.platformName}. This feature requires Linux.`,
    "security.advanced.namespacesPid": `Linux namespaces are not supported on ${caps.platformName}. This feature requires Linux.`,
    "security.advanced.namespacesNetwork": `Linux namespaces are not supported on ${caps.platformName}. This feature requires Linux.`,
    "security.advanced.namespacesMount": `Linux namespaces are not supported on ${caps.platformName}. This feature requires Linux.`,
    "security.advanced.namespacesUts": `Linux namespaces are not supported on ${caps.platformName}. This feature requires Linux.`,
    "security.advanced.namespacesIpc": `Linux namespaces are not supported on ${caps.platformName}. This feature requires Linux.`,
    "security.advanced.namespacesUser": `Linux namespaces are not supported on ${caps.platformName}. This feature requires Linux.`,
    "security.advanced.enableSeccomp": `Seccomp is not supported on ${caps.platformName}. This feature requires Linux.`,
    "security.advanced.seccompProfile": `Seccomp is not supported on ${caps.platformName}. This feature requires Linux.`,
    "security.advanced.enableMAC": `Mandatory Access Control (SELinux/AppArmor) is not supported on ${caps.platformName}. This feature requires Linux.`,
    "security.advanced.macProfile": `Mandatory Access Control (SELinux/AppArmor) is not supported on ${caps.platformName}. This feature requires Linux.`,
    "security.advanced.dropCapabilities": `Linux capabilities are not supported on ${caps.platformName}. This feature requires Linux.`,
    "security.advanced.readOnlyFilesystem": `Read-only filesystem is not supported on ${caps.platformName}. This feature requires Unix/Linux.`,
    "security.advanced.tmpfsSize": `Tmpfs is not supported on ${caps.platformName}. This feature requires Unix/Linux.`,
    "resources.defaultMaxFileDescriptors": `File descriptor limits are not supported on ${caps.platformName}. This feature requires Unix/Linux.`,
    "executable.blockSetuidExecutables": `Setuid blocking is not supported on ${caps.platformName}. This feature requires Unix/Linux.`,
  };

  return (
    reasonMap[settingPath] ||
    `This setting is not supported on ${caps.platformName}.`
  );
}
