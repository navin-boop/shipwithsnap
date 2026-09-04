import { NextResponse } from "next/server";
import { CSV_TEMPLATE } from "@/lib/batch/csv";

export function GET() {
  return new NextResponse(CSV_TEMPLATE, {
    headers: { "content-type": "text/csv", "content-disposition": 'attachment; filename="snap-orders-template.csv"' },
  });
}
