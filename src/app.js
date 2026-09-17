import './styles.css';

/* =========================================================
   AeroMint Mini App — Step 3
   Frontend
   ========================================================= */

const tg = window.Telegram?.WebApp;

tg?.ready();
tg?.expand();

try {
  if (tg) {
    tg.headerColor = '#06110d';
    tg.backgroundColor = '#06110d';
    tg.enableClosingConfirmation?.();
  }
} catch {}

const API_BASE =
  localStorage.getItem('AEROMINT_API') ||
  'https://aeromint-v2-backend-production.up.railway.app';

const state = {
  page: 'mining',
  me: null,
  dashboard: null,
  mining: null,
  tasks: [],
  referrals: null,
  transactions: [],
  filter: 'all',
  loading: true,
  busy: false,
  error: '',
};

/* =========================================================
   Helpers
   ========================================================= */

const $ = (selector) => document.querySelector(selector);

const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[char]
  );

const fmt = (number, digits = 2) =>
  Number(number || 0).toFixed(digits);

const initData = () =>
  tg?.initData ||
  localStorage.getItem('telegram_init_data') ||
  '';

function clock(seconds) {
  seconds = Math.max(0, Math.floor(Number(seconds) || 0));

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return [h, m, s]
    .map((x) => String(x).padStart(2, '0'))
    .join(':');
}

function initials() {
  const name =
    state.me?.first_name ||
    state.me?.username ||
    'AeroMint';

  return String(name).slice(0, 1).toUpperCase();
}

function notify(message) {
  try {
    if (tg?.showAlert) {
      tg.showAlert(String(message));
      return;
    }
  } catch {}

  alert(String(message));
}

function setPage(page) {
  state.page = page;
  render();

  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  });
}

function navItem(page, icon, label) {
  return `
    <button
      class="nav-item ${state.page === page ? 'active' : ''}"
      data-page="${page}"
      type="button"
    >
      <span>${icon}</span>
      <small>${label}</small>
    </button>
  `;
}

/* =========================================================
   API
   ========================================================= */

async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const data = initData();

  if (data) {
    headers['X-Telegram-Init-Data'] = data;
  }

  const response = await fetch(API_BASE + path, {
    ...options,
    headers,
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error ||
        result.message ||
        `Request failed (${response.status})`
    );
  }

  return result;
}

/* =========================================================
   Refresh all application data
   ========================================================= */

async function refresh(renderAfter = true) {
  try {
    state.error = '';

    const [
      me,
      dashboard,
      mining,
      tasks,
      referrals,
      transactions,
    ] = await Promise.all([
      api('/api/me'),
      api('/api/dashboard'),
      api('/api/mining'),
      api('/api/tasks'),
      api('/api/referrals'),
      api('/api/transactions?limit=30'),
    ]);

    state.me = me;
    state.dashboard = dashboard;
    state.mining = mining;
    state.tasks = tasks?.tasks || [];
    state.referrals = referrals;
    state.transactions = transactions?.transactions || [];
  } catch (error) {
    console.error('AeroMint refresh error:', error);

    state.error =
      error?.message ||
      'Could not connect to AeroMint server.';
  } finally {
    state.loading = false;

    if (renderAfter) {
      render();
    }
  }
}

/* =========================================================
   Main Render
   ========================================================= */

function render() {
  const name =
    state.me?.first_name ||
    state.me?.username ||
    'AeroMint User';

  const balance = fmt(
    state.dashboard?.balance ??
      state.me?.balance ??
      0
  );

  document.body.innerHTML = `
    <div id="app">
      <div class="shell">

        <header class="topbar">

          <div class="brand">
            <img
              src="./assets/aeromint-logo.png"
              alt="AeroMint"
              onerror="this.style.display='none'"
            />

            <div>
              <b>AeroMint</b>
              <span>AMT REWARDS</span>
            </div>
          </div>

          <div class="top-actions">

            <div class="mini-balance">
              ${balance}
              <i>AMT</i>
            </div>

            <button
              id="refreshBtn"
              class="round"
              type="button"
              aria-label="Refresh"
            >
              ↻
            </button>

          </div>

        </header>

        ${
          state.error
            ? `
              <div class="error-banner">
                <span>${esc(state.error)}</span>
                <button id="retry" type="button">
                  Retry
                </button>
              </div>
            `
            : ''
        }

        <main>
          ${pageHTML(name)}
        </main>

        <nav class="bottom-nav">

          ${navItem('mining', '⌁', 'Mining')}

          ${navItem('tasks', '✓', 'Tasks')}

          ${navItem('referrals', '↗', 'Referrals')}

          ${navItem('account', '●', 'Account')}

        </nav>

      </div>
    </div>
  `;

  bind();
}

