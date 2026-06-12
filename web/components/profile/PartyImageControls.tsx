"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

type PartyKind = "customers" | "suppliers";

export function PartyImageControls({
  party,
  recordId,
}: {
  party: PartyKind;
  recordId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  function upload(kind: "cover" | "logo", file: File | undefined) {
    if (!file) return;
    setMessage(null);
    startTransition(async () => {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch(`/api/${party}/${recordId}/${kind}`, {
        body: form,
        method: "POST",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(body.error ?? "Upload failed.");
        return;
      }
      window.location.reload();
    });
  }

  function remove(kind: "cover" | "logo") {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/${party}/${recordId}/${kind}`, {
        method: "DELETE",
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(body.error ?? "Remove failed.");
        return;
      }
      window.location.reload();
    });
  }

  return (
    <div className="space-y-2">
      <input
        ref={coverInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(event) => upload("cover", event.target.files?.[0])}
      />
      <input
        ref={logoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/svg+xml,image/webp"
        hidden
        onChange={(event) => upload("logo", event.target.files?.[0])}
      />
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" size="sm" variant="secondary" loading={isPending} onClick={() => coverInputRef.current?.click()}>
          <ImagePlus className="h-4 w-4" /> Cover
        </Button>
        <Button type="button" size="sm" variant="secondary" loading={isPending} onClick={() => logoInputRef.current?.click()}>
          <Camera className="h-4 w-4" /> Logo
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={isPending} onClick={() => remove("cover")}>
          <Trash2 className="h-4 w-4" /> Cover
        </Button>
        <Button type="button" size="sm" variant="secondary" disabled={isPending} onClick={() => remove("logo")}>
          <Trash2 className="h-4 w-4" /> Logo
        </Button>
      </div>
      {message ? <p className="text-right text-xs font-semibold text-rose-600">{message}</p> : null}
    </div>
  );
}
