"use client";

import { Check, Trash2, Upload, UserRound } from "lucide-react";
import { useActionState, useRef, useState, useTransition } from "react";
import { deleteProfilePhoto, selectProfilePhoto, uploadProfilePhoto } from "@/app/actions/profile";
import type { ActionResult, ProfilePhotoRow } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Avatar } from "../Avatar";
import { FormError } from "../Modal";

const fmt = new Intl.DateTimeFormat("en-MY", { day: "numeric", month: "short", year: "numeric" });

export function PhotoPicker({ currentId, photos, name }: { currentId: number | null; photos: ProfilePhotoRow[]; name: string }) {
  const [state, upload, uploading] = useActionState(uploadProfilePhoto, undefined);
  const [result, setResult] = useState<ActionResult>();
  const [pending, start] = useTransition();
  const [armed, setArmed] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const run = (fn: () => Promise<ActionResult>) => start(async () => setResult(await fn()));

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center">
        <Avatar photoId={currentId} name={name} className="size-28 text-[36px]" />
        <form ref={formRef} action={upload} className="mt-4">
          <label className={cn("btn-primary h-10 cursor-pointer", uploading && "pointer-events-none opacity-60")}>
            <Upload className="size-4" /> {uploading ? "Uploading…" : "Upload new picture"}
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={uploading}
              onChange={(e) => e.currentTarget.files?.length && formRef.current?.requestSubmit()}
            />
          </label>
        </form>
        <p className="mt-2 text-[12px] text-muted">JPG, PNG or WebP, up to 8 MB. Stored encrypted.</p>
      </div>

      <FormError message={state?.error ?? result?.error} />

      {photos.length > 0 && (
        <div className="border-t border-line pt-4">
          <p className="mb-3 text-[13px] font-medium">Your pictures</p>
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {photos.map((p) => {
              const current = p.id === currentId;
              return (
                <li key={p.id} className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    disabled={pending || current}
                    onClick={() => run(() => selectProfilePhoto(p.id))}
                    className={cn("relative rounded-full ring-offset-2 ring-offset-surface transition", current ? "ring-2 ring-accent" : "hover:opacity-80")}
                    title={current ? "Current picture" : "Use this picture"}
                  >
                    <Avatar photoId={p.id} name={name} className="size-16" />
                    {current && (
                      <span className="absolute -bottom-1 -right-1 grid size-5 place-items-center rounded-full bg-accent text-accent-ink">
                        <Check className="size-3" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                  <span className="text-[11px] text-muted">{fmt.format(new Date(p.createdAt))}</span>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => (armed === p.id ? run(() => deleteProfilePhoto(p.id)) : setArmed(p.id))}
                    onBlur={() => setArmed(null)}
                    className={cn("rounded px-1.5 py-0.5 text-[11px]", armed === p.id ? "bg-negative text-white" : "text-muted hover:text-negative")}
                    aria-label="Delete picture"
                  >
                    {armed === p.id ? "Delete?" : <Trash2 className="size-3.5" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {currentId && (
        <button type="button" disabled={pending} onClick={() => run(() => selectProfilePhoto(null))} className="btn-ghost h-10 w-full text-[14px]">
          <UserRound className="size-4" /> Don&apos;t show a picture (use my initial)
        </button>
      )}
    </div>
  );
}