/* =========================================================
   Page Router
   ========================================================= */

function pageHTML(name) {
  if (state.loading) {
    return `
      <section class="page">

        <div class="skeleton hero"></div>

        <div class="skeleton line"></div>

        <div class="skeleton line short"></div>

        <div class="skeleton card"></div>

      </section>
    `;
  }

  if (state.page === 'tasks') {
    return tasksPage();
  }

  if (state.page === 'referrals') {
    return referralPage();
  }

  if (state.page === 'account') {
    return accountPage(name);
  }

  return miningPage(name);
}

/* =========================================================
   MINING PAGE
   ========================================================= */

function miningPage(name) {
  const mining = state.mining || {};
  const dashboard = state.dashboard || {};

  const progress = Math.max(
    0,
    Math.min(
      100,
      Number(mining.progress_percent || 0)
    )
  );

  const remaining = Number(
    mining.remaining_seconds || 0
  );

  const completed =
    !mining.active &&
    Boolean(mining.session_id);

  const currentReward = Number(
    mining.live_reward || 0
  );

  return `
    <section class="page">

      <!-- Welcome -->

      <div class="welcome-row">

        <div>
          <span class="eyebrow">
            AEROMINT
          </span>

          <h1>
            Welcome, ${esc(name)} 👋
          </h1>

          <p>
            Mine AMT rewards every hour.
          </p>
        </div>

        <div class="avatar">

          <img
            src="./assets/aeromint-logo.png"
            alt="AeroMint"
          />

          <span>${initials()}</span>

        </div>

      </div>

      <!-- Balance -->

      <section class="balance-hero">

        <div>
          <small>
            AVAILABLE BALANCE
          </small>

          <strong>
            ${fmt(dashboard.balance || 0)}
            <em>AMT</em>
          </strong>
        </div>

        <div class="hero-glow"></div>

      </section>

      <!-- Mining Heading -->

      <div class="section-head">

        <div>
          <h2>Mining</h2>
          <p>24-hour earning session</p>
        </div>

        ${
          mining.active
            ? `
              <span class="live">
                ● MINING LIVE
              </span>
            `
            : ''
        }

      </div>

      <!-- Mining Card -->

      <section class="mine-card">

        <div class="mine-orb ${mining.active ? 'active' : ''}">

          <img
            src="./assets/aeromint-logo.png"
            alt="AMT"
          />

          <span>
            +${fmt(mining.rate || 1)}

            <small>
              AMT/H
            </small>
          </span>

        </div>

        <h2>
          ${
            mining.active
              ? `Mining ${fmt(currentReward)} AMT`
              : 'Start Mining'
          }
        </h2>

        <p>
          ${
            mining.active
              ? 'Your session is running. Come back later to collect your earned AMT.'
              : 'Tap start to begin a 24-hour mining session.'
          }
        </p>

        <!-- Progress -->

        <div class="progress">
          <i style="width:${progress}%"></i>
        </div>

        <div class="progress-meta">

          <span>
            ${
              mining.active
                ? fmt(currentReward)
                : '0.00'
            }
            /
            ${fmt(mining.daily_max || 24)}
            AMT
          </span>

          <span>
            ${
              mining.active
                ? clock(remaining)
                : '24:00:00'
            }
          </span>

        </div>

        <!-- Main Button -->

        <button
          id="mineBtn"
          class="primary"
          type="button"
          ${state.busy ? 'disabled' : ''}
        >
          ${
            state.busy
              ? 'Please wait...'
              : mining.active
                ? 'Sync Mining'
                : 'Start Mining'
          }
        </button>

        ${
          mining.active
            ? `
              <div class="rate-note">
                Rate <b>+${fmt(mining.rate || 1)} AMT/hour</b>
                · Max <b>${fmt(mining.daily_max || 24)} AMT</b>
              </div>
            `
            : ''
        }

        ${
          completed
            ? `
              <div class="complete-note">
                ✓ Mining Session Completed!
                You earned up to
                ${fmt(mining.daily_max || 24)} AMT.
              </div>
            `
            : ''
        }

      </section>

      <!-- Mining Stats -->

      <div class="stats-grid">

        <div class="stat">
          <small>MINING RATE</small>

          <b>
            +${fmt(mining.rate || 1)}
            <i>AMT/H</i>
          </b>
        </div>

        <div class="stat">
          <small>TODAY'S MINING</small>

          <b>
            ${fmt(dashboard.today_mining || 0)}
            <i>AMT</i>
          </b>
        </div>

        <div class="stat">
          <small>TIME REMAINING</small>

          <b>
            ${
              mining.active
                ? clock(remaining)
                : '--:--:--'
            }
          </b>
        </div>

        <div class="stat">
          <small>SESSION MAX</small>

          <b>
            ${fmt(mining.daily_max || 24)}
            <i>AMT</i>
          </b>
        </div>

      </div>

      <!-- Quick Tasks -->

      <section class="section">

        <div class="section-head">

          <div>
            <h2>Quick Tasks</h2>
            <p>Extra AMT rewards</p>
          </div>

          <button
            class="link-btn"
            data-page="tasks"
            type="button"
          >
            View all →
          </button>

        </div>

        ${
          state.tasks.length
            ? state.tasks
                .slice(0, 3)
                .map(taskCompact)
                .join('')
            : `
              <div class="empty">
                No active tasks right now.
              </div>
            `
        }

      </section>

    </section>
  `;
}

