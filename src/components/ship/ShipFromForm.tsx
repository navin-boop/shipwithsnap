"use client";

import { useState, useTransition } from "react";
import { Button, Input } from "@/components/ui";
import type { Address } from "@/lib/db/schema";
import { saveShipFrom } from "@/lib/ship/actions";
import { AddressFields, EMPTY_ADDRESS, type AddressFieldValues, type AddressMode } from "./AddressFields";
import { formatAddressLine } from "@/lib/ship/address-parse";

/** Ship-from editor. Same two ways in as the recipient: paste a whole address, or type the fields. */
export function ShipFromForm({ initial, onSaved, onCancel }: { initial: Address | null; onSaved: (a: Address) => void; onCancel?: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [addr, setAddr] = useState<AddressFieldValues>(
    initial ? { street1: initial.street1, street2: initial.street2 ?? "", city: initial.city, state: initial.state, zip: initial.zip } : EMPTY_ADDRESS,
  );
  const [mode, setMode] = useState<AddressMode>(initial ? "fields" : "paste");
  const [pasted, setPasted] = useState(initial ? formatAddressLine({ ...initial, street2: initial.street2 }) : "");
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, start] = useTransition();

  function submit() {
    start(async () => {
      setErrors([]);
      const res = await saveShipFrom({ name, phone, ...addr, street2: addr.street2 || null, country: "US" });
      if (res.ok) onSaved(res.address);
      else setErrors(res.errors);
    });
  }

  return (
    <div className="flex flex-col gap-3.5">
      <Input label="Name or store" value={name} onChange={(e) => setName(e.target.value)} placeholder="Snap Goods" />
      <AddressFields
        value={addr}
        onChange={setAddr}
        mode={mode}
        onModeChange={setMode}
        pasted={pasted}
        onPastedChange={setPasted}
        disabled={pending}
        idPrefix="from"
      />
      <Input label="Phone — carriers require it" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="(718) 555-0100" />
      {errors.map((e) => (
        <div key={e} className="text-[13px] font-bold text-danger">{e}</div>
      ))}
      <div className="flex gap-2">
        <Button variant="secondary" size="md" onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Save ship-from"}
        </Button>
        {onCancel && (
          <Button variant="outline" size="md" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
