import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Home,
  ListChecks,
  Users,
  Trophy,
  UserRound,
  Gift,
  ChevronRight,
  CheckCircle2,
  Copy,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import "./styles.css";

const API =
  import.meta.env.VITE_API_URL ||
  "https://aeromint-v2-backend-production.up.railway.app";

const tg = window.Telegram?.WebApp;

const demoTasks = [
  {
    id: 1,
    title: "Join AeroMint Channel",
    reward: 500,
    type: "channel_join",
  },
  {
    id: 2,
    title: "Daily Check-in",
    reward: 250,
    type: "daily",
  },
];

function App() {
  const [tab, setTab] = useState("home");

  const [dashboard, setDashboard] = useState({
    points: 0,
    level: 1,
    dailyProgress: 0,
  });

  const [tasks, setTasks] = useState(demoTasks);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Telegram Mini App initialization
    if (tg) {
      tg.ready();
      tg.expand();

      tg.setHeaderColor?.("#07130d");
      tg.setBackgroundColor?.("#07130d");
    }

    // Load dashboard and tasks
    Promise.all([
      fetch(`${API}/api/dashboard`)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Dashboard API error");
          }

          return response.json();
        })
        .catch(() => null),

      fetch(`${API}/api/tasks`)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Tasks API error");
          }

          return response.json();
        })
        .catch(() => null),
    ])
      .then(([dashboardData, taskData]) => {
        if (dashboardData) {
          setDashboard({
            points: Number(dashboardData.points || 0),
            level: Number(dashboardData.level || 1),
            dailyProgress: Number(
              dashboardData.dailyProgress || 0
            ),
          });
        }

        if (Array.isArray(taskData)) {
          setTasks(taskData);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Telegram user
  const user = tg?.initDataUnsafe?.user;

  const firstName =
    user?.first_name || "AeroMiner";

  const username = user?.username
    ? `@${user.username}`
    : "Telegram User";

  // Personal referral link
  const referralLink = user?.id
    ? `https://t.me/AeroMintXBot?start=ref_${user.id}`
    : "https://t.me/AeroMintXBot";

  // Copy referral link
  const copyReferral = async () => {
    try {
      await navigator.clipboard?.writeText(referralLink);

      if (tg?.showPopup) {
        tg.showPopup({
          title: "Referral link",
          message: "Referral link copied!",
          buttons: [{ type: "ok" }],
        });
      }
    } catch {
      // Clipboard may not be available
    }
  };

  // Open Telegram share
  const shareReferral = () => {
    const shareUrl =
      `https://t.me/share/url?url=${encodeURIComponent(
        referralLink
      )}`;

    if (tg?.openTelegramLink) {
      tg.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, "_blank");
    }
  };

  // Demo task completion UI
  const completeTask = (taskId) => {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId
          ? { ...task, done: true }
          : task
      )
    );
  };

  return (
    <div className="app">
      {/* HEADER */}
      <header>
        <div className="brand">
          <div className="logo">
            <Sparkles />
          </div>

          <div>
            <b>AeroMint</b>
            <small>Airdrop Hub</small>
          </div>
        </div>

        <span className="secure">
          <ShieldCheck />
          Secure
        </span>
      </header>

      {/* MAIN CONTENT */}
      <main>
        {/* HOME */}
        {tab === "home" && (
          <>
            <section className="hero card">
              <p>
                Welcome back, {firstName} 👋
              </p>

              <div className="balance">
                {loading
                  ? "..."
                  : dashboard.points.toLocaleString()}
                <i> AMT</i>
              </div>

              <small>Available balance</small>

              <div className="level">
                <span>
                  Level {dashboard.level}
                </span>

                <span>
                  {Math.min(
                    dashboard.dailyProgress,
                    100
                  )}
                  % progress
                </span>
              </div>

              <div className="progress">
                <div
                  style={{
                    width: `${Math.min(
                      dashboard.dailyProgress,
                      100
                    )}%`,
                  }}
                />
              </div>
            </section>

            {/* STATS */}
            <div className="stats">
              <Stat
                icon={<Gift />}
                label="Daily reward"
                value="+250 AMT"
              />

              <Stat
                icon={<Users />}
                label="Referrals"
                value="1"
              />

              <Stat
                icon={<Trophy />}
                label="Rank"
                value="#—"
              />
            </div>

            <Title t="Quick actions" />

            <div className="grid">
              <Action
                t="Complete Tasks"
                s="Earn AMT"
                icon={<ListChecks />}
                go={() => setTab("tasks")}
              />

              <Action
                t="Invite Friends"
                s="Grow your team"
                icon={<Users />}
                go={() => setTab("invite")}
              />
            </div>

            <Title t="Daily check-in" />

            <div className="daily card">
              <Gift />

              <div>
                <b>Claim your daily reward</b>

                <small>
                  Come back every day for more AMT
                </small>
              </div>

              <button
                onClick={() => setTab("tasks")}
              >
                Claim
              </button>
            </div>
          </>
        )}

        {/* TASKS */}
        {tab === "tasks" && (
          <>
            <Page
              t="Tasks"
              s="Complete activities to earn AMT"
            />

            {tasks.length === 0 ? (
              <div className="empty card">
                <ListChecks />

                <h2>No tasks available</h2>

                <p>
                  New tasks will appear here.
                </p>
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  className="task card"
                  key={task.id}
                >
                  <div className="ico">
                    <ListChecks />
                  </div>

                  <div>
                    <b>{task.title}</b>

                    <small>
                      Reward: {task.reward || 0} AMT
                    </small>
                  </div>

                  <button
                    onClick={() =>
                      completeTask(task.id)
                    }
                  >
                    {task.done ? (
                      <CheckCircle2 />
                    ) : (
                      "Start"
                    )}
                  </button>
                </div>
              ))
            )}

            <div className="notice">
              Rewards will be enabled after secure
              Telegram verification and server-side
              task verification.
            </div>
          </>
        )}

        {/* INVITE */}
        {tab === "invite" && (
          <>
            <Page
              t="Invite & Earn"
              s="Invite friends and grow your team"
            />

            <section className="invite card">
              <Users />

              <h2>Build your team</h2>

              <p>
                Share your personal AeroMint
                referral link with friends on
                Telegram.
              </p>

              <div className="ref">
                <span>{referralLink}</span>

                <button onClick={copyReferral}>
                  <Copy />
                </button>
              </div>

              <button
                className="primary"
                onClick={shareReferral}
              >
                <Send />
                Share link
              </button>
            </section>
          </>
        )}

        {/* RANK */}
        {tab === "rank" && (
          <>
            <Page
              t="Leaderboard"
              s="Top AeroMiners by AMT points"
            />

            <section className="empty card">
              <Trophy />

              <h2>
                Leaderboard coming next
              </h2>

              <p>
                The ranking API will be connected
                to PostgreSQL next.
              </p>
            </section>
          </>
        )}

        {/* PROFILE */}
        {tab === "profile" && (
          <>
            <Page
              t="Profile"
              s="Your AeroMint account"
            />

            <section className="profile card">
              <div className="avatar">
                {firstName.charAt(0).toUpperCase()}
              </div>

              <h2>{firstName}</h2>

              <p>{username}</p>

              <div className="rows">
                <div>
                  <span>Balance</span>

                  <b>
                    {dashboard.points.toLocaleString()} AMT
                  </b>
                </div>

                <div>
                  <span>Level</span>

                  <b>{dashboard.level}</b>
                </div>

                <div>
                  <span>Telegram ID</span>

                  <b>{user?.id || "—"}</b>
                </div>
              </div>
            </section>
          </>
        )}
      </main>

      {/* BOTTOM NAVIGATION */}
      <nav>
        <Nav
          active={tab === "home"}
          title="Home"
          icon={<Home />}
          go={() => setTab("home")}
        />

        <Nav
          active={tab === "tasks"}
          title="Tasks"
          icon={<ListChecks />}
          go={() => setTab("tasks")}
        />

        <Nav
          active={tab === "invite"}
          title="Invite"
          icon={<Users />}
          go={() => setTab("invite")}
        />

        <Nav
          active={tab === "rank"}
          title="Rank"
          icon={<Trophy />}
          go={() => setTab("rank")}
        />

        <Nav
          active={tab === "profile"}
          title="Profile"
          icon={<UserRound />}
          go={() => setTab("profile")}
        />
      </nav>
    </div>
  );
}

