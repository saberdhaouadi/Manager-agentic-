import { useState, useEffect, useRef } from "react";

const SYSTEM_SECURITY = `You are an elite AWS Cloud Security Agent. Your job is to evaluate AWS infrastructure for security risks.

When given AWS resource data or a description, you:
1. Identify specific security vulnerabilities and misconfigurations
2. Reference the exact AWS service, resource type, and CIS/NIST control violated
3. Assign severity: CRITICAL / HIGH / MEDIUM / LOW
4. Provide a concise remediation command or console step
5. Prioritize actionable findings over theory

Format each finding as:
[SEVERITY] Service/Resource — Issue — Remediation

Be direct, technical, and precise. No fluff. Act like a senior cloud security engineer doing a live audit.`;

const SYSTEM_COST = `You are an elite AWS Cloud Cost Optimization Agent. Your job is to identify waste, over-provisioning, and savings opportunities.

When given AWS resource data or a description, you:
1. Identify specific cost waste: idle resources, over-provisioned instances, missing reservations, orphaned storage
2. Estimate monthly savings where possible (e.g. "~$240/mo")
3. Reference the exact service and optimization lever (RI, Savings Plan, right-size, delete, schedule)
4. Provide a concrete next action

Format each finding as:
[IMPACT: $$$] Service/Resource — Waste Identified — Action

Be direct, numerical, and ROI-focused. Act like a FinOps engineer doing a live cost audit.`;

const PRESETS = [
  {
    label: "EC2 fleet scan",
    value: "We have 47 EC2 instances: mix of t3.large and m5.xlarge, many running 24/7. Several have public IPs and wide-open security groups (0.0.0.0/0 on port 22). Some are at 5-15% CPU utilization consistently. No reserved instances purchased.",
  },
  {
    label: "S3 + IAM audit",
    value: "Multiple S3 buckets, two are publicly accessible with no encryption. IAM has 30+ users, many with AdministratorAccess policy. Several access keys are 400+ days old and never rotated. CloudTrail is enabled only in us-east-1.",
  },
  {
    label: "RDS & Lambda review",
    value: "RDS Multi-AZ db.r5.2xlarge running at 20% CPU. No automated backups beyond 7 days. Lambda functions with 1024MB memory allocated but avg 120MB used. Several Lambda functions have roles with wildcard resource permissions.",
  },
  {
    label: "Full environment",
    value: "Production AWS account: 60+ EC2 instances (no RIs), 3 public S3 buckets, RDS at low utilization, no GuardDuty enabled, root account used for deployments, CloudWatch logs not encrypted, 15 unattached EBS volumes totaling 2TB, NAT Gateway with minimal traffic.",
  },
];

const severityColor = (text) => {
  if (text.includes("CRITICAL")) return "#ff4444";
  if (text.includes("HIGH")) return "#ff8c00";
  if (text.includes("MEDIUM")) return "#f0c040";
  if (text.includes("LOW")) return "#4caf7d";
  if (text.includes("$$$")) return "#ff6b35";
  if (text.includes("$$")) return "#f0a500";
  if (text.includes("$")) return "#a8c070";
  return "#8899aa";
};

