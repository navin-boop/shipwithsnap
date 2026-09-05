import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";

/** Public store logo, used by the tracking page and customer emails. Cached for a day. */
export async function GET(_req: Request, ctx: { params: Promise<{ accountId: string }> }) {
  const { accountId } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/.test(accountId)) return new NextResponse("Not found", { status: 404 });
  const account = await db().query.accounts.findFirst({ where: eq(schema.accounts.id, accountId), columns: { logoData: true, logoMime: true } });
  if (!account?.logoData) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(Buffer.from(account.logoData, "base64"), {
    headers: { "content-type": account.logoMime ?? "image/png", "cache-control": "public, max-age=86400" },
  });
}
