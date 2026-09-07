"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui";
import { suggestRecipients, type RecipientSuggestion } from "@/lib/ship/actions";
import { cn } from "@/lib/cn";

/**
 * Recipient name field that completes from addresses this account has shipped to before.
 *
 * Deliberately not a third-party autocomplete: those send every keystroke of a customer's address
 * to another company, and a seller's own history is both the likelier match and already verified.
 * Picking a suggestion fills the whole address, so the common case — shipping to the same person
 * again — is two keystrokes and a click.
 */
export function RecipientSuggest({
  value,
  onChange,
  onPick,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (s: RecipientSuggestion) => void;
  disabled?: boolean;
}) {
  const [list, setList] = useState<RecipientSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrap = useRef<HTMLDivElement>(null);
  const listId = useId();
  // Set when a suggestion is taken, so the resulting value change does not immediately re-query.
  const justPicked = useRef(false);

  const tooShort = value.trim().length < 2;
  // Derived rather than stored: setting state synchronously in the effect below just to hide the
  // list would cascade a render on every keystroke.
  const visible = open && !tooShort && list.length > 0;

  useEffect(() => {
    if (disabled || tooShort || justPicked.current) { justPicked.current = false; return; }
    const q = value.trim();
    let cancelled = false;
    // Typing is faster than a round trip; wait for a pause rather than querying per keystroke.
    const t = setTimeout(async () => {
      const rows = await suggestRecipients(q);
      if (cancelled) return;
      setList(rows);
      setOpen(rows.length > 0);
      setActive(-1);
    }, 180);
    return () => { cancelled = true; clearTimeout(t); };
  }, [value, disabled, tooShort]);

  useEffect(() => {
    if (!visible) return;
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [visible]);

  function take(s: RecipientSuggestion) {
    justPicked.current = true;
    setOpen(false);
    setList([]);
    onPick(s);
  }

  return (
    <div className="relative" ref={wrap}>
      <Input
        aria-label="Recipient name"
        placeholder="Recipient name"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={visible}
        aria-controls={listId}
        aria-autocomplete="list"
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!visible) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % list.length); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? list.length - 1 : a - 1)); }
          else if (e.key === "Enter" && active >= 0) { e.preventDefault(); take(list[active]); }
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {visible && (
        <ul id={listId} role="listbox" aria-label="Previous recipients" className="card absolute left-0 right-0 top-[calc(100%+6px)] z-30 flex max-h-[280px] flex-col gap-0.5 overflow-y-auto p-2">
          {list.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => take(s)}
                className={cn("flex w-full flex-col gap-0.5 rounded-[14px] px-3 py-2 text-left", i === active ? "bg-paper" : "hover:bg-paper")}
              >
                <span className="text-[15px] font-extrabold text-ink">{s.name || s.company || s.street1}</span>
                <span className="text-[13px] font-bold text-muted">
                  {[s.street1, s.city, s.state, s.zip].filter(Boolean).join(", ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
