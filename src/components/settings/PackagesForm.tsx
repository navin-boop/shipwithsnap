"use client";

import { useState, useTransition } from "react";
import { Button, Input, Select } from "@/components/ui";
import { cn } from "@/lib/cn";
import type { ParcelPreset } from "@/lib/db/schema";
import { deleteParcelPreset, saveParcelPreset } from "@/lib/ship/actions";
import { PREDEFINED_PACKAGES } from "@/lib/shipping/options";

// Saved package sizes: pick one on the Ship page instead of retyping dimensions.

const CARRIER_PACKAGES = Object.entries(PREDEFINED_PACKAGES).flatMap(([carrier, list]) =>
  list.filter((p) => p.code !== "Parcel" && p.code !== "YourPackaging").map((p) => ({ value: `${carrier}|${p.code}`, label: `${carrier} ${p.label}${p.hint ? ` · ${p.hint}` : ""}` })),
);

export function PackagesForm({ presets: initial }: { presets: ParcelPreset[] }) {
  const [presets, setPresets] = useState(initial);
  const [kind, setKind] = useState<"own" | "carrier">("own");
  const [name, setName] = useState("");
  const [dims, setDims] = useState({ l: "", w: "", h: "", lb: "" });
  const [carrierPkg, setCarrierPkg] = useState(CARRIER_PACKAGES[0].value);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [pending, start] = useTransition();

  function add() {
    const weightOz = Math.round((parseFloat(dims.lb) || 0) * 16);
    if (kind === "own") {
      const [l, w, h] = [parseFloat(dims.l), parseFloat(dims.w), parseFloat(dims.h)];
      if (![l, w, h].every((x) => Number.isFinite(x) && x > 0)) { setErr(true); setMsg("Fill in length, width and height."); return; }
      if (!weightOz) { setErr(true); setMsg("Add the empty-or-typical weight."); return; }
      start(async () => {
        const p = await saveParcelPreset({ name: name || `${l}×${w}×${h}`, parcel: { type: "box", lengthIn: l, widthIn: w, heightIn: h, weightOz } });
        setPresets([...presets, p]); setErr(false); setMsg("Saved."); setName(""); setDims({ l: "", w: "", h: "", lb: "" });
      });
    } else {
      const [carrier, code] = carrierPkg.split("|");
      if (!weightOz) { setErr(true); setMsg("Add a typical weight."); return; }
      start(async () => {
        const p = await saveParcelPreset({ name: name || `${carrier} ${code.replace(/([a-z])([A-Z])/g, "$1 $2")}`, parcel: { type: code.includes("FlatRate") ? "flat_rate" : "carrier_package", lengthIn: 1, widthIn: 1, heightIn: 1, weightOz, predefinedPackage: code } });
        setPresets([...presets, p]); setErr(false); setMsg("Saved."); setName("");
      });
    }
  }

  return (
    <div className="flex max-w-[720px] flex-col gap-6">
      <div className="flex flex-col gap-3">
        {presets.length === 0 && <div className="text-[14px] font-bold text-muted">No saved packages yet. Add the boxes you actually use and the Ship page becomes two clicks.</div>}
        {presets.map((p) => (
          <div key={p.id} className="card-quiet flex items-center justify-between gap-3 p-4">
            <div className="flex flex-col">
              <div className="text-[15px] font-extrabold">{p.name}</div>
              <div className="text-[13px] font-bold text-muted">
                {p.parcel.predefinedPackage ? p.parcel.predefinedPackage.replace(/([a-z])([A-Z])/g, "$1 $2") : `${p.parcel.lengthIn} × ${p.parcel.widthIn} × ${p.parcel.heightIn} in`} · {p.parcel.weightOz} oz
              </div>
            </div>
            <button type="button" className="text-[13px] font-extrabold text-muted hover:text-danger" onClick={() => start(async () => { await deleteParcelPreset(p.id); setPresets(presets.filter((x) => x.id !== p.id)); })}>Remove</button>
          </div>
        ))}
      </div>

      <div className="card flex flex-col gap-4 p-5">
        <div className="lbl">Add a package</div>
        <div className="flex gap-2">
          {(["own", "carrier"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} className={cn("rounded-pill border-2 border-ink px-4 py-2 text-[14px] font-extrabold", kind === k ? "bg-teal text-white" : "bg-surface")}>
              {k === "own" ? "My own box" : "Carrier packaging"}
            </button>
          ))}
        </div>
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Small mug box" />
        {kind === "own" ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Input label="Length" unit="in" inputMode="decimal" value={dims.l} onChange={(e) => setDims({ ...dims, l: e.target.value })} />
            <Input label="Width" unit="in" inputMode="decimal" value={dims.w} onChange={(e) => setDims({ ...dims, w: e.target.value })} />
            <Input label="Height" unit="in" inputMode="decimal" value={dims.h} onChange={(e) => setDims({ ...dims, h: e.target.value })} />
            <Input label="Typical weight" unit="lb" inputMode="decimal" value={dims.lb} onChange={(e) => setDims({ ...dims, lb: e.target.value })} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
            <Select label="Packaging" value={carrierPkg} onChange={(e) => setCarrierPkg(e.target.value)} options={CARRIER_PACKAGES} />
            <Input label="Typical weight" unit="lb" inputMode="decimal" value={dims.lb} onChange={(e) => setDims({ ...dims, lb: e.target.value })} />
          </div>
        )}
        {msg && <div className={cn("text-[13px] font-bold", err ? "text-danger" : "text-teal")}>{msg}</div>}
        <Button variant="secondary" size="sm" className="self-start" disabled={pending} onClick={add}>{pending ? "Saving…" : "Save package"}</Button>
      </div>
    </div>
  );
}
