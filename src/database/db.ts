import Database from 'better-sqlite3';
import { UserProfile } from '../types.js';

const db = new Database('bot_database.db');

export function initDB() {
  // Users table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id INTEGER PRIMARY KEY,
      age INTEGER,
      weight REAL,
      height REAL,
      sex TEXT,
      activity_level TEXT,
      goal TEXT,
      bmr REAL,
      tdee REAL
    )
  `).run();

  // Migration: try to add goal column if it doesn't exist
  try {
    db.prepare('ALTER TABLE users ADD COLUMN goal TEXT').run();
  } catch (e) {
    // Column might already exist
  }

  // Meals table
  db.prepare(`
    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      raw_text TEXT,
      calories_estimated REAL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      ai_response TEXT
    )
  `).run();

  console.log('✅ Database initialized');
}

export function saveUserProfile(telegramId: number, profile: UserProfile) {
  const upsert = db.prepare(`
    INSERT INTO users (telegram_id, age, weight, height, sex, activity_level, goal, bmr, tdee)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(telegram_id) DO UPDATE SET
      age = excluded.age,
      weight = excluded.weight,
      height = excluded.height,
      sex = excluded.sex,
      activity_level = excluded.activity_level,
      goal = excluded.goal,
      bmr = excluded.bmr,
      tdee = excluded.tdee
  `);
  upsert.run(
    telegramId,
    profile.age,
    profile.weight,
    profile.height,
    profile.sex,
    profile.activity,
    profile.goal,
    profile.bmr,
    profile.tdee
  );
}

export function getUserProfile(telegramId: number): UserProfile | null {
  const row = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId) as any;
  if (!row) return null;
  return {
    age: row.age,
    weight: row.weight,
    height: row.height,
    sex: row.sex,
    activity: row.activity_level as any,
    goal: row.goal as any,
    bmr: row.bmr,
    tdee: row.tdee,
  };
}

export function addMeal(userId: number, text: string, calories: number, aiResponse?: string) {
  const insert = db.prepare(`
    INSERT INTO meals (user_id, raw_text, calories_estimated, ai_response)
    VALUES (?, ?, ?, ?)
  `);
  insert.run(userId, text, calories, aiResponse || null);
}

export function getTodayMeals(userId: number) {
  const rows = db.prepare(`
    SELECT * FROM meals 
    WHERE user_id = ? 
    AND date(timestamp) = date('now', 'localtime')
    ORDER BY timestamp ASC
  `).all(userId) as any[];
  return rows;
}
