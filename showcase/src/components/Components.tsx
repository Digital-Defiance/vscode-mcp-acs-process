import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import "./Components.css";

interface Feature {
  title: string;
  description: string;
  icon: string;
  tech: string[];
  highlights: string[];
  category: "Core" | "Interfaces" | "Security" | "Errors" | "Builders";
}

const features: Feature[] = [
  {
    title: "Process Management",
    icon: "🚀",
    description:
      "Launch, monitor, and control processes with custom arguments and environment variables. Real-time CPU, memory, and I/O monitoring with graceful or forced termination.",
    tech: ["Process Control", "Monitoring", "Resource Tracking"],
    category: "Core",
    highlights: [
      "Launch processes with custom arguments and environment",
      "Real-time CPU, memory, and I/O monitoring",
      "Graceful (SIGTERM) or forced (SIGKILL) termination",
      "Process tree view with real-time updates",
      "Detailed resource usage statistics in webview",
    ],
  },
  {
    title: "17 LSP Features",
    icon: "🎨",
    description:
      "Comprehensive Language Server Protocol integration with 7 types of code lens actions, semantic tokens, signature help, diagnostics, and more for enhanced development.",
    tech: ["LSP", "Code Intelligence", "AI Integration"],
    category: "Interfaces",
    highlights: [
      "Enhanced Code Lens: Launch, Terminate, Send, Get Output, Monitor",
      "Semantic Tokens: Syntax highlighting for process functions",
      "Inlay Hints: Parameter names and type hints (%, MB units)",
      "Signature Help: Function signatures with documentation",
      "Diagnostics: Real-time security warnings and best practices",
    ],
  },
  {
    title: "6-Layer Security",
    icon: "🛡️",
    description:
      "Multi-layer security with executable allowlist, resource limits, security dashboard, audit logging, and comprehensive validation to protect against malicious operations.",
    tech: ["Security", "Validation", "Audit Logging"],
    category: "Security",
    highlights: [
      "Executable Allowlist: Only pre-approved executables can run",
      "Resource Limits: CPU, memory, and time limits enforced",
      "Security Dashboard: View all boundaries in tree view",
      "Audit Logging: Complete operation tracking",
      "Multi-Layer Validation: 6 layers of security checks",
    ],
  },
  {
    title: "Real-Time Monitoring",
    icon: "📊",
    description:
      "Monitor process resource usage in real-time with beautiful charts and metrics. Track CPU percentage, memory usage, I/O operations, and more.",
    tech: ["Monitoring", "Metrics", "Visualization"],
    category: "Core",
    highlights: [
      "CPU percentage tracking with visual indicators",
      "Memory usage monitoring (RSS, heap, external)",
      "I/O operations and network statistics",
      "Beautiful charts and metrics in webview",
      "Auto-refresh with configurable intervals",
    ],
  },
  {
    title: "AI Integration",
    icon: "🤖",
    description:
      "Seamless integration with AI agents through MCP Protocol. GitHub Copilot can manage processes through LSP, with full visibility and security enforcement.",
    tech: ["MCP Protocol", "Copilot", "AI Agents"],
    category: "Interfaces",
    highlights: [
      "MCP Protocol: Works with Kiro, Claude Desktop, etc.",
      "GitHub Copilot Ready: Manage processes through LSP",
      "Code Lens Integration: AI sees inline actions",
      "Context Providers: Full visibility into running processes",
      "Secure by Default: AI cannot bypass security",
    ],
  },
  {
    title: "Visual Interface",
    icon: "📊",
    description:
      "Beautiful process tree view, security tree view, and statistics webview. See all running processes, security boundaries, and metrics at a glance.",
    tech: ["UI", "Tree View", "Webview"],
    category: "Core",
    highlights: [
      "Process Tree View: See all running processes",
      "Security Tree View: Understand security boundaries",
      "Statistics Webview: Beautiful charts and metrics",
      "Real-Time Updates: Auto-refresh process list",
      "Activity Bar Integration: Quick access to all features",
    ],
  },
  {
    title: "Resource Limits",
    icon: "⏱️",
    description:
      "Configure CPU, memory, file descriptor, and time limits. Enforce limits strictly or with warnings, and terminate processes that violate limits.",
    tech: ["Resource Control", "Limits", "Enforcement"],
    category: "Security",
    highlights: [
      "CPU usage limits (0-100%)",
      "Memory limits (MB)",
      "File descriptor limits",
      "CPU time limits (seconds)",
      "Strict or warning-based enforcement",
    ],
  },
  {
    title: "50+ Configuration Options",
    icon: "⚙️",
    description:
      "Comprehensive configuration with 50+ settings organized into 9 categories. Configure via VS Code settings UI or settings.json for advanced users.",
    tech: ["Configuration", "Settings", "Customization"],
    category: "Core",
    highlights: [
      "9 logical configuration categories",
      "Server, timeout, and connection settings",
      "Executable control and argument validation",
      "Resource limits and process limits",
      "Rate limiting and audit logging",
    ],
  },
];

