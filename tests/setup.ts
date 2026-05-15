import { afterEach, beforeAll } from "vitest";
import { getDb, run } from "@/lib/db";

export const TEST_USER_A = "user-a";
export const TEST_USER_B = "user-b";

beforeAll(() => {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT
    )
  `);
  run("INSERT OR IGNORE INTO user (id, name, email) VALUES (?, 'A', 'a@test')", TEST_USER_A);
  run("INSERT OR IGNORE INTO user (id, name, email) VALUES (?, 'B', 'b@test')", TEST_USER_B);
});

afterEach(() => {
  run("DELETE FROM notes");
});
