import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { getDb } from "@/lib/db";

export const auth = betterAuth({
  database: getDb(),
  emailAndPassword: { enabled: true },
  experimental: { joins: true },
  plugins: [nextCookies()],
});
