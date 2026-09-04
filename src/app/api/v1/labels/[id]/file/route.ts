import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { authenticateApi, isResponse, problem } from "@/lib/api/auth";
import { db, schema } from "@/lib/db";

/** GET /api/v1/labels/{id}/file — streams the label file (PDF/ZPL) to the key's owner. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const api = await authenticateApi(req);
  if (isResponse(api)) return api;
  const { id } = await ctx.params;
  const label = await db().query.labels.findFirst({ where: and(eq(schema.labels.id, id), eq(schema.labels.accountId, api.account.id)) });
  if (!label?.fileUrl) return problem(404, "not_found", "Label not found.");
  const upstream = await fetch(label.fileUrl);
  if (!upstream.ok || !upstream.body) return problem(502, "file_unavailable", "Label file unavailable right now.");
  const ext = label.format === "zpl" ? "zpl" : "pdf";
  return new NextResponse(upstream.body, {
    headers: { "content-type": upstream.headers.get("content-type") ?? (ext === "zpl" ? "text/plain" : "application/pdf"), "content-disposition": `inline; filename="snap-${label.trackingNumber}.${ext}"` },
  });
}