const Components = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="components section" id="components" ref={ref}>
      <motion.div
        className="components-container"
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
      >
        <h2 className="section-title">
          Core <span className="gradient-text">Features</span> & Capabilities
        </h2>
        <p className="components-subtitle">
          Process management with enterprise-grade security for AI agents
        </p>

        <motion.div
          className="suite-intro"
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h3>
            Secure <em>process management</em> for <em>AI agents</em> with comprehensive <em>security boundaries</em>
          </h3>
          <p>
            <strong>
              MCP ACS Process Manager brings enterprise-grade process control to AI agents
            </strong>{" "}
            with comprehensive security enforcement. Launch processes with custom arguments,
            monitor CPU and memory usage in real-time, enforce resource limits, and terminate
            processes gracefully - all within strict security boundaries that protect your
            system from malicious operations.
          </p>
          <div className="problem-solution">
            <div className="problem">
              <h4>❌ The Challenge: AI Agents Need Safe Process Control</h4>
              <ul>
                <li>Preventing execution of malicious or unauthorized programs</li>
                <li>Enforcing CPU, memory, and time limits for spawned processes</li>
                <li>Monitoring resource usage and detecting violations</li>
                <li>Rate limiting to prevent process spam and abuse</li>
                <li>Audit logging for accountability and forensics</li>
              </ul>
              <p>
                <strong>Result:</strong> AI agents either can't manage processes or have unsafe unlimited access.
              </p>
            </div>
            <div className="solution">
              <h4>✅ The Solution: 6-Layer Security with Process Management</h4>
              <p>
                <strong>MCP ACS Process Manager</strong> provides{" "}
                <strong>executable allowlist</strong> to only allow pre-approved programs,{" "}
                <strong>resource limits</strong> for CPU, memory, and time,{" "}
                <strong>security dashboard</strong> to visualize all boundaries,
                and <strong>complete audit logging</strong> for forensics.
              </p>
              <p>
                Built on <strong>Model Context Protocol</strong> with seamless{" "}
                <strong>GitHub Copilot integration</strong>, it enables AI agents to
                manage processes safely. 17 Language Server Protocol features provide
                code intelligence, diagnostics, and inline actions. Monitor processes
                with beautiful charts, terminate them gracefully, and track resource
                usage in real-time.
              </p>
            </div>
          </div>
          <div className="value-props">
            <div className="value-prop">
              <strong>🛡️ 6-Layer Security</strong>
              <p>
                Executable allowlist, resource limits, validation, audit logging,
                and security dashboard
              </p>
            </div>
            <div className="value-prop">
              <strong>📊 Real-Time Monitoring</strong>
              <p>
                Track CPU, memory, I/O operations with beautiful charts and metrics
              </p>
            </div>
            <div className="value-prop">
              <strong>🎨 17 LSP Features</strong>
              <p>
                Code lens, semantic tokens, diagnostics, signature help, and more
              </p>
            </div>
            <div className="value-prop">
              <strong>🤖 AI Integration</strong>
              <p>
                MCP protocol support with GitHub Copilot integration and context
                providers
              </p>
            </div>
          </div>
        </motion.div>

        <div className="components-grid">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="component-card card"
              initial={{ opacity: 0, y: 50 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.1, duration: 0.6 }}
            >
              <div className="component-header">
                <div className="component-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <span
                  className={`component-badge ${feature.category.toLowerCase()}`}
                >
                  {feature.category}
                </span>
              </div>

              <p className="component-description">{feature.description}</p>

              <ul className="component-highlights">
                {feature.highlights.map((highlight, i) => (
                  <li key={i}>{highlight}</li>
                ))}
              </ul>

              <div className="component-tech">
                {feature.tech.map((tech) => (
                  <span key={tech} className="tech-badge">
                    {tech}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
};

export default Components;
