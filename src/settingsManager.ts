/**
 * Settings Manager for MCP Process Manager VS Code Extension
 *
 * This module manages the synchronization between VS Code settings and the MCP Process Server configuration.
 * It reads settings from VS Code's configuration system and generates the SecurityConfig object
 * that the server expects.
 */

import * as vscode from "vscode";
import {
  detectPlatformCapabilities,
  generatePlatformMetadata,
  PlatformCapabilities,
  PlatformMetadata,
} from "./platformDetection";

/**
 * Resource limits for process execution
 */
export interface ResourceLimits {
  maxCpuPercent?: number;
  maxMemoryMB?: number;
  maxFileDescriptors?: number;
  maxCpuTime?: number;
  maxProcesses?: number;
}

/**
 * Security configuration for MCP Process Server
 */
export interface SecurityConfig {
  // === EXECUTABLE CONTROL ===
  allowedExecutables: string[];
  blockSetuidExecutables: boolean;
  blockShellInterpreters: boolean;
  additionalBlockedExecutables?: string[];

  // === ARGUMENT CONTROL ===
  maxArgumentCount?: number;
  maxArgumentLength?: number;
  blockedArgumentPatterns?: string[];

  // === ENVIRONMENT CONTROL ===
  additionalBlockedEnvVars?: string[];
  allowedEnvVars?: string[];
  maxEnvVarCount?: number;

  // === WORKING DIRECTORY CONTROL ===
  allowedWorkingDirectories?: string[];
  blockedWorkingDirectories?: string[];

  // === RESOURCE LIMITS ===
  defaultResourceLimits: ResourceLimits;
  maximumResourceLimits?: ResourceLimits;
  strictResourceEnforcement?: boolean;

  // === PROCESS LIMITS ===
  maxConcurrentProcesses: number;
  maxConcurrentProcessesPerAgent?: number;
  maxProcessLifetime: number;
  maxTotalProcesses?: number;

  // === RATE LIMITING ===
  maxLaunchesPerMinute?: number;
  maxLaunchesPerHour?: number;
  rateLimitCooldownSeconds?: number;

  // === TERMINATION CONTROL ===
  allowProcessTermination: boolean;
  allowGroupTermination: boolean;
  allowForcedTermination: boolean;
  requireTerminationConfirmation?: boolean;

  // === I/O CONTROL ===
  allowStdinInput: boolean;
  allowOutputCapture: boolean;
  maxOutputBufferSize?: number;
  blockBinaryStdin?: boolean;

  // === ISOLATION (Unix/Linux) ===
  enableChroot?: boolean;
  chrootDirectory?: string;
  enableNamespaces?: boolean;
  namespaces?: {
    pid?: boolean;
    network?: boolean;
    mount?: boolean;
    uts?: boolean;
    ipc?: boolean;
    user?: boolean;
  };
  enableSeccomp?: boolean;
  seccompProfile?: "strict" | "moderate" | "permissive";

  // === NETWORK CONTROL ===
  blockNetworkAccess?: boolean;
  allowedNetworkDestinations?: string[];
  blockedNetworkDestinations?: string[];

  // === AUDIT & MONITORING ===
  enableAuditLog: boolean;
  auditLogPath?: string;
  auditLogLevel?: "error" | "warn" | "info" | "debug";
  enableSecurityAlerts?: boolean;
  securityAlertWebhook?: string;

  // === CONFIRMATION & APPROVAL ===
  requireConfirmation: boolean;
  requireConfirmationFor?: string[];
  autoApproveAfterCount?: number;

  // === TIME RESTRICTIONS ===
  allowedTimeWindows?: string[];
  blockedTimeWindows?: string[];

  // === ADVANCED SECURITY ===
  enableMAC?: boolean;
  macProfile?: string;
  dropCapabilities?: string[];
  readOnlyFilesystem?: boolean;
  tmpfsSize?: number;
}

/**
 * Configuration change event
 */
export interface ConfigurationChange {
  affectsConfiguration: (section: string) => boolean;
}

/**
 * Validation error
 */
