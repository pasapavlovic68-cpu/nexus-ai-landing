-- Статистика лендинга: схема D1 (база nexus-landing-stats, привязка DB)
-- Применение: npx wrangler d1 execute nexus-landing-stats --remote --file=stats-schema.sql

-- одна строка на визит (сессия живёт в sessionStorage вкладки, без cookie)
CREATE TABLE IF NOT EXISTS sessions (
  sid          TEXT PRIMARY KEY,
  first_ts     INTEGER NOT NULL,          -- мс, время сервера
  last_ts      INTEGER NOT NULL,
  ref          TEXT,                      -- домен источника перехода (без пути)
  utm_source   TEXT,
  utm_medium   TEXT,
  utm_campaign TEXT,
  utm_content  TEXT,
  country      TEXT,                      -- cf-ipcountry
  device       TEXT,                      -- mobile | tablet | desktop
  browser      TEXT,
  lang         TEXT,
  dur          INTEGER NOT NULL DEFAULT 0,  -- активное время на странице, сек
  max_scroll   INTEGER NOT NULL DEFAULT 0,  -- 0 / 25 / 50 / 75 / 100
  lead         INTEGER NOT NULL DEFAULT 0   -- 1 = нажал кнопку Telegram
);
CREATE INDEX IF NOT EXISTS idx_sessions_first ON sessions(first_ts);

-- все действия внутри визита
CREATE TABLE IF NOT EXISTS events (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  ts    INTEGER NOT NULL,
  sid   TEXT NOT NULL,
  type  TEXT NOT NULL,     -- pv | scroll | section | click | works_open | video_play | video_done | video_fs | faq | leave
  name  TEXT,              -- место клика / секция / видео / вопрос FAQ
  value REAL
);
CREATE INDEX IF NOT EXISTS idx_events_ts   ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type, ts);
CREATE INDEX IF NOT EXISTS idx_events_sid  ON events(sid);

-- вход в дашборд: хеш PIN (PBKDF2), счётчик неверных попыток и блокировка
CREATE TABLE IF NOT EXISTS auth (
  k TEXT PRIMARY KEY,      -- pin_hash | pin_fails | pin_lock_until
  v TEXT NOT NULL
);

-- деньги: продажи и расходы на рекламу, которые владелец вносит вручную в дашборде
CREATE TABLE IF NOT EXISTS sales (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  date     TEXT NOT NULL,          -- YYYY-MM-DD (дата продажи, по местному времени владельца)
  amount   REAL NOT NULL,          -- $
  product  TEXT NOT NULL,
  campaign TEXT,                   -- utm_campaign, NULL = без рекламы / сарафан
  source   TEXT,                   -- utm_source
  note     TEXT,
  created  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);

CREATE TABLE IF NOT EXISTS spend (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  date     TEXT NOT NULL,
  amount   REAL NOT NULL,
  campaign TEXT NOT NULL,
  source   TEXT,
  note     TEXT,
  created  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_spend_date ON spend(date);

-- короткие ссылки nexusnova.app/<slug> -> страница с utm-метками (campaign = slug)
CREATE TABLE IF NOT EXISTS links (
  slug     TEXT PRIMARY KEY,
  target   TEXT NOT NULL,          -- "/", "/#pricing" …
  source   TEXT NOT NULL,          -- utm_source
  medium   TEXT,                   -- utm_medium
  content  TEXT,                   -- utm_content
  hits     INTEGER NOT NULL DEFAULT 0,
  created  INTEGER NOT NULL
);
