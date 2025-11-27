const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../quizmaster.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initializeSchema();
  }
});

function initializeSchema() {
  db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Quizzes Table
    db.run(`CREATE TABLE IF NOT EXISTS quizzes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      creator_id INTEGER,
      is_public BOOLEAN DEFAULT 0,
      status TEXT DEFAULT 'draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(creator_id) REFERENCES users(id)
    )`);

    // Migration for existing quizzes table
    const columnsToAdd = [
      "ALTER TABLE quizzes ADD COLUMN creator_id INTEGER REFERENCES users(id)",
      "ALTER TABLE quizzes ADD COLUMN is_public BOOLEAN DEFAULT 0",
      "ALTER TABLE quizzes ADD COLUMN status TEXT DEFAULT 'draft'",
      "ALTER TABLE quizzes ADD COLUMN created_at DATETIME",
      "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'",
      "ALTER TABLE quizzes ADD COLUMN source TEXT DEFAULT 'manual'"
    ];

    columnsToAdd.forEach(query => {
      db.run(query, (err) => {
        // Ignore errors if column already exists
      });
    });

    // Update NULL created_at values to current timestamp
    db.run("UPDATE quizzes SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL", (err) => {
      // Ignore errors
    });

    // Create Admin User if not exists
    const adminPassword = 'admin123'; // In production, hash this!
    // For this simple app, we might be storing plain text or simple hash. 
    // Let's check how auth is handled. 
    // Assuming simple storage for now based on existing code (or I should check auth.js).
    // But for now, I'll just insert if not exists.


    // Questions Table
    // type: 'multiple_choice' or 'true_false'
    // options: JSON string for MC options, null for TF
    // correct_answer: string
    db.run(`CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER,
      type TEXT NOT NULL,
      question_text TEXT NOT NULL,
      options TEXT, 
      correct_answer TEXT NOT NULL,
      FOREIGN KEY(quiz_id) REFERENCES quizzes(id)
    )`);

    // Results Table
    db.run(`CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      quiz_id INTEGER,
      score INTEGER NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(quiz_id) REFERENCES quizzes(id)
    )`);

    // Question Attempts Table - tracks detailed metrics for each question
    db.run(`CREATE TABLE IF NOT EXISTS question_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      quiz_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      result_id INTEGER,
      user_answer TEXT NOT NULL,
      is_correct BOOLEAN NOT NULL,
      time_taken_seconds INTEGER NOT NULL,
      attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(quiz_id) REFERENCES quizzes(id),
      FOREIGN KEY(question_id) REFERENCES questions(id),
      FOREIGN KEY(result_id) REFERENCES results(id)
    )`);

    // Quiz Reviews Table
    db.run(`CREATE TABLE IF NOT EXISTS quiz_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id INTEGER NOT NULL,
      reviewer_id INTEGER,
      status TEXT NOT NULL,
      comments TEXT,
      reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(quiz_id) REFERENCES quizzes(id),
      FOREIGN KEY(reviewer_id) REFERENCES users(id)
    )`);

    // User Quiz Library Table
    db.run(`CREATE TABLE IF NOT EXISTS user_quiz_library (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      quiz_id INTEGER NOT NULL,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(quiz_id) REFERENCES quizzes(id),
      UNIQUE(user_id, quiz_id)
    )`);

    // User Achievements Table
    db.run(`CREATE TABLE IF NOT EXISTS user_achievements(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      achievement_id TEXT NOT NULL,
      unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id),
      UNIQUE(user_id, achievement_id)
    )`);

    // User Stats Table
    db.run(`CREATE TABLE IF NOT EXISTS user_stats(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      total_quizzes INTEGER DEFAULT 0,
      total_score INTEGER DEFAULT 0,
      best_score INTEGER DEFAULT 0,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_active_date DATE,
      total_time_seconds INTEGER DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Add profile fields to users table
    const userProfileColumns = [
      "ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1",
      "ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0",
      "ALTER TABLE users ADD COLUMN avatar_url TEXT"
    ];

    userProfileColumns.forEach(query => {
      db.run(query, (err) => {
        // Ignore errors if column already exists
      });
    });
  });
}

module.exports = db;