/* =========================================================
   TASK ICON
   ========================================================= */

function taskIcon(task) {
  if (task.task_type === 'video') {
    return '▶';
  }

  if (task.task_type === 'daily') {
    return '◷';
  }

  if (task.task_type === 'referral') {
    return '↗';
  }

  if (task.task_type === 'telegram') {
    return '✈';
  }

  return '✓';
}

/* =========================================================
   Compact Task
   ========================================================= */

function taskCompact(task) {
  const done =
    task.completed ||
    task.status === 'claimed' ||
    task.status === 'completed';

  return `
    <article class="task-row">

      <div class="task-icon">
        ${taskIcon(task)}
      </div>

      <div class="task-main">

        <b>
          ${esc(task.title)}
        </b>

        <span>
          +${fmt(task.reward_amt)} AMT
        </span>

      </div>

      <button
        class="small-go"
        data-task="${esc(task.id)}"
        type="button"
        ${done ? 'disabled' : ''}
      >
        ${done ? 'Done' : 'Go'}
      </button>

    </article>
  `;
}

/* =========================================================
   TASKS PAGE
   ========================================================= */

function tasksPage() {
  const filters = [
    ['all', 'All'],
    ['social', 'Social'],
    ['daily', 'Daily'],
    ['special', 'Special'],
  ];

  const list = state.tasks.filter((task) => {
    if (state.filter === 'all') {
      return true;
    }

    return (
      task.category === state.filter ||
      task.task_type === state.filter
    );
  });

  return `
    <section class="page">

      <div class="title-block">

        <span class="eyebrow">
          REWARDS CENTER
        </span>

        <h1>Tasks</h1>

        <p>
          Complete tasks and claim AMT instantly.
        </p>

      </div>

      <!-- Filters -->

      <div class="tabs">

        ${filters
          .map(
            ([key, label]) => `
              <button
                class="${
                  state.filter === key
                    ? 'selected'
                    : ''
                }"
                data-filter="${key}"
                type="button"
              >
                ${label}
              </button>
            `
          )
          .join('')}

      </div>

      <!-- Task List -->

      <div class="task-list">

        ${
          list.length
            ? list.map(taskCard).join('')
            : `
              <div class="empty">
                No tasks in this category.
              </div>
            `
        }

      </div>

    </section>
  `;
}

