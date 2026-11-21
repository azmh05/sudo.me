"use client";

import { useActionState } from "react";
import { setupAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { PasswordInput } from "../PasswordInput";

export function SetupForm() {
  const [state, action] = useActionState(setupAction, undefined);

  return (
    <form action={action} autoComplete="off" className="card p-6">
      <p className="text-[15px] font-medium">Let's set up your Hub</p>
      <p className="mt-0.5 text-[14px] text-muted">
        This creates the only account. Nobody else can sign up afterwards.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="name" className="label">Your name</label>
          <input id="name" name="name" className="input" autoComplete="off" maxLength={80} required autoFocus />
        </div>
        <div>
          <label htmlFor="password" className="label">Password (min. 10 characters)</label>
          <PasswordInput id="password" name="password" autoComplete="new-password" minLength={10} required />
        </div>
        <div>
          <label htmlFor="confirm" className="label">Confirm password</label>
          <PasswordInput id="confirm" name="confirm" autoComplete="new-password" minLength={10} required />
        </div>
      </div>

      {state?.error && (
        <p role="alert" className="mt-3 rounded-lg bg-negative/10 px-3 py-2 text-[13px] text-negative">
          {state.error}
        </p>
      )}

      <SubmitButton className="mt-5">Create my Hub</SubmitButton>
      <p className="mt-3 text-center text-[12px] text-muted">
        Forgot it later? It can only be reset from your laptop.
      </p>
    </form>
  );
}
