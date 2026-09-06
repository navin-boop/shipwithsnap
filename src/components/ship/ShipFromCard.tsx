"use client";

import { Select } from "@/components/ui";
import type { Address } from "@/lib/db/schema";
import { formatAddressLine } from "@/lib/ship/address-parse";

/**
 * The return address on the label, shown in full on the Ship page rather than as a footnote.
 * Sellers ship from more than one place, and a wrong return address is only obvious once the
 * package comes back, so it gets its own card with a switcher when there is more than one.
 */
export function ShipFromCard({ from, options, onSelect, onEdit, disabled }: {
  from: Address;
  options: Address[];
  onSelect: (a: Address) => void;
  onEdit: () => void;
  disabled?: boolean;
}) {
  const others = options.filter((a) => a.id !== from.id);
  return (
    <section className="card flex flex-col gap-3 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="lbl">Shipping from</div>
        <button type="button" className="text-[13px] font-extrabold text-coral disabled:opacity-50" onClick={onEdit} disabled={disabled}>
          {options.length ? "Edit or add" : "Add one"}
        </button>
      </div>

      <div className="flex flex-col gap-0.5 text-[15px] font-bold">
        <div className="text-[17px] font-extrabold">{from.name ?? from.company ?? "Ship-from address"}</div>
        {from.company && from.name && <div className="text-ink-2">{from.company}</div>}
        <div className="text-ink-2">{formatAddressLine(from)}</div>
        <div className="text-muted">
          {from.phone ? from.phone : <span className="text-danger">No phone — FedEx and UPS refuse labels without one</span>}
          {from.email ? ` · ${from.email}` : ""}
        </div>
      </div>

      {others.length > 0 && (
        <Select
          aria-label="Ship from which address"
          value={from.id}
          disabled={disabled}
          onChange={(e) => {
            const next = options.find((a) => a.id === e.target.value);
            if (next) onSelect(next);
          }}
          options={options.map((a) => ({ value: a.id, label: `${a.name ?? a.company ?? "Address"} — ${a.city}, ${a.state} ${a.zip}` }))}
        />
      )}

      <p className="text-[13px] font-bold text-muted">This is the return address printed on the label, and where a carrier collects a pickup.</p>
    </section>
  );
}