/* =========================================================
   Task Card
   ========================================================= */

function taskCard(task) {
  const done =
    task.completed ||
    task.status === 'claimed' ||
    task.status === 'completed';

  let action = '';

  if (done) {
    action = `
      <span class="done">
        ✓ Done
      </span>
    `;
  } else {
    const isInstant =
      task.verification_type === 'none' ||
      task.verification_type === 'daily';

    action = `
      <button
        class="go"
        data-task="${esc(task.id)}"
        type="button"
      >
        ${isInstant ? 'Claim' : 'Go'}
      </button>
    `;
  }

  return `
    <article class="task-card">

      <div class="task-icon large">
        ${taskIcon(task)}
      </div>

      <div class="task-main">

        <h3>
          ${esc(task.title)}
        </h3>

        <p>
          ${esc(
            task.description ||
              'Complete this task to receive your reward.'
          )}
        </p>

        <b>
          +${fmt(task.reward_amt)} AMT
        </b>

      </div>

      <div class="task-action">
        ${action}
      </div>

    </article>
  `;
}

/* =========================================================
   REFERRAL PAGE
   ========================================================= */

function referralPage() {
  const referral = state.referrals || {};

  const link =
    referral.referral_link || '';

  const qualified = Number(
    referral.qualified_referrals || 0
  );

  const milestones = [
    [1, 0.5],
    [5, 2],
    [10, 4],
    [15, 6],
    [20, 8],
    [25, 10],
  ];

  return `
    <section class="page">

      <!-- Referral Hero -->

      <section class="ref-hero">

        <div class="ref-visual">

          <img
            src="./assets/aeromint-logo.png"
            alt="AeroMint"
          />

          <span>↗</span>

        </div>

        <span class="eyebrow">
          REFERRAL PROGRAM
        </span>

        <h1>
          Invite Friends
          <br />
          <span>& Earn AMT</span>
        </h1>

        <p>
          Share your personal link.
          A referral qualifies after the
          new user starts their first mining session.
        </p>

      </section>

      <!-- Referral Stats -->

      <div class="ref-stats">

        <div>
          <b>
            ${referral.total_referrals || 0}
          </b>

          <span>
            Total Referrals
          </span>
        </div>

        <div>
          <b>
            ${qualified}
          </b>

          <span>
            Qualified
          </span>
        </div>

        <div>
          <b>
            ${fmt(referral.earned || 0)}
          </b>

          <span>
            Referral AMT
          </span>
        </div>

      </div>

      <!-- Referral Link -->

      <section class="card">

        <label>
          Your Referral Link
        </label>

        <div class="copy-row">

          <input
            readonly
            value="${esc(link)}"
            id="refLink"
          />

          <button
            id="copyRef"
            type="button"
          >
            Copy
          </button>

        </div>

        <button
          id="shareRef"
          class="primary share"
          type="button"
        >
          Share Invite Link
        </button>

      </section>

      <!-- Milestones -->

      <section class="milestones">

        <div class="section-head">

          <div>
            <h2>Referral Bonuses</h2>

            <p>
              Milestones are awarded automatically.
            </p>
          </div>

        </div>

        ${milestones
          .map(
            ([count, amount]) => `
              <div
                class="milestone ${
                  qualified >= count
                    ? 'reached'
                    : ''
                }"
              >

                <span>
                  ${
                    qualified >= count
                      ? '✓'
                      : '○'
                  }

                  ${count}
                  qualified referral${
                    count > 1 ? 's' : ''
                  }
                </span>

                <b>
                  +${amount.toFixed(2)} AMT
                </b>

              </div>
            `
          )
          .join('')}

      </section>

    </section>
  `;
}

/* =========================================================
   ACCOUNT PAGE
   ========================================================= */

