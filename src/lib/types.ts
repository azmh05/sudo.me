// Shared types and labels — safe to use in both server and browser code.

export type TxKind = "INCOME" | "EXPENSE" | "TRANSFER";
export type AccountKind = "BANK" | "EWALLET" | "CASH" | "CARD" | "SAVINGS" | "OTHER";
export type CatKind = "INCOME" | "EXPENSE";

export type AccountOption = { id: number; name: string; type: AccountKind; archived: boolean };
export type CategoryOption = { id: number; name: string; kind: CatKind; archived: boolean };

export type AccountWithBalance = AccountOption & {
  openingBalance: number;
  note: string | null;
  balance: number;
};

export type CategoryWithBudget = CategoryOption & { monthlyBudget: number | null; used: number };

// A transaction ready to send to the browser (dates as "YYYY-MM-DD").
export type TxRow = {
  id: number;
  type: TxKind;
  amount: number;
  date: string;
  accountId: number;
  accountName: string;
  toAccountId: number | null;
  toAccountName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  note: string | null;
};

export type ActionResult = { ok?: boolean; error?: string; message?: string; id?: number; value?: string } | undefined;

export const ACCOUNT_TYPE_LABEL: Record<AccountKind, string> = {
  BANK: "Bank",
  EWALLET: "E-wallet",
  CASH: "Cash",
  CARD: "Credit card",
  SAVINGS: "Savings",
  OTHER: "Other",
};

export const TX_TYPE_LABEL: Record<TxKind, string> = {
  EXPENSE: "Expense",
  INCOME: "Income",
  TRANSFER: "Transfer",
};

// ---------- Step 3 ----------

export type BillRow = {
  id: number;
  name: string;
  amount: number;
  frequency: "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  nextDueDate: string;
  remindDays: number;
  accountId: number | null;
  categoryId: number | null;
  categoryName: string | null;
  note: string | null;
  active: boolean;
  payments: { id: number; dueDate: string; paidDate: string; amount: number; recorded: boolean }[];
};

export type MaintenanceRow = {
  id: number;
  name: string;
  groupLabel: string | null;
  intervalValue: number | null;
  intervalUnit: "DAY" | "WEEK" | "MONTH" | "YEAR" | null;
  lastDoneDate: string | null;
  nextDueDate: string | null;
  remindDays: number;
  note: string | null;
  active: boolean;
  logs: { id: number; doneDate: string; cost: number | null; note: string | null }[];
};

export type GoalRow = {
  id: number;
  name: string;
  type: "SAVINGS" | "EMERGENCY" | "PURCHASE";
  targetAmount: number;
  targetDate: string | null;
  note: string | null;
  archived: boolean;
  saved: number;
  contributions: { id: number; amount: number; date: string; note: string | null }[];
};

export type UpcomingItem = {
  key: string;
  kind: "bill" | "maintenance" | "document" | "health";
  remindDays?: number;
  badge?: { tone: "overdue" | "soon" | "later"; label: string }; // overrides the default due badge
  name: string;
  amount: number | null;
  dueDate: string;
  href: string;
};

// ---------- Step 4 ----------

export type VehicleItemRow = {
  id: number;
  name: string;
  intervalKm: number | null;
  lastDoneKm: number | null;
  lastDoneDate: string | null;
  nextDueKm: number | null;
  note: string | null;
  active: boolean;
  logs: { id: number; doneDate: string; odometer: number; cost: number | null; note: string | null }[];
};

export type VehicleRow = {
  id: number;
  name: string;
  plate: string | null;
  odometer: number;
  odometerDate: string | null;
  note: string | null;
  archived: boolean;
  items: VehicleItemRow[];
};

export type RecordCategoryKey =
  | "IDENTITY"
  | "VEHICLE"
  | "INSURANCE"
  | "EDUCATION"
  | "FINANCE"
  | "WORK"
  | "HEALTH"
  | "PURCHASE"
  | "OTHER";