export interface ValidationError {
  setting: string;
  message: string;
  suggestion?: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  setting: string;
  message: string;
  severity: "low" | "medium" | "high";
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/**
 * Configuration preset
 */
export interface ConfigurationPreset {
  name: string;
  description: string;
  securityLevel: "low" | "medium" | "high";
  config: Partial<SecurityConfig>;
}

/**
 * Predefined configuration presets for common use cases
 */
export const CONFIGURATION_PRESETS: ConfigurationPreset[] = [
  {
    name: "Development",
    description:
      "Permissive settings optimized for local development. Minimal restrictions to maximize flexibility and ease of use.",
    securityLevel: "low",
    config: {
      // Executable Control - Permissive
      allowedExecutables: [], // Allow all executables
      blockSetuidExecutables: false,
      blockShellInterpreters: false,
      additionalBlockedExecutables: [],

      // Argument Control - Permissive
      maxArgumentCount: 1000,
      maxArgumentLength: 1048576, // 1 MB
      blockedArgumentPatterns: [],

      // Environment Control - Permissive
      additionalBlockedEnvVars: [],
      allowedEnvVars: [],
      maxEnvVarCount: 1000,

      // Working Directory Control - Permissive
      allowedWorkingDirectories: [],
      blockedWorkingDirectories: [],

      // Resource Limits - Generous
      defaultResourceLimits: {
        maxCpuPercent: 0, // Unlimited
        maxMemoryMB: 0, // Unlimited
        maxFileDescriptors: 0, // Unlimited
        maxCpuTime: 0, // Unlimited
        maxProcesses: 0, // Unlimited
      },
      maximumResourceLimits: {
        maxCpuPercent: 100,
        maxMemoryMB: 8192, // 8 GB
      },
      strictResourceEnforcement: false,

      // Process Limits - Generous
      maxConcurrentProcesses: 50,
      maxConcurrentProcessesPerAgent: 25,
      maxProcessLifetime: 7200, // 2 hours
      maxTotalProcesses: 10000,

      // Rate Limiting - Permissive
      maxLaunchesPerMinute: 100,
      maxLaunchesPerHour: 1000,
      rateLimitCooldownSeconds: 10,

      // Termination Control - Permissive
      allowProcessTermination: true,
      allowGroupTermination: true,
      allowForcedTermination: true,
      requireTerminationConfirmation: false,

      // I/O Control - Permissive
      allowStdinInput: true,
      allowOutputCapture: true,
      maxOutputBufferSize: 10485760, // 10 MB
      blockBinaryStdin: false,

      // Isolation - Disabled
      enableChroot: false,
      chrootDirectory: "",
      enableNamespaces: false,
      namespaces: {
        pid: false,
        network: false,
        mount: false,
        uts: false,
        ipc: false,
        user: false,
      },
      enableSeccomp: false,
      seccompProfile: "permissive",

      // Network Control - Permissive
      blockNetworkAccess: false,
      allowedNetworkDestinations: [],
      blockedNetworkDestinations: [],

      // Audit & Monitoring - Basic
      enableAuditLog: true,
      auditLogPath: "",
      auditLogLevel: "info",
      enableSecurityAlerts: false,
      securityAlertWebhook: "",

      // Confirmation & Approval - Minimal
      requireConfirmation: false,
      requireConfirmationFor: [],
      autoApproveAfterCount: 0,

      // Time Restrictions - None
      allowedTimeWindows: [],
      blockedTimeWindows: [],

      // Advanced Security - Disabled
      enableMAC: false,
      macProfile: "",
      dropCapabilities: [],
      readOnlyFilesystem: false,
      tmpfsSize: 256,
    },
  },
  {
    name: "Production",
    description:
      "Balanced settings suitable for production environments. Provides reasonable security while maintaining functionality.",
    securityLevel: "medium",
    config: {
      // Executable Control - Moderate
      allowedExecutables: [], // Should be configured per environment
      blockSetuidExecutables: true,
      blockShellInterpreters: false,
      additionalBlockedExecutables: ["curl", "wget", "nc", "netcat"],

      // Argument Control - Moderate
      maxArgumentCount: 100,
      maxArgumentLength: 4096, // 4 KB
      blockedArgumentPatterns: [],

      // Environment Control - Moderate
      additionalBlockedEnvVars: [
        "AWS_SECRET_ACCESS_KEY",
        "DATABASE_PASSWORD",
        "API_KEY",
      ],
      allowedEnvVars: [],
      maxEnvVarCount: 100,

      // Working Directory Control - Moderate
      allowedWorkingDirectories: [],
      blockedWorkingDirectories: ["/etc", "/root", "/boot"],

      // Resource Limits - Balanced
      defaultResourceLimits: {
        maxCpuPercent: 50,
        maxMemoryMB: 512,
        maxFileDescriptors: 1024,
        maxCpuTime: 300, // 5 minutes
        maxProcesses: 10,
      },
      maximumResourceLimits: {
        maxCpuPercent: 100,
        maxMemoryMB: 2048, // 2 GB
      },
      strictResourceEnforcement: true,

      // Process Limits - Balanced
      maxConcurrentProcesses: 10,
      maxConcurrentProcessesPerAgent: 5,
      maxProcessLifetime: 3600, // 1 hour
      maxTotalProcesses: 1000,

      // Rate Limiting - Moderate
      maxLaunchesPerMinute: 10,
      maxLaunchesPerHour: 100,
      rateLimitCooldownSeconds: 60,

      // Termination Control - Moderate
      allowProcessTermination: true,
      allowGroupTermination: true,
      allowForcedTermination: false,
      requireTerminationConfirmation: false,

      // I/O Control - Moderate
      allowStdinInput: true,
      allowOutputCapture: true,
      maxOutputBufferSize: 1048576, // 1 MB
      blockBinaryStdin: true,

      // Isolation - Optional (platform-dependent)
      enableChroot: false,
      chrootDirectory: "",
      enableNamespaces: false,
      namespaces: {
        pid: false,
        network: false,
        mount: false,
        uts: false,
        ipc: false,
        user: false,
      },
      enableSeccomp: false,
      seccompProfile: "moderate",

      // Network Control - Moderate
      blockNetworkAccess: false,
      allowedNetworkDestinations: [],
      blockedNetworkDestinations: [
        "169.254.169.254",
        "metadata.google.internal",
      ], // Block cloud metadata

      // Audit & Monitoring - Comprehensive
      enableAuditLog: true,
      auditLogPath: "",
      auditLogLevel: "info",
      enableSecurityAlerts: false,
      securityAlertWebhook: "",

      // Confirmation & Approval - Selective
      requireConfirmation: false,
      requireConfirmationFor: ["rm", "dd", "mkfs"],
      autoApproveAfterCount: 3,

      // Time Restrictions - None
      allowedTimeWindows: [],
      blockedTimeWindows: [],

      // Advanced Security - Optional
      enableMAC: false,
      macProfile: "",
      dropCapabilities: ["CAP_NET_RAW", "CAP_SYS_ADMIN"],
      readOnlyFilesystem: false,
      tmpfsSize: 64,
    },
  },
  {
    name: "High Security",
    description:
      "Strict settings for maximum security. Suitable for untrusted code execution or high-risk environments.",
    securityLevel: "high",
    config: {
      // Executable Control - Strict
      allowedExecutables: [], // Must be explicitly configured
      blockSetuidExecutables: true,
      blockShellInterpreters: true,
      additionalBlockedExecutables: [
        "curl",
        "wget",
        "nc",
        "netcat",
        "ssh",
        "scp",
        "ftp",
      ],

      // Argument Control - Strict
      maxArgumentCount: 50,
      maxArgumentLength: 1024, // 1 KB
      blockedArgumentPatterns: [
        ".*\\|.*", // Block pipes
        ".*>.*", // Block redirects
        ".*\\$\\(.*\\).*", // Block command substitution
      ],

      // Environment Control - Strict
      additionalBlockedEnvVars: [
        "AWS_SECRET_ACCESS_KEY",
        "DATABASE_PASSWORD",
        "API_KEY",
        "SECRET",
        "TOKEN",
        "PASSWORD",
      ],
      allowedEnvVars: [], // Whitelist mode - must be explicitly configured
      maxEnvVarCount: 50,

      // Working Directory Control - Strict
      allowedWorkingDirectories: [], // Must be explicitly configured
      blockedWorkingDirectories: [
        "/etc",
        "/root",
        "/boot",
        "/sys",
        "/proc",
        "/dev",
      ],

      // Resource Limits - Strict
      defaultResourceLimits: {
        maxCpuPercent: 25,
        maxMemoryMB: 256,
        maxFileDescriptors: 512,
        maxCpuTime: 60, // 1 minute
        maxProcesses: 5,
      },
      maximumResourceLimits: {
        maxCpuPercent: 50,
        maxMemoryMB: 512,
      },
      strictResourceEnforcement: true,

      // Process Limits - Strict
      maxConcurrentProcesses: 5,
      maxConcurrentProcessesPerAgent: 2,
      maxProcessLifetime: 600, // 10 minutes
      maxTotalProcesses: 100,

      // Rate Limiting - Strict
      maxLaunchesPerMinute: 5,
      maxLaunchesPerHour: 50,
      rateLimitCooldownSeconds: 120,

      // Termination Control - Strict
      allowProcessTermination: true,
      allowGroupTermination: false,
      allowForcedTermination: false,
      requireTerminationConfirmation: true,

      // I/O Control - Strict
      allowStdinInput: false,
      allowOutputCapture: true,
      maxOutputBufferSize: 524288, // 512 KB
      blockBinaryStdin: true,

      // Isolation - Enabled (Linux only)
      enableChroot: false, // Must be configured with chrootDirectory
      chrootDirectory: "",
      enableNamespaces: false, // Should be enabled on Linux
      namespaces: {
        pid: true,
        network: true,
        mount: true,
        uts: true,
        ipc: true,
        user: false, // User namespace can be complex
      },
      enableSeccomp: false, // Should be enabled on Linux
      seccompProfile: "strict",

      // Network Control - Strict
      blockNetworkAccess: true,
      allowedNetworkDestinations: [], // Must be explicitly configured
      blockedNetworkDestinations: [
        "169.254.169.254",
        "metadata.google.internal",
        "0.0.0.0/8",
        "10.0.0.0/8",
        "172.16.0.0/12",
        "192.168.0.0/16",
      ],

      // Audit & Monitoring - Comprehensive
      enableAuditLog: true,
      auditLogPath: "",
      auditLogLevel: "debug",
      enableSecurityAlerts: false, // Should be configured with webhook
      securityAlertWebhook: "",

      // Confirmation & Approval - Strict
      requireConfirmation: true,
      requireConfirmationFor: [], // All executables require confirmation
      autoApproveAfterCount: 0, // No auto-approval

      // Time Restrictions - Optional
      allowedTimeWindows: [], // Can be configured for business hours only
      blockedTimeWindows: [],

      // Advanced Security - Enabled
      enableMAC: false, // Should be enabled on Linux with appropriate profile
      macProfile: "",
      dropCapabilities: [
        "CAP_NET_RAW",
        "CAP_SYS_ADMIN",
        "CAP_SYS_PTRACE",
        "CAP_SYS_MODULE",
        "CAP_SYS_BOOT",
      ],
      readOnlyFilesystem: true,
      tmpfsSize: 32,
    },
  },
];

/**
 * Settings Manager class
 *
 * Manages the synchronization between VS Code settings and MCP Process Server configuration.
 */
export class SettingsManager {
  private disposables: vscode.Disposable[] = [];
  private configChangeCallbacks: Array<(changes: ConfigurationChange) => void> =
    [];
  private platformCapabilities: PlatformCapabilities;

