"use client";

import { useRef, useState } from "react";
import { parseAmount } from "@/lib/money";

// RM amount field with cents-first typing and automatic formatting:
// typing 1 → 0.01, 2 → 0.12, 3 → 1.23, … 123456 → 1,234.56. Backspace removes the last digit.
// The submitted value looks like "1,234.56", which the server already understands.

const MAX_SEN = 999_999_999; // RM 9,999,999.99
const fmt = new Intl.NumberFormat("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatSen(sen: number | null) {
  if (sen === null) return "";
  return `${sen < 0 ? "-" : ""}${fmt.format(Math.abs(sen) / 100)}`;
}

function toSen(v?: string | null) {
  if (!v) return null;
  const sen = parseAmount(v, { allowNegative: true });
  return sen ? sen : null; // 0 shows as empty (placeholder 0.00)
}

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "defaultValue" | "onChange" | "type" | "inputMode"> & {
  value?: string; // controlled
  defaultValue?: string; // uncontrolled, e.g. "12.50"
  onValueChange?: (formatted: string) => void;
  allowNegative?: boolean; // shows a ± button (e.g. a credit card's opening balance)
};

export function MoneyInput({ value, defaultValue, onValueChange, allowNegative = false, className = "", placeholder = "0.00", ...rest }: Props) {
  const controlled = value !== undefined;
  const [inner, setInner] = useState(() => formatSen(toSen(defaultValue)));
  const shown = controlled ? formatSen(toSen(value)) : inner;
  const ref = useRef<HTMLInputElement>(null);

  function commit(sen: number | null) {
    const s = formatSen(sen);
    if (!controlled) setInner(s);
    onValueChange?.(s);
    // Keep the cursor at the end so the next digit always lands in the cents.
    requestAnimationFrame(() => {
      const el = ref.current;
      if (el && document.activeElement === el) el.setSelectionRange(el.value.length, el.value.length);
    });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, "").replace(/^0+/, "");
    const sen = digits ? Number(digits) : 0;
    if (sen > MAX_SEN) return; // ignore digits beyond the maximum
    const negative = allowNegative && (raw.match(/-/g)?.length ?? 0) % 2 === 1;
    commit(sen === 0 ? null : negative ? -sen : sen);
  }

  // Pasting "12.50" or "RM 1,200" keeps its real meaning.
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const sen = parseAmount(e.clipboardData.getData("text"), { allowNegative });
    if (sen === null) return;
    e.preventDefault();
    commit(Math.abs(sen) > MAX_SEN ? toSen(shown) : sen || null);
  }

  const moveCaretToEnd = (e: React.SyntheticEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    requestAnimationFrame(() => el.setSelectionRange(el.value.length, el.value.length));
  };

  const input = (
    <input
      {...rest}
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={shown}
      placeholder={placeholder}
      onChange={handleChange}
      onPaste={handlePaste}
      onFocus={moveCaretToEnd}
      onClick={moveCaretToEnd}
      className={`${className} tabular-nums`}
    />
  );

  if (!allowNegative) return input;

  const sen = toSen(shown);
  return (
    <div className="relative">
      {input}
      <button
        type="button"
        onClick={() => sen !== null && commit(-sen)}
        disabled={sen === null}
        aria-label="Switch between positive and negative"
        className="absolute inset-y-1 right-1 grid w-9 place-items-center rounded-lg text-[15px] text-muted hover:bg-subtle hover:text-ink disabled:opacity-40"
      >
        ±
      </button>
    </div>
  );
}
