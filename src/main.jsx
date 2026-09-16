import "dotenv/config";
import { Telegraf, Markup } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL =
  process.env.WEBAPP_URL ||
  "https://smartbazar770-creator.github.io/aeromint-v2-miniapp/";

if (!BOT_TOKEN) {
  throw new Error("BOT_TOKEN is missing in Railway Variables");
}

const bot = new Telegraf(BOT_TOKEN);

// ─────────────────────────────────────
// START
// ─────────────────────────────────────

bot.start(async (ctx) => {
  const user = ctx.from;

  const firstName = user.first_name || "AeroMiner";

  await ctx.reply(
    `🌿 Welcome to AeroMint, ${firstName}!\n\n` +
      `🚀 Complete tasks\n` +
      `🎁 Claim daily rewards\n` +
      `👥 Invite friends\n` +
      `🏆 Climb the leaderboard\n\n` +
      `Open the AeroMint Mini App below 👇`,
    Markup.inlineKeyboard([
      [
        Markup.button.webApp(
          "🚀 Open AeroMint",
          WEBAPP_URL
        )
      ],
      [
        Markup.button.callback(
          "📖 How it works",
          "how_it_works"
        )
      ]
    ])
  );
});

// ─────────────────────────────────────
// APP
// ─────────────────────────────────────

bot.command("app", async (ctx) => {
  await ctx.reply(
    "🚀 Open your AeroMint Mini App:",
    Markup.inlineKeyboard([
      [
        Markup.button.webApp(
          "🚀 Open AeroMint",
          WEBAPP_URL
        )
      ]
    ])
  );
});

// ─────────────────────────────────────
// HELP
// ─────────────────────────────────────

bot.command("help", async (ctx) => {
  await ctx.reply(
    `🌿 AeroMint Help\n\n` +
      `🚀 /start — Open AeroMint\n` +
      `📱 /app — Open Mini App\n` +
      `👤 /profile — Your profile\n` +
      `🎯 /tasks — Available tasks\n` +
      `👥 /referral — Referral section\n` +
      `🏆 /rank — Leaderboard\n\n` +
      `All rewards and account data are managed through the AeroMint Mini App.`
  );
});

// ─────────────────────────────────────
// PROFILE
// ─────────────────────────────────────

bot.command("profile", async (ctx) => {
  const user = ctx.from;

  const name = user.first_name || "AeroMiner";
  const username = user.username
    ? `@${user.username}`
    : "Telegram User";

  await ctx.reply(
    `👤 AeroMint Profile\n\n` +
      `Name: ${name}\n` +
      `Username: ${username}\n` +
      `Telegram ID: ${user.id}\n\n` +
      `Open the Mini App to view your full balance, level and activity.`,
    Markup.inlineKeyboard([
      [
        Markup.button.webApp(
          "👤 Open Profile",
          WEBAPP_URL
        )
      ]
    ])
  );
});

// ─────────────────────────────────────
// TASKS
// ─────────────────────────────────────

bot.command("tasks", async (ctx) => {
  await ctx.reply(
    `🎯 AeroMint Tasks\n\n` +
      `Complete available tasks inside the Mini App and check your progress there.`,
    Markup.inlineKeyboard([
      [
        Markup.button.webApp(
          "🎯 View Tasks",
          WEBAPP_URL
        )
      ]
    ])
  );
});

// ─────────────────────────────────────
// REFERRAL
// ─────────────────────────────────────

bot.command("referral", async (ctx) => {
  const userId = ctx.from.id;

  const referralLink =
    `https://t.me/AeroMintXBot?start=ref_${userId}`;

  await ctx.reply(
    `👥 Invite & Earn\n\n` +
      `Share your personal AeroMint referral link with friends.\n\n` +
      `🔗 Your referral link:\n${referralLink}`,
    Markup.inlineKeyboard([
      [
        Markup.button.url(
          "📤 Share Referral Link",
          `https://t.me/share/url?url=${encodeURIComponent(
            referralLink
          )}`
        )
      ],
      [
        Markup.button.webApp(
          "👥 Open Invite",
          WEBAPP_URL
        )
      ]
    ])
  );
});

// ─────────────────────────────────────
// RANK
// ─────────────────────────────────────

bot.command("rank", async (ctx) => {
  await ctx.reply(
    `🏆 AeroMint Leaderboard\n\n` +
      `See the latest leaderboard inside the Mini App.`,
    Markup.inlineKeyboard([
      [
        Markup.button.webApp(
          "🏆 View Leaderboard",
          WEBAPP_URL
        )
      ]
    ])
  );
});

// ─────────────────────────────────────
// DAILY
// ─────────────────────────────────────

bot.command("daily", async (ctx) => {
  await ctx.reply(
    `🎁 Daily Reward\n\n` +
      `Open AeroMint to check and claim today's available reward.`,
    Markup.inlineKeyboard([
      [
        Markup.button.webApp(
          "🎁 Claim Daily Reward",
          WEBAPP_URL
        )
      ]
    ])
  );
});

// ─────────────────────────────────────
// BALANCE
// ─────────────────────────────────────

bot.command("balance", async (ctx) => {
  await ctx.reply(
    `🪙 Your AeroMint balance is available inside the Mini App.`,
    Markup.inlineKeyboard([
      [
        Markup.button.webApp(
          "🪙 View Balance",
          WEBAPP_URL
        )
      ]
    ])
  );
});

// ─────────────────────────────────────
// HOW IT WORKS
// ─────────────────────────────────────

bot.action("how_it_works", async (ctx) => {
  await ctx.answerCbQuery();

  await ctx.reply(
    `🌿 How AeroMint Works\n\n` +
      `1️⃣ Open the Mini App\n` +
      `2️⃣ Complete available tasks\n` +
      `3️⃣ Check your daily reward\n` +
      `4️⃣ Invite friends\n` +
      `5️⃣ Track your progress and rank\n\n` +
      `Your account information is managed through the AeroMint system.`
  );
});

// ─────────────────────────────────────
// UNKNOWN COMMAND / MESSAGE
// ─────────────────────────────────────

bot.on("text", async (ctx) => {
  await ctx.reply(
    `🌿 Welcome to AeroMint!\n\n` +
      `Use the button below to open the AeroMint Mini App.`,
    Markup.inlineKeyboard([
      [
        Markup.button.webApp(
          "🚀 Open AeroMint",
          WEBAPP_URL
        )
      ]
    ])
  );
});

// ─────────────────────────────────────
// ERROR HANDLER
// ─────────────────────────────────────

bot.catch((error) => {
  console.error("AeroMint Bot Error:", error);
});

// ─────────────────────────────────────
// START BOT
// ─────────────────────────────────────

bot.launch().then(() => {
  console.log("🚀 AeroMint Telegram Bot is running");
  console.log(`🌐 Mini App: ${WEBAPP_URL}`);
});

// Graceful shutdown
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
