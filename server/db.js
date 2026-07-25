const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'resume_checker.db');

function openDatabase() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return new sqlite3.Database(DB_PATH);
}

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) reject(error);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) reject(error);
      else resolve(row);
    });
  });
}

function all(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

async function tableExists(db, name) {
  const row = await get(
    db,
    "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
    [name]
  );
  return Boolean(row);
}

async function migrate(db) {
  const hasChecks = await tableExists(db, 'resume_checks');

  if (!hasChecks) {
    await run(
      db,
      `CREATE TABLE resume_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        resume_text TEXT NOT NULL,
        score INTEGER NOT NULL,
        feedback JSON NOT NULL,
        source_type TEXT DEFAULT 'text',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`
    );
  } else {
    const columns = await all(db, 'PRAGMA table_info(resume_checks)');
    const columnNames = columns.map((col) => col.name);

    if (!columnNames.includes('user_id')) {
      await run(db, 'ALTER TABLE resume_checks ADD COLUMN user_id INTEGER');
    }
    if (!columnNames.includes('source_type')) {
      await run(db, 'ALTER TABLE resume_checks ADD COLUMN source_type TEXT DEFAULT "text"');
    }
  }

  await run(
    db,
    'CREATE INDEX IF NOT EXISTS idx_resume_checks_created_at ON resume_checks(created_at DESC)'
  );
  await run(
    db,
    'CREATE INDEX IF NOT EXISTS idx_resume_checks_user_id ON resume_checks(user_id)'
  );
}

async function initializeDatabase() {
  const db = openDatabase();

  await run(
    db,
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  );

  await migrate(db);
  return db;
}

function createUser(db, email, passwordHash, name) {
  return run(db, 'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)', [
    email,
    passwordHash,
    name,
  ]).then((result) => ({ id: result.lastID, email, name }));
}

function findUserByEmail(db, email) {
  return get(db, 'SELECT * FROM users WHERE email = ?', [email]);
}

function findUserById(db, id) {
  return get(db, 'SELECT id, email, name, created_at FROM users WHERE id = ?', [id]);
}

function saveCheck(db, resumeText, score, feedback, userId = null, sourceType = 'text') {
  return run(
    db,
    `INSERT INTO resume_checks (user_id, resume_text, score, feedback, source_type)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, resumeText, score, JSON.stringify(feedback), sourceType]
  ).then((result) => ({ id: result.lastID, score, feedback }));
}

function getRecentChecks(db, limit = 5, userId = null) {
  const sql = userId
    ? `SELECT id, score, feedback, source_type, created_at
       FROM resume_checks
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    : `SELECT id, score, feedback, source_type, created_at
       FROM resume_checks
       ORDER BY created_at DESC
       LIMIT ?`;

  const params = userId ? [userId, limit] : [limit];

  return all(db, sql, params).then((rows) =>
    rows.map((row) => {
      let parsedFeedback = {};
      try {
        parsedFeedback = typeof row.feedback === 'string' ? JSON.parse(row.feedback) : (row.feedback || {});
      } catch {
        parsedFeedback = { summary: 'Previous check', score: row.score };
      }
      return {
        id: row.id,
        score: row.score,
        feedback: parsedFeedback,
        sourceType: row.source_type || 'text',
        createdAt: row.created_at,
      };
    })
  );
}

module.exports = {
  openDatabase,
  initializeDatabase,
  createUser,
  findUserByEmail,
  findUserById,
  saveCheck,
  getRecentChecks,
};
