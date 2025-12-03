const sqlite3 = require('sqlite3').verbose();
const logger = require('./utils/logger');

const path = require('path');
const dbPath = path.resolve(__dirname, '../quizmaster.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('Failed to connect to database', {
      error: err
    });
    process.exit(1);
  } else {
    logger.info('Connected to SQLite database', {
      database: dbPath
    });
    initializeSchema();
  }
});

function initializeSchema() {
  db.serialize(() => {
    // Users Table
    db.run(`CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

    // Quizzes Table
    db.run(`CREATE TABLE IF NOT EXISTS quizzes(
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
      "ALTER TABLE quizzes ADD COLUMN source TEXT DEFAULT 'manual'",
      "ALTER TABLE quizzes ADD COLUMN video_url TEXT",
      "ALTER TABLE quizzes ADD COLUMN video_platform TEXT",
      "ALTER TABLE quizzes ADD COLUMN video_id TEXT",
      "ALTER TABLE quizzes ADD COLUMN video_title TEXT",
      "ALTER TABLE quizzes ADD COLUMN video_duration INTEGER",
      "ALTER TABLE quizzes ADD COLUMN video_thumbnail TEXT"
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

    // Note: Admin users should be created through a secure setup script, not hardcoded here

    // Questions Table
    // type: 'multiple_choice' or 'true_false'
    // options: JSON string for MC options, null for TF
    // correct_answer: string
    db.run(`CREATE TABLE IF NOT EXISTS questions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER,
  type TEXT NOT NULL,
  question_text TEXT NOT NULL,
  options TEXT,
  correct_answer TEXT NOT NULL,
  FOREIGN KEY(quiz_id) REFERENCES quizzes(id)
)`);

    // Results Table
    db.run(`CREATE TABLE IF NOT EXISTS results(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  quiz_id INTEGER,
  score INTEGER NOT NULL,
  completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(quiz_id) REFERENCES quizzes(id)
)`);

    // Question Attempts Table - tracks detailed metrics for each question
    db.run(`CREATE TABLE IF NOT EXISTS question_attempts(
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
    db.run(`CREATE TABLE IF NOT EXISTS quiz_reviews(
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
    db.run(`CREATE TABLE IF NOT EXISTS user_quiz_library(
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

    // Challenges Table - 1v1 Quiz Challenges
    db.run(`CREATE TABLE IF NOT EXISTS challenges(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL,
  creator_id INTEGER NOT NULL,
  opponent_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  winner_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  completed_at DATETIME,
  FOREIGN KEY(quiz_id) REFERENCES quizzes(id),
  FOREIGN KEY(creator_id) REFERENCES users(id),
  FOREIGN KEY(opponent_id) REFERENCES users(id),
  FOREIGN KEY(winner_id) REFERENCES users(id)
)`);

    // Challenge Participants Table - Track individual participant progress
    db.run(`CREATE TABLE IF NOT EXISTS challenge_participants(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  challenge_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  score INTEGER DEFAULT 0,
  total_time_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT 0,
  completed_at DATETIME,
  result_id INTEGER,
  FOREIGN KEY(challenge_id) REFERENCES challenges(id),
  FOREIGN KEY(user_id) REFERENCES users(id),
  FOREIGN KEY(result_id) REFERENCES results(id)
)`);

    // Challenge Stats Table - User challenge performance tracking
    db.run(`CREATE TABLE IF NOT EXISTS challenge_stats(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE,
  total_challenges INTEGER DEFAULT 0,
  challenges_won INTEGER DEFAULT 0,
  challenges_lost INTEGER DEFAULT 0,
  challenges_drawn INTEGER DEFAULT 0,
  current_win_streak INTEGER DEFAULT 0,
  best_win_streak INTEGER DEFAULT 0,
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);

    // RBAC Tables

    // Roles Table
    db.run(`CREATE TABLE IF NOT EXISTS roles(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

    // Permissions Table
    db.run(`CREATE TABLE IF NOT EXISTS permissions(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

    // Role Permissions Association
    db.run(`CREATE TABLE IF NOT EXISTS role_permissions(
  role_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY(permission_id) REFERENCES permissions(id) ON DELETE CASCADE
)`);

    // User Groups Table
    db.run(`CREATE TABLE IF NOT EXISTS user_groups(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

    // Group Members Association
    db.run(`CREATE TABLE IF NOT EXISTS group_members(
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, user_id),
  FOREIGN KEY(group_id) REFERENCES user_groups(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
)`);

    // Group Permissions Association
    db.run(`CREATE TABLE IF NOT EXISTS group_permissions(
  group_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (group_id, permission_id),
  FOREIGN KEY(group_id) REFERENCES user_groups(id) ON DELETE CASCADE,
  FOREIGN KEY(permission_id) REFERENCES permissions(id) ON DELETE CASCADE
)`);

    // User Permissions (Direct Whitelist/Blacklist)
    db.run(`CREATE TABLE IF NOT EXISTS user_permissions(
  user_id INTEGER NOT NULL,
  permission_id INTEGER NOT NULL,
  granted BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(permission_id) REFERENCES permissions(id) ON DELETE CASCADE
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

    // Add rematch fields to challenges table
    const challengeRematchColumns = [
      "ALTER TABLE challenges ADD COLUMN parent_challenge_id INTEGER REFERENCES challenges(id)",
      "ALTER TABLE challenges ADD COLUMN is_rematch BOOLEAN DEFAULT 0"
    ];

    challengeRematchColumns.forEach(query => {
      db.run(query, (err) => {
        // Ignore errors if column already exists
      });
    });

    // Create indexes for performance optimization
    const indexes = [
      // Foreign key indexes
      "CREATE INDEX IF NOT EXISTS idx_quizzes_creator_id ON quizzes(creator_id)",
      "CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON questions(quiz_id)",
      "CREATE INDEX IF NOT EXISTS idx_results_user_id ON results(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_results_quiz_id ON results(quiz_id)",
      "CREATE INDEX IF NOT EXISTS idx_results_completed_at ON results(completed_at)",
      "CREATE INDEX IF NOT EXISTS idx_question_attempts_user_id ON question_attempts(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_question_attempts_quiz_id ON question_attempts(quiz_id)",
      "CREATE INDEX IF NOT EXISTS idx_question_attempts_result_id ON question_attempts(result_id)",
      "CREATE INDEX IF NOT EXISTS idx_user_quiz_library_user_id ON user_quiz_library(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_user_quiz_library_quiz_id ON user_quiz_library(quiz_id)",
      "CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_quiz_reviews_quiz_id ON quiz_reviews(quiz_id)",
      "CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id)",

      // Challenge indexes
      "CREATE INDEX IF NOT EXISTS idx_challenges_creator_id ON challenges(creator_id)",
      "CREATE INDEX IF NOT EXISTS idx_challenges_opponent_id ON challenges(opponent_id)",
      "CREATE INDEX IF NOT EXISTS idx_challenges_quiz_id ON challenges(quiz_id)",
      "CREATE INDEX IF NOT EXISTS idx_challenges_status ON challenges(status)",
      "CREATE INDEX IF NOT EXISTS idx_challenge_participants_challenge_id ON challenge_participants(challenge_id)",
      "CREATE INDEX IF NOT EXISTS idx_challenge_participants_user_id ON challenge_participants(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_challenge_stats_user_id ON challenge_stats(user_id)",

      // Composite indexes for common query patterns
      "CREATE INDEX IF NOT EXISTS idx_results_user_quiz ON results(user_id, quiz_id)",
      "CREATE INDEX IF NOT EXISTS idx_results_quiz_score ON results(quiz_id, score DESC)",
      "CREATE INDEX IF NOT EXISTS idx_quizzes_public_status ON quizzes(is_public, status)",
      "CREATE INDEX IF NOT EXISTS idx_question_attempts_result_correct ON question_attempts(result_id, is_correct)"
    ];

    indexes.forEach(indexQuery => {
      db.run(indexQuery, (err) => {
        if (err) {
          logger.error('Failed to create database index', {
            error: err,
            query: indexQuery
          });
        }
      });
    });
  });
}

module.exports = db;