function accountPage(name) {
  const me = state.me || {};
  const transactions =
    state.transactions || [];

  return `
    <section class="page">

      <!-- Profile -->

      <section class="profile-card">

        <div class="profile-top">

          <div class="avatar big">

            <img
              src="./assets/aeromint-logo.png"
              alt="AeroMint"
            />

            <span>
              ${initials()}
            </span>

          </div>

          <div>

            <h1>
              ${esc(name)}
            </h1>

            <p>
              ${
                me.username
                  ? '@' + esc(me.username)
                  : 'AeroMint member'
              }
            </p>

          </div>

        </div>

        <div class="account-balance">

          <small>
            AMT BALANCE
          </small>

          <b>
            ${fmt(me.balance || 0)}
            <i>AMT</i>
          </b>

        </div>

      </section>

      <!-- Transactions -->

      <div class="section-head">

        <div>
          <h2>Transactions</h2>

          <p>
            Your reward history
          </p>
        </div>

      </div>

      <div class="tx-list">

        ${
          transactions.length
            ? transactions
                .map(transactionCard)
                .join('')
            : `
              <div class="empty">
                No transactions yet.
              </div>
            `
        }

      </div>

      <div class="account-note">
        AMT shown here is an in-app reward balance.
        Withdrawal/real-money conversion is not enabled
        in this version.
      </div>

    </section>
  `;
}

/* =========================================================
   Transaction
   ========================================================= */

function transactionCard(transaction) {
  let icon = '✓';

  if (transaction.type === 'mining') {
    icon = '⌁';
  }

  if (transaction.type === 'referral') {
    icon = '↗';
  }

  const date = transaction.created_at
    ? new Date(
        transaction.created_at
      ).toLocaleString()
    : '';

  const amount = Number(
    transaction.amount || 0
  );

  return `
    <div class="tx">

      <div class="tx-icon">
        ${icon}
      </div>

      <div class="tx-main">

        <b>
          ${esc(
            transaction.description ||
              transaction.type ||
              'Reward'
          )}
        </b>

        <small>
          ${esc(date)}
        </small>

      </div>

      <strong>
        ${
          amount >= 0 ? '+' : ''
        }${fmt(amount)} AMT
      </strong>

    </div>
  `;
}

/* =========================================================
   EVENT BINDING
   ========================================================= */

function bind() {
  /* Bottom / internal navigation */

  document
    .querySelectorAll('[data-page]')
    .forEach((element) => {
      element.onclick = () => {
        setPage(element.dataset.page);
      };
    });

  /* Task filters */

  document
    .querySelectorAll('[data-filter]')
    .forEach((element) => {
      element.onclick = () => {
        state.filter =
          element.dataset.filter;

        render();
      };
    });

  /* Refresh */

  $('#refreshBtn')?.addEventListener(
    'click',
    () => refresh()
  );

  $('#retry')?.addEventListener(
    'click',
    () => refresh()
  );

  /* Mining */

  $('#mineBtn')?.addEventListener(
    'click',
    handleMining
  );

  /* Tasks */

  document
    .querySelectorAll('[data-task]')
    .forEach((button) => {
      button.onclick = () =>
        runTask(
          button.dataset.task,
          button
        );
    });

  /* Referral copy */

  $('#copyRef')?.addEventListener(
    'click',
    copyReferral
  );

  /* Referral share */

  $('#shareRef')?.addEventListener(
    'click',
    shareReferral
  );
}

/* =========================================================
   MINING ACTION
   ========================================================= */

async function handleMining() {
  if (state.busy) {
    return;
  }

  try {
    state.busy = true;
    render();

    const endpoint =
      state.mining?.active
        ? '/api/mining/sync'
        : '/api/mining/start';

    await api(endpoint, {
      method: 'POST',
    });

    state.busy = false;

    await refresh();
  } catch (error) {
    state.busy = false;

    console.error(
      'Mining error:',
      error
    );

    notify(
      error?.message ||
        'Mining action failed.'
    );

    render();
  }
}

/* =========================================================
   TASK FLOW
   ========================================================= */

