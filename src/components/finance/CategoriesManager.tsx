"use client";

import { Pencil, Plus } from "lucide-react";
import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { deleteCategory, saveCategory, setCategoryArchived } from "@/app/actions/finance";
import type { ActionResult, CatKind, CategoryOption } from "@/lib/types";
import { ConfirmDelete, FormError, Modal } from "../Modal";

type Editing = { category?: CategoryOption; kind: CatKind } | null;

export function CategoriesManager({ categories }: { categories: CategoryOption[] }) {
  const [editing, setEditing] = useState<Editing>(null);
  const close = useCallback(() => setEditing(null), []);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {(["EXPENSE", "INCOME"] as const).map((kind) => {
          const list = categories.filter((c) => c.kind === kind);
          return (
            <div key={kind} className="card">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <h2 className="text-[15px] font-medium">{kind === "EXPENSE" ? "Spending" : "Income"} categories</h2>
                <button type="button" onClick={() => setEditing({ kind })} className="btn-ghost h-8 px-2.5 text-[13px]">
                  <Plus className="size-4" /> Add
                </button>
              </div>
              <ul className="divide-y divide-line">
                {list.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setEditing({ category: c, kind })}
                      className="group flex w-full items-center justify-between px-5 py-3 text-left text-[14px] hover:bg-subtle/60"
                    >
                      <span className={c.archived ? "text-muted line-through" : ""}>{c.name}</span>
                      <Pencil className="size-3.5 text-muted opacity-0 transition group-hover:opacity-100" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[13px] text-muted">
        Deleting a category that&apos;s already used archives it instead, so your old records keep their label.
      </p>

      <Modal open={editing !== null} onClose={close} title={editing?.category ? "Edit category" : "New category"}>
        {editing && <CategoryForm {...editing} onDone={close} />}
      </Modal>
    </>
  );
}

function CategoryForm({ category, kind, onDone }: { category?: CategoryOption; kind: CatKind; onDone: () => void }) {
  const [state, action, saving] = useActionState(saveCategory, undefined);
  const [result, setResult] = useState<ActionResult>();
  const [busy, start] = useTransition();

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      const r = await fn();
      if (r?.ok) onDone();
      else setResult(r);
    });

  return (
    <form action={action} autoComplete="off" className="space-y-4">
      {category && <input type="hidden" name="id" value={category.id} />}
      <input type="hidden" name="kind" value={kind} />
      <div>
        <label htmlFor="name" className="label">{kind === "EXPENSE" ? "Spending" : "Income"} category name</label>
        <input id="name" name="name" autoComplete="off" defaultValue={category?.name} maxLength={60} className="input" required autoFocus />
      </div>
      <FormError message={state?.error ?? result?.error} />
      <div className="flex items-center gap-2">
        {category && (
          <>
            <ConfirmDelete pending={busy} onConfirm={() => run(() => deleteCategory(category.id))} />
            {category.archived && (
              <button type="button" disabled={busy} onClick={() => run(() => setCategoryArchived(category.id, false))} className="btn-ghost h-10 px-3 text-[14px]">
                Restore
              </button>
            )}
          </>
        )}
        <button type="submit" disabled={saving || busy} className="btn-primary ml-auto min-w-24">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
