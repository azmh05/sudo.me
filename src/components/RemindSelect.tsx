// "Remind me" dropdown shared by bills and home/device upkeep.
export function RemindSelect({ value = 7, label = "Remind me" }: { value?: number; label?: string }) {
  return (
    <div>
      <label htmlFor="remindDays" className="label">{label}</label>
      <select id="remindDays" name="remindDays" defaultValue={String(value)} className="input">
        {[1, 3, 7, 14, 30].map((d) => (
          <option key={d} value={d}>{d === 1 ? "1 day" : `${d} days`} before it&apos;s due</option>
        ))}
      </select>
    </div>
  );
}
