"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { PasswordInput } from "../PasswordInput";

export function LoginForm({ name }: { name: string }) {
  const [state, action] = useActionState(loginAction, undefined);

  return (
    <form action={action} className="card p-6">
      <p className="text-[15px] font-medium">Welcome back, {name}</p>
      <p className="mt-0.5 text-[14px] text-muted">Enter your password to unlock.</p>

      <div className="mt-5">
        <label htmlFor="password" className="label">Password</label>
        <PasswordInput id="password" name="password" autoComplete="current-password" autoFocus required />
      </div>

      {state?.error && (
        <p role="alert" className="mt-3 rounded-lg bg-negative/10 px-3 py-2 text-[13px] text-negative">
          {state.error}
        </p>
      )}

      <SubmitButton className="mt-5">Unlock</SubmitButton>
    </form>
  );
}
