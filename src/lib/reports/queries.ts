import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";

export type Range = "7d" | "30d" | "90d";

export type Report = {
  range: Range;
  bucket: "day" | "week";
  totals: { spendCents: number; labels: number; savedCents: number; avgCents: number };
  series: Array<{ label: string; spendCents: number; labels: number }>;
  services: Array<{ name: string; labels: number; spendCents: number; avgCents: number; savedCents: number }>;
};

const DAYS: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90 };

/** Spend, savings and volume over the range, for non-voided labels. Savings = retail − price where retail is known and higher. */
export async function buildReport(accountId: string, range: Range): Promise<Report> {
  const days = DAYS[range];
  const since = new Date(Date.now() - days * 86_400_000);
  since.setHours(0, 0, 0, 0);
  const bucket = range === "7d" ? "day" : "week";
  const where = and(eq(schema.labels.accountId, accountId), isNull(schema.labels.voidedAt), gte(schema.labels.purchasedAt, since));
  const saved = sql<number>`coalesce(sum(greatest(coalesce(${schema.labels.retailCents}, 0) - ${schema.labels.priceCents}, 0)), 0)`;

  const [totals] = await db()
    .select({ spend: sql<number>`coalesce(sum(${schema.labels.priceCents}), 0)`, n: sql<number>`count(*)`, saved })
    .from(schema.labels)
    .where(where);

  const period = sql`date_trunc(${sql.raw(`'${bucket}'`)}, ${schema.labels.purchasedAt})`;
  const seriesRows = await db()
    .select({ period, spend: sql<number>`sum(${schema.labels.priceCents})`, n: sql<number>`count(*)` })
    .from(schema.labels)
    .where(where)
    .groupBy(period)
    .orderBy(period);
  const byPeriod = new Map(seriesRows.map((r) => [new Date(r.period as string).toISOString().slice(0, 10), r]));

  // Fill empty buckets so the chart has a continuous axis.
  const series: Report["series"] = [];
  const cursor = new Date(since);
  if (bucket === "week") {
    // date_trunc('week') starts on Monday
    const dow = (cursor.getDay() + 6) % 7;
    cursor.setDate(cursor.getDate() - dow);
  }
  const end = new Date();
  while (cursor <= end) {
    const key = new Date(Date.UTC(cursor.getFullYear(), cursor.getMonth(), cursor.getDate())).toISOString().slice(0, 10);
    const row = byPeriod.get(key);
    series.push({
      label: cursor.toLocaleDateString("en-US", bucket === "day" ? { weekday: "short" } : { month: "short", day: "numeric" }),
      spendCents: Number(row?.spend ?? 0),
      labels: Number(row?.n ?? 0),
    });
    cursor.setDate(cursor.getDate() + (bucket === "day" ? 1 : 7));
  }

  const serviceRows = await db()
    .select({ carrier: schema.labels.carrier, service: schema.labels.serviceName, n: sql<number>`count(*)`, spend: sql<number>`sum(${schema.labels.priceCents})`, saved })
    .from(schema.labels)
    .where(where)
    .groupBy(schema.labels.carrier, schema.labels.serviceName)
    .orderBy(sql`sum(${schema.labels.priceCents}) desc`);

  const n = Number(totals.n);
  return {
    range,
    bucket,
    totals: { spendCents: Number(totals.spend), labels: n, savedCents: Number(totals.saved), avgCents: n ? Math.round(Number(totals.spend) / n) : 0 },
    series,
    services: serviceRows.map((r) => ({ name: `${r.carrier} ${r.service}`, labels: Number(r.n), spendCents: Number(r.spend), avgCents: Math.round(Number(r.spend) / Number(r.n)), savedCents: Number(r.saved) })),
  };
}
