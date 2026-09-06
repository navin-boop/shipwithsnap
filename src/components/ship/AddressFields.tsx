"use client";

import { Input } from "@/components/ui";
import { cn } from "@/lib/cn";
import { formatAddressLine, parseAddressLine } from "@/lib/ship/address-parse";

/**
 * Address entry with two equal ways in: paste a whole address, or type each field.
 *
 * Both modes edit the same values, so switching never loses what you typed — a pasted line is
 * parsed straight into the fields, and the fields are recomposed into a line when you switch back.
 * International addresses are fields-only, because a single line can't be parsed reliably abroad.
 */

export type AddressFieldValues = { street1: string; street2: string; city: string; state: string; zip: string };
export type AddressMode = "paste" | "fields";

export const EMPTY_ADDRESS: AddressFieldValues = { street1: "", street2: "", city: "", state: "", zip: "" };

export function addressIsComplete(v: AddressFieldValues, country = "US"): boolean {
  if (!v.street1.trim() || !v.city.trim() || !v.state.trim() || !v.zip.trim()) return false;
  if (country !== "US") return true;
  return /^[A-Za-z]{2}$/.test(v.state.trim()) && /^\d{5}(-\d{4})?$/.test(v.zip.trim());
}

export interface AddressFieldsProps {
  value: AddressFieldValues;
  onChange: (next: AddressFieldValues) => void;
  mode: AddressMode;
  onModeChange: (mode: AddressMode) => void;
  /** Free text currently in the paste box (kept by the caller so it survives a re-render). */
  pasted: string;
  onPastedChange: (text: string) => void;
  country?: string;
  disabled?: boolean;
  /** Rendered beside the paste box — the Verify button on the Ship page. */
  action?: React.ReactNode;
  /** Called when the user finishes editing, e.g. to kick off verification. */
  onCommit?: () => void;
  idPrefix?: string;
}

export function AddressFields({ value, onChange, mode, onModeChange, pasted, onPastedChange, country = "US", disabled, action, onCommit, idPrefix = "addr" }: AddressFieldsProps) {
  const intl = country !== "US";
  const effectiveMode: AddressMode = intl ? "fields" : mode;
  const set = (k: keyof AddressFieldValues) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });

  function handlePaste(text: string) {
    onPastedChange(text);
    const parsed = parseAddressLine(text);
    if (parsed) onChange({ street1: parsed.street1, street2: parsed.street2 ?? "", city: parsed.city, state: parsed.state, zip: parsed.zip });
  }

  function switchMode(next: AddressMode) {
    // Carry what is already there across, so neither way of entering loses work.
    if (next === "paste" && value.street1) onPastedChange(formatAddressLine({ ...value, street2: value.street2 || null }));
    onModeChange(next);
  }

  const unparsed = effectiveMode === "paste" && pasted.trim().length > 8 && !parseAddressLine(pasted);

  return (
    <div className="flex flex-col gap-3">
      {!intl && (
        <div role="radiogroup" aria-label="How to enter the address" className="flex w-fit gap-1 rounded-pill border-2 border-ink bg-paper p-1">
          {(["paste", "fields"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={effectiveMode === m}
              disabled={disabled}
              onClick={() => switchMode(m)}
              className={cn(
                "rounded-pill px-3.5 py-1.5 text-[13px] font-extrabold transition-colors",
                effectiveMode === m ? "bg-ink text-yellow" : "text-muted hover:text-ink",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              {m === "paste" ? "Paste whole address" : "Enter fields"}
            </button>
          ))}
        </div>
      )}

      {effectiveMode === "paste" ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <Input
              id={`${idPrefix}-paste`}
              aria-label="Whole address"
              placeholder="418 Bergen St, Brooklyn, NY 11217"
              value={pasted}
              onChange={(e) => handlePaste(e.target.value)}
              onBlur={onCommit}
              onKeyDown={(e) => e.key === "Enter" && onCommit?.()}
              disabled={disabled}
              className="flex-1"
            />
            {action}
          </div>
          {unparsed ? (
            <div className="text-[13px] font-bold text-danger">
              Couldn&apos;t read that one. Use the format &ldquo;418 Bergen St, Brooklyn, NY 11217&rdquo;, or{" "}
              <button type="button" className="underline underline-offset-2" onClick={() => switchMode("fields")}>enter the fields instead</button>.
            </div>
          ) : (
            <div className="text-[13px] font-bold text-muted">Paste it straight from an email or an order — street, city, state and ZIP on one line.</div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Input id={`${idPrefix}-street1`} aria-label="Street" label="Street" placeholder="418 Bergen St" value={value.street1} onChange={set("street1")} disabled={disabled} />
          <Input id={`${idPrefix}-street2`} aria-label="Apartment, suite or unit" label="Apt, suite, unit (optional)" value={value.street2} onChange={set("street2")} disabled={disabled} />
          <div className="grid grid-cols-[minmax(0,1fr)_92px_110px] gap-3">
            <Input id={`${idPrefix}-city`} aria-label="City" label="City" placeholder="Brooklyn" value={value.city} onChange={set("city")} disabled={disabled} />
            <Input
              id={`${idPrefix}-state`}
              aria-label={intl ? "State, province or region" : "State"}
              label={intl ? "Region" : "State"}
              placeholder={intl ? "Region" : "NY"}
              maxLength={intl ? 40 : 2}
              value={value.state}
              onChange={(e) => onChange({ ...value, state: intl ? e.target.value : e.target.value.toUpperCase() })}
              disabled={disabled}
            />
            <Input
              id={`${idPrefix}-zip`}
              aria-label={intl ? "Postal code" : "ZIP code"}
              label={intl ? "Postal code" : "ZIP"}
              placeholder={intl ? "75004" : "11217"}
              inputMode={intl ? "text" : "numeric"}
              value={value.zip}
              onChange={set("zip")}
              onBlur={onCommit}
              disabled={disabled}
            />
          </div>
          {action}
        </div>
      )}
    </div>
  );
}
