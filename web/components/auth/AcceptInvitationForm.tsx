"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

function messageFrom(error: unknown) {
  if (!error) return "Invitation could not be accepted.";
  if (typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return "Invitation could not be accepted.";
}

export function AcceptInvitationForm({ token }: { token: string }) {
  const router = useRouter();
  const { signIn, fetchStatus } = useSignIn();
  const [error, setError] = useState("");

  function accept() {
    setError("");
    void signIn.ticket({ ticket: token })
      .then(async ({ error }) => {
        if (error) {
          setError(messageFrom(error));
          return;
        }
        if (signIn.status === "complete") {
          await signIn.finalize({
            navigate: ({ decorateUrl }) => {
              const url = decorateUrl("/onboarding");
              if (url.startsWith("http")) window.location.href = url;
              else router.push(url);
            },
          });
        }
      })
      .catch((error) => setError(messageFrom(error)));
  }

  return (
    <div className="space-y-4">
      {error ? <Alert variant="error">{error}</Alert> : null}
      <Button type="button" loading={fetchStatus === "fetching"} fullWidth onClick={accept}>
        Continue with invitation
      </Button>
    </div>
  );
}
