import { and, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { PDFDocument } from "pdf-lib";
import { auth } from "@/lib/auth";
import { db, schema } from "@/lib/db";

export const maxDuration = 60;

/** Merges every label in a batch into one PDF, in the order the rows were bought. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });
  const { id } = await ctx.params;
  const batch = await db().query.batches.findFirst({ where: and(eq(schema.batches.id, id), eq(schema.batches.accountId, session.user.accountId)) });
  if (!batch) return new NextResponse("Not found", { status: 404 });

  const rows = await db()
    .select({ url: schema.labels.fileUrl, format: schema.labels.format })
    .from(schema.labels)
    .innerJoin(schema.shipments, eq(schema.shipments.id, schema.labels.shipmentId))
    .where(and(eq(schema.shipments.batchId, batch.id), isNull(schema.labels.voidedAt)))
    .orderBy(schema.labels.purchasedAt);

  const merged = await PDFDocument.create();
  for (const r of rows) {
    if (!r.url) continue;
    const res = await fetch(r.url);
    if (!res.ok) continue;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const type = res.headers.get("content-type") ?? "";
    if (type.includes("pdf") || r.format !== "zpl") {
      try {
        const src = await PDFDocument.load(bytes);
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
        continue;
      } catch {
        // not a PDF — fall through to image handling
      }
    }
    if (type.includes("png")) {
      const img = await merged.embedPng(bytes);
      const page = merged.addPage([288, 432]); // 4×6 in at 72 dpi
      page.drawImage(img, { x: 0, y: 0, width: 288, height: 432 });
    }
  }
  const out = await merged.save();
  return new NextResponse(Buffer.from(out), {
    headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="snap-batch-${batch.id.slice(0, 8)}.pdf"`, "cache-control": "private, max-age=3600" },
  });
}
