import { extendTailwindMerge } from "tailwind-merge";

/**
 * Join class names, resolving Tailwind conflicts so the last one wins.
 *
 * A plain join is not enough. Written as a base plus an override —
 * `cn("bg-surface", selected && "bg-ink")` — both classes reach the element and CSS source order
 * decides, not the order they were written in. That silently made the selected label format in
 * Printing settings cream-on-white: `bg-surface` beat `bg-ink`, while `text-paper` applied
 * unopposed. tailwind-merge drops the losing class instead, so the written order is the real one.
 *
 * The custom scales from `@theme` in globals.css have to be declared here, or tailwind-merge
 * cannot tell that `rounded-card` and `rounded-pill` are the same property.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      radius: ["pill", "card", "field", "row"],
    },
  },
});

export function cn(...parts: Array<string | false | null | undefined>): string {
  return twMerge(parts.filter(Boolean).join(" "));
}
