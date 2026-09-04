import { defineConfig } from "drizzle-kit";

// Migrations use the unpooled (direct) Neon URL; the app uses the pooled DATABASE_URL.
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