/* ─────────────────────────────────────
   STAT CARD
───────────────────────────────────── */

function Stat({ icon, label, value }) {
  return (
    <div className="stat card">
      {icon}

      <div>
        <small>{label}</small>
        <b>{value}</b>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────
   ACTION CARD
───────────────────────────────────── */

function Action({ t, s, icon, go }) {
  return (
    <button
      className="action card"
      onClick={go}
    >
      <span>{icon}</span>

      <div>
        <b>{t}</b>
        <small>{s}</small>
      </div>

      <ChevronRight />
    </button>
  );
}

/* ─────────────────────────────────────
   SECTION TITLE
───────────────────────────────────── */

function Title({ t }) {
  return <h3>{t}</h3>;
}

/* ─────────────────────────────────────
   PAGE HEADER
───────────────────────────────────── */

function Page({ t, s }) {
  return (
    <div className="page">
      <h1>{t}</h1>
      <p>{s}</p>
    </div>
  );
}

/* ─────────────────────────────────────
   BOTTOM NAV ITEM
───────────────────────────────────── */

function Nav({
  active,
  title,
  icon,
  go,
}) {
  return (
    <button
      className={active ? "active" : ""}
      onClick={go}
    >
      {icon}
      <span>{title}</span>
    </button>
  );
}

/* ─────────────────────────────────────
   REACT START
───────────────────────────────────── */

const rootElement =
  document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(<App />);
}
