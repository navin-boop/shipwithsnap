import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";

/** Streams the manifest (scan form) file without exposing the provider URL. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const row = await db().query.scanForms.findFirst({ where: and(eq(schema.scanForms.id, id), eq(schema.scanForms.accountId, session.user.accountId)) });
  if (!row?.formUrl) return new NextResponse("Not found", { status: 404 });
  if (row.formUrl.startsWith("data:")) {
    const [meta, b64] = row.formUrl.slice(5).split(",");
    return new NextResponse(Buffer.from(b64, "base64"), { headers: { "content-type": meta.replace(";base64", ""), "content-disposition": `inline; filename="manifest-${row.id.slice(0, 8)}"` } });
  }
  const upstream = await fetch(row.formUrl);
  if (!upstream.ok) return new NextResponse("Unavailable", { status: 502 });
  return new NextResponse(upstream.body, { headers: { "content-type": upstream.headers.get("content-type") ?? "application/pdf", "content-disposition": `inline; filename="manifest-${row.id.slice(0, 8)}.pdf"`, "cache-control": "private, max-age=3600" } });
}
