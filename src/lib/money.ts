// Converts what you type ("12.5", "RM 1,200", "-30") into whole sen.
// Returns null if it isn't a valid amount.
export function parseAmount(input: string, { allowNegative = false } = {}) {
  let s = input.trim().replace(/^rm/i, "").replace(/[,\s]/g, "");
  let sign = 1;
  if (allowNegative && s.startsWith("-")) {
    sign = -1;
    s = s.slice(1).replace(/^rm/i, "");
  }
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  const sen = Number(whole) * 100 + Number(frac.padEnd(2, "0"));
  if (!Number.isSafeInteger(sen) || sen > 1_000_000_000) return null; // RM 10 million cap
  return sign * sen;
}

// 1250 -> "12.50" (for filling in edit forms)
export function senToInput(sen: number) {
  return (sen / 100).toFixed(2);
}
