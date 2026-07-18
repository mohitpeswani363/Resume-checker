CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resume_checks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  resume_text TEXT NOT NULL,
  score INTEGER NOT NULL,
  feedback JSON NOT NULL,
  source_type TEXT DEFAULT 'text',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_resume_checks_created_at
  ON resume_checks(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_resume_checks_user_id
  ON resume_checks(user_id);
