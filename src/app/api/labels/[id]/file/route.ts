import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";

/**
 * Serves a label file to its owner. Customers never see provider URLs: we fetch the file
 * server-side and stream it. (Phase 5 moves storage to our bucket with signed URLs.)
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const label = await db().query.labels.findFirst({
    where: and(eq(schema.labels.id, id), eq(schema.labels.accountId, session.user.accountId)),
  });
  if (!label?.fileUrl) return new NextResponse("Not found", { status: 404 });

  if (label.fileUrl.startsWith("data:")) {
    const [, meta, b64] = /^data:([^;,]+);base64,(.*)$/.exec(label.fileUrl) ?? [];
    if (!b64) return new NextResponse("Bad label file", { status: 500 });
    return new NextResponse(Buffer.from(b64, "base64"), {
      headers: { "content-type": meta, "cache-control": "private, max-age=3600" },
    });
  }

  const upstream = await fetch(label.fileUrl);
  if (!upstream.ok || !upstream.body) return new NextResponse("Label file unavailable", { status: 502 });
  const ext = label.format === "zpl" ? "zpl" : "pdf";
  return new NextResponse(upstream.body, {
    headers: {
      "content-type": upstream.headers.get("content-type") ?? (ext === "zpl" ? "text/plain" : "application/pdf"),
      "content-disposition": `inline; filename="snap-${label.trackingNumber}.${ext}"`,
      "cache-control": "private, max-age=3600",
    },
  });
}