async function runTask(id, button) {
  if (!id) {
    return;
  }

  try {
    if (button) {
      button.disabled = true;
    }

    /* Start task */

    await api(
      `/api/tasks/${encodeURIComponent(id)}/start`,
      {
        method: 'POST',
      }
    );

    const task = state.tasks.find(
      (item) =>
        String(item.id) === String(id)
    );

    /* Manual verification */

    if (
      task?.verification_type ===
      'manual'
    ) {
      notify(
        'এই Video Task-এর verification এখন manual। Admin verification provider সংযুক্ত না করা পর্যন্ত এটি auto-claim হবে না।'
      );

      return;
    }

    /* Verify */

    const verification = await api(
      `/api/tasks/${encodeURIComponent(id)}/verify`,
      {
        method: 'POST',
      }
    );

    /* Claim */

    if (
      verification?.claimable ||
      verification?.verified
    ) {
      await api(
        `/api/tasks/${encodeURIComponent(id)}/claim`,
        {
          method: 'POST',
        }
      );

      notify(
        `Task completed! +${fmt(
          task?.reward_amt || 0
        )} AMT added.`
      );
    } else {
      notify(
        verification?.message ||
          'Task verification হয়নি।'
      );
    }

    await refresh();
  } catch (error) {
    console.error(
      'Task error:',
      error
    );

    notify(
      error?.message ||
        'Task could not be completed.'
    );
  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

/* =========================================================
   REFERRAL COPY
   ========================================================= */

async function copyReferral() {
  const input = $('#refLink');

  if (!input) {
    return;
  }

  const link = input.value;

  if (!link) {
    notify(
      'Referral link is not available yet.'
    );

    return;
  }

  try {
    await navigator.clipboard.writeText(
      link
    );

    const button = $('#copyRef');

    if (button) {
      button.textContent = 'Copied!';

      setTimeout(() => {
        if ($('#copyRef')) {
          $('#copyRef').textContent =
            'Copy';
        }
      }, 1200);
    }
  } catch {
    notify(link);
  }
}

/* =========================================================
   TELEGRAM SHARE
   ========================================================= */

function shareReferral() {
  const link =
    state.referrals?.referral_link ||
    '';

  if (!link) {
    notify(
      'Referral link is not available yet.'
    );

    return;
  }

  const text = encodeURIComponent(
    'Join AeroMint and start earning AMT rewards!'
  );

  const shareUrl =
    `https://t.me/share/url?url=${encodeURIComponent(
      link
    )}&text=${text}`;

  try {
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(
        shareUrl
      );
    } else {
      window.open(
        shareUrl,
        '_blank'
      );
    }
  } catch {
    window.open(
      shareUrl,
      '_blank'
    );
  }
}

/* =========================================================
   Mining auto-sync
   ========================================================= */

setInterval(async () => {
  if (
    state.page !== 'mining' ||
    !state.mining?.active
  ) {
    return;
  }

  try {
    await api(
      '/api/mining/sync',
      {
        method: 'POST',
      }
    );

    await refresh();
  } catch (error) {
    console.warn(
      'Mining sync failed:',
      error
    );
  }
}, 60000);

/* =========================================================
   Local countdown
   ========================================================= */

setInterval(() => {
  if (
    state.page !== 'mining' ||
    !state.mining?.active
  ) {
    return;
  }

  const element =
    document.querySelector(
      '.progress-meta span:last-child'
    );

  if (!element) {
    return;
  }

  const remaining =
    Number(
      state.mining.remaining_seconds || 0
    );

  element.textContent =
    clock(remaining);

  /*
   * Keep the local display moving between
   * server syncs.
   */

  if (
    state.mining.remaining_seconds > 0
  ) {
    state.mining.remaining_seconds =
      Math.max(
        0,
        state.mining.remaining_seconds - 1
      );
  }
}, 1000);

/* =========================================================
   Refresh when app becomes visible again
   ========================================================= */

document.addEventListener(
  'visibilitychange',
  () => {
    if (
      document.visibilityState ===
      'visible'
    ) {
      refresh();
    }
  }
);

/* =========================================================
   Telegram Main Button handling
   ========================================================= */

try {
  tg?.MainButton?.hide?.();
} catch {}

/* =========================================================
   START
   ========================================================= */

render();
refresh();
