import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Database } from "bun:sqlite";
import { mkdirSync } from "fs";
import { dirname } from "path";

const dbPath = process.env.DB_PATH || "data/app.db";

mkdirSync(dirname(dbPath), { recursive: true });

export const auth = betterAuth({
  database: new Database(dbPath),
  emailAndPassword: { enabled: true },
  plugins: [nextCookies()],
});