function FindingLine({ line }) {
  const color = severityColor(line);
  const isBold = line.match(/^\[/);
  return (
    <div style={{
      padding: "6px 10px",
      borderLeft: isBold ? `3px solid ${color}` : "3px solid transparent",
      marginBottom: 4,
      background: isBold ? `${color}11` : "transparent",
      borderRadius: "0 6px 6px 0",
      fontSize: 13,
      lineHeight: 1.6,
      color: isBold ? "#e8edf2" : "#8899aa",
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      transition: "all 0.2s",
    }}>
      {isBold ? (
        <>
          <span style={{ color, fontWeight: 700 }}>{line.match(/\[.*?\]/)?.[0]}</span>
          <span style={{ color: "#c8d8e8" }}>{line.replace(/\[.*?\]/, "")}</span>
        </>
      ) : line}
    </div>
  );
}

function AgentPanel({ title, icon, color, accentGradient, systemPrompt, agentKey, sharedInput, isRunning, setIsRunning, result, setResult }) {
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isRunning) {
      runAgent();
    }
  }, [isRunning]);

  const runAgent = async () => {
    if (!sharedInput.trim()) return;
    setThinking(true);
    setResult("");
    setError("");
    try {
      const res = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemPrompt,
          message: sharedInput,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data.text);
    } catch (e) {
      setError(e.message);
    } finally {
      setThinking(false);
      setIsRunning(false);
    }
  };

  const lines = result.split("\n").filter(l => l.trim());

  return (
    <div style={{
      flex: 1,
      background: "#0d1117",
      border: `1px solid ${color}33`,
      borderRadius: 16,
      overflow: "hidden",
      display: "flex",
      flexDirection: "column",
      boxShadow: `0 0 40px ${color}15`,
      minWidth: 0,
    }}>
      <div style={{
        background: `linear-gradient(135deg, ${accentGradient})`,
        padding: "16px 20px",
        display: "flex",
        alignItems: "center",
        gap: 12,
      }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "0.05em", fontFamily: "'Space Grotesk', sans-serif" }}>{title}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", fontFamily: "monospace" }}>
            {agentKey === "security" ? "IAM · SG · S3 · GuardDuty · CloudTrail" : "CE · EC2 · RDS · Lambda · EBS"}
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: thinking ? "#ffcc00" : result ? "#4caf7d" : "#444",
            boxShadow: thinking ? "0 0 8px #ffcc00" : result ? "0 0 8px #4caf7d" : "none",
            animation: thinking ? "pulse 1s infinite" : "none",
          }} />
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: "monospace" }}>
            {thinking ? "SCANNING..." : result ? "COMPLETE" : "IDLE"}
          </span>
        </div>
      </div>

      <div style={{
        flex: 1,
        padding: 16,
        overflowY: "auto",
        minHeight: 320,
        maxHeight: 480,
      }}>
        {thinking && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "20px 0" }}>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{
                height: 14,
                borderRadius: 4,
                background: `linear-gradient(90deg, #1a2030 25%, #2a3040 50%, #1a2030 75%)`,
                backgroundSize: "200% 100%",
                animation: `shimmer 1.5s infinite ${i * 0.2}s`,
                width: `${70 + Math.random() * 30}%`,
              }} />
            ))}
            <div style={{ color: "#4466aa", fontSize: 12, fontFamily: "monospace", marginTop: 8 }}>
              {agentKey === "security" ? "► Analyzing security posture..." : "► Calculating cost inefficiencies..."}
            </div>
          </div>
        )}

        {error && (
          <div style={{
            padding: 12, background: "#ff444420", border: "1px solid #ff4444",
            borderRadius: 8, color: "#ff8888", fontSize: 12, fontFamily: "monospace"
          }}>⚠ {error}</div>
        )}

        {result && !thinking && (
          <div>
            {lines.map((line, i) => (
              <FindingLine key={i} line={line} />
            ))}
          </div>
        )}

        {!thinking && !result && !error && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: "100%", gap: 10, opacity: 0.3, paddingTop: 60,
          }}>
            <span style={{ fontSize: 40 }}>{icon}</span>
            <span style={{ fontSize: 12, fontFamily: "monospace", color: "#667" }}>Awaiting scan input...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [input, setInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [secRunning, setSecRunning] = useState(false);
  const [costRunning, setCostRunning] = useState(false);
  const [secResult, setSecResult] = useState("");
  const [costResult, setCostResult] = useState("");
  const [scanCount, setScanCount] = useState(0);

  const handleScan = () => {
    if (!input.trim() || scanning) return;
    setScanning(true);
    setScanCount(c => c + 1);
    setSecResult("");
    setCostResult("");
    setSecRunning(true);
    setCostRunning(true);
  };

  useEffect(() => {
    if (!secRunning && !costRunning && scanning) {
      setScanning(false);
    }
  }, [secRunning, costRunning]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080c12",
      fontFamily: "'Inter', sans-serif",
      padding: "28px 24px",
      boxSizing: "border-box",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing: border-box; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        textarea:focus { outline: none; }
        textarea { resize: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0d1117; }
        ::-webkit-scrollbar-thumb { background: #2a3a50; border-radius: 4px; }
      `}</style>

      <div style={{ textAlign: "center", marginBottom: 28, animation: "fadeIn 0.6s ease" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #1a4a8a, #0a2a5a)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, border: "1px solid #2a4a8a"
          }}>☁</div>
          <h1 style={{
            margin: 0, fontSize: 22, fontWeight: 800,
            fontFamily: "'Space Grotesk', sans-serif",
            background: "linear-gradient(90deg, #4a9eff, #e040fb, #ff6b35)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: "-0.02em",
          }}>AWS AI Agent Command Center</h1>
        </div>
        <p style={{ margin: 0, color: "#445566", fontSize: 12, fontFamily: "monospace" }}>
          DUAL AUTONOMOUS AGENTS · SECURITY + COST INTELLIGENCE · PARALLEL EXECUTION
        </p>
      </div>

      <div style={{
        background: "#0d1117",
        border: "1px solid #1a2535",
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        animation: "fadeIn 0.6s ease 0.1s both",
      }}>
        <div style={{ fontSize: 11, color: "#445566", fontFamily: "monospace", marginBottom: 8, letterSpacing: "0.08em" }}>
          ► DESCRIBE YOUR AWS ENVIRONMENT OR PASTE RESOURCE DATA
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => setInput(p.value)} style={{
              padding: "4px 10px", borderRadius: 6, border: "1px solid #1e3050",
              background: "#0a1520", color: "#5588bb", fontSize: 11,
              fontFamily: "monospace", cursor: "pointer", transition: "all 0.15s",
            }}>
              {p.label}
            </button>
          ))}
        </div>

        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="e.g. We have 30 EC2 instances, several with public IPs and port 22 open to 0.0.0.0/0..."
          rows={4}
          style={{
            width: "100%", background: "#060a0f", border: "1px solid #1a2535",
            borderRadius: 8, padding: "10px 12px", color: "#c8d8e8",
            fontSize: 13, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6,
          }}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
          <span style={{ fontSize: 11, color: "#334455", fontFamily: "monospace" }}>
            {scanCount > 0 ? `${scanCount} scan${scanCount > 1 ? "s" : ""} executed` : "Ready to scan"}
          </span>
          <button
            onClick={handleScan}
            disabled={!input.trim() || scanning}
            style={{
              padding: "9px 24px", borderRadius: 8, border: "none",
              background: scanning ? "#1a2535" : "linear-gradient(135deg, #1a4a9a, #6a1a9a)",
              color: scanning ? "#445566" : "#fff",
              fontSize: 13, fontWeight: 700,
              fontFamily: "'Space Grotesk', sans-serif",
              cursor: scanning || !input.trim() ? "not-allowed" : "pointer",
              letterSpacing: "0.05em", transition: "all 0.2s",
              boxShadow: scanning ? "none" : "0 4px 20px #3a2a6a55",
            }}
          >
            {scanning ? "⟳  AGENTS RUNNING..." : "⚡  LAUNCH BOTH AGENTS"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 14, animation: "fadeIn 0.6s ease 0.2s both", flexWrap: "wrap" }}>
        <AgentPanel
          title="Security Guardian" icon="🛡" color="#4a9eff"
          accentGradient="#0a2a5a 0%, #1a3a7a 100%"
          systemPrompt={SYSTEM_SECURITY} agentKey="security"
          sharedInput={input} isRunning={secRunning}
          setIsRunning={setSecRunning} result={secResult} setResult={setSecResult}
        />
        <AgentPanel
          title="Cost Optimizer" icon="💰" color="#ff6b35"
          accentGradient="#3a1a0a 0%, #6a2a0a 100%"
          systemPrompt={SYSTEM_COST} agentKey="cost"
          sharedInput={input} isRunning={costRunning}
          setIsRunning={setCostRunning} result={costResult} setResult={setCostResult}
        />
      </div>

      <div style={{
        marginTop: 14, display: "flex", gap: 16, flexWrap: "wrap",
        padding: "10px 14px", background: "#0a0e14",
        borderRadius: 10, border: "1px solid #111820",
      }}>
        {[
          ["CRITICAL", "#ff4444"], ["HIGH", "#ff8c00"], ["MEDIUM", "#f0c040"], ["LOW", "#4caf7d"],
          ["$$$ IMPACT", "#ff6b35"], ["$$ IMPACT", "#f0a500"], ["$ IMPACT", "#a8c070"],
        ].map(([label, color]) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
            <span style={{ fontSize: 10, fontFamily: "monospace", color: "#445566" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
