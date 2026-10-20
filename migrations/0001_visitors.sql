-- 2026-10-21: посетители вместо заходов.
-- vid — постоянный случайный номер браузера (localStorage nexus_vid, 12 байт hex), связывает визиты одного человека.
-- hidden_visitors — «это я / свои»: их визиты не пишутся и не входят в цифры /stats.
-- В hidden_visitors.vid лежит ключ посетителя = COALESCE(sessions.vid, sessions.sid):
-- у старых визитов (до этой миграции) vid пустой — такого посетителя скрывают по номеру визита.
-- Применение (один раз):
--   npx wrangler d1 execute nexus-landing-stats --remote --file=migrations/0001_visitors.sql
--   (локально — то же с --local)

ALTER TABLE sessions ADD COLUMN vid TEXT;
CREATE INDEX IF NOT EXISTS idx_sessions_vid ON sessions(vid);

CREATE TABLE IF NOT EXISTS hidden_visitors (
  vid     TEXT PRIMARY KEY,          -- ключ посетителя: vid (или sid для старых визитов без vid)
  label   TEXT,                      -- подпись: «Это я», «Свои» …
  created INTEGER NOT NULL           -- мс
);
