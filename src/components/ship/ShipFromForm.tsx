"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import type { Address } from "@/lib/db/schema";
import { saveShipFrom } from "@/lib/ship/actions";

/** Inline ship-from editor. Shown open on first use; behind "change" afterwards. */
export function ShipFromForm({ initial, onSaved, onCancel }: { initial: Address | null; onSaved: (a: Address) => void; onCancel?: () => void }) {
  const [f, setF] = useState({
    name: initial?.name ?? "",
    street1: initial?.street1 ?? "",
    street2: initial?.street2 ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    zip: initial?.zip ?? "",
    phone: initial?.phone ?? "",
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  function submit() {
    start(async () => {
      const res = await saveShipFrom({ ...f, street2: f.street2 || null, country: "US" });
      if (res.ok) onSaved(res.address);
      else setErrors(res.errors);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <Input label="Name or store" value={f.name} onChange={set("name")} placeholder="Snap Goods" />
      <Input label="Street" value={f.street1} onChange={set("street1")} placeholder="20 Jay St" />
      <Input label="Unit, suite (optional)" value={f.street2} onChange={set("street2")} />
      <div className="grid grid-cols-[minmax(0,1fr)_72px_110px] gap-3">
        <Input label="City" value={f.city} onChange={set("city")} placeholder="Brooklyn" />
        <Input label="State" value={f.state} onChange={set("state")} placeholder="NY" maxLength={2} />
        <Input label="ZIP" value={f.zip} onChange={set("zip")} placeholder="11201" inputMode="numeric" />
      </div>
      <Input label="Phone (carriers require it)" value={f.phone} onChange={set("phone")} inputMode="tel" placeholder="(718) 555-0100" />
      {errors.map((e) => (
        <div key={e} className="text-[13px] font-bold text-danger">{e}</div>
      ))}
      <div className="flex gap-2">
        <Button variant="secondary" size="md" onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Save ship-from"}
        </Button>
        {onCancel && (
          <Button variant="outline" size="md" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
