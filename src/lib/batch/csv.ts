import type { OrderItem, OrderShipTo, Parcel } from "@/lib/db/schema";

/** Small RFC 4180 parser: quoted fields, escaped quotes, CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

export const CSV_COLUMNS = [
  "order_number",
  "name",
  "email",
  "phone",
  "street1",
  "street2",
  "city",
  "state",
  "zip",
  "weight_lb",
  "length_in",
  "width_in",
  "height_in",
  "items",
] as const;

const ALIASES: Record<string, (typeof CSV_COLUMNS)[number]> = {
  order: "order_number",
  order_id: "order_number",
  "order #": "order_number",
  number: "order_number",
  recipient: "name",
  full_name: "name",
  customer: "name",
  address: "street1",
  address1: "street1",
  street: "street1",
  address2: "street2",
  apt: "street2",
  province: "state",
  postal_code: "zip",
  postcode: "zip",
  zipcode: "zip",
  weight: "weight_lb",
  weight_lbs: "weight_lb",
  length: "length_in",
  width: "width_in",
  height: "height_in",
  item: "items",
  products: "items",
};

export type ParsedOrder = { externalId: string; number: string; shipTo: OrderShipTo; items: OrderItem[]; parcel: Parcel | null };
export type CsvResult = { orders: ParsedOrder[]; errors: string[] };

/** Maps a CSV to orders. Header names are matched loosely (case, spaces, common aliases). */
export function ordersFromCsv(text: string): CsvResult {
  const rows = parseCsv(text);
  if (rows.length < 2) return { orders: [], errors: ["The file needs a header row and at least one order."] };
  const header = rows[0].map((h) => {
    const k = h.trim().toLowerCase().replace(/[\s-]+/g, "_");
    return (CSV_COLUMNS as readonly string[]).includes(k) ? k : ALIASES[k] ?? ALIASES[h.trim().toLowerCase()] ?? null;
  });
  const idx = (col: (typeof CSV_COLUMNS)[number]) => header.indexOf(col);
  const required: Array<(typeof CSV_COLUMNS)[number]> = ["name", "street1", "city", "state", "zip"];
  const missing = required.filter((c) => idx(c) === -1);
  if (missing.length) return { orders: [], errors: [`Missing column(s): ${missing.join(", ")}. Download the template to see the expected headers.`] };

  const orders: ParsedOrder[] = [];
  const errors: string[] = [];
  rows.slice(1).forEach((r, i) => {
    const get = (c: (typeof CSV_COLUMNS)[number]) => (idx(c) === -1 ? "" : (r[idx(c)] ?? "").trim());
    const line = i + 2;
    const zip = get("zip").replace(/\D/g, "").slice(0, 5);
    if (!get("name") || !get("street1") || !get("city") || !/^[A-Za-z]{2}$/.test(get("state")) || zip.length !== 5) {
      errors.push(`Line ${line}: needs name, street, city, 2-letter state and 5-digit ZIP.`);
      return;
    }
    const num = (c: (typeof CSV_COLUMNS)[number]) => {
      const v = parseFloat(get(c));
      return Number.isFinite(v) && v > 0 ? v : null;
    };
    const weight = num("weight_lb");
    const parcel: Parcel | null = weight
      ? { type: "box", lengthIn: num("length_in") ?? 12, widthIn: num("width_in") ?? 9, heightIn: num("height_in") ?? 4, weightOz: Math.round(weight * 16) }
      : null;
    const number = get("order_number") || `CSV-${line}`;
    orders.push({
      externalId: number,
      number,
      shipTo: { name: get("name"), email: get("email") || null, phone: get("phone") || null, street1: get("street1"), street2: get("street2") || null, city: get("city"), state: get("state").toUpperCase(), zip, country: "US" },
      items: get("items") ? get("items").split(/\s*[|;]\s*/).filter(Boolean).map((t) => ({ title: t, quantity: 1 })) : [],
      parcel,
    });
  });
  return { orders, errors };
}

export const CSV_TEMPLATE = `${CSV_COLUMNS.join(",")}\n#1042,Maya Chen,maya@example.com,,418 Bergen St,,Brooklyn,NY,11217,1.8,12,9,4,Linen tote | Ceramic mug\n`;
