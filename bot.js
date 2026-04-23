// AWS AI Agent Telegram Bot
// Stack: Node.js + Telegraf + Anthropic SDK
// -----------------------------------------

import Anthropic from "@anthropic-ai/sdk";
import { Telegraf, Markup } from "telegraf";

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── System Prompts ───────────────────────────────────────────────────────────

const SYSTEM_SECURITY = `You are an elite AWS Cloud Security Agent. Evaluate AWS infrastructure for security risks.

For each finding output EXACTLY this format (one per line):
🔴 [CRITICAL] or 🟠 [HIGH] or 🟡 [MEDIUM] or 🟢 [LOW]
Service: <aws service>
Issue: <specific problem>
Fix: <exact remediation step>
---

Be direct, technical, concise. Max 6 findings. No intro text.`;

const SYSTEM_COST = `You are an elite AWS FinOps Cost Optimization Agent. Identify waste and savings.

For each finding output EXACTLY this format (one per line):
💸 [IMPACT: $$$] or [IMPACT: $$] or [IMPACT: $]
Service: <aws service>
Waste: <what is wasted>
Saving: ~$<amount>/mo
Action: <exact next step>
---

Be direct, numerical, ROI-focused. Max 6 findings. No intro text.`;

// ─── Claude API Call ──────────────────────────────────────────────────────────

async function runAgent(systemPrompt, userInput) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: "user", content: userInput }],
  });
  return response.content[0].text;
}

// ─── User Sessions ────────────────────────────────────────────────────────────

const sessions = {}; // store pending input per user

// ─── Commands ─────────────────────────────────────────────────────────────────

bot.start((ctx) => {
  ctx.replyWithMarkdown(
    `☁️ *AWS AI Agent Command Center*\n\n` +
    `I run two autonomous agents on your AWS environment:\n\n` +
    `🛡 *Security Guardian* — finds misconfigs, IAM issues, exposed resources\n` +
    `💰 *Cost Optimizer* — finds waste, idle resources, savings opportunities\n\n` +
    `*Commands:*\n` +
    `/scan — Run both agents\n` +
    `/security — Security audit only\n` +
    `/cost — Cost audit only\n` +
    `/help — Show examples\n\n` +
    `_Just describe your AWS environment in plain text._`,
    Markup.keyboard([
      ["🔍 /scan", "🛡 /security"],
      ["💰 /cost", "❓ /help"],
    ]).resize()
  );
});

bot.help((ctx) => {
  ctx.replyWithMarkdown(
    `*Example inputs you can send after a command:*\n\n` +
    `▸ _We have 40 EC2 instances, some with port 22 open to 0.0.0.0/0, no GuardDuty enabled_\n\n` +
    `▸ _3 public S3 buckets, IAM users with AdministratorAccess, keys not rotated in 1 year_\n\n` +
    `▸ _RDS at 15% CPU, Lambda with 1024MB allocated, 20 unattached EBS volumes, no RIs purchased_\n\n` +
    `▸ _Production account: 60 EC2s running 24/7, root account used for deployments, no CloudTrail in eu-west_`
  );
});

// ─── /scan ────────────────────────────────────────────────────────────────────

bot.command("scan", (ctx) => {
  sessions[ctx.from.id] = { mode: "scan" };
  ctx.reply(
    "🔍 FULL SCAN MODE\n\nDescribe your AWS environment and I'll run both Security + Cost agents in parallel:"
  );
});

// ─── /security ────────────────────────────────────────────────────────────────

bot.command("security", (ctx) => {
  sessions[ctx.from.id] = { mode: "security" };
  ctx.reply(
    "🛡 SECURITY AUDIT MODE\n\nDescribe your AWS environment and I'll audit it for security issues:"
  );
});

// ─── /cost ────────────────────────────────────────────────────────────────────

bot.command("cost", (ctx) => {
  sessions[ctx.from.id] = { mode: "cost" };
  ctx.reply(
    "💰 COST OPTIMIZATION MODE\n\nDescribe your AWS environment and I'll find waste and savings:"
  );
});

// ─── Message Handler ──────────────────────────────────────────────────────────

bot.on("text", async (ctx) => {
  const userId = ctx.from.id;
  const text = ctx.message.text;
  const session = sessions[userId];

  if (!session) {
    ctx.reply(
      "Use a command first:\n/scan — both agents\n/security — security only\n/cost — cost only"
    );
    return;
  }

  const { mode } = session;
  delete sessions[userId];

  if (mode === "scan") {
    // Run both agents in parallel
    await ctx.reply("⚡ Launching both agents in parallel...");

    const [secMsg, costMsg] = await Promise.allSettled([
      ctx.reply("🛡 Security Guardian scanning..."),
      ctx.reply("💰 Cost Optimizer scanning..."),
    ]);

    const [secResult, costResult] = await Promise.allSettled([
      runAgent(SYSTEM_SECURITY, text),
      runAgent(SYSTEM_COST, text),
    ]);

    // Security results
    if (secResult.status === "fulfilled") {
      await ctx.replyWithMarkdown(
        `🛡 *SECURITY FINDINGS*\n\n${secResult.value}`
      );
    } else {
      await ctx.reply(`🛡 Security Agent error: ${secResult.reason.message}`);
    }

    // Cost results
    if (costResult.status === "fulfilled") {
      await ctx.replyWithMarkdown(
        `💰 *COST FINDINGS*\n\n${costResult.value}`
      );
    } else {
      await ctx.reply(`💰 Cost Agent error: ${costResult.reason.message}`);
    }

    await ctx.reply(
      "✅ Scan complete.\n\nRun /scan again or use /security /cost for focused audits."
    );

  } else if (mode === "security") {
    await ctx.reply("🛡 Security Guardian scanning...");
    try {
      const result = await runAgent(SYSTEM_SECURITY, text);
      await ctx.replyWithMarkdown(`🛡 *SECURITY FINDINGS*\n\n${result}`);
    } catch (e) {
      await ctx.reply(`Error: ${e.message}`);
    }

  } else if (mode === "cost") {
    await ctx.reply("💰 Cost Optimizer scanning...");
    try {
      const result = await runAgent(SYSTEM_COST, text);
      await ctx.replyWithMarkdown(`💰 *COST FINDINGS*\n\n${result}`);
    } catch (e) {
      await ctx.reply(`Error: ${e.message}`);
    }
  }
});

// ─── Launch ───────────────────────────────────────────────────────────────────

bot.launch();
console.log("🤖 AWS AI Agent Bot is running...");

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
