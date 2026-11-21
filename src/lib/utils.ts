import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// All money is stored as whole sen (integers) to avoid rounding errors.
// RM 12.50 is stored as 1250.
const rm = new Intl.NumberFormat("en-MY", {
  style: "currency",
  currency: "MYR",
  minimumFractionDigits: 2,
});

export function formatRM(sen: number) {
  return rm.format(sen / 100);
}

// "+RM 50.00" for income, "−RM 12.50" for spending.
export function formatSignedRM(sen: number, sign: "+" | "-" | "") {
  return `${sign === "-" ? "−" : sign}${rm.format(Math.abs(sen) / 100)}`;
}

export function percent(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}