  constructor() {
    // Detect platform capabilities
    this.platformCapabilities = detectPlatformCapabilities();

    // Listen for configuration changes
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        this.handleConfigurationChange(e);
      })
    );
  }

  /**
   * Get the current platform capabilities
   */
  public getPlatformCapabilities(): PlatformCapabilities {
    return this.platformCapabilities;
  }

  /**
   * Register a callback for configuration changes
   */
  public onConfigurationChanged(
    callback: (changes: ConfigurationChange) => void
  ): void {
    this.configChangeCallbacks.push(callback);
  }

  /**
   * Handle configuration change events
   */
  private handleConfigurationChange(e: vscode.ConfigurationChangeEvent): void {
    // Only notify if MCP Process settings changed
    if (e.affectsConfiguration("mcp-process")) {
      const changeWrapper: ConfigurationChange = {
        affectsConfiguration: (section: string) =>
          e.affectsConfiguration(section),
      };

      for (const callback of this.configChangeCallbacks) {
        callback(changeWrapper);
      }
    }
  }

  /**
   * Get the current VS Code configuration
   */
  public getConfiguration(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration("mcp-process");
  }

  /**
   * Generate server configuration from VS Code settings
   *
   * This method reads all settings from VS Code and converts them to the SecurityConfig
   * format expected by the MCP Process Server.
   */
  public generateServerConfig(): SecurityConfig {
    const config = this.getConfiguration();

    // Build default resource limits
    const defaultResourceLimits: ResourceLimits = {
      maxCpuPercent: config.get("resources.defaultMaxCpuPercent"),
      maxMemoryMB: config.get("resources.defaultMaxMemoryMB"),
      maxFileDescriptors: config.get("resources.defaultMaxFileDescriptors"),
      maxCpuTime: config.get("resources.defaultMaxCpuTime"),
      maxProcesses: config.get("resources.defaultMaxProcesses"),
    };

    // Build maximum resource limits
    const maximumResourceLimits: ResourceLimits = {
      maxCpuPercent: config.get("resources.maximumMaxCpuPercent"),
      maxMemoryMB: config.get("resources.maximumMaxMemoryMB"),
    };

    // Build namespaces configuration
    const namespaces = {
      pid: config.get("security.advanced.namespacesPid", false),
      network: config.get("security.advanced.namespacesNetwork", false),
      mount: config.get("security.advanced.namespacesMount", false),
      uts: config.get("security.advanced.namespacesUts", false),
      ipc: config.get("security.advanced.namespacesIpc", false),
      user: config.get("security.advanced.namespacesUser", false),
    };

    // Build the complete SecurityConfig
    let allowedExecutables = config.get<string[]>(
      "executable.allowedExecutables",
      []
    );
    // If allowlist is empty, allow all executables (wildcard) to satisfy server validation
    if (allowedExecutables.length === 0) {
      allowedExecutables = ["*"];
    }

    const serverConfig: SecurityConfig = {
      // Executable Control
      allowedExecutables,
      blockSetuidExecutables: config.get(
        "executable.blockSetuidExecutables",
        true
      ),
      blockShellInterpreters: config.get(
        "executable.blockShellInterpreters",
        false
      ),
      additionalBlockedExecutables: config.get(
        "executable.additionalBlockedExecutables"
      ),

      // Argument Control
      maxArgumentCount: config.get("executable.maxArgumentCount"),
      maxArgumentLength: config.get("executable.maxArgumentLength"),
      blockedArgumentPatterns: config.get("executable.blockedArgumentPatterns"),

      // Environment Control
      additionalBlockedEnvVars: config.get("security.additionalBlockedEnvVars"),
      allowedEnvVars: config.get("security.allowedEnvVars"),
      maxEnvVarCount: config.get("security.maxEnvVarCount"),

      // Working Directory Control
      allowedWorkingDirectories: config.get(
        "security.allowedWorkingDirectories"
      ),
      blockedWorkingDirectories: config.get(
        "security.blockedWorkingDirectories"
      ),

      // Resource Limits
      defaultResourceLimits,
      maximumResourceLimits,
      strictResourceEnforcement: config.get(
        "resources.strictResourceEnforcement"
      ),

      // Process Limits
      maxConcurrentProcesses: config.get("process.maxConcurrentProcesses", 10),
      maxConcurrentProcessesPerAgent: config.get(
        "process.maxConcurrentProcessesPerAgent"
      ),
      maxProcessLifetime: config.get("process.maxProcessLifetime", 3600),
      maxTotalProcesses: config.get("process.maxTotalProcesses"),

      // Rate Limiting
      maxLaunchesPerMinute: config.get("process.maxLaunchesPerMinute"),
      maxLaunchesPerHour: config.get("process.maxLaunchesPerHour"),
      rateLimitCooldownSeconds: config.get("process.rateLimitCooldownSeconds"),

      // Termination Control
      allowProcessTermination: config.get(
        "security.allowProcessTermination",
        true
      ),
      allowGroupTermination: config.get("security.allowGroupTermination", true),
      allowForcedTermination: config.get(
        "security.allowForcedTermination",
        false
      ),
      requireTerminationConfirmation: config.get(
        "security.requireTerminationConfirmation"
      ),

      // I/O Control
      allowStdinInput: config.get("io.allowStdinInput", true),
      allowOutputCapture: config.get("io.allowOutputCapture", true),
      maxOutputBufferSize: config.get("io.maxOutputBufferSize"),
      blockBinaryStdin: config.get("io.blockBinaryStdin"),

      // Isolation
      enableChroot: config.get("security.advanced.enableChroot"),
      chrootDirectory: config.get("security.advanced.chrootDirectory"),
      enableNamespaces: config.get("security.advanced.enableNamespaces"),
      namespaces,
      enableSeccomp: config.get("security.advanced.enableSeccomp"),
      seccompProfile: config.get("security.advanced.seccompProfile"),

      // Network Control
      blockNetworkAccess: config.get("security.advanced.blockNetworkAccess"),
      allowedNetworkDestinations: config.get(
        "security.advanced.allowedNetworkDestinations"
      ),
      blockedNetworkDestinations: config.get(
        "security.advanced.blockedNetworkDestinations"
      ),

      // Audit & Monitoring
      enableAuditLog: config.get("audit.enableAuditLog", true),
      auditLogPath: config.get("audit.auditLogPath"),
      auditLogLevel: config.get("audit.auditLogLevel"),
      enableSecurityAlerts: config.get("audit.enableSecurityAlerts"),
      securityAlertWebhook: config.get("audit.securityAlertWebhook"),

      // Confirmation & Approval
      requireConfirmation: config.get("security.requireConfirmation", false),
      requireConfirmationFor: config.get("security.requireConfirmationFor"),
      autoApproveAfterCount: config.get("security.autoApproveAfterCount"),

      // Time Restrictions
      allowedTimeWindows: config.get("audit.allowedTimeWindows"),
      blockedTimeWindows: config.get("audit.blockedTimeWindows"),

      // Advanced Security
      enableMAC: config.get("security.advanced.enableMAC"),
      macProfile: config.get("security.advanced.macProfile"),
      dropCapabilities: config.get("security.advanced.dropCapabilities"),
      readOnlyFilesystem: config.get("security.advanced.readOnlyFilesystem"),
      tmpfsSize: config.get("security.advanced.tmpfsSize"),
    };

    return serverConfig;
  }

  /**
   * Validate configuration
   *
   * Validates the current configuration for correctness and conflicts.
   * Returns a ValidationResult with any errors or warnings found.
   */
  public validateConfiguration(
    config?: Partial<SecurityConfig>
  ): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Use provided config or generate from current settings
    const configToValidate = config || this.generateServerConfig();

    // === TYPE VALIDATION ===

    // Validate allowedExecutables is an array
    if (!Array.isArray(configToValidate.allowedExecutables)) {
      errors.push({
        setting: "executable.allowedExecutables",
        message: "allowedExecutables must be an array",
        suggestion:
          "Set to an empty array [] or provide a list of executable paths",
      });
    }

    // Validate boolean fields
    const booleanFields: Array<keyof SecurityConfig> = [
      "blockSetuidExecutables",
      "blockShellInterpreters",
      "allowProcessTermination",
      "allowGroupTermination",
      "allowForcedTermination",
      "allowStdinInput",
      "allowOutputCapture",
      "enableAuditLog",
      "requireConfirmation",
    ];

    for (const field of booleanFields) {
      if (
        configToValidate[field] !== undefined &&
        typeof configToValidate[field] !== "boolean"
      ) {
        errors.push({
          setting: this.getSettingPath(field),
          message: `${field} must be a boolean`,
          suggestion: "Set to true or false",
        });
      }
    }

    // === RANGE VALIDATION ===

    // Validate maxConcurrentProcesses
    if (typeof configToValidate.maxConcurrentProcesses === "number") {
      if (configToValidate.maxConcurrentProcesses < 1) {
        errors.push({
          setting: "process.maxConcurrentProcesses",
          message: "maxConcurrentProcesses must be at least 1",
          suggestion: "Set to a positive integer (recommended: 10)",
        });
      }
    }

    // Validate maxProcessLifetime
    if (typeof configToValidate.maxProcessLifetime === "number") {
      if (configToValidate.maxProcessLifetime < 1) {
        errors.push({
          setting: "process.maxProcessLifetime",
          message: "maxProcessLifetime must be at least 1 second",
          suggestion:
            "Set to a positive integer in seconds (recommended: 3600)",
        });
      }
    }

    // Validate resource limits
    if (configToValidate.defaultResourceLimits) {
      const limits = configToValidate.defaultResourceLimits;

      if (limits.maxCpuPercent !== undefined) {
        if (limits.maxCpuPercent < 0 || limits.maxCpuPercent > 100) {
          errors.push({
            setting: "resources.defaultMaxCpuPercent",
            message: "maxCpuPercent must be between 0 and 100",
            suggestion: "Set to a value between 0 and 100 (0 = unlimited)",
          });
        }
      }

      if (limits.maxMemoryMB !== undefined && limits.maxMemoryMB < 0) {
        errors.push({
          setting: "resources.defaultMaxMemoryMB",
          message: "maxMemoryMB must be non-negative",
          suggestion: "Set to a positive integer in megabytes (0 = unlimited)",
        });
      }

      if (
        limits.maxFileDescriptors !== undefined &&
        limits.maxFileDescriptors < 0
      ) {
        errors.push({
          setting: "resources.defaultMaxFileDescriptors",
          message: "maxFileDescriptors must be non-negative",
          suggestion: "Set to a positive integer (0 = unlimited)",
        });
      }

      if (limits.maxCpuTime !== undefined && limits.maxCpuTime < 0) {
        errors.push({
          setting: "resources.defaultMaxCpuTime",
          message: "maxCpuTime must be non-negative",
          suggestion: "Set to a positive integer in seconds (0 = unlimited)",
        });
      }

      if (limits.maxProcesses !== undefined && limits.maxProcesses < 0) {
        errors.push({
          setting: "resources.defaultMaxProcesses",
          message: "maxProcesses must be non-negative",
          suggestion: "Set to a positive integer (0 = unlimited)",
        });
      }
    }

    // === ENUM VALIDATION ===

    // Validate seccompProfile
    if (configToValidate.seccompProfile !== undefined) {
      const validProfiles = ["strict", "moderate", "permissive"];
      if (!validProfiles.includes(configToValidate.seccompProfile)) {
        errors.push({
          setting: "security.advanced.seccompProfile",
          message: `seccompProfile must be one of: ${validProfiles.join(", ")}`,
          suggestion: 'Set to "strict", "moderate", or "permissive"',
        });
      }
    }

    // Validate auditLogLevel
    if (configToValidate.auditLogLevel !== undefined) {
      const validLevels = ["error", "warn", "info", "debug"];
      if (!validLevels.includes(configToValidate.auditLogLevel)) {
        errors.push({
          setting: "audit.auditLogLevel",
          message: `auditLogLevel must be one of: ${validLevels.join(", ")}`,
          suggestion: 'Set to "error", "warn", "info", or "debug"',
        });
      }
    }

    // === DEPENDENCY VALIDATION ===

    // Validate chroot dependency
    if (configToValidate.enableChroot === true) {
      if (
        !configToValidate.chrootDirectory ||
        configToValidate.chrootDirectory.trim() === ""
      ) {
        errors.push({
          setting: "security.advanced.chrootDirectory",
          message: "chrootDirectory is required when enableChroot is true",
          suggestion:
            "Set chrootDirectory to a valid directory path or disable enableChroot",
        });
      }
    }

    // Validate namespace dependencies
    if (configToValidate.namespaces) {
      const hasAnyNamespace = Object.values(configToValidate.namespaces).some(
        (v) => v === true
      );
      if (hasAnyNamespace && !configToValidate.enableNamespaces) {
        warnings.push({
          setting: "security.advanced.enableNamespaces",
          message:
            "Individual namespaces are enabled but enableNamespaces is false",
          severity: "medium",
        });
      }
    }

    // Validate seccomp dependency
    if (configToValidate.seccompProfile && !configToValidate.enableSeccomp) {
      warnings.push({
        setting: "security.advanced.enableSeccomp",
        message: "seccompProfile is set but enableSeccomp is false",
        severity: "low",
      });
    }

    // Validate MAC dependency
    if (configToValidate.enableMAC === true) {
      if (
        !configToValidate.macProfile ||
        configToValidate.macProfile.trim() === ""
      ) {
        errors.push({
          setting: "security.advanced.macProfile",
          message: "macProfile is required when enableMAC is true",
          suggestion:
            "Set macProfile to a valid SELinux context or AppArmor profile, or disable enableMAC",
        });
      }
    }

    // Validate security alerts dependency
    if (configToValidate.enableSecurityAlerts === true) {
      if (
        !configToValidate.securityAlertWebhook ||
        configToValidate.securityAlertWebhook.trim() === ""
      ) {
        errors.push({
          setting: "audit.securityAlertWebhook",
          message:
            "securityAlertWebhook is required when enableSecurityAlerts is true",
          suggestion:
            "Set securityAlertWebhook to a valid URL or disable enableSecurityAlerts",
        });
      } else {
        // Validate URL format
        try {
          new URL(configToValidate.securityAlertWebhook);
        } catch {
          errors.push({
            setting: "audit.securityAlertWebhook",
            message: "securityAlertWebhook must be a valid URL",
            suggestion:
              "Set to a valid HTTP/HTTPS URL (e.g., https://hooks.slack.com/...)",
          });
        }
      }
    }

    // === PLATFORM-SPECIFIC VALIDATION ===

    // Use platform capabilities for validation
    const caps = this.platformCapabilities;

    // Chroot validation
    if (configToValidate.enableChroot && !caps.supportsChroot) {
      warnings.push({
        setting: "security.advanced.enableChroot",
        message: `chroot is not supported on ${caps.platformName}`,
        severity: "high",
      });
    }

    // Namespaces validation
    if (configToValidate.enableNamespaces && !caps.supportsNamespaces) {
      warnings.push({
        setting: "security.advanced.enableNamespaces",
        message: `Linux namespaces are not supported on ${caps.platformName}`,
        severity: "high",
      });
    }

    // Seccomp validation
    if (configToValidate.enableSeccomp && !caps.supportsSeccomp) {
      warnings.push({
        setting: "security.advanced.enableSeccomp",
        message: `seccomp is not supported on ${caps.platformName}`,
        severity: "high",
      });
    }

    // MAC validation
    if (configToValidate.enableMAC && !caps.supportsMAC) {
      warnings.push({
        setting: "security.advanced.enableMAC",
        message: `Mandatory Access Control (SELinux/AppArmor) is not supported on ${caps.platformName}`,
        severity: "high",
      });
    }

    // File descriptors limit validation
    if (
      configToValidate.defaultResourceLimits?.maxFileDescriptors &&
      !caps.supportsFileDescriptorLimits
    ) {
      warnings.push({
        setting: "resources.defaultMaxFileDescriptors",
        message: `File descriptor limits are not supported on ${caps.platformName}`,
        severity: "low",
      });
    }

    // Setuid blocking validation
    if (
      configToValidate.blockSetuidExecutables &&
      !caps.supportsSetuidBlocking
    ) {
      warnings.push({
        setting: "executable.blockSetuidExecutables",
        message: `Setuid blocking is not supported on ${caps.platformName}`,
        severity: "low",
      });
    }

    // Capabilities validation
    if (
      configToValidate.dropCapabilities &&
      configToValidate.dropCapabilities.length > 0 &&
      !caps.supportsCapabilities
    ) {
      warnings.push({
        setting: "security.advanced.dropCapabilities",
        message: `Linux capabilities are not supported on ${caps.platformName}`,
        severity: "medium",
      });
    }

    // === SECURITY WARNINGS ===

    // Warn if no executables are allowed (empty allowlist)
    if (
      configToValidate.allowedExecutables &&
      configToValidate.allowedExecutables.length === 0
    ) {
      warnings.push({
        setting: "executable.allowedExecutables",
        message:
          "No executables are explicitly allowed - all executables will be permitted",
        severity: "high",
      });
    }

    // Warn if forced termination is allowed
    if (configToValidate.allowForcedTermination === true) {
      warnings.push({
        setting: "security.allowForcedTermination",
        message:
          "Forced termination (SIGKILL) is enabled - processes cannot clean up",
        severity: "medium",
      });
    }

    // Warn if shell interpreters are not blocked
    if (configToValidate.blockShellInterpreters === false) {
      warnings.push({
        setting: "executable.blockShellInterpreters",
        message:
          "Shell interpreters are not blocked - this may allow command injection",
        severity: "high",
      });
    }

    // Warn if audit log is disabled
    if (configToValidate.enableAuditLog === false) {
      warnings.push({
        setting: "audit.enableAuditLog",
        message:
          "Audit logging is disabled - security events will not be recorded",
        severity: "medium",
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get the VS Code setting path for a SecurityConfig field
   */
  private getSettingPath(field: keyof SecurityConfig): string {
    // Map SecurityConfig fields to VS Code setting paths
    const fieldMap: Partial<Record<keyof SecurityConfig, string>> = {
      allowedExecutables: "executable.allowedExecutables",
      blockSetuidExecutables: "executable.blockSetuidExecutables",
      blockShellInterpreters: "executable.blockShellInterpreters",
      additionalBlockedExecutables: "executable.additionalBlockedExecutables",
      maxArgumentCount: "executable.maxArgumentCount",
      maxArgumentLength: "executable.maxArgumentLength",
      blockedArgumentPatterns: "executable.blockedArgumentPatterns",
      additionalBlockedEnvVars: "security.additionalBlockedEnvVars",
      allowedEnvVars: "security.allowedEnvVars",
      maxEnvVarCount: "security.maxEnvVarCount",
      allowedWorkingDirectories: "security.allowedWorkingDirectories",
      blockedWorkingDirectories: "security.blockedWorkingDirectories",
      strictResourceEnforcement: "resources.strictResourceEnforcement",
      maxConcurrentProcesses: "process.maxConcurrentProcesses",
      maxConcurrentProcessesPerAgent: "process.maxConcurrentProcessesPerAgent",
      maxProcessLifetime: "process.maxProcessLifetime",
      maxTotalProcesses: "process.maxTotalProcesses",
      maxLaunchesPerMinute: "process.maxLaunchesPerMinute",
      maxLaunchesPerHour: "process.maxLaunchesPerHour",
      rateLimitCooldownSeconds: "process.rateLimitCooldownSeconds",
      allowProcessTermination: "security.allowProcessTermination",
      allowGroupTermination: "security.allowGroupTermination",
      allowForcedTermination: "security.allowForcedTermination",
      requireTerminationConfirmation: "security.requireTerminationConfirmation",
      allowStdinInput: "io.allowStdinInput",
      allowOutputCapture: "io.allowOutputCapture",
      maxOutputBufferSize: "io.maxOutputBufferSize",
      blockBinaryStdin: "io.blockBinaryStdin",
      enableChroot: "security.advanced.enableChroot",
      chrootDirectory: "security.advanced.chrootDirectory",
      enableNamespaces: "security.advanced.enableNamespaces",
      enableSeccomp: "security.advanced.enableSeccomp",
      seccompProfile: "security.advanced.seccompProfile",
      blockNetworkAccess: "security.advanced.blockNetworkAccess",
      allowedNetworkDestinations:
        "security.advanced.allowedNetworkDestinations",
      blockedNetworkDestinations:
        "security.advanced.blockedNetworkDestinations",
      enableAuditLog: "audit.enableAuditLog",
      auditLogPath: "audit.auditLogPath",
      auditLogLevel: "audit.auditLogLevel",
      enableSecurityAlerts: "audit.enableSecurityAlerts",
      securityAlertWebhook: "audit.securityAlertWebhook",
      requireConfirmation: "security.requireConfirmation",
      requireConfirmationFor: "security.requireConfirmationFor",
      autoApproveAfterCount: "security.autoApproveAfterCount",
      allowedTimeWindows: "audit.allowedTimeWindows",
      blockedTimeWindows: "audit.blockedTimeWindows",
      enableMAC: "security.advanced.enableMAC",
      macProfile: "security.advanced.macProfile",
      dropCapabilities: "security.advanced.dropCapabilities",
      readOnlyFilesystem: "security.advanced.readOnlyFilesystem",
      tmpfsSize: "security.advanced.tmpfsSize",
    };

    return fieldMap[field] || field.toString();
  }

  /**
   * Apply a configuration preset
   *
   * This method applies a predefined configuration preset to VS Code settings.
   * It generates a diff of changes, shows a confirmation dialog, and applies the preset if confirmed.
   *
   * @param preset The preset to apply
   * @returns Promise that resolves to true if applied, false if cancelled
   */
  public async applyPreset(preset: ConfigurationPreset): Promise<boolean> {
    // Generate diff showing changes
    const diff = this.generatePresetDiff(preset);

    // Show confirmation dialog with diff
    const confirmed = await this.showPresetConfirmationDialog(preset, diff);

    if (!confirmed) {
      return false;
    }

    // Apply the preset settings
    await this.applyPresetSettings(preset.config);

    return true;
  }

  /**
   * Generate a diff showing changes that would be made by applying a preset
   *
   * @param preset The preset to generate diff for
   * @returns Array of diff entries showing setting changes
   */
  private generatePresetDiff(
    preset: ConfigurationPreset
  ): Array<{ setting: string; oldValue: any; newValue: any }> {
    const diff: Array<{ setting: string; oldValue: any; newValue: any }> = [];
    const config = this.getConfiguration();

    // Helper function to get current value for a setting path
    const getCurrentValue = (settingPath: string): any => {
      return config.get(settingPath);
    };

    // Helper function to convert SecurityConfig field to setting path
    const getSettingPathForField = (
      field: string,
      value: any,
      parentPath: string = ""
    ): string[] => {
      const paths: string[] = [];

      if (field === "defaultResourceLimits" && typeof value === "object") {
        // Handle resource limits
        if (value.maxCpuPercent !== undefined) {
          paths.push("resources.defaultMaxCpuPercent");
        }
        if (value.maxMemoryMB !== undefined) {
          paths.push("resources.defaultMaxMemoryMB");
        }
        if (value.maxFileDescriptors !== undefined) {
          paths.push("resources.defaultMaxFileDescriptors");
        }
        if (value.maxCpuTime !== undefined) {
          paths.push("resources.defaultMaxCpuTime");
        }
        if (value.maxProcesses !== undefined) {
          paths.push("resources.defaultMaxProcesses");
        }
      } else if (
        field === "maximumResourceLimits" &&
        typeof value === "object"
      ) {
        if (value.maxCpuPercent !== undefined) {
          paths.push("resources.maximumMaxCpuPercent");
        }
        if (value.maxMemoryMB !== undefined) {
          paths.push("resources.maximumMaxMemoryMB");
        }
      } else if (field === "namespaces" && typeof value === "object") {
        // Handle namespaces
        if (value.pid !== undefined) {
          paths.push("security.advanced.namespacesPid");
        }
        if (value.network !== undefined) {
          paths.push("security.advanced.namespacesNetwork");
        }
        if (value.mount !== undefined) {
          paths.push("security.advanced.namespacesMount");
        }
        if (value.uts !== undefined) {
          paths.push("security.advanced.namespacesUts");
        }
        if (value.ipc !== undefined) {
          paths.push("security.advanced.namespacesIpc");
        }
        if (value.user !== undefined) {
          paths.push("security.advanced.namespacesUser");
        }
      } else {
        // Use the field map from getSettingPath
        const path = this.getSettingPath(field as keyof SecurityConfig);
        if (path) {
          paths.push(path);
        }
      }

      return paths;
    };

    // Iterate through preset config and generate diff
    for (const [field, newValue] of Object.entries(preset.config)) {
      const settingPaths = getSettingPathForField(field, newValue);

      for (const settingPath of settingPaths) {
        const oldValue = getCurrentValue(settingPath);

        // Extract the actual new value for nested objects
        let actualNewValue: any = newValue;
        if (field === "defaultResourceLimits" && typeof newValue === "object") {
          const resourceField = settingPath.split(".").pop();
          if (resourceField === "defaultMaxCpuPercent") {
            actualNewValue = (newValue as ResourceLimits).maxCpuPercent;
          } else if (resourceField === "defaultMaxMemoryMB") {
            actualNewValue = (newValue as ResourceLimits).maxMemoryMB;
          } else if (resourceField === "defaultMaxFileDescriptors") {
            actualNewValue = (newValue as ResourceLimits).maxFileDescriptors;
          } else if (resourceField === "defaultMaxCpuTime") {
            actualNewValue = (newValue as ResourceLimits).maxCpuTime;
          } else if (resourceField === "defaultMaxProcesses") {
            actualNewValue = (newValue as ResourceLimits).maxProcesses;
          }
        } else if (
          field === "maximumResourceLimits" &&
          typeof newValue === "object"
        ) {
          const resourceField = settingPath.split(".").pop();
          if (resourceField === "maximumMaxCpuPercent") {
            actualNewValue = (newValue as ResourceLimits).maxCpuPercent;
          } else if (resourceField === "maximumMaxMemoryMB") {
            actualNewValue = (newValue as ResourceLimits).maxMemoryMB;
          }
        } else if (field === "namespaces" && typeof newValue === "object") {
          const namespaceField = settingPath.split(".").pop();
          if (namespaceField === "namespacesPid") {
            actualNewValue = (newValue as SecurityConfig["namespaces"])?.pid;
          } else if (namespaceField === "namespacesNetwork") {
            actualNewValue = (newValue as SecurityConfig["namespaces"])
              ?.network;
          } else if (namespaceField === "namespacesMount") {
            actualNewValue = (newValue as SecurityConfig["namespaces"])?.mount;
          } else if (namespaceField === "namespacesUts") {
            actualNewValue = (newValue as SecurityConfig["namespaces"])?.uts;
          } else if (namespaceField === "namespacesIpc") {
            actualNewValue = (newValue as SecurityConfig["namespaces"])?.ipc;
          } else if (namespaceField === "namespacesUser") {
            actualNewValue = (newValue as SecurityConfig["namespaces"])?.user;
          }
        }

        // Only add to diff if value is actually changing and actualNewValue is defined
        if (
          actualNewValue !== undefined &&
          JSON.stringify(oldValue) !== JSON.stringify(actualNewValue)
        ) {
          diff.push({
            setting: settingPath,
            oldValue,
            newValue: actualNewValue,
          });
        }
      }
    }

    return diff;
  }

  /**
   * Show confirmation dialog for preset application
   *
   * @param preset The preset being applied
   * @param diff The diff of changes
   * @returns Promise that resolves to true if confirmed, false if cancelled
   */
  private async showPresetConfirmationDialog(
    preset: ConfigurationPreset,
    diff: Array<{ setting: string; oldValue: any; newValue: any }>
  ): Promise<boolean> {
    // Skip confirmation in test mode
    const isTestMode =
      process.env.VSCODE_TEST_MODE === "true" ||
      process.env.NODE_ENV === "test";

    if (isTestMode) {
      return true; // Auto-confirm in tests
    }

    // Build diff message
    let diffMessage = `Apply "${preset.name}" preset?\n\n`;
    diffMessage += `${preset.description}\n\n`;
    diffMessage += `Security Level: ${preset.securityLevel.toUpperCase()}\n\n`;

    if (diff.length === 0) {
      diffMessage +=
        "No changes needed - current settings already match this preset.";
    } else {
      diffMessage += `This will change ${diff.length} setting(s):\n\n`;

      // Show first 10 changes in detail
      const displayDiff = diff.slice(0, 10);
      for (const change of displayDiff) {
        const oldValueStr = this.formatValueForDisplay(change.oldValue);
        const newValueStr = this.formatValueForDisplay(change.newValue);
        diffMessage += `• ${change.setting}\n`;
        diffMessage += `  ${oldValueStr} → ${newValueStr}\n\n`;
      }

      if (diff.length > 10) {
        diffMessage += `... and ${diff.length - 10} more changes\n\n`;
      }
    }

    // Show confirmation dialog
    const result = await vscode.window.showWarningMessage(
      diffMessage,
      { modal: true },
      "Apply Preset",
      "Cancel"
    );

    return result === "Apply Preset";
  }

  /**
   * Format a value for display in diff
   *
   * @param value The value to format
   * @returns Formatted string representation
   */
  private formatValueForDisplay(value: any): string {
    if (value === undefined) {
      return "(not set)";
    }
    if (value === null) {
      return "null";
    }
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
    if (typeof value === "number") {
      return value.toString();
    }
    if (typeof value === "string") {
      return value === "" ? "(empty)" : `"${value}"`;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return "[]";
      }
      if (value.length <= 3) {
        return `[${value
          .map((v) => this.formatValueForDisplay(v))
          .join(", ")}]`;
      }
      return `[${value.length} items]`;
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  }

  /**
   * Wait for a configuration change to be persisted
   *
   * VS Code's config.update() returns a Promise, but the configuration might not be
   * immediately readable after the Promise resolves. This method waits for the
   * configuration change event to fire, ensuring the change has been persisted.
   *
   * If the value is already correct, resolves immediately without waiting for an event.
   */
  private async waitForConfigChange(
    settingPath: string,
    expectedValue: any,
    timeoutMs: number = 30000
  ): Promise<void> {
    // First check if the value is already correct
    const config = this.getConfiguration();
    const currentValue = config.get(settingPath);
    const valuesMatch =
      JSON.stringify(currentValue) === JSON.stringify(expectedValue);

    if (valuesMatch) {
      // Value is already correct, no need to wait
      return Promise.resolve();
    }

    // Value is not correct yet, poll for the change
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const config = this.getConfiguration();
      const actualValue = config.get(settingPath);
      const valuesMatch =
        JSON.stringify(actualValue) === JSON.stringify(expectedValue);

      if (valuesMatch) {
        return Promise.resolve();
      }
    }

    // Timeout reached, check one final time
    const finalValue = this.getConfiguration().get(settingPath);
    const finalMatch =
      JSON.stringify(finalValue) === JSON.stringify(expectedValue);

    if (!finalMatch) {
      throw new Error(
        `Timeout waiting for ${settingPath} to change to ${JSON.stringify(
          expectedValue
        )}, got ${JSON.stringify(finalValue)} after ${timeoutMs}ms`
      );
    }
  }

  /**
   * Apply preset settings to VS Code configuration
   *
   * @param presetConfig The preset configuration to apply
   */
  private async applyPresetSettings(
    presetConfig: Partial<SecurityConfig>
  ): Promise<void> {
    const config = this.getConfiguration();

    // Helper function to set a value in VS Code configuration and wait for it to persist
    const setValue = async (settingPath: string, value: any): Promise<void> => {
      await config.update(
        settingPath,
        value,
        vscode.ConfigurationTarget.Global
      );
      // Wait for the configuration change to be persisted
      await this.waitForConfigChange(settingPath, value);
    };

    // Apply each setting from the preset
    for (const [field, value] of Object.entries(presetConfig)) {
      if (field === "defaultResourceLimits" && typeof value === "object") {
        const limits = value as ResourceLimits;
        if (limits.maxCpuPercent !== undefined) {
          await setValue(
            "resources.defaultMaxCpuPercent",
            limits.maxCpuPercent
          );
        }
        if (limits.maxMemoryMB !== undefined) {
          await setValue("resources.defaultMaxMemoryMB", limits.maxMemoryMB);
        }
        if (limits.maxFileDescriptors !== undefined) {
          await setValue(
            "resources.defaultMaxFileDescriptors",
            limits.maxFileDescriptors
          );
        }
        if (limits.maxCpuTime !== undefined) {
          await setValue("resources.defaultMaxCpuTime", limits.maxCpuTime);
        }
        if (limits.maxProcesses !== undefined) {
          await setValue("resources.defaultMaxProcesses", limits.maxProcesses);
        }
      } else if (
        field === "maximumResourceLimits" &&
        typeof value === "object"
      ) {
        const limits = value as ResourceLimits;
        if (limits.maxCpuPercent !== undefined) {
          await setValue(
            "resources.maximumMaxCpuPercent",
            limits.maxCpuPercent
          );
        }
        if (limits.maxMemoryMB !== undefined) {
          await setValue("resources.maximumMaxMemoryMB", limits.maxMemoryMB);
        }
      } else if (field === "namespaces" && typeof value === "object") {
        const namespaces = value as SecurityConfig["namespaces"];
        if (namespaces?.pid !== undefined) {
          await setValue("security.advanced.namespacesPid", namespaces.pid);
        }
        if (namespaces?.network !== undefined) {
          await setValue(
            "security.advanced.namespacesNetwork",
            namespaces.network
          );
        }
        if (namespaces?.mount !== undefined) {
          await setValue("security.advanced.namespacesMount", namespaces.mount);
        }
        if (namespaces?.uts !== undefined) {
          await setValue("security.advanced.namespacesUts", namespaces.uts);
        }
        if (namespaces?.ipc !== undefined) {
          await setValue("security.advanced.namespacesIpc", namespaces.ipc);
        }
        if (namespaces?.user !== undefined) {
          await setValue("security.advanced.namespacesUser", namespaces.user);
        }
      } else {
        // Use the field map to get the setting path
        const settingPath = this.getSettingPath(field as keyof SecurityConfig);
        if (settingPath) {
          await setValue(settingPath, value);
        }
      }
    }

    // Show success message
    vscode.window.showInformationMessage(
      `Successfully applied preset: ${presetConfig}`
    );
  }

  /**
   * Export configuration to JSON
   *
   * Generates a JSON file containing all current settings with metadata.
   * The exported configuration can be imported later or shared with other users.
   *
   * @returns Promise that resolves to the JSON string
   */
  public async exportConfiguration(): Promise<string> {
    // Get current server configuration
    const serverConfig = this.generateServerConfig();

    // Get VS Code configuration for UI settings
    const config = this.getConfiguration();

    // Generate platform metadata
    const platformMetadata = generatePlatformMetadata();

    // Build export object with metadata
    const exportData = {
      // Metadata
      version: "1.0.0",
      timestamp: platformMetadata.timestamp,
      exportedBy: "MCP Process Manager VS Code Extension",

      // Platform metadata
      platform: platformMetadata.platform,
      platformName: platformMetadata.platformName,
      architecture: platformMetadata.architecture,
      release: platformMetadata.release,
      nodeVersion: platformMetadata.nodeVersion,

      // Platform capabilities (for reference when importing)
      platformCapabilities: this.platformCapabilities,

      // Server settings
      server: {
        serverPath: config.get("server.serverPath", ""),
        useConfigFile: config.get("server.useConfigFile", false),
        configPath: config.get("server.configPath", ""),
        autoStart: config.get("server.autoStart", true),
        logLevel: config.get("server.logLevel", "info"),
      },

      // UI settings
      ui: {
        refreshInterval: config.get("ui.refreshInterval", 2000),
        showResourceUsage: config.get("ui.showResourceUsage", true),
        showSecurityWarnings: config.get("ui.showSecurityWarnings", true),
        confirmDangerousOperations: config.get(
          "ui.confirmDangerousOperations",
          true
        ),
      },

      // Security configuration (all settings)
      security: serverConfig,
    };

    // Convert to JSON with pretty formatting
    const jsonString = JSON.stringify(exportData, null, 2);

    // Validate that the JSON is well-formed by parsing it
    try {
      JSON.parse(jsonString);
    } catch (error) {
      throw new Error(
        `Failed to generate valid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    return jsonString;
  }

  /**
   * Import configuration from JSON
   *
   * Parses and validates a JSON configuration file, then applies the settings to VS Code.
   * Handles platform-specific settings with warnings and validates all settings against the schema.
   *
   * @param json The JSON string to import
   * @returns Promise that resolves when import is complete
   * @throws Error if JSON is invalid or settings fail validation
   */
  public async importConfiguration(
    json: string,
    skipWarnings: boolean = false
  ): Promise<void> {
    // Auto-skip warnings in test mode
    const isTestMode =
      process.env.VSCODE_TEST_MODE === "true" ||
      process.env.NODE_ENV === "test";

    if (isTestMode) {
      skipWarnings = true;
    }

    // Parse JSON
    let importData: any;
    try {
      importData = JSON.parse(json);
    } catch (error) {
      throw new Error(
        `Invalid JSON: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }

    // Validate structure
    if (!importData || typeof importData !== "object") {
      throw new Error("Invalid configuration: root must be an object");
    }

    // Check for platform differences
    if (
      !skipWarnings &&
      importData.platform &&
      importData.platform !== this.platformCapabilities.platform
    ) {
      const sourcePlatform = importData.platformName || importData.platform;
      const currentPlatform = this.platformCapabilities.platformName;

      const result = await vscode.window.showWarningMessage(
        `This configuration was exported from ${sourcePlatform} but you are running on ${currentPlatform}. ` +
          `Some platform-specific settings may not work correctly. Continue?`,
        { modal: true },
        "Continue",
        "Cancel"
      );

      if (result !== "Continue") {
        throw new Error("Import cancelled by user");
      }
    }

    // Extract security configuration
    const securityConfig = importData.security as Partial<SecurityConfig>;
    if (!securityConfig) {
      throw new Error("Invalid configuration: missing 'security' section");
    }

    // Validate the security configuration
    const validationResult = this.validateConfiguration(securityConfig);
    if (!validationResult.valid) {
      // Show validation errors
      const errorMessages = validationResult.errors
        .map((e) => `• ${e.setting}: ${e.message}`)
        .join("\n");

      throw new Error(
        `Configuration validation failed:\n\n${errorMessages}\n\n` +
          `Please fix these errors in the configuration file and try again.`
      );
    }

    // Show warnings if any (skip in test mode)
    if (!skipWarnings && validationResult.warnings.length > 0) {
      // Separate platform-specific warnings from other warnings
      const platformWarnings = validationResult.warnings.filter(
        (w) =>
          w.message.includes("not supported on") ||
          w.message.includes("only supported on")
      );
      const otherWarnings = validationResult.warnings.filter(
        (w) =>
          !w.message.includes("not supported on") &&
          !w.message.includes("only supported on")
      );

      let warningMessage = "Configuration has warnings:\n\n";

      if (platformWarnings.length > 0) {
        warningMessage += "Platform-specific warnings:\n";
        warningMessage += platformWarnings
          .map((w) => `• ${w.setting}: ${w.message}`)
          .join("\n");
        warningMessage += "\n\n";
      }

      if (otherWarnings.length > 0) {
        warningMessage += "Other warnings:\n";
        warningMessage += otherWarnings
          .map((w) => `• ${w.setting}: ${w.message} (${w.severity})`)
          .join("\n");
        warningMessage += "\n\n";
      }

      warningMessage += "Continue with import?";

      const result = await vscode.window.showWarningMessage(
        warningMessage,
        { modal: true },
        "Continue",
        "Cancel"
      );

      if (result !== "Continue") {
        throw new Error("Import cancelled by user");
      }
    }

    // Apply server settings if present
    if (importData.server) {
      await this.applyServerSettings(importData.server);
    }

    // Apply UI settings if present
    if (importData.ui) {
      await this.applyUISettings(importData.ui);
    }

    // Apply security settings
    await this.applySecuritySettings(securityConfig);

    // Show success message (skip in test mode)
    if (!skipWarnings) {
      vscode.window.showInformationMessage(
        "Configuration imported successfully!"
      );
    }
  }

  /**
   * Apply server settings from imported configuration
   */
  private async applyServerSettings(serverSettings: any): Promise<void> {
    const config = this.getConfiguration();

    if (serverSettings.serverPath !== undefined) {
      await config.update(
        "server.serverPath",
        serverSettings.serverPath,
        vscode.ConfigurationTarget.Global
      );
      await this.waitForConfigChange(
        "server.serverPath",
        serverSettings.serverPath
      );
    }

    if (serverSettings.useConfigFile !== undefined) {
      await config.update(
        "server.useConfigFile",
        serverSettings.useConfigFile,
        vscode.ConfigurationTarget.Global
      );
      await this.waitForConfigChange(
        "server.useConfigFile",
        serverSettings.useConfigFile
      );
    }

    if (serverSettings.configPath !== undefined) {
      await config.update(
        "server.configPath",
        serverSettings.configPath,
        vscode.ConfigurationTarget.Global
      );
      await this.waitForConfigChange(
        "server.configPath",
        serverSettings.configPath
      );
    }

    if (serverSettings.autoStart !== undefined) {
      await config.update(
        "server.autoStart",
        serverSettings.autoStart,
        vscode.ConfigurationTarget.Global
      );
      await this.waitForConfigChange(
        "server.autoStart",
        serverSettings.autoStart
      );
    }

    if (serverSettings.logLevel !== undefined) {
      await config.update(
        "server.logLevel",
        serverSettings.logLevel,
        vscode.ConfigurationTarget.Global
      );
      await this.waitForConfigChange(
        "server.logLevel",
        serverSettings.logLevel
      );
    }
  }

  /**
   * Apply UI settings from imported configuration
   */
  private async applyUISettings(uiSettings: any): Promise<void> {
    const config = this.getConfiguration();

    if (uiSettings.refreshInterval !== undefined) {
      await config.update(
        "ui.refreshInterval",
        uiSettings.refreshInterval,
        vscode.ConfigurationTarget.Global
      );
      await this.waitForConfigChange(
        "ui.refreshInterval",
        uiSettings.refreshInterval
      );
    }

    if (uiSettings.showResourceUsage !== undefined) {
      await config.update(
        "ui.showResourceUsage",
        uiSettings.showResourceUsage,
        vscode.ConfigurationTarget.Global
      );
      await this.waitForConfigChange(
        "ui.showResourceUsage",
        uiSettings.showResourceUsage
      );
    }

    if (uiSettings.showSecurityWarnings !== undefined) {
      await config.update(
        "ui.showSecurityWarnings",
        uiSettings.showSecurityWarnings,
        vscode.ConfigurationTarget.Global
      );
      await this.waitForConfigChange(
        "ui.showSecurityWarnings",
        uiSettings.showSecurityWarnings
      );
    }

    if (uiSettings.confirmDangerousOperations !== undefined) {
      await config.update(
        "ui.confirmDangerousOperations",
        uiSettings.confirmDangerousOperations,
        vscode.ConfigurationTarget.Global
      );
      await this.waitForConfigChange(
        "ui.confirmDangerousOperations",
        uiSettings.confirmDangerousOperations
      );
    }
  }

  /**
   * Apply security settings from imported configuration
   */
  private async applySecuritySettings(
    securityConfig: Partial<SecurityConfig>
  ): Promise<void> {
    const config = this.getConfiguration();

    // Helper function to set a value and wait for it to persist
    const setValue = async (settingPath: string, value: any): Promise<void> => {
      await config.update(
        settingPath,
        value,
        vscode.ConfigurationTarget.Global
      );
      // Wait for the configuration change to be persisted
      await this.waitForConfigChange(settingPath, value);
    };

    // Apply each setting from the security config
    for (const [field, value] of Object.entries(securityConfig)) {
      if (value === undefined) {
        continue;
      }

      if (field === "defaultResourceLimits" && typeof value === "object") {
        const limits = value as ResourceLimits;
        if (limits.maxCpuPercent !== undefined) {
          await setValue(
            "resources.defaultMaxCpuPercent",
            limits.maxCpuPercent
          );
        }
        if (limits.maxMemoryMB !== undefined) {
          await setValue("resources.defaultMaxMemoryMB", limits.maxMemoryMB);
        }
        if (limits.maxFileDescriptors !== undefined) {
          await setValue(
            "resources.defaultMaxFileDescriptors",
            limits.maxFileDescriptors
          );
        }
        if (limits.maxCpuTime !== undefined) {
          await setValue("resources.defaultMaxCpuTime", limits.maxCpuTime);
        }
        if (limits.maxProcesses !== undefined) {
          await setValue("resources.defaultMaxProcesses", limits.maxProcesses);
        }
      } else if (
        field === "maximumResourceLimits" &&
        typeof value === "object"
      ) {
        const limits = value as ResourceLimits;
        if (limits.maxCpuPercent !== undefined) {
          await setValue(
            "resources.maximumMaxCpuPercent",
            limits.maxCpuPercent
          );
        }
        if (limits.maxMemoryMB !== undefined) {
          await setValue("resources.maximumMaxMemoryMB", limits.maxMemoryMB);
        }
      } else if (field === "namespaces" && typeof value === "object") {
        const namespaces = value as SecurityConfig["namespaces"];
        if (namespaces?.pid !== undefined) {
          await setValue("security.advanced.namespacesPid", namespaces.pid);
        }
        if (namespaces?.network !== undefined) {
          await setValue(
            "security.advanced.namespacesNetwork",
            namespaces.network
          );
        }
        if (namespaces?.mount !== undefined) {
          await setValue("security.advanced.namespacesMount", namespaces.mount);
        }
        if (namespaces?.uts !== undefined) {
          await setValue("security.advanced.namespacesUts", namespaces.uts);
        }
        if (namespaces?.ipc !== undefined) {
          await setValue("security.advanced.namespacesIpc", namespaces.ipc);
        }
        if (namespaces?.user !== undefined) {
          await setValue("security.advanced.namespacesUser", namespaces.user);
        }
      } else {
        // Use the field map to get the setting path
        const settingPath = this.getSettingPath(field as keyof SecurityConfig);
        if (settingPath) {
          await setValue(settingPath, value);
        }
      }
    }
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
    this.disposables = [];
    this.configChangeCallbacks = [];
  }
}
