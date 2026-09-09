/**
 * US state from a ZIP code.
 *
 * The public rate calculator asks for two ZIPs and nothing else, which is the point of it. But
 * several carriers — DHL eCommerce and USAExportPBA among them — refuse to quote without a state,
 * so they were silently dropping out of every estimate.
 *
 * States own contiguous blocks of ZIP prefixes, so the first three digits determine the state.
 * This is stable public postal data, not a guess, and anything outside the table returns null so
 * an unknown ZIP omits the state rather than inventing one.
 */
const RANGES: Array<[number, number, string]> = [
  [6, 9, "PR"], [10, 27, "MA"], [28, 29, "RI"], [30, 38, "NH"], [39, 49, "ME"],
  [50, 59, "VT"], [60, 69, "CT"], [70, 89, "NJ"], [100, 149, "NY"], [150, 196, "PA"],
  [197, 199, "DE"], [200, 205, "DC"], [206, 219, "MD"], [220, 246, "VA"], [247, 268, "WV"],
  [270, 289, "NC"], [290, 299, "SC"], [300, 319, "GA"], [320, 349, "FL"], [350, 369, "AL"],
  [370, 385, "TN"], [386, 397, "MS"], [398, 399, "GA"], [400, 427, "KY"], [430, 459, "OH"],
  [460, 479, "IN"], [480, 499, "MI"], [500, 528, "IA"], [530, 549, "WI"], [550, 567, "MN"],
  [570, 577, "SD"], [580, 588, "ND"], [590, 599, "MT"], [600, 629, "IL"], [630, 658, "MO"],
  [660, 679, "KS"], [680, 693, "NE"], [700, 714, "LA"], [716, 729, "AR"], [730, 749, "OK"],
  [750, 799, "TX"], [800, 816, "CO"], [820, 831, "WY"], [832, 838, "ID"], [840, 847, "UT"],
  [850, 865, "AZ"], [870, 884, "NM"], [885, 885, "TX"], [889, 898, "NV"], [900, 961, "CA"],
  [967, 968, "HI"], [969, 969, "GU"], [970, 979, "OR"], [980, 994, "WA"], [995, 999, "AK"],
];

/** Two-letter state for a 5-digit US ZIP, or null when the prefix is not assigned to one. */
export function stateForZip(zip: string): string | null {
  // ZIP or ZIP+4, and nothing else — a bare run of six digits is not a ZIP with a stray character,
  // it is bad input, and guessing a state from its first five digits would be inventing one.
  const m = /^(\d{5})(?:-\d{4})?$/.exec(zip.trim());
  if (!m) return null;
  const prefix = Number(m[1].slice(0, 3));
  for (const [lo, hi, state] of RANGES) if (prefix >= lo && prefix <= hi) return state;
  return null;
}