export const RECORD_CATEGORY_LABEL: Record<RecordCategoryKey, string> = {
  IDENTITY: "Identity",
  VEHICLE: "Vehicle & licence",
  INSURANCE: "Insurance",
  EDUCATION: "Education",
  FINANCE: "Finance & tax",
  WORK: "Work",
  HEALTH: "Health",
  PURCHASE: "Purchases & warranties",
  OTHER: "Other",
};

export const RECORD_CATEGORY_HINT: Record<RecordCategoryKey, string> = {
  IDENTITY: "IC, passport, birth certificate",
  VEHICLE: "Driving licence, road tax, vehicle grant",
  INSURANCE: "Motor, medical, life policies",
  EDUCATION: "Certificates, transcripts, student card",
  FINANCE: "Bank, EPF, tax, PTPTN",
  WORK: "Offer letters, internship letters",
  HEALTH: "Medical card, vaccination record",
  PURCHASE: "Receipts and warranties",
  OTHER: "Anything else",
};

export type RecordFileRow = { id: number; name: string; mimeType: string; size: number; createdAt: string };

export type RecordRow = {
  id: number;
  title: string;
  category: RecordCategoryKey;
  hasNumber: boolean;
  numberLast4: string | null;
  issuer: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  remindDays: number;
  note: string | null;
  updatedAt: string;
  files: RecordFileRow[];
};

// ---------- Step 5 ----------

export type IntervalUnitKey = "DAY" | "WEEK" | "MONTH" | "YEAR";
export type BookedViaKey = "MYSEJAHTERA" | "PHONE" | "WALK_IN" | "ONLINE" | "OTHER";

export const BOOKED_VIA_LABEL: Record<BookedViaKey, string> = {
  MYSEJAHTERA: "MySejahtera",
  PHONE: "Phone call",
  WALK_IN: "Walk-in",
  ONLINE: "Online",
  OTHER: "Other",
};

export type AppointmentRow = {
  id: number;
  title: string;
  checkupId: number | null;
  date: string;
  time: string | null;
  place: string | null;
  bookedVia: BookedViaKey | null;
  reference: string | null;
  note: string | null;
  status: "BOOKED" | "DONE";
  outcome: string | null;
  cost: number | null;
};

export type CheckupRow = {
  id: number;
  name: string;
  intervalValue: number;
  intervalUnit: IntervalUnitKey;
  bookLeadDays: number;
  lastDoneDate: string | null;
  nextDueDate: string | null;
  place: string | null;
  note: string | null;
  active: boolean;
  booked: AppointmentRow | null; // the next upcoming appointment for it, if booked
};

export type HealthProfileRow = {
  bloodType: string | null;
  allergies: string | null;
  medications: string | null;
  conditions: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  emergencyRelation: string | null;
  note: string | null;
};

export type TaskRow = {
  id: number;
  title: string;
  dueDate: string | null;
  dueTime: string | null;
  priority: "LOW" | "NORMAL" | "HIGH";
  remindMinutes: number | null;
  done: boolean;
  note: string | null;
};

export type EventRow = {
  id: number;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  remindMinutes: number | null;
  note: string | null;
};

export const REMIND_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "At the time" },
  { value: 10, label: "10 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
];

// Anything that shows on the planner's agenda or calendar.
export type PlannerItem = {
  key: string;
  kind: "task" | "event" | "health" | "bill";
  date: string;
  time: string | null;
  title: string;
  sub: string | null;
  href?: string;
  task?: TaskRow;
  event?: EventRow;
};

export type JournalRow = { id: number; date: string; content: string; mood: number | null };

export type ProfileInfoRow = {
  fullName: string | null;
  preferredName: string | null;
  dateOfBirth: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  about: string | null;
  photoId: number | null;
};

export type ProfilePhotoRow = { id: number; createdAt: string };

export type ProfileKind = "EDUCATION" | "WORK" | "SKILL" | "CERTIFICATION" | "ACHIEVEMENT";

export type ProfileEntryRow = {
  id: number;
  kind: ProfileKind;
  title: string;
  organisation: string | null;
  detail: string | null;
  startDate: string | null;
  endDate: string | null;
  current: boolean;
  description: string | null;
};
