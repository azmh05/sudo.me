"use client";

import { Plus } from "lucide-react";
import { useCallback, useState } from "react";
import type { AccountOption, CategoryOption } from "@/lib/types";
import { Modal } from "../Modal";
import { TransactionForm } from "./TransactionForm";

export function AddRecordButton({
  accounts,
  categories,
  className = "",
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`btn-primary h-10 ${className}`}>
        <Plus className="size-[18px]" strokeWidth={2} />
        Add record
      </button>
      <Modal open={open} onClose={close} title="New record">
        <TransactionForm accounts={accounts} categories={categories} onDone={close} />
      </Modal>
    </>
  );
}
