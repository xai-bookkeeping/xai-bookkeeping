"use client";

import { useState, useTransition } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { acceptInvitationAction } from "@/actions/auth";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordStrength } from "@/components/ui/PasswordStrength";

export function AcceptInvitationForm({ token }: { token: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await acceptInvitationAction({ token, password, confirmPassword });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push("/login?invite=accepted");
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Input
        autoFocus
        label="Password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      {password ? <PasswordStrength password={password} /> : null}
      <Input
        label="Confirm password"
        type="password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
      />
      <Button type="submit" loading={isPending} fullWidth>
        Activate account
      </Button>
    </form>
  );
}
