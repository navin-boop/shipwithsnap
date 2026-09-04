import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let cached: NeonHttpDatabase<typeof schema> | undefined;

/**
 * Drizzle client over Neon's HTTP driver (one request per query — right for serverless).
 * Created lazily so importing this module never throws at build time when DATABASE_URL is unset.
 */
export function db(): NeonHttpDatabase<typeof schema> {
  if (!cached) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    cached = drizzle(neon(url), { schema });
  }
  return cached;
}

export { schema };
