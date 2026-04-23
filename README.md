# Manager-agentic# ☁️ AWS AI Agent Command Center

> Dual autonomous AI agents for AWS **Security Auditing** and **Cost Optimization** — powered by Claude AI.

---

## 🤖 Agents

### 🛡 Security Guardian
Evaluates your AWS environment for security risks:
- IAM misconfigurations & overprivileged roles
- Open Security Groups (`0.0.0.0/0`)
- Public S3 buckets & missing encryption
- Stale access keys & root account usage
- GuardDuty / CloudTrail coverage gaps

Findings tagged: `[CRITICAL]` `[HIGH]` `[MEDIUM]` `[LOW]`

### 💰 Cost Optimizer
Identifies waste and savings opportunities:
- Idle & over-provisioned EC2 instances
- Missing Reserved Instances / Savings Plans
- Orphaned EBS volumes & underused RDS
- Lambda memory over-allocation
- Estimated monthly savings per finding

Findings tagged: `[$$$]` `[$$]` `[$]`

---

## ⚡ Features

- Both agents run **in parallel** simultaneously
- Pre-built environment presets for quick testing
- Color-coded severity system
- Built with React + Anthropic Claude API

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Anthropic API key → [console.anthropic.com](https://console.anthropic.com)

### Install & Run

```bash
git clone https://github.com/YOUR_USERNAME/aws-ai-agents.git
cd aws-ai-agents
npm install
npm run dev
```

### API Key Setup

The app calls the Anthropic API directly from the browser (demo mode).  
For production, create a backend proxy and set:

```env
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

---

## 🏗 Tech Stack

| Layer | Tech |
|-------|------|
| UI | React + Tailwind |
| AI | Anthropic Claude Sonnet |
| Build | Vite |

---

## 📁 Project Structure

```
aws-ai-agents/
├── aws-ai-agents.jsx   # Main dashboard component
└── README.md
```

---

## ☁️ Roadmap

- [ ] Real AWS SDK integration (live resource scanning)
- [ ] Export findings as PDF report
- [ ] Slack / email alerting
- [ ] Historical scan comparison
- [ ] Multi-account support

---

Built with ❤️ using Claude AI by Anthropic
-
